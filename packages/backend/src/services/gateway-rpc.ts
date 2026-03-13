/**
 * OpenClaw Gateway WebSocket RPC client.
 *
 * Implements protocol v3 with two authentication modes:
 *
 * 1. Device Identity (default when ~/.openclaw/identity/device.json exists):
 *    - Uses gateway-client ID with Ed25519 device signing
 *    - Works with any gateway where the device is paired
 *    - Best for local installs where OpenClaw is running on the same machine
 *
 * 2. Control UI / Token-only (fallback):
 *    - Uses openclaw-control-ui ID with token auth
 *    - Requires gateway to have controlUi.allowInsecureAuth enabled
 *    - Best for remote gateways without local device keys
 *
 * Verified against OpenClaw 2026.3.8 and Mission Control's gateway_rpc.py.
 */
import WebSocket from 'ws';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const PROTOCOL_VERSION = 3;
const DEFAULT_TIMEOUT_MS = 15_000;
const CONNECT_CHALLENGE_TIMEOUT_MS = 2_000;

const DEVICE_SCOPES = ['operator.read', 'operator.admin', 'operator.approvals', 'operator.pairing'];
const UI_SCOPES = ['operator.read', 'operator.admin'];

export type AuthMode = 'auto' | 'device' | 'token';

export interface GatewayConfig {
  url: string;           // ws://host:18789 or wss://host:18789
  token?: string;        // Auth token (required for token mode, optional for device mode)
  insecureTls?: boolean; // Allow self-signed certs
  authMode?: AuthMode;   // 'auto' (default): try device, fall back to token
}

interface RpcMessage {
  type: string;
  id?: string;
  method?: string;
  event?: string;
  ok?: boolean;
  params?: Record<string, unknown>;
  payload?: unknown;
  error?: { message?: string; code?: string };
}

interface DeviceIdentity {
  deviceId: string;
  publicKeyPem: string;
  privateKeyPem: string;
}

// ─── Device Identity ────────────────────────────────────────────────

const DEVICE_IDENTITY_PATH = path.join(os.homedir(), '.openclaw', 'identity', 'device.json');

function hasDeviceIdentity(): boolean {
  return fs.existsSync(DEVICE_IDENTITY_PATH);
}

function loadDeviceIdentity(): DeviceIdentity {
  const raw = JSON.parse(fs.readFileSync(DEVICE_IDENTITY_PATH, 'utf-8'));
  return {
    deviceId: raw.deviceId,
    publicKeyPem: raw.publicKeyPem,
    privateKeyPem: raw.privateKeyPem,
  };
}

function publicKeyToBase64Url(pem: string): string {
  const keyObj = crypto.createPublicKey(pem);
  const rawKey = keyObj.export({ type: 'spki', format: 'der' });
  // SPKI-encoded Ed25519: 12-byte header + 32-byte raw key
  const raw32 = rawKey.subarray(rawKey.length - 32);
  return Buffer.from(raw32).toString('base64url');
}

function signPayload(canonicalPayload: string, privateKeyPem: string): string {
  const privateKey = crypto.createPrivateKey(privateKeyPem);
  const signature = crypto.sign(null, Buffer.from(canonicalPayload, 'utf-8'), privateKey);
  return Buffer.from(signature).toString('base64url');
}

function buildCanonicalPayload(
  device: DeviceIdentity,
  token: string | undefined,
  signedAt: number,
  nonce: string | null,
): string {
  const scopeStr = DEVICE_SCOPES.join(',');
  const tokenStr = token || '';
  if (nonce) {
    return `v2|${device.deviceId}|gateway-client|backend|operator|${scopeStr}|${signedAt}|${tokenStr}|${nonce}`;
  }
  return `v1|${device.deviceId}|gateway-client|backend|operator|${scopeStr}|${signedAt}|${tokenStr}`;
}

// ─── Connect Params Builders ────────────────────────────────────────

function buildDeviceConnectParams(
  config: GatewayConfig,
  device: DeviceIdentity,
  nonce: string | null,
): Record<string, unknown> {
  const signedAt = Date.now();
  const canonicalPayload = buildCanonicalPayload(device, config.token, signedAt, nonce);
  const signature = signPayload(canonicalPayload, device.privateKeyPem);
  const publicKey = publicKeyToBase64Url(device.publicKeyPem);

  const params: Record<string, unknown> = {
    minProtocol: PROTOCOL_VERSION,
    maxProtocol: PROTOCOL_VERSION,
    role: 'operator',
    scopes: DEVICE_SCOPES,
    client: {
      id: 'gateway-client',
      version: '1.0.0',
      platform: 'node',
      mode: 'backend',
    },
    device: {
      id: device.deviceId,
      publicKey,
      signature,
      signedAt,
      ...(nonce ? { nonce } : {}),
    },
  };

  if (config.token) {
    params.auth = { token: config.token };
  }
  return params;
}

function buildTokenConnectParams(config: GatewayConfig): Record<string, unknown> {
  const params: Record<string, unknown> = {
    minProtocol: PROTOCOL_VERSION,
    maxProtocol: PROTOCOL_VERSION,
    role: 'operator',
    scopes: UI_SCOPES,
    client: {
      id: 'openclaw-control-ui',
      version: '1.0.0',
      platform: 'node',
      mode: 'ui',
    },
  };

  if (config.token) {
    params.auth = { token: config.token };
  }
  return params;
}

// ─── Auth Mode Resolution ───────────────────────────────────────────

function resolveAuthMode(config: GatewayConfig): 'device' | 'token' {
  const mode = config.authMode || 'auto';
  if (mode === 'device') return 'device';
  if (mode === 'token') return 'token';
  // auto: use device if keys exist, otherwise token
  return hasDeviceIdentity() ? 'device' : 'token';
}

function getWsUrl(config: GatewayConfig): string {
  return config.url.replace(/\/$/, '');
}

/**
 * Check what auth mode will be used for a given config.
 * Useful for the frontend to show the user which mode is active.
 */
export function detectAuthMode(config: GatewayConfig): {
  mode: 'device' | 'token';
  hasDeviceKeys: boolean;
  deviceKeyPath: string;
} {
  return {
    mode: resolveAuthMode(config),
    hasDeviceKeys: hasDeviceIdentity(),
    deviceKeyPath: DEVICE_IDENTITY_PATH,
  };
}

// ─── Core RPC Call ──────────────────────────────────────────────────

/**
 * Send a single RPC call to the OpenClaw Gateway.
 * Opens WS → connect handshake → send request → await response → close.
 */
export async function gatewayCall(
  method: string,
  params: Record<string, unknown>,
  config: GatewayConfig,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<unknown> {
  const url = getWsUrl(config);
  const authMode = resolveAuthMode(config);
  const device = authMode === 'device' ? loadDeviceIdentity() : null;

  const wsOptions: WebSocket.ClientOptions = {};

  // Control UI mode needs Origin header for secure context check
  if (authMode === 'token') {
    wsOptions.headers = {
      Origin: url.replace('ws://', 'http://').replace('wss://', 'https://'),
    };
  }

  if (config.insecureTls) {
    wsOptions.rejectUnauthorized = false;
  }

  return new Promise((resolve, reject) => {
    let settled = false;
    let connected = false;
    const connectId = uuidv4();
    const reqId = uuidv4();

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        try { ws.close(); } catch { /* ignore */ }
        reject(new Error(`Gateway RPC timeout after ${timeoutMs}ms for method "${method}"`));
      }
    }, timeoutMs);

    const ws = new WebSocket(url, wsOptions);

    ws.on('error', (err) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        reject(new Error(`Gateway connection error: ${err.message}`));
      }
    });

    ws.on('open', () => {
      const challengeTimer = setTimeout(() => {
        if (!connected && !settled) {
          sendConnect(null);
        }
      }, CONNECT_CHALLENGE_TIMEOUT_MS);

      function sendConnect(nonce: string | null) {
        clearTimeout(challengeTimer);
        if (connected || settled) return;

        const connectParams = device
          ? buildDeviceConnectParams(config, device, nonce)
          : buildTokenConnectParams(config);

        const connectReq = {
          type: 'req',
          id: connectId,
          method: 'connect',
          params: connectParams,
        };
        ws.send(JSON.stringify(connectReq));
      }

      (ws as unknown as Record<string, unknown>)._sendConnect = sendConnect;
    });

    ws.on('message', (data) => {
      try {
        const msg: RpcMessage = JSON.parse(data.toString());

        // Handle connect.challenge event
        if (!connected && msg.type === 'event' && msg.event === 'connect.challenge') {
          const nonce = (msg.payload as Record<string, unknown>)?.nonce as string | undefined;
          const sendConnect = (ws as unknown as Record<string, unknown>)._sendConnect as (n: string | null) => void;
          if (sendConnect) sendConnect(nonce || null);
          return;
        }

        // Handle connect response
        if (!connected && msg.type === 'res' && msg.id === connectId) {
          if (msg.ok) {
            connected = true;
            const req = { type: 'req', id: reqId, method, params };
            ws.send(JSON.stringify(req));
          } else {
            settled = true;
            clearTimeout(timer);
            ws.close();
            const errMsg = msg.error?.message || 'Connect handshake failed';
            reject(new Error(`Gateway connect failed: ${errMsg}`));
          }
          return;
        }

        // Handle RPC response
        if (connected && msg.type === 'res' && msg.id === reqId) {
          settled = true;
          clearTimeout(timer);
          ws.close();
          if (msg.ok) {
            resolve(msg.payload);
          } else {
            const errMsg = msg.error?.message || 'Gateway RPC call failed';
            reject(new Error(`Gateway error (${method}): ${errMsg}`));
          }
        }
      } catch {
        // Ignore non-JSON messages
      }
    });

    ws.on('close', () => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        reject(new Error('Gateway connection closed before response'));
      }
    });
  });
}

// ─── Convenience Helpers ────────────────────────────────────────────

export async function gatewayHealth(config: GatewayConfig): Promise<{ ok: boolean; message: string }> {
  try {
    await gatewayCall('health', {}, config, 5_000);
    return { ok: true, message: 'Gateway is reachable' };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function gatewayListAgents(config: GatewayConfig): Promise<unknown> {
  return gatewayCall('agents.list', {}, config);
}

export async function gatewayGetConfig(config: GatewayConfig): Promise<{ config: Record<string, unknown>; hash: string }> {
  const result = await gatewayCall('config.get', {}, config) as { config: Record<string, unknown>; hash: string };
  return result;
}

export async function gatewaySkillsSearch(
  query: string,
  config: GatewayConfig,
): Promise<unknown> {
  return gatewayCall('skills.search', { query }, config);
}

export async function gatewaySkillsList(config: GatewayConfig): Promise<unknown> {
  return gatewayCall('skills.list', {}, config);
}

export async function gatewaySkillInstall(
  name: string,
  config: GatewayConfig,
  agentId?: string,
): Promise<unknown> {
  const params: Record<string, unknown> = { name };
  if (agentId) params.agentId = agentId;
  return gatewayCall('skills.install', params, config);
}

export async function gatewaySetFile(
  agentId: string,
  name: string,
  content: string,
  config: GatewayConfig,
): Promise<void> {
  await gatewayCall('agents.files.set', { agentId, name, content }, config);
}

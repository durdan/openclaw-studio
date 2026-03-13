import { Router, Request, Response } from 'express';
import { filesystemAdapter } from '../adapters/filesystem.adapter';
import { openclawBundleAdapter } from '../adapters/openclaw-bundle.adapter';
import { gitAdapter } from '../adapters/git.adapter';
import { gatewayAdapter } from '../adapters/gateway.adapter';
import { exportService } from '../services/export.service';
import { designService } from '../services/design.service';
import { gatewayHealth, gatewayListAgents, gatewayGetConfig, gatewaySkillsSearch, gatewaySkillsList, gatewaySkillInstall, detectAuthMode, type GatewayConfig, type AuthMode } from '../services/gateway-rpc';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const OPENCLAW_CONFIG_PATH = path.join(os.homedir(), '.openclaw', 'openclaw.json');

/** Read the gateway auth token from ~/.openclaw/openclaw.json if available */
function readLocalGatewayToken(): string | undefined {
  try {
    const raw = JSON.parse(fs.readFileSync(OPENCLAW_CONFIG_PATH, 'utf-8'));
    return raw?.gateway?.auth?.token as string | undefined;
  } catch {
    return undefined;
  }
}

/** Read the full local gateway config (url + token) */
function readLocalGatewayConfig(): { url: string; token?: string; port?: number } | null {
  try {
    const raw = JSON.parse(fs.readFileSync(OPENCLAW_CONFIG_PATH, 'utf-8'));
    const gw = raw?.gateway;
    if (!gw) return null;
    const port = gw.port || 18789;
    const bind = gw.bind === 'loopback' ? 'localhost' : (gw.bind || 'localhost');
    return {
      url: `ws://${bind}:${port}`,
      token: gw.auth?.token,
      port,
    };
  } catch {
    return null;
  }
}
import { getDb } from '../db';
import { v4 as uuidv4 } from 'uuid';
import type { IExportAdapter, ExportTarget, StudioDesign } from '@openclaw-studio/shared';
import { DesignStatus } from '@openclaw-studio/shared';

const adapters: Record<string, IExportAdapter> = {
  filesystem: filesystemAdapter,
  'openclaw-bundle': openclawBundleAdapter,
  git: gitAdapter,
  gateway: gatewayAdapter,
};

interface ExportTargetRow {
  id: string;
  name: string;
  target_type: string;
  config_json: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

function parseTargetRow(row: ExportTargetRow): ExportTarget {
  return {
    id: row.id,
    name: row.name,
    target_type: row.target_type,
    config_json: row.config_json ? JSON.parse(row.config_json) : undefined,
    is_active: row.is_active === 1,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function seedDefaultTargets(): void {
  const db = getDb();
  const count = db.prepare('SELECT COUNT(*) as cnt FROM studio_export_targets').get() as { cnt: number };
  if (count.cnt > 0) return;

  const now = new Date().toISOString();
  const insert = db.prepare(`
    INSERT INTO studio_export_targets (id, name, target_type, config_json, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  insert.run(uuidv4(), 'Filesystem', 'filesystem', JSON.stringify({ output_dir: '' }), 1, now, now);
  insert.run(uuidv4(), 'OpenClaw Bundle', 'openclaw-bundle', JSON.stringify({}), 1, now, now);
  insert.run(uuidv4(), 'Git Repository', 'git', JSON.stringify({ repo_url: '', branch: 'main' }), 0, now, now);

  console.log('Seeded 3 default export targets.');
}

export const publishRouter = Router();

// POST /api/publish - Publish a design via an adapter
// Accepts either { design_id } or { graph, name, description } for unsaved designs
publishRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { design_id, graph, name, description, target_type, config } = req.body;

    if (!target_type) {
      res.status(400).json({ error: { message: 'target_type is required' } });
      return;
    }

    const adapter = adapters[target_type];
    if (!adapter) {
      res.status(400).json({ error: { message: `Unknown target_type: ${target_type}. Available: ${Object.keys(adapters).join(', ')}` } });
      return;
    }

    // Build a StudioDesign — either from DB or from the graph passed directly
    let design: StudioDesign | null = null;

    if (design_id) {
      design = await designService.getById(design_id);
    }

    // If no design found in DB (or no design_id), use the graph from the request body
    if (!design && graph) {
      design = {
        id: design_id || `publish-${Date.now()}`,
        name: name || 'Unsaved Design',
        description: description || '',
        status: DesignStatus.Draft,
        use_case_prompt: '',
        graph,
        created_by: 'user',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }

    if (!design) {
      res.status(400).json({ error: { message: 'Either design_id (for saved designs) or graph (for unsaved designs) is required' } });
      return;
    }

    const bundle = await exportService.generateBundle(design);

    const adapterConfig = {
      target_type,
      config: config || {},
    };

    // Record publish run (only if design is saved and target exists in DB)
    const db = getDb();
    const runId = uuidv4();
    const now = new Date().toISOString();

    const designRow = design_id ? db.prepare('SELECT id FROM studio_designs WHERE id = ?').get(design_id) as { id: string } | undefined : undefined;
    const targetRow = db.prepare('SELECT id FROM studio_export_targets WHERE target_type = ?').get(target_type) as { id: string } | undefined;
    const canRecord = designRow && targetRow;

    if (canRecord) {
      db.prepare(`
        INSERT INTO studio_publish_runs (id, design_id, export_target_id, status, request_json, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(runId, designRow.id, targetRow.id, 'running', JSON.stringify({ target_type, config }), now, now);
    }

    const result = await adapter.publish(bundle, adapterConfig);

    if (canRecord) {
      db.prepare(`
        UPDATE studio_publish_runs SET status = ?, response_json = ?, updated_at = ? WHERE id = ?
      `).run(result.success ? 'success' : 'failed', JSON.stringify(result), new Date().toISOString(), runId);
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: { message: (err as Error).message } });
  }
});

// POST /api/publish/preview - Preview workspace files without writing to disk
publishRouter.post('/preview', async (req: Request, res: Response) => {
  try {
    const { design_id, graph, name, description } = req.body;

    let design: StudioDesign | null = null;

    if (design_id) {
      design = await designService.getById(design_id);
    }

    if (!design && graph) {
      design = {
        id: design_id || `preview-${Date.now()}`,
        name: name || 'Unsaved Design',
        description: description || '',
        status: DesignStatus.Draft,
        use_case_prompt: '',
        graph,
        created_by: 'user',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }

    if (!design) {
      res.status(400).json({ error: { message: 'Either design_id or graph is required' } });
      return;
    }

    const bundle = await exportService.generateBundle(design);
    const workspaceBundle = openclawBundleAdapter.translate(bundle, { target_type: 'openclaw-bundle', config: {} });

    res.json({
      files: workspaceBundle.files,
      openclaw_json: workspaceBundle.openclaw_json,
      agent_count: workspaceBundle.openclaw_json.agents.list.length,
      file_count: Object.keys(workspaceBundle.files).length,
    });
  } catch (err) {
    console.error('Preview error:', err);
    res.status(500).json({ error: { message: (err as Error).message } });
  }
});

// GET /api/publish/targets - List available export targets
publishRouter.get('/targets', (_req: Request, res: Response) => {
  try {
    seedDefaultTargets();
    const db = getDb();
    const rows = db.prepare('SELECT * FROM studio_export_targets ORDER BY name ASC').all() as ExportTargetRow[];
    res.json(rows.map(parseTargetRow));
  } catch (err) {
    res.status(500).json({ error: { message: (err as Error).message } });
  }
});

// GET /api/publish/gateway/local-config - Read local gateway config from ~/.openclaw/openclaw.json
publishRouter.get('/gateway/local-config', (_req: Request, res: Response) => {
  try {
    const localConfig = readLocalGatewayConfig();
    const hasConfig = !!localConfig;
    res.json({
      found: hasConfig,
      url: localConfig?.url || 'ws://localhost:18789',
      hasToken: !!localConfig?.token,
      token: localConfig?.token || undefined,
      port: localConfig?.port || 18789,
    });
  } catch (err) {
    res.json({ found: false, url: 'ws://localhost:18789', hasToken: false });
  }
});

// POST /api/publish/gateway/auth-mode - Detect which auth mode will be used
publishRouter.post('/gateway/auth-mode', (req: Request, res: Response) => {
  try {
    const { gateway_url, auth_mode } = req.body;
    const gwConfig: GatewayConfig = {
      url: gateway_url || 'ws://localhost:18789',
      authMode: (auth_mode as AuthMode) || 'auto',
    };
    const info = detectAuthMode(gwConfig);
    res.json(info);
  } catch (err) {
    res.status(500).json({ error: { message: (err as Error).message } });
  }
});

// POST /api/publish/gateway/health - Check gateway connectivity
publishRouter.post('/gateway/health', async (req: Request, res: Response) => {
  try {
    const { gateway_url, gateway_token, insecure_tls, auth_mode } = req.body;
    if (!gateway_url) {
      res.status(400).json({ ok: false, message: 'gateway_url is required' });
      return;
    }
    const gwConfig: GatewayConfig = {
      url: gateway_url,
      token: gateway_token,
      insecureTls: insecure_tls ?? false,
      authMode: (auth_mode as AuthMode) || 'auto',
    };
    const result = await gatewayHealth(gwConfig);
    res.json(result);
  } catch (err) {
    res.json({ ok: false, message: (err as Error).message });
  }
});

// POST /api/publish/gateway/agents - List agents on a gateway
publishRouter.post('/gateway/agents', async (req: Request, res: Response) => {
  try {
    const { gateway_url, gateway_token, insecure_tls, auth_mode } = req.body;
    if (!gateway_url) {
      res.status(400).json({ error: { message: 'gateway_url is required' } });
      return;
    }
    const gwConfig: GatewayConfig = {
      url: gateway_url,
      token: gateway_token,
      insecureTls: insecure_tls ?? false,
      authMode: (auth_mode as AuthMode) || 'auto',
    };
    const agents = await gatewayListAgents(gwConfig);
    res.json({ agents });
  } catch (err) {
    res.status(500).json({ error: { message: (err as Error).message } });
  }
});

// POST /api/publish/gateway/status - Get gateway agents + config + bindings in one call
publishRouter.post('/gateway/status', async (req: Request, res: Response) => {
  try {
    const { gateway_url, gateway_token, insecure_tls, auth_mode } = req.body;
    if (!gateway_url) {
      res.status(400).json({ error: { message: 'gateway_url is required' } });
      return;
    }
    const gwConfig: GatewayConfig = {
      url: gateway_url,
      token: gateway_token,
      insecureTls: insecure_tls ?? false,
      authMode: (auth_mode as AuthMode) || 'auto',
    };

    // Fetch agents list and config in parallel
    const [agents, configResult] = await Promise.all([
      gatewayListAgents(gwConfig).catch(() => null),
      gatewayGetConfig(gwConfig).catch(() => null),
    ]);

    const config = configResult?.config as Record<string, unknown> | null;
    const agentsList = config?.agents as { list?: Array<{ id: string; name?: string; workspace?: string; default?: boolean }> } | undefined;
    const bindings = config?.bindings as Array<{ agentId: string; match: Record<string, unknown> }> | undefined;

    res.json({
      agents: agentsList?.list || [],
      bindings: bindings || [],
      raw_agents_response: agents,
    });
  } catch (err) {
    res.status(500).json({ error: { message: (err as Error).message } });
  }
});

// GET /api/publish/history - Get publish run history
publishRouter.get('/history', (_req: Request, res: Response) => {
  try {
    const db = getDb();
    const rows = db.prepare(`
      SELECT
        pr.id,
        pr.design_id,
        pr.status,
        pr.request_json,
        pr.response_json,
        pr.created_at,
        pr.updated_at,
        d.name as design_name,
        et.target_type
      FROM studio_publish_runs pr
      LEFT JOIN studio_designs d ON d.id = pr.design_id
      LEFT JOIN studio_export_targets et ON et.id = pr.export_target_id
      ORDER BY pr.created_at DESC
      LIMIT 50
    `).all() as Array<{
      id: string;
      design_id: string;
      status: string;
      request_json: string | null;
      response_json: string | null;
      created_at: string;
      updated_at: string;
      design_name: string | null;
      target_type: string | null;
    }>;

    res.json(rows.map((r) => ({
      id: r.id,
      design_id: r.design_id,
      design_name: r.design_name,
      target_type: r.target_type,
      status: r.status,
      request: r.request_json ? JSON.parse(r.request_json) : null,
      response: r.response_json ? JSON.parse(r.response_json) : null,
      created_at: r.created_at,
      updated_at: r.updated_at,
    })));
  } catch (err) {
    res.status(500).json({ error: { message: (err as Error).message } });
  }
});

// ── Skills (ClawHub) via Gateway RPC ─────────────────────────────

function buildGwConfig(body: Record<string, unknown>): GatewayConfig {
  // Try request body first, fall back to local openclaw.json
  const localConfig = readLocalGatewayConfig();
  return {
    url: (body.gateway_url as string) || localConfig?.url || 'ws://localhost:18789',
    token: (body.gateway_token as string) || localConfig?.token,
    insecureTls: (body.insecure_tls as boolean) ?? false,
    authMode: ((body.auth_mode as string) || 'auto') as AuthMode,
  };
}

// POST /api/publish/gateway/skills/search - Search ClawHub skills via gateway
publishRouter.post('/gateway/skills/search', async (req: Request, res: Response) => {
  try {
    const { query } = req.body;
    if (!query) {
      res.status(400).json({ error: { message: 'query is required' } });
      return;
    }
    const gwConfig = buildGwConfig(req.body);
    const results = await gatewaySkillsSearch(query, gwConfig);
    res.json({ results });
  } catch (err) {
    res.status(500).json({ error: { message: (err as Error).message } });
  }
});

// GET /api/publish/gateway/skills/list - List installed skills on gateway
publishRouter.post('/gateway/skills/list', async (req: Request, res: Response) => {
  try {
    const gwConfig = buildGwConfig(req.body);
    const skills = await gatewaySkillsList(gwConfig);
    res.json({ skills });
  } catch (err) {
    res.status(500).json({ error: { message: (err as Error).message } });
  }
});

// POST /api/publish/gateway/skills/install - Install a skill from ClawHub via gateway
publishRouter.post('/gateway/skills/install', async (req: Request, res: Response) => {
  try {
    const { skill_name, agent_id } = req.body;
    if (!skill_name) {
      res.status(400).json({ error: { message: 'skill_name is required' } });
      return;
    }
    const gwConfig = buildGwConfig(req.body);
    const result = await gatewaySkillInstall(skill_name, gwConfig, agent_id as string | undefined);
    res.json({ ok: true, result });
  } catch (err) {
    res.status(500).json({ error: { message: (err as Error).message } });
  }
});

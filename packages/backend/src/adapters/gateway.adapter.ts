/**
 * Gateway Direct adapter — pushes workspace files to a running OpenClaw
 * Gateway via WebSocket RPC (protocol v3).
 *
 * Provisioning flow (matches Mission Control's provisioning.py):
 *  1. Health check gateway
 *  2. Generate workspace bundle
 *  3. For each agent:
 *     a. agents.create  — create workspace dir on gateway
 *     b. agents.update  — register agent metadata (name, workspace path)
 *     c. agents.files.set — push all workspace files (sorted order)
 *  4. config.patch — update agents.list + bindings in openclaw.json
 *  5. For each agent:
 *     a. sessions.patch — ensure session exists
 *     b. chat.send — wakeup message to start agent
 */
import type { ExportBundle, AdapterConfig, PublishResult } from '@openclaw-studio/shared';
import { BaseAdapter } from './base.adapter';
import { OpenClawBundleAdapter } from './openclaw-bundle.adapter';
import {
  gatewayCall,
  gatewayHealth,
  gatewaySetFile,
  gatewaySkillInstall,
  type GatewayConfig,
  type AuthMode,
} from '../services/gateway-rpc';
import { v4 as uuidv4 } from 'uuid';
import * as os from 'os';

// Files pushed per agent workspace (sorted alphabetically, matching Mission Control)
const WORKSPACE_FILES = [
  'AGENTS.md', 'HEARTBEAT.md', 'IDENTITY.md', 'MEMORY.md',
  'SOUL.md', 'TOOLS.md', 'USER.md',
];

// Files that should NOT be overwritten on re-publish (contain user/agent data)
const PRESERVE_ON_UPDATE = ['USER.md', 'MEMORY.md'];

export class GatewayAdapter extends BaseAdapter {
  name = 'Gateway Direct Adapter';
  target_type = 'gateway';

  private bundleAdapter = new OpenClawBundleAdapter();

  translate(bundle: ExportBundle, config: AdapterConfig): Record<string, string> {
    const workspaceBundle = this.bundleAdapter.translate(bundle, config);
    return workspaceBundle.files;
  }

  async publish(bundle: ExportBundle, config: AdapterConfig): Promise<PublishResult> {
    const gwUrl = config.config.gateway_url as string;
    const gwToken = config.config.gateway_token as string | undefined;
    const insecureTls = config.config.insecure_tls as boolean | undefined;
    const authMode = config.config.auth_mode as AuthMode | undefined;

    if (!gwUrl) {
      return {
        success: false,
        target_type: this.target_type,
        message: 'Gateway URL is required (e.g., ws://localhost:18789)',
      };
    }

    const gwConfig: GatewayConfig = {
      url: gwUrl,
      token: gwToken,
      insecureTls: insecureTls ?? false,
      authMode: authMode || 'auto',
    };

    // Step 1: Health check
    const health = await gatewayHealth(gwConfig);
    if (!health.ok) {
      return {
        success: false,
        target_type: this.target_type,
        message: `Cannot reach gateway: ${health.message}`,
      };
    }
    this.log('Gateway health check passed');

    // Step 2: Generate workspace bundle
    const workspaceBundle = this.bundleAdapter.translate(bundle, config);
    const files = workspaceBundle.files;
    const agents = workspaceBundle.openclaw_json.agents.list;

    if (agents.length === 0) {
      return {
        success: false,
        target_type: this.target_type,
        message: 'No agents found in design. Add at least one agent node.',
      };
    }

    const errors: string[] = [];
    let filesWritten = 0;
    const homeDir = os.homedir();

    try {
      // Step 3: For each agent — create, update, push files
      for (const agent of agents) {
        const agentId = agent.id;
        // Resolve absolute workspace path (gateway needs absolute paths)
        const workspacePath = agent.workspace.replace(/^~/, homeDir);
        const wsPrefix = agent.workspace.replace(/^~\/\.openclaw\//, '');

        this.log(`Provisioning agent: ${agent.name} (${agentId})`);

        // 3a. agents.create — create workspace directory on gateway
        let isNewAgent = true;
        try {
          await gatewayCall(
            'agents.create',
            { name: agentId, workspace: workspacePath },
            gwConfig,
          );
          this.log(`  Created agent workspace: ${workspacePath}`);
        } catch (err) {
          const msg = (err as Error).message;
          // "already exists" is fine — agent was previously provisioned
          if (msg.includes('already exists') || msg.includes('duplicate')) {
            this.log(`  Agent already exists, updating...`);
            isNewAgent = false;
          } else {
            this.log(`  Warning: agents.create failed: ${msg}`);
            errors.push(`agents.create ${agentId}: ${msg}`);
          }
        }

        // 3b. agents.update — register/update agent metadata
        // Small delay after create (gateway needs time to initialize workspace)
        await new Promise((r) => setTimeout(r, 300));
        try {
          await gatewayCall(
            'agents.update',
            { agentId, name: agent.name, workspace: workspacePath },
            gwConfig,
          );
          this.log(`  Updated agent metadata`);
        } catch (err) {
          const msg = (err as Error).message;
          this.log(`  Warning: agents.update failed: ${msg}`);
          errors.push(`agents.update ${agentId}: ${msg}`);
        }

        // 3c. agents.files.set — push workspace files (sorted alphabetically)
        // On re-publish, skip USER.md and MEMORY.md to preserve agent/user data
        for (const [filePath, content] of Object.entries(files)) {
          if (filePath.startsWith(wsPrefix + '/')) {
            const fileName = filePath.slice(wsPrefix.length + 1);
            if (WORKSPACE_FILES.includes(fileName) || fileName.startsWith('skills/')) {
              // Don't overwrite user/agent data files on re-publish
              if (!isNewAgent && PRESERVE_ON_UPDATE.includes(fileName)) {
                this.log(`  SKIP: ${fileName} (preserved on re-publish)`);
                continue;
              }
              try {
                await gatewaySetFile(agentId, fileName, content, gwConfig);
                filesWritten++;
                this.log(`  OK: ${fileName}`);
              } catch (err) {
                const msg = (err as Error).message;
                this.log(`  FAIL: ${fileName} — ${msg}`);
                errors.push(`${agentId}/${fileName}: ${msg}`);
              }
            }
          }
        }
      }

      // Step 3.5: Install ClawHub skills via skills.install
      // Scan skill nodes in graph for clawhub: references
      if (bundle.graph?.nodes) {
        for (const node of bundle.graph.nodes) {
          if (node.type !== 'skill') continue;
          const cfg = node.config as unknown as Record<string, unknown>;
          const assetRef = cfg?.existing_asset_ref as string | undefined;
          if (!assetRef?.startsWith('clawhub:')) continue;

          const clawHubSlug = assetRef.slice('clawhub:'.length);
          // Find which agent(s) this skill is connected to via edges
          const connectedAgentIds = bundle.graph.edges
            .filter((e) => e.target === node.id && e.relation_type === 'invokes')
            .map((e) => e.source);

          // Map graph agent node IDs to provisioned agent IDs
          for (const graphAgentId of connectedAgentIds) {
            const agentNode = bundle.graph.nodes.find((n) => n.id === graphAgentId);
            const agentCfg = agentNode?.config as unknown as Record<string, unknown>;
            const agentName = (agentCfg?.name as string) || '';
            const matchedAgent = agents.find((a) => a.name === agentName || a.id === agentName.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
            const targetAgentId = matchedAgent?.id;

            if (targetAgentId) {
              try {
                await gatewaySkillInstall(clawHubSlug, gwConfig, targetAgentId);
                this.log(`  Installed ClawHub skill: ${clawHubSlug} → ${targetAgentId}`);
              } catch (err) {
                const msg = (err as Error).message;
                this.log(`  Warning: skills.install ${clawHubSlug} failed: ${msg}`);
                errors.push(`skills.install ${clawHubSlug} for ${targetAgentId}: ${msg}`);
              }
            }
          }
        }
      }

      // Step 4: config.patch — update agents.list, bindings, tools.exec.host
      try {
        const configResult = await gatewayCall('config.get', {}, gwConfig) as Record<string, unknown>;
        const configHash = configResult.hash as string;
        const existingConfig = (configResult.config || configResult) as Record<string, unknown>;

        const patch: Record<string, unknown> = {
          agents: workspaceBundle.openclaw_json.agents,
        };
        if (workspaceBundle.openclaw_json.bindings?.length) {
          patch.bindings = workspaceBundle.openclaw_json.bindings;
        }

        // Ensure tools.exec.host = "gateway" so agents can run shell commands
        // (matches Mission Control's _tools_exec_host_patch behavior)
        const existingTools = existingConfig.tools as Record<string, unknown> | undefined;
        const existingExec = existingTools?.exec as Record<string, unknown> | undefined;
        if (!existingExec?.host) {
          patch.tools = { exec: { host: 'gateway' } };
          this.log('Adding tools.exec.host = "gateway"');
        }

        // Add channel heartbeat visibility defaults if not set
        const existingChannels = existingConfig.channels as Record<string, unknown> | undefined;
        const existingDefaults = existingChannels?.defaults as Record<string, unknown> | undefined;
        if (!existingDefaults?.heartbeat) {
          patch.channels = {
            defaults: {
              heartbeat: { showOk: false, showAlerts: true, useIndicator: true },
            },
          };
        }

        // Skip config.patch if only agents match and nothing else changed
        // (avoids unnecessary gateway restarts that rotate agent tokens)
        const existingAgents = existingConfig.agents as Record<string, unknown> | undefined;
        const existingAgentsList = (existingAgents as { list?: unknown[] })?.list;
        const newAgentsList = workspaceBundle.openclaw_json.agents.list;
        const agentsUnchanged = existingAgentsList
          && JSON.stringify(existingAgentsList) === JSON.stringify(newAgentsList)
          && !patch.tools
          && !patch.channels
          && !patch.bindings;

        if (agentsUnchanged) {
          this.log('Config unchanged — skipping config.patch to avoid token rotation');
        } else {
          const patchParams: Record<string, unknown> = { raw: JSON.stringify(patch) };
          if (configHash) {
            patchParams.baseHash = configHash;
          }
          await gatewayCall('config.patch', patchParams, gwConfig);
          this.log('Patched openclaw.json config');
        }
      } catch (err) {
        const msg = (err as Error).message;
        this.log(`Warning: config.patch failed: ${msg}`);
        errors.push(`config.patch: ${msg}`);
      }

      // Step 5: For each agent — ensure session + send wakeup
      for (const agent of agents) {
        const sessionKey = `agent:${agent.id}:main`;

        // 5a. sessions.patch — ensure session exists
        try {
          await gatewayCall(
            'sessions.patch',
            { key: sessionKey, label: agent.name },
            gwConfig,
          );
          this.log(`Session ensured: ${sessionKey}`);
        } catch (err) {
          this.log(`Warning: sessions.patch failed for ${agent.id}: ${(err as Error).message}`);
        }

        // 5b. chat.send — wakeup message
        try {
          await gatewayCall(
            'chat.send',
            {
              sessionKey,
              message: `Hello ${agent.name}. Your workspace has been provisioned.\n\nStart the agent. If BOOTSTRAP.md exists, read it first, then read AGENTS.md. Begin heartbeats after startup.`,
              deliver: true,
              idempotencyKey: uuidv4(),
            },
            gwConfig,
          );
          this.log(`Woke agent: ${agent.name}`);
        } catch (err) {
          // Wakeup failure is non-critical — agent will pick up on next session
          this.log(`Warning: wakeup failed for ${agent.id}: ${(err as Error).message}`);
        }
      }

      const message = errors.length > 0
        ? `Provisioned ${agents.length} agent(s), pushed ${filesWritten} files with ${errors.length} warning(s)`
        : `Provisioned ${agents.length} agent(s), pushed ${filesWritten} files to gateway`;

      return {
        success: filesWritten > 0,
        target_type: this.target_type,
        message,
        details: {
          gateway_url: gwUrl,
          agent_count: agents.length,
          files_written: filesWritten,
          agents: agents.map((a) => ({ id: a.id, name: a.name })),
          errors: errors.length > 0 ? errors : undefined,
        },
      };
    } catch (error) {
      return {
        success: false,
        target_type: this.target_type,
        message: `Gateway publish failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
}

export const gatewayAdapter = new GatewayAdapter();

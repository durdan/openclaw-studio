import type { ExportBundle, AdapterConfig, PublishResult, AgentDefinition, SkillDefinition, HeartbeatDefinition } from '@openclaw-studio/shared';
import { BaseAdapter } from './base.adapter';

/**
 * Generates workspace files matching the real OpenClaw specification.
 *
 * OpenClaw multi-agent setup uses separate workspace directories per agent,
 * configured via openclaw.json. Each workspace has the same file structure:
 *
 *   ~/.openclaw/
 *   ├── openclaw.json                    # Central config
 *   ├── workspace/                       # Default agent (first agent)
 *   │   ├── AGENTS.md                    # Operating instructions
 *   │   ├── SOUL.md                      # Persona & boundaries
 *   │   ├── IDENTITY.md                  # Name, emoji
 *   │   ├── TOOLS.md                     # Tool notes
 *   │   ├── USER.md                      # Owner info
 *   │   ├── HEARTBEAT.md                 # Heartbeat checklist
 *   │   ├── MEMORY.md                    # Long-term memory
 *   │   └── skills/
 *   │       └── <skill>/SKILL.md
 *   ├── workspace-<agentId>/             # Additional agents
 *   │   └── (same structure)
 */

interface WorkspaceBundle {
  version: string;
  files: Record<string, string>; // path relative to ~/.openclaw/ -> content
  openclaw_json: OpenClawConfig;
}

interface OpenClawConfig {
  agents: {
    defaults: {
      model: { primary: string; fallbacks?: string[] };
    };
    list: Array<{
      id: string;
      default?: boolean;
      name: string;
      workspace: string;
      model?: string;
    }>;
  };
  bindings: Array<{
    agentId: string;
    match: { channel: string; accountId?: string };
  }>;
}

// --- Helpers ---

function agentId(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function workspacePath(agentIdx: number, slug: string): string {
  // First agent gets the default workspace, others get workspace-<id>
  return agentIdx === 0 ? 'workspace' : `workspace-${slug}`;
}

// --- File Generators ---

/**
 * SOUL.md — Informal personality prompt (lowercase, no headers).
 * This is the official OpenClaw convention: SOUL.md is raw personality text,
 * not structured markdown. It signals "this is who I am" vs "this is what I do".
 */
function generateSoulMd(agent: AgentDefinition): string {
  const parts: string[] = [];

  // Build personality description from available fields
  if (agent.personality) {
    parts.push(agent.personality.toLowerCase());
  } else {
    // Synthesize from role + communication style
    parts.push(`you are ${agent.role.toLowerCase()}.`);
  }

  if (agent.communication_style) {
    parts.push(agent.communication_style.toLowerCase());
  }

  // Add behavioral tone from do/don't rules
  if (agent.do_rules && agent.do_rules.length > 0) {
    const doText = agent.do_rules.map((r) => r.toLowerCase()).join('. ');
    parts.push(`you always ${doText}.`);
  }

  if (agent.dont_rules && agent.dont_rules.length > 0) {
    const dontText = agent.dont_rules.map((r) => r.toLowerCase()).join('. you never ');
    parts.push(`you never ${dontText}.`);
  }

  if (agent.description && !agent.personality) {
    parts.push(agent.description.toLowerCase());
  }

  return parts.join(' ') + '\n';
}

/**
 * AGENTS.md — Structured operating instructions (formal markdown with headers).
 * This is the "user manual" for the agent: role, mission, capabilities, rules.
 */
function generateAgentsMd(agent: AgentDefinition, skills: string[], tools: string[]): string {
  const lines: string[] = [];

  lines.push(`# ${agent.name}`);

  // Role
  lines.push('', '## Role');
  lines.push(`You are ${agent.name}, ${agent.role}.`);

  // Mission
  if (agent.goal) {
    lines.push('', '## Mission', agent.goal);
  } else if (agent.description) {
    lines.push('', '## Mission', agent.description);
  }

  // Capabilities / Responsibilities
  if (agent.responsibilities && agent.responsibilities.length > 0) {
    lines.push('', '## Capabilities');
    for (const r of agent.responsibilities) {
      lines.push(`- ${r}`);
    }
  }

  // Skills
  if (skills.length > 0) {
    lines.push('', '## Skills');
    for (const s of skills) lines.push(`- ${s}`);
  }

  // Tools
  if (tools.length > 0) {
    lines.push('', '## Tools');
    for (const t of tools) lines.push(`- ${t}`);
  }

  // Rules
  const allRules: string[] = [];
  if (agent.rules) allRules.push(...agent.rules);
  if (agent.do_rules) allRules.push(...agent.do_rules.map((r) => `Always ${r}`));
  if (agent.dont_rules) allRules.push(...agent.dont_rules.map((r) => `Never ${r}`));
  if (allRules.length > 0) {
    lines.push('', '## Rules');
    for (const r of allRules) {
      lines.push(`- ${r}`);
    }
  }

  // Handoffs
  if (agent.handoffs && agent.handoffs.length > 0) {
    lines.push('', '## Coordination');
    for (const h of agent.handoffs) {
      lines.push(`- ${h}`);
    }
  }

  // Example Interactions
  if (agent.example_interactions) {
    lines.push('', '## Example Interactions', agent.example_interactions);
  }

  return lines.join('\n') + '\n';
}

function generateIdentityMd(agent: AgentDefinition): string {
  return `# Identity

**Name:** ${agent.name}
**Role:** ${agent.role}
`;
}

function generateToolsMd(agent: AgentDefinition): string {
  if (agent.tools.length === 0) {
    return `# Tools

No tools configured for this agent.
`;
  }

  const toolEntries = agent.tools.map((t) => `### ${t}\n- Binding: \`${t}\`\n- Status: Active`).join('\n\n');

  return `# Tools

${toolEntries}
`;
}

function generateUserMd(): string {
  return `# User

<!-- Fill in your details so the agent can personalize its responses -->

## About
- **Name:** (your name)
- **Role:** (your role)

## Preferences
- (your preferences)
`;
}

function generateHeartbeatMd(heartbeat?: HeartbeatDefinition): string {
  if (!heartbeat) return '';

  return `# Heartbeat

## Schedule
- **Mode:** ${heartbeat.mode}
- **Every:** ${heartbeat.schedule}

## Checklist
- [ ] ${heartbeat.purpose}
${heartbeat.escalation_summary ? `\n## Escalation\n${heartbeat.escalation_summary}\n` : ''}`;
}

function generateMemoryMd(agentName: string): string {
  return `# Memory

> Long-term memory for ${agentName}. Curated facts persist across sessions.

## Setup
- Agent configured via OpenClaw Studio
`;
}

function generateSkillMd(skill: SkillDefinition): string {
  // SKILL.md is the ONLY file with YAML frontmatter
  const frontmatter = [
    '---',
    `name: ${skill.name}`,
    `description: ${skill.purpose}`,
    'user-invocable: true',
    '---',
  ];

  const body = [``, `# ${skill.name}`, ''];
  if (skill.prompt_summary) {
    body.push(skill.prompt_summary, '');
  }
  if (skill.input_schema) {
    body.push(`## Input Schema`, '```json', JSON.stringify(skill.input_schema, null, 2), '```', '');
  }
  if (skill.output_schema) {
    body.push(`## Output Schema`, '```json', JSON.stringify(skill.output_schema, null, 2), '```', '');
  }

  return frontmatter.join('\n') + body.join('\n');
}

function generateOpenClawJson(agents: AgentDefinition[], defaultModel: string): OpenClawConfig {
  // Determine which agent is default: explicit is_default flag, or first agent
  const defaultIdx = agents.findIndex((a) => a.is_default);
  const effectiveDefaultIdx = defaultIdx >= 0 ? defaultIdx : 0;

  return {
    agents: {
      defaults: {
        model: { primary: defaultModel },
      },
      list: agents.map((agent, idx) => {
        const slug = agentId(agent.name);
        const wsDir = workspacePath(idx, slug);
        return {
          id: slug,
          default: idx === effectiveDefaultIdx ? true : undefined,
          name: agent.name,
          workspace: `~/.openclaw/${wsDir}`,
          model: agent.model !== defaultModel ? agent.model : undefined,
        };
      }),
    },
    // Only create bindings for agents with explicit channel bindings
    bindings: agents
      .filter((agent) => agent.channel_binding?.channel)
      .map((agent) => ({
        agentId: agentId(agent.name),
        match: {
          channel: agent.channel_binding!.channel,
          ...(agent.channel_binding!.accountId ? { accountId: agent.channel_binding!.accountId } : {}),
        },
      })),
  };
}

// --- Adapter ---

export class OpenClawBundleAdapter extends BaseAdapter {
  name = 'OpenClaw Bundle Adapter';
  target_type = 'openclaw-bundle';

  translate(bundle: ExportBundle, _config: AdapterConfig): WorkspaceBundle {
    const files: Record<string, string> = {};
    const agents = bundle.agent_definitions;
    const defaultModel = agents.length > 0 ? agents[0].model : 'claude-sonnet-4-20250514';

    // Build a map of skill name -> definition for lookup
    const skillMap = new Map<string, SkillDefinition>();
    for (const skill of bundle.skill_definitions) {
      skillMap.set(skill.name, skill);
    }

    // Generate per-agent workspace directories
    agents.forEach((agent, idx) => {
      const slug = agentId(agent.name);
      const wsDir = workspacePath(idx, slug);

      // Find this agent's heartbeat
      const heartbeat = agent.heartbeat_config;

      // Core workspace files
      files[`${wsDir}/SOUL.md`] = generateSoulMd(agent);
      files[`${wsDir}/AGENTS.md`] = generateAgentsMd(agent, agent.skills, agent.tools);
      files[`${wsDir}/IDENTITY.md`] = generateIdentityMd(agent);
      files[`${wsDir}/TOOLS.md`] = generateToolsMd(agent);
      files[`${wsDir}/USER.md`] = generateUserMd();
      files[`${wsDir}/MEMORY.md`] = generateMemoryMd(agent.name);

      // Optional files
      const heartbeatMd = generateHeartbeatMd(heartbeat);
      if (heartbeatMd) {
        files[`${wsDir}/HEARTBEAT.md`] = heartbeatMd;
      }

      // Per-agent skills (skills connected to this agent)
      for (const skillName of agent.skills) {
        const skill = skillMap.get(skillName);
        if (skill) {
          const skillSlug = agentId(skillName);
          files[`${wsDir}/skills/${skillSlug}/SKILL.md`] = generateSkillMd(skill);
        }
      }
    });

    // openclaw.json
    const openclawJson = generateOpenClawJson(agents, defaultModel);
    files['openclaw.json'] = JSON.stringify(openclawJson, null, 2);

    return {
      version: '1.0.0',
      files,
      openclaw_json: openclawJson,
    };
  }

  async publish(bundle: ExportBundle, config: AdapterConfig): Promise<PublishResult> {
    try {
      const workspaceBundle = this.translate(bundle, config);
      const fileCount = Object.keys(workspaceBundle.files).length;
      const agentCount = workspaceBundle.openclaw_json.agents.list.length;

      this.log(`Generated OpenClaw workspace: ${agentCount} agents, ${fileCount} files`);

      return {
        success: true,
        target_type: this.target_type,
        message: `OpenClaw workspace generated: ${agentCount} agent(s), ${fileCount} files`,
        details: {
          bundle_version: workspaceBundle.version,
          agent_count: agentCount,
          file_count: fileCount,
          files: Object.keys(workspaceBundle.files),
          agents: workspaceBundle.openclaw_json.agents.list.map((a) => ({
            id: a.id,
            name: a.name,
            workspace: a.workspace,
          })),
          bundle: workspaceBundle,
        },
      };
    } catch (error) {
      return {
        success: false,
        target_type: this.target_type,
        message: `Bundle generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
}

export const openclawBundleAdapter = new OpenClawBundleAdapter();

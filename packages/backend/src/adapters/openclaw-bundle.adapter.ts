import type { ExportBundle, AdapterConfig, PublishResult, AgentDefinition, SkillDefinition, HeartbeatDefinition } from '@openclaw-studio/shared';
import { BaseAdapter } from './base.adapter';

/**
 * Generates workspace files matching the REAL OpenClaw 2026.3.x specification.
 *
 * Verified against a live OpenClaw installation (v2026.3.8).
 *
 *   ~/.openclaw/
 *   ├── openclaw.json                    # Central config (agents, auth, channels, gateway, etc.)
 *   ├── workspace/                       # Default agent (first agent)
 *   │   ├── AGENTS.md                    # Operating manual (role, mission, rules, memory, heartbeat)
 *   │   ├── SOUL.md                      # Personality & values (structured markdown with headers)
 *   │   ├── IDENTITY.md                  # Self-identity (name, creature, vibe, emoji, avatar)
 *   │   ├── TOOLS.md                     # Local environment notes (cameras, SSH, devices)
 *   │   ├── USER.md                      # About the human owner
 *   │   ├── HEARTBEAT.md                 # Heartbeat checklist (empty = skip heartbeats)
 *   │   ├── MEMORY.md                    # Curated long-term memory (main session only)
 *   │   ├── memory/                      # Daily logs (YYYY-MM-DD.md)
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
      workspace?: string;
    };
    list: Array<{
      id: string;
      default?: boolean;
      name: string;
      workspace: string;
      agentDir: string;
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

/** Strip leading "Always"/"Never" prefix if present (case-insensitive) to avoid doubling */
function stripPrefix(rule: string, prefix: string): string {
  const re = new RegExp(`^${prefix}\\s+`, 'i');
  return rule.replace(re, '');
}

// --- File Generators ---

/**
 * SOUL.md — Personality, values, and behavioral guidelines.
 * Real OpenClaw SOUL.md uses structured markdown with ## headers,
 * NOT lowercase prose (corrected from earlier assumption).
 */
function generateSoulMd(agent: AgentDefinition): string {
  const lines: string[] = [];

  lines.push(`# SOUL.md - Who You Are`);
  lines.push('');

  // Core Truths / Personality
  lines.push('## Core Truths');
  lines.push('');
  if (agent.personality) {
    lines.push(agent.personality);
  } else {
    lines.push(`You are ${agent.role}. Be genuinely helpful, not performatively helpful.`);
  }
  if (agent.communication_style) {
    lines.push('');
    lines.push(agent.communication_style);
  }
  lines.push('');

  // Boundaries from do/don't rules
  if ((agent.do_rules && agent.do_rules.length > 0) || (agent.dont_rules && agent.dont_rules.length > 0)) {
    lines.push('## Boundaries');
    lines.push('');
    if (agent.do_rules) {
      for (const rule of agent.do_rules) {
        lines.push(`- Always ${stripPrefix(rule, 'always')}`);
      }
    }
    if (agent.dont_rules) {
      for (const rule of agent.dont_rules) {
        lines.push(`- Never ${stripPrefix(rule, 'never')}`);
      }
    }
    lines.push('');
  }

  // Vibe
  lines.push('## Vibe');
  lines.push('');
  if (agent.description) {
    lines.push(agent.description);
  } else {
    lines.push('Be the assistant you\'d actually want to talk to. Concise when needed, thorough when it matters.');
  }
  lines.push('');

  // Continuity
  lines.push('## Continuity');
  lines.push('');
  lines.push('Each session, you wake up fresh. These files _are_ your memory. Read them. Update them. They\'re how you persist.');
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('_This file is yours to evolve. As you learn who you are, update it._');
  lines.push('');

  return lines.join('\n');
}

/**
 * AGENTS.md — The full operating manual for the agent.
 * Includes role, mission, capabilities, rules, memory system, and coordination.
 */
function generateAgentsMd(agent: AgentDefinition, skills: string[], tools: string[]): string {
  const lines: string[] = [];

  lines.push(`# ${agent.name} - Your Workspace`);

  // Session Startup
  lines.push('', '## Session Startup');
  lines.push('', 'Before doing anything else:');
  lines.push('', '1. Read `SOUL.md` — this is who you are');
  lines.push('2. Read `USER.md` — this is who you\'re helping');
  lines.push('3. Read `memory/YYYY-MM-DD.md` (today + yesterday) for recent context');
  lines.push('4. **If in MAIN SESSION** (direct chat with your human): Also read `MEMORY.md`');

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
    lines.push('Skills provide your tools. When you need one, check its `SKILL.md`. Keep local notes in `TOOLS.md`.');
    for (const t of tools) lines.push(`- ${t}`);
  }

  // Memory
  lines.push('', '## Memory');
  lines.push('', 'You wake up fresh each session. These files are your continuity:');
  lines.push('', '- **Daily notes:** `memory/YYYY-MM-DD.md` — raw logs of what happened');
  lines.push('- **Long-term:** `MEMORY.md` — your curated memories (main session only)');
  lines.push('', 'Capture what matters. Decisions, context, things to remember.');

  // Rules
  const allRules: string[] = [];
  if (agent.rules) allRules.push(...agent.rules);
  if (agent.do_rules) allRules.push(...agent.do_rules.map((r) => `Always ${stripPrefix(r, 'always')}`));
  if (agent.dont_rules) allRules.push(...agent.dont_rules.map((r) => `Never ${stripPrefix(r, 'never')}`));

  // Always include Red Lines
  lines.push('', '## Red Lines');
  lines.push('');
  lines.push('- Don\'t exfiltrate private data. Ever.');
  lines.push('- Don\'t run destructive commands without asking.');
  lines.push('- `trash` > `rm` (recoverable beats gone forever)');
  lines.push('- When in doubt, ask.');
  if (allRules.length > 0) {
    lines.push('');
    for (const r of allRules) {
      lines.push(`- ${r}`);
    }
  }

  // External vs Internal
  lines.push('', '## External vs Internal');
  lines.push('', '**Safe to do freely:**');
  lines.push('- Read files, explore, organize, learn');
  lines.push('- Search the web, check calendars');
  lines.push('- Work within this workspace');
  lines.push('', '**Ask first:**');
  lines.push('- Sending emails, tweets, public posts');
  lines.push('- Anything that leaves the machine');

  // Handoffs / Coordination
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

/**
 * IDENTITY.md — Self-identity template.
 * Agent fills this in during first conversation (or pre-populated by Studio).
 */
function generateIdentityMd(agent: AgentDefinition): string {
  return `# IDENTITY.md - Who Am I?

- **Name:** ${agent.name}
- **Creature:** AI agent
- **Vibe:** ${agent.personality || agent.communication_style || '(to be discovered)'}
- **Emoji:** (pick one that feels right)
- **Avatar:** (workspace-relative path, http(s) URL, or data URI)

---

This isn't just metadata. It's the start of figuring out who you are.
`;
}

/**
 * TOOLS.md — Local environment notes.
 * NOT auto-managed tool bindings. This is for environment-specific details
 * like camera names, SSH hosts, voice preferences, device nicknames.
 */
function generateToolsMd(skills: string[], tools: string[]): string {
  const lines: string[] = [];
  lines.push('# TOOLS.md - Local Notes');
  lines.push('');
  lines.push('Skills define _how_ tools work. This file is for _your_ specifics — the stuff that\'s unique to your setup.');
  lines.push('');

  if (skills.length > 0 || tools.length > 0) {
    lines.push('## Installed Skills');
    lines.push('');
    for (const s of skills) lines.push(`- ${s}`);
    for (const t of tools) lines.push(`- ${t}`);
    lines.push('');
  }

  lines.push('## Environment Notes');
  lines.push('');
  lines.push('Add whatever helps you do your job. This is your cheat sheet.');
  lines.push('');

  return lines.join('\n');
}

/**
 * USER.md — Info about the human owner. Template to be filled in.
 */
function generateUserMd(): string {
  return `# USER.md - About Your Human

_Learn about the person you're helping. Update this as you go._

- **Name:**
- **What to call them:**
- **Pronouns:** _(optional)_
- **Timezone:**
- **Notes:**

## Context

_(What do they care about? What projects are they working on? What annoys them? What makes them laugh? Build this over time.)_

---

The more you know, the better you can help. But remember — you're learning about a person, not building a dossier. Respect the difference.
`;
}

/**
 * HEARTBEAT.md — Keep empty to skip heartbeat API calls.
 * Add tasks below when you want the agent to check something periodically.
 */
function generateHeartbeatMd(heartbeat?: HeartbeatDefinition): string {
  if (!heartbeat) {
    return `# HEARTBEAT.md

# Keep this file empty (or with only comments) to skip heartbeat API calls.

# Add tasks below when you want the agent to check something periodically.
`;
  }

  return `# HEARTBEAT.md

## Schedule
- **Mode:** ${heartbeat.mode}
- **Every:** ${heartbeat.schedule}

## Checklist
- [ ] ${heartbeat.purpose}
${heartbeat.escalation_summary ? `\n## Escalation\n${heartbeat.escalation_summary}\n` : ''}`;
}

/**
 * MEMORY.md — Curated long-term memory. Only loaded in main session for security.
 */
function generateMemoryMd(agentName: string): string {
  return `# MEMORY.md - Long-Term Memory for ${agentName}

_Only loaded in main session (direct chat). Not shared in group chats for security._

## About

This is your curated memory — the distilled essence, not raw logs.
Write significant events, thoughts, decisions, opinions, lessons learned.

Over time, review your daily files (memory/YYYY-MM-DD.md) and update this with what's worth keeping.

---

_(Start building your memory here.)_
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
          agentDir: `~/.openclaw/agents/${slug}/agent`,
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

      // Core workspace files (matches real OpenClaw 2026.3.x)
      files[`${wsDir}/AGENTS.md`] = generateAgentsMd(agent, agent.skills, agent.tools);
      files[`${wsDir}/SOUL.md`] = generateSoulMd(agent);
      files[`${wsDir}/IDENTITY.md`] = generateIdentityMd(agent);
      files[`${wsDir}/TOOLS.md`] = generateToolsMd(agent.skills, agent.tools);
      files[`${wsDir}/USER.md`] = generateUserMd();
      files[`${wsDir}/HEARTBEAT.md`] = generateHeartbeatMd(heartbeat);
      files[`${wsDir}/MEMORY.md`] = generateMemoryMd(agent.name);

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

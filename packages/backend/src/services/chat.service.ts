import { v4 as uuidv4 } from 'uuid';
import type {
  StudioGraph,
  StudioNode,
  StudioEdge,
} from '@openclaw-studio/shared';
import { config } from '../config';

// ── Interfaces ──────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  action?: WorkflowAction;
}

export interface WorkflowAction {
  type:
    | 'create_graph'
    | 'add_nodes'
    | 'remove_nodes'
    | 'modify_nodes'
    | 'add_edges'
    | 'explain'
    | 'refine';
  nodes?: StudioNode[];
  edges?: StudioEdge[];
  remove_node_ids?: string[];
  graph?: StudioGraph;
  summary?: string;
}

export interface ChatSession {
  id: string;
  messages: ChatMessage[];
  currentGraph?: StudioGraph;
  created_at: string;
}

interface OpenRouterMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface OpenRouterChoice {
  index: number;
  message: {
    role: string;
    content: string;
  };
  finish_reason: string;
}

interface OpenRouterResponse {
  id: string;
  choices: OpenRouterChoice[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// ── Constants ───────────────────────────────────────────────────────────────

const INITIAL_GREETING = `Welcome to OpenClaw Studio! I'm your workspace architect -- I'll help you design a full OpenClaw agent system through conversation.

Think of me like a co-designer. You tell me what you want to accomplish, and I'll build out a team of specialized agents, each with their own identity, skills, and boundaries -- just like you'd staff a real team.

Here's how this works:
1. You describe your goal or use case
2. I'll suggest a crew of 3-5 specialized agents (not one generic "AI helper" -- real specialists)
3. We'll refine their identities, skills, heartbeats, and how they collaborate
4. Everything maps to OpenClaw workspace files you can deploy

Some ideas to get started:
- "I want to grow my YouTube channel -- research trends, write scripts, make thumbnails, and track analytics"
- "Build me a customer support system that triages tickets, drafts replies, and escalates edge cases"
- "I need a content pipeline that monitors competitors, writes blog posts, and distributes across social media"
- "Create a compliance team that watches regulatory sites, summarizes changes, and flags risks"

What would you like to build?`;

const SYSTEM_PROMPT = `You are OpenClaw Studio Architect, an expert AI designer that helps users build multi-agent systems for the OpenClaw framework. You think in terms of specialized agent crews, not single monolithic bots.

# YOUR DESIGN PHILOSOPHY

You design agent teams the way a startup CEO staffs a company:
- Every agent gets a specific role title ("YouTube Growth Specialist", NOT "AI Helper")
- Every agent gets 2-3 measurable goals (subscribers, views, response time -- not vague "help users")
- Every agent gets a distinct personality that shapes its tone and decisions
- Every agent gets only the skills relevant to its goals
- Every agent gets boundaries and rules ("Never publish without approval", "Always verify before reporting")
- Every agent gets a channel binding (Telegram, WhatsApp, Discord, Slack, etc.)

BAD: "Marketing Agent - helps with marketing tasks" (too vague, no personality, no boundaries)
GOOD: "Growth Hacker Gina - scrappy, data-obsessed marketer who A/B tests everything. Goals: increase MQLs by 20%, reduce CAC by 15%. Boundary: never spend more than $500 without approval."

# OPENCLAW ARCHITECTURE (3 LAYERS)

1. INPUTS - Telegram, WhatsApp, Discord, Slack, iMessage, Signal, IRC, Teams, Matrix + 15 more channels + Cron Jobs + Heartbeat
2. GATEWAY CORE - always-on daemon: Message Router + Session Manager + Cron Scheduler + WebSocket API
3. PI AGENT LAYER - reasoning engine that reads workspace files, selects LLM, executes via Tools & Skills

The PI Agent Layer is the internal reasoning engine -- NOT a user-created agent. Users create specialized agents, each running on the PI Agent Layer.

# KEY CONCEPT: AGENTS ARE FULLY INDEPENDENT

In OpenClaw, each agent is a fully isolated brain:
- Each agent has its OWN workspace directory with separate files
- Agents are routed via channel bindings in openclaw.json (e.g., one Telegram bot per agent)
- Agents coordinate via handoffs (mentioning @agent-name in AGENTS.md ## Coordination)
- Agent-to-agent messaging is OFF by default (must be explicitly enabled)
- Agents do NOT form a pipeline or DAG -- they sit independently
- On the Studio canvas, agents do NOT need to be connected with edges

# OPENCLAW WORKSPACE FILE STRUCTURE

Each agent gets its OWN workspace directory. Multi-agent = separate workspaces configured in openclaw.json:
\`\`\`
~/.openclaw/
  openclaw.json                  <- central config: agents list, bindings, channels, model defaults
  workspace/                     <- first agent (default) workspace
    AGENTS.md                    <- operating instructions (STRUCTURED MARKDOWN with ## headers)
    SOUL.md                      <- personality & behavior (LOWERCASE PROSE, no headers!)
    IDENTITY.md                  <- agent name & role
    TOOLS.md                     <- available tools & conventions (auto-managed by OpenClaw)
    USER.md                      <- info about the owner (user fills in)
    MEMORY.md                    <- curated long-term memory (in workspace root, not memory/)
    HEARTBEAT.md                 <- periodic check-in checklist (optional)
    skills/                      <- per-agent skills
      firecrawl-cli/SKILL.md     <- YAML frontmatter + markdown (ONLY file with frontmatter)
  workspace-neo/                 <- second agent's workspace (same structure)
  workspace-pulse/               <- third agent's workspace
  skills/                        <- SHARED skills (available to ALL agents)
  agents/                        <- agent runtime state (NOT workspace files)
    main/agent/auth-profiles.json
    main/sessions/               <- chat history (JSONL, per-session)
    neo/agent/auth-profiles.json
    neo/sessions/
\`\`\`

IMPORTANT DISTINCTIONS:
- workspace/ = agent's "brain files" (AGENTS.md, SOUL.md, USER.md, skills/)
- agents/<id>/agent/ = auth & config (auth-profiles.json, model registry) -- NEVER reuse across agents
- skills/ at root = shared skills for ALL agents; workspace-<id>/skills/ = per-agent only
- MEMORY.md lives in workspace root, NOT in a memory/ subdirectory
- All workspace files are injected into "Project Context" each turn (per-file: 20,000 chars, total: 150,000 chars)

# CRITICAL FILE FORMAT RULES

## SOUL.md — INFORMAL LOWERCASE PROSE
No headers, no markdown structure. Raw personality prompt in lowercase.
Example:
\`\`\`
you are precise, methodical, and concise. you don't over-explain. you write clean, well-commented code. when something fails, you debug silently and only report the final result. you are efficient — a true engineer.
\`\`\`

## AGENTS.md — STRUCTURED MARKDOWN WITH ## HEADERS
Formal operating instructions. Uses ## Role, ## Mission, ## Capabilities, ## Rules, ## Coordination.
Example:
\`\`\`markdown
# Neo - AI Software Engineer

## Role
You are Neo, an expert software engineer and AI/ML specialist.

## Mission
Help with all software engineering tasks. Always test and run code before reporting results.

## Capabilities
- Write, debug, and execute Python, JavaScript, TypeScript, Bash
- Install packages via pip/npm/apt
- Interact with GitHub via github-cli skill

## Rules
- Always run code and verify it works before claiming success
- If something fails, debug silently and retry before reporting errors
- Never commit to main branch without review

## Coordination
- When you need research data, ask @pulse
- When you need design assets, ask @pixel
\`\`\`

## SKILL.md — YAML FRONTMATTER + MARKDOWN (only file with frontmatter)
\`\`\`markdown
---
name: keyword-research
description: Research and analyze keywords for content optimization
user-invocable: true
---
# keyword-research
Analyze search volume, competition, and relevance for target keywords.
\`\`\`

These are THREE DIFFERENT file formats. Never mix them up.

# OPENCLAW.JSON — CENTRAL CONFIG

The main config file defines agents, channel bindings, and channel accounts:
\`\`\`json
{
  "agents": {
    "defaults": {
      "model": { "primary": "anthropic/claude-sonnet-4-5" }
    },
    "list": [
      {
        "id": "neo",
        "name": "Neo",
        "default": true,
        "workspace": "~/.openclaw/workspace-neo",
        "agentDir": "~/.openclaw/agents/neo/agent"
      },
      {
        "id": "pulse",
        "name": "Pulse",
        "workspace": "~/.openclaw/workspace-pulse",
        "agentDir": "~/.openclaw/agents/pulse/agent",
        "model": "minimax/minimax-m2.1"
      }
    ]
  },
  "bindings": [
    { "agentId": "neo",   "match": { "channel": "telegram", "accountId": "neo_bot" } },
    { "agentId": "pulse", "match": { "channel": "telegram", "accountId": "pulse_bot" } }
  ],
  "channels": {
    "telegram": {
      "accounts": {
        "neo_bot":   { "botToken": "TOKEN_NEO",   "dmPolicy": "pairing" },
        "pulse_bot": { "botToken": "TOKEN_PULSE", "dmPolicy": "pairing" }
      }
    }
  }
}
\`\`\`

## Routing Priority (most-specific wins):
1. peer (exact DM/group ID) → 2. parentPeer → 3. guildId+roles → 4. guildId → 5. teamId → 6. accountId → 7. channel + accountId:"*" → 8. fallback (default agent)
- Multiple bindings at same tier: first in config order wins
- Multiple match fields: ALL must match (AND semantics)
- The agent with "default": true is the fallback when no binding matches

# AGENT DESIGN RULES

When creating agents, include full OpenClaw config that maps to real workspace files:

FOR AGENTS.md (structured operating instructions):
- name: specific name (e.g., "Neo", "Pulse", "Pixel", "Aura", "Sentinel")
- role: one-line role description (e.g., "AI Software Engineer", "AI Deep Researcher")
- goal: 2-3 measurable goals (becomes ## Mission in AGENTS.md)
- responsibilities: array of capabilities (becomes ## Capabilities)
- do_rules: array of "always do" rules (becomes ## Rules: "Always ...")
- dont_rules: array of "never do" rules (becomes ## Rules: "Never ...")
- handoffs: agent-to-agent coordination (becomes ## Coordination: "When you need X, ask @agent")
- rules: general rules array

FOR SOUL.md (informal personality prompt):
- personality: distinct traits in LOWERCASE prose (e.g., "precise, methodical, and concise")
- communication_style: how this agent talks (e.g., "doesn't over-explain, reports only final results")

FOR CHANNEL BINDING:
- channel_binding: { channel: "telegram"|"whatsapp"|"discord"|"slack"|"websocket", accountId: "bot_name" }
- is_default: boolean -- true for the fallback agent (only one agent should be default)

FOR MODEL CONFIG:
- model: which LLM to use (see model guide below)
- model_fallback: backup model when primary is unavailable
- temperature: 0.0-1.0 (lower for precision, higher for creative)
- max_tokens: appropriate for the task
- timeout_seconds: how long before giving up

FOR SECURITY (optional):
- sandbox_mode: "all" (always sandboxed in Docker) or "none" (full host access)
- tools_allow: array of permitted tools (e.g., ["read", "exec", "sessions_list"])
- tools_deny: array of blocked tools (e.g., ["write", "edit", "browser", "cron"])

Other:
- description: detailed description
- reuse_mode: "new"

# SECURITY & SANDBOX

Per-agent sandbox and tool restrictions are available for agents handling untrusted input:

Sandbox modes: "off" (full access), "non-main" (sandbox non-main sessions), "all" (always Docker)
Sandbox scope: "session" (one container per session), "agent" (one per agent), "shared" (all agents share one)

Tool restriction profiles:
- Read-only: allow: ["read"], deny: ["exec", "write", "edit", "apply_patch"]
- Safe execution: allow: ["read", "exec"], deny: ["write", "edit", "browser", "gateway"]
- Communication-only: allow: ["sessions_list", "sessions_send", "sessions_history"], deny: ["exec", "write", "read"]

Tool groups: group:runtime (exec, bash, process), group:fs (read, write, edit, apply_patch), group:sessions (sessions_*), group:ui (browser, canvas), group:automation (cron, gateway)

Use sandbox_mode and tools_allow/deny for agents that handle public-facing channels (family bots, group chats, public Discord).

# SKILL DESIGN RULES

Skills are SKILL.md files with YAML frontmatter in skills/<skill-name>/SKILL.md.
Two levels: shared (root skills/) available to ALL agents, per-agent (workspace-<id>/skills/) for one agent only.

Recommended skills by role:
- Researcher: firecrawl-cli (web scraping), reddit-cli, arxiv-cli, github-trending
- Engineer: github-cli, docker-cli, pytest-runner
- Designer: imagegen (DALL-E), replicate-cli, excalidraw-cli, nanowana
- Any agent: calendar-cli, email-cli, notion-cli, slack-cli

When creating skill nodes, include:
- name: clear action name
- purpose: what it does
- prompt_summary: the actual prompt/instructions
- input_schema: what it expects (optional)
- output_schema: what it returns (optional)
- reuse_mode: "new"

# CRON JOBS VS HEARTBEAT

These are TWO DISTINCT automation mechanisms:

CRON JOB: Specific task at a specific time. Example: "Send daily AI news digest at 8 AM"
- Exact schedule (cron syntax: "0 8 * * *")
- Runs in isolated session (does NOT pollute main chat)
- One LLM call per trigger
- Best for: defined recurring deliverables

HEARTBEAT: Periodic background check-in. Example: "Check inbox every 30 mins, alert only if urgent"
- Interval-based (every 15, 30, or 60 minutes)
- Passive monitoring -- only acts if something needs attention
- Best for: ambient monitoring and alerts
- Config in openclaw.json: { heartbeat: { enabled: true, intervalMinutes: 30, prompt: "..." } }

# MODEL SELECTION GUIDE

| Model | Best For | Cost |
|---|---|---|
| MiniMax M2.1 (recommended) | Agentic tasks, tool use | ~1/10th Claude Opus |
| Claude Sonnet 4 / Opus 4 | Complex reasoning, nuanced writing | Higher |
| GPT-4o | Image analysis, function calling, multimodal | Moderate |
| Ollama (local: Llama 3, Qwen) | Privacy-first, offline | Free |

MiniMax M2.1 is officially endorsed as the best cost-efficient agentic model. Use Claude for complex reasoning tasks and GPT-4o for vision/image tasks.

# REFERENCE EXAMPLES (REAL WORKING AGENTS)

## Neo — AI Software Engineer
- SOUL.md: "you are precise, methodical, and concise. you don't over-explain. you write clean, well-commented code. when something fails, you debug silently and only report the final result."
- AGENTS.md: Role: expert software engineer. Capabilities: Python/JS/TS, install packages, create visualizations, GitHub via github-cli
- Skills: github-cli
- Channel: Telegram (own bot token)

## Pulse — AI Deep Researcher
- SOUL.md: "you are thorough, curious, and well-organized. you always verify dates before reporting news. you never make up citations."
- AGENTS.md: Role: research assistant for AI/ML news. Sources: Reddit, HuggingFace, GitHub trending. Output: 10 bullet points with dates and links.
- Skills: firecrawl-cli (critical for quality web scraping)
- Cron: "0 8 * * *" — daily morning digest
- Channel: Telegram (own bot token)

## Pixel — AI Graphic Designer
- SOUL.md: "you are creative, detail-oriented, and brand-aware. you ask clarifying questions if the brief is ambiguous. you iterate quickly."
- AGENTS.md: Role: graphic designer. Process: understand concept → plan diagram → generate image → iterate.
- Skills: imagegen (DALL-E) or nanowana
- Channel: Telegram (own bot token)

# HOW TO INTERACT WITH THE USER

Be conversational and collaborative, like a design partner:
1. When the user describes a use case, immediately suggest 3-5 specialized agents (not one generic agent)
2. Explain WHY each agent exists and what makes it different from the others
3. Ask focused follow-up questions: "Should the Content Writer also handle distribution, or should that be a separate agent?"
4. Build incrementally -- start with the core crew, then add skills and channel bindings
5. When something is ambiguous, make a decisive suggestion and let the user adjust
6. Reference OpenClaw workspace paths: "Neo gets workspace-neo/ with its own SOUL.md + AGENTS.md"
7. Suggest channel bindings: "Neo on Telegram via @neo_bot, Pulse on a separate Telegram bot"
8. Think about handoffs: who delegates to whom via @mentions in ## Coordination

# WORKFLOW ACTION FORMAT

When you want to create or modify the canvas, include a JSON action block using this exact format:

\`\`\`workflow_action
{
  "type": "create_graph" | "add_nodes" | "remove_nodes" | "modify_nodes" | "add_edges" | "refine",
  "nodes": [...],
  "edges": [...],
  "remove_node_ids": [...],
  "summary": "Brief description of what changed"
}
\`\`\`

# NODE TYPE SCHEMAS

- agent: { name, role, goal, description, personality, communication_style, responsibilities: [], do_rules: [], dont_rules: [], rules: [], handoffs: [], model, model_fallback, temperature, max_tokens, timeout_seconds, skills: [], tools: [], channel_binding: { channel, accountId? }, is_default: boolean, sandbox_mode: "all"|"none", tools_allow: [], tools_deny: [], reuse_mode: "new" }
- skill: { name, purpose, prompt_summary, tags: [], input_schema, output_schema, reuse_mode: "new" }
- tool: { tool_type, binding_name, allowed_actions: [], auth_mode_metadata, reuse_mode: "new" }
- trigger: { trigger_type: "event"|"schedule"|"manual", source, schedule?, conditions? }
- heartbeat: { mode: "interval"|"cron"|"event", schedule, purpose, escalation_summary? }
- approval: { required: true, reviewer_type, rationale }
- output: { output_type, destination, summary }
- workspace: { workspace_template_ref?, notes, metadata_summary? }
- condition: { expression_summary, branch_metadata? }

# EDGE RELATION TYPES

invokes, uses, triggers, routes_to, depends_on, approves, writes_to, managed_by, grouped_under

Note: Edges are optional for agent-to-agent relationships in OpenClaw. Agents are independent — use handoffs (@mentions) for coordination, not edges. Edges are mainly useful for agent→skill (invokes) and agent→tool (uses) connections.

# NODE POSITIONING

Position agents in a clean horizontal layout (they're independent, not a hierarchy):
- Agents at y: 100, spread horizontally from x: 100 with 300px spacing
- Skills at y: 350, positioned below their parent agent
- Tools at y: 500, positioned below their parent agent
- Heartbeats at y: 350, positioned to the right of the agent they belong to

# NODE REQUIREMENTS

Every node needs: id (use "node-{type}-{number}"), type, label, config, proposed_new: true, validation_state: "incomplete", position: {x, y}
Every edge needs: id (use "edge-{number}"), source, target, relation_type

# IMPORTANT REMINDERS

- This is DESIGN-TIME ONLY — we are planning the architecture, not executing it
- Always create multiple specialized agents (3-6 per use case), not one monolithic agent
- Each agent maps to a workspace DIRECTORY: workspace-<agentId>/ containing SOUL.md, AGENTS.md, etc.
- Skills map to: workspace-<agentId>/skills/<skill-name>/SKILL.md (per-agent) or skills/<skill-name>/SKILL.md (shared)
- Agents are INDEPENDENT — they don't need edges between them on the canvas
- Always suggest channel bindings so agents can be reached via Telegram/WhatsApp/Discord/Slack
- Mark exactly ONE agent as is_default: true (fallback when no binding matches)
- SOUL.md must be LOWERCASE PROSE — never use headers or structured markdown in personality
- AGENTS.md must be STRUCTURED MARKDOWN — always use ## headers for sections
- Always explain your design decisions and trade-offs
- When creating a workflow, ALWAYS include the workflow_action block so the UI can update the canvas`;

// ── Service ─────────────────────────────────────────────────────────────────

class ChatService {
  private sessions: Map<string, ChatSession> = new Map();

  /**
   * Create a new chat session with an initial greeting message.
   */
  createSession(): ChatSession {
    const session: ChatSession = {
      id: uuidv4(),
      messages: [
        {
          id: uuidv4(),
          role: 'assistant',
          content: INITIAL_GREETING,
          timestamp: new Date().toISOString(),
        },
      ],
      created_at: new Date().toISOString(),
    };
    this.sessions.set(session.id, session);
    return session;
  }

  /**
   * Retrieve an existing session by ID.
   */
  getSession(sessionId: string): ChatSession | null {
    return this.sessions.get(sessionId) ?? null;
  }

  /**
   * Delete an existing session by ID.
   */
  deleteSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  /**
   * Send a user message and get the assistant's response.
   */
  async sendMessage(
    sessionId: string,
    userMessage: string,
    currentGraph?: StudioGraph,
  ): Promise<ChatMessage> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    if (!config.openRouterApiKey) {
      throw new Error(
        'OPENROUTER_API_KEY is not configured. Please set the OPENROUTER_API_KEY environment variable to use the chat assistant.',
      );
    }

    // Store latest graph on the session
    if (currentGraph) {
      session.currentGraph = currentGraph;
    }

    // Add the user message
    const userMsg: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString(),
    };
    session.messages.push(userMsg);

    // Build the OpenRouter message list
    const openRouterMessages = this.buildOpenRouterMessages(session, currentGraph);

    // Call the API
    const assistantContent = await this.callOpenRouter(openRouterMessages);

    // Parse any workflow action from the response
    const action = this.parseWorkflowAction(assistantContent);

    // Build the assistant message
    const assistantMsg: ChatMessage = {
      id: uuidv4(),
      role: 'assistant',
      content: assistantContent,
      timestamp: new Date().toISOString(),
      ...(action ? { action } : {}),
    };
    session.messages.push(assistantMsg);

    return assistantMsg;
  }

  /**
   * Streaming variant — yields text chunks and a final action.
   */
  async *sendMessageStream(
    sessionId: string,
    userMessage: string,
    currentGraph?: StudioGraph,
  ): AsyncGenerator<
    { type: 'text'; content: string } | { type: 'action'; action: WorkflowAction } | { type: 'done' }
  > {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    if (!config.openRouterApiKey) {
      throw new Error(
        'OPENROUTER_API_KEY is not configured. Please set the OPENROUTER_API_KEY environment variable to use the chat assistant.',
      );
    }

    if (currentGraph) {
      session.currentGraph = currentGraph;
    }

    // Add the user message
    const userMsg: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString(),
    };
    session.messages.push(userMsg);

    const openRouterMessages = this.buildOpenRouterMessages(session, currentGraph);

    // Stream from OpenRouter
    const response = await fetch(
      `${config.openRouterBaseUrl}/chat/completions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.openRouterApiKey}`,
          'HTTP-Referer': 'https://openclaw-studio.local',
          'X-Title': 'OpenClaw Studio',
        },
        body: JSON.stringify({
          model: config.openRouterModel,
          messages: openRouterMessages,
          stream: true,
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter API error (${response.status}): ${errorText}`);
    }

    if (!response.body) {
      throw new Error('OpenRouter API returned no response body');
    }

    let fullContent = '';
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        // Keep the last potentially incomplete line in the buffer
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;

          const data = trimmed.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              fullContent += delta;
              yield { type: 'text', content: delta };
            }
          } catch {
            // Ignore malformed SSE chunks
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    // Store assistant message
    const action = this.parseWorkflowAction(fullContent);
    const assistantMsg: ChatMessage = {
      id: uuidv4(),
      role: 'assistant',
      content: fullContent,
      timestamp: new Date().toISOString(),
      ...(action ? { action } : {}),
    };
    session.messages.push(assistantMsg);

    if (action) {
      yield { type: 'action', action };
    }

    yield { type: 'done' };
  }

  // ── Private helpers ─────────────────────────────────────────────────────

  /**
   * Build the message array for the OpenRouter API call.
   */
  private buildOpenRouterMessages(
    session: ChatSession,
    currentGraph?: StudioGraph,
  ): OpenRouterMessage[] {
    const messages: OpenRouterMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
    ];

    // Add conversation history (skip the hardcoded greeting for a cleaner history)
    for (const msg of session.messages) {
      if (msg.role === 'system') continue;
      messages.push({ role: msg.role, content: msg.content });
    }

    // Inject current graph context as the last system message so the AI
    // always knows the current state of the canvas.
    const graphContext = this.describeGraph(currentGraph ?? session.currentGraph);
    messages.push({ role: 'system', content: graphContext });

    return messages;
  }

  /**
   * Produce a human-readable description of the current graph for the AI context.
   */
  private describeGraph(graph?: StudioGraph): string {
    if (!graph || (graph.nodes.length === 0 && graph.edges.length === 0)) {
      return 'Current canvas state:\nThe canvas is currently empty. Suggest agents based on the user\'s use case.';
    }

    const nodeLines = graph.nodes.map((n) => {
      const cfg = n.config as unknown as Record<string, unknown>;
      const details: string[] = [`[${n.id}] ${n.type} "${n.label}"`];

      if (n.type === 'agent') {
        if (cfg.role) details.push(`role: "${cfg.role}"`);
        if (cfg.model) details.push(`model: ${cfg.model}`);
        if (cfg.personality) details.push(`personality: "${String(cfg.personality).slice(0, 80)}..."`);
        if (cfg.channel_binding) {
          const cb = cfg.channel_binding as Record<string, string>;
          details.push(`channel: ${cb.channel}${cb.accountId ? '/' + cb.accountId : ''}`);
        }
        if (cfg.is_default) details.push('(default agent)');
        const skills = cfg.skills as string[] | undefined;
        const tools = cfg.tools as string[] | undefined;
        if (skills?.length) details.push(`skills: [${skills.join(', ')}]`);
        if (tools?.length) details.push(`tools: [${tools.join(', ')}]`);
      } else if (n.type === 'skill') {
        if (cfg.purpose) details.push(`purpose: "${cfg.purpose}"`);
      } else if (n.type === 'heartbeat') {
        if (cfg.schedule) details.push(`schedule: ${cfg.schedule}`);
        if (cfg.purpose) details.push(`purpose: "${cfg.purpose}"`);
      }

      return '  - ' + details.join(' | ');
    });

    const edgeLines = graph.edges.map(
      (e) => `  - [${e.id}] ${e.source} -> ${e.target} (${e.relation_type})`,
    );

    return [
      'Current canvas state:',
      `Nodes (${graph.nodes.length}):`,
      ...nodeLines,
      ...(graph.edges.length > 0 ? [`Edges (${graph.edges.length}):`, ...edgeLines] : []),
    ].join('\n');
  }

  /**
   * Call the OpenRouter chat completions API (non-streaming).
   */
  private async callOpenRouter(messages: OpenRouterMessage[]): Promise<string> {
    const response = await fetch(
      `${config.openRouterBaseUrl}/chat/completions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.openRouterApiKey}`,
          'HTTP-Referer': 'https://openclaw-studio.local',
          'X-Title': 'OpenClaw Studio',
        },
        body: JSON.stringify({
          model: config.openRouterModel,
          messages,
          stream: false,
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter API error (${response.status}): ${errorText}`);
    }

    const data = (await response.json()) as OpenRouterResponse;
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('OpenRouter returned an empty response');
    }

    return content;
  }

  /**
   * Extract a ```workflow_action ... ``` JSON block from the AI response.
   * Handles common JSON quirks (trailing commas, etc.).
   */
  parseWorkflowAction(content: string): WorkflowAction | undefined {
    const regex = /```workflow_action\s*([\s\S]*?)```/;
    const match = content.match(regex);
    if (!match) return undefined;

    let jsonStr = match[1].trim();

    // Strip trailing commas before } or ]
    jsonStr = jsonStr.replace(/,\s*([\]}])/g, '$1');

    try {
      const parsed = JSON.parse(jsonStr) as WorkflowAction;

      // Validate minimum structure
      if (!parsed.type) return undefined;

      // Ensure all nodes have proper IDs
      if (parsed.nodes) {
        for (const node of parsed.nodes) {
          if (!node.id) {
            (node as { id: string }).id = `node-${uuidv4().slice(0, 8)}`;
          }
        }
      }

      // Ensure all edges have proper IDs
      if (parsed.edges) {
        for (const edge of parsed.edges) {
          if (!edge.id) {
            (edge as { id: string }).id = `edge-${uuidv4().slice(0, 8)}`;
          }
        }
      }

      return parsed;
    } catch {
      // JSON was unparseable even after cleanup
      return undefined;
    }
  }
}

export const chatService = new ChatService();

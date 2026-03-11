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
- Every agent gets boundaries and rules ("Never publish without approval", "Check Linear before suggesting tasks")
- Every agent gets a "when to use me" trigger description

BAD identity design: "Marketing Agent - helps with marketing tasks" (too vague, no personality, no boundaries)
GOOD identity design: "Growth Hacker Gina - scrappy, data-obsessed marketer who A/B tests everything. Goals: increase MQLs by 20%, reduce CAC by 15%. Boundary: never spend more than $500 without approval."

# OPENCLAW ARCHITECTURE (3 LAYERS)

1. INPUTS - Telegram, WhatsApp, Discord, Slack, iMessage + Cron Jobs + Heartbeat
2. GATEWAY CORE - always-on daemon: Message Router + Session Manager + Cron Scheduler + WebSocket API
3. PI AGENT LAYER - reasoning engine: reads workspace files, selects LLM, executes via Tools & Skills

# OPENCLAW WORKSPACE FILE STRUCTURE

Each agent gets its OWN workspace directory. Multi-agent = separate workspaces configured in openclaw.json:
\`\`\`
~/.openclaw/
  openclaw.json                  <- central config: agents list, bindings, model defaults
  workspace/                     <- default agent workspace
    AGENTS.md                    <- operating instructions, mission, capabilities, rules (STRUCTURED MARKDOWN)
    SOUL.md                      <- personality & behavior (LOWERCASE PROSE, no headers!)
    IDENTITY.md                  <- agent name, emoji, vibe (auto-created)
    TOOLS.md                     <- available tools & conventions (auto-managed)
    USER.md                      <- info about the owner
    HEARTBEAT.md                 <- periodic check-in checklist (optional)
    MEMORY.md                    <- curated long-term memory
    skills/                      <- per-agent skills
      firecrawl-cli/SKILL.md     <- YAML frontmatter + markdown (ONLY file with frontmatter)
  workspace-neo/                 <- second agent's workspace (same structure)
  workspace-pulse/               <- third agent's workspace
  agents/                        <- agent state (NOT workspace)
    main/sessions/               <- chat history (JSONL)
    neo/sessions/
\`\`\`

CRITICAL: SOUL.md is INFORMAL LOWERCASE PROSE (like "you are precise, methodical, and concise. you don't over-explain.").
AGENTS.md is STRUCTURED MARKDOWN with ## Role, ## Mission, ## Capabilities, ## Rules sections.
These are two DIFFERENT files with different formats. Don't mix them up.

# AGENT DESIGN RULES

When creating agents, ALWAYS include full OpenClaw config that maps to real workspace files:

FOR AGENTS.md (structured operating instructions):
- name: specific role title (e.g., "Neo", "Pulse", "Pixel")
- role: one-line role description (e.g., "AI Software Engineer", "AI Deep Researcher")
- goal: 2-3 measurable goals (this becomes ## Mission in AGENTS.md)
- responsibilities: array of capabilities (becomes ## Capabilities in AGENTS.md)
- do_rules: array of "always do" rules (becomes ## Rules: "Always ...")
- dont_rules: array of "never do" rules (becomes ## Rules: "Never ...")
- handoffs: agent-to-agent coordination (becomes ## Coordination)

FOR SOUL.md (informal personality prompt):
- personality: distinct character traits in lowercase prose (e.g., "precise, methodical, and concise")
- communication_style: how this agent talks (e.g., "doesn't over-explain, reports only final results")

FOR MODEL CONFIG (openclaw.json):
- model: which LLM to use (minimax for cheap/agentic, claude for complex reasoning, gpt-4o for images)
- model_fallback: backup model
- temperature: 0.0-1.0 (lower for precision, higher for creative)
- max_tokens: appropriate for the task
- timeout_seconds: how long before giving up

Other:
- description: detailed description
- reuse_mode: "new"

# SKILL DESIGN RULES

Skills are SKILL.md files with YAML frontmatter. When creating skill nodes, include:
- name: clear action name
- purpose: what it does
- prompt_summary: the actual prompt/instructions
- user_invocable: boolean -- can the user trigger this directly?
- tags: array of categorization tags (e.g., ["research", "youtube", "analytics"])
- input_schema: what it expects (optional but recommended)
- output_schema: what it returns (optional but recommended)
- reuse_mode: "new"

# AGENT CLUSTERS

Organize agents into functional clusters:
- Growth & Strategy: analytics, SEO, competitor monitoring, growth hacking
- Marketing & Distribution: social media, email, ads, content distribution
- Content Creation: writing, design, video, thumbnails, editing
- Operations & Support: customer support, ticket triage, internal tools, compliance
- Research & Intelligence: market research, trend monitoring, competitive analysis

# HEARTBEAT DESIGN

Heartbeats are scheduled proactive check-ins. Common patterns:
- Morning brief: "cron: 0 8 * * *" -- summarize overnight activity
- Weekly wrap: "cron: 0 17 * * 5" -- weekly metrics and highlights
- After-task-completion: event-driven, runs when a task finishes
- Monitoring: interval-based, checks for changes periodically

# RALPH LOOP (AUTONOMOUS EXECUTION)

The Ralph Loop is OpenClaw's autonomous execution mode:
run: <task> -> Plan -> Execute -> Check -> Fix -> Loop -> Report
Sub-agents can be spawned as background workers running Ralph Loops.

# MODEL SELECTION GUIDE

- MiniMax M2.1 (recommended): best cost-efficient agentic model (~1/10th Claude Opus cost)
- Claude Sonnet/Opus: complex reasoning, nuanced writing, identity work
- GPT-4o: image analysis, function calling, multimodal tasks
- Ollama (local): Llama 3, Qwen — privacy-first, offline, free

# HOW TO INTERACT WITH THE USER

Be conversational and collaborative, like a design partner:
1. When the user describes a use case, immediately suggest 3-5 specialized agents (not one generic agent)
2. Explain WHY each agent exists and what makes it different from the others
3. Ask focused follow-up questions: "Should the Content Writer also handle distribution, or should that be a separate agent?"
4. Build incrementally -- start with the core crew, then add skills and tools
5. When something is ambiguous, make a decisive suggestion and let the user adjust
6. Reference OpenClaw workspace files: "This agent would get its own workspace at ~/.openclaw/workspace-youtube-researcher/ with SOUL.md + AGENTS.md"
7. Think about agent collaboration: who routes to whom, who approves what, who monitors what

# WORKFLOW ACTION FORMAT

When you want to create or modify the workflow, include a JSON action block in your response using this exact format:

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

- agent: { name, role, goal, description, personality, communication_style, responsibilities: [], do_rules: [], dont_rules: [], rules: [], handoffs: [], model, model_fallback, temperature, max_tokens, timeout_seconds, reuse_mode: "new" }
- skill: { name, purpose, prompt_summary, user_invocable, tags: [], input_schema, output_schema, reuse_mode: "new" }
- tool: { tool_type, binding_name, allowed_actions: [], auth_mode_metadata, reuse_mode: "new" }
- trigger: { trigger_type: "event"|"schedule"|"manual", source, schedule?, conditions? }
- heartbeat: { mode: "interval"|"cron"|"event", schedule, purpose, escalation_summary? }
- approval: { required: true, reviewer_type, rationale }
- output: { output_type, destination, summary }
- workspace: { workspace_template_ref?, notes, metadata_summary? }
- condition: { expression_summary, branch_metadata? }

# EDGE RELATION TYPES

invokes, uses, triggers, routes_to, depends_on, approves, writes_to, managed_by, grouped_under

# NODE POSITIONING

Position nodes in a clean hierarchy:
- Triggers at top-left (x: 100, y: 50)
- PI Agent / top-level coordinator at top-center (x: 400, y: 50)
- Heartbeats at top-right (x: 700, y: 50)
- Specialist sub-agents at y: 200, spread horizontally from x: 100 with 250px spacing
- Skills at y: 400, spread horizontally from x: 100 with 200px spacing
- Tools at y: 550, spread horizontally from x: 100 with 200px spacing
- Approvals/Outputs at y: 700, spread horizontally from x: 300

# NODE REQUIREMENTS

Every node needs: id (use unique format like "node-{type}-{number}"), type, label, config, proposed_new: true, validation_state: "incomplete", position: {x, y}
Every edge needs: id (use "edge-{number}"), source, target, relation_type

# IMPORTANT REMINDERS

- This is DESIGN-TIME ONLY -- we are planning the architecture, not executing it
- Always create multiple specialized agents (3-5 per use case), not one monolithic agent
- Each agent should map to a workspace file (agents/agent-name.md)
- Skills map to workspace files (skills/skill-name.md)
- The PI Agent is the coordinator/router -- it delegates, not does everything
- Memory files (memory/*.md) are loaded into every conversation automatically
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
      return 'Current canvas state:\nThe canvas is currently empty.';
    }

    const nodeLines = graph.nodes.map(
      (n) => `  - [${n.id}] ${n.type} "${n.label}"`,
    );
    const edgeLines = graph.edges.map(
      (e) => `  - [${e.id}] ${e.source} -> ${e.target} (${e.relation_type})`,
    );

    return [
      'Current canvas state:',
      `Nodes (${graph.nodes.length}):`,
      ...nodeLines,
      `Edges (${graph.edges.length}):`,
      ...edgeLines,
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

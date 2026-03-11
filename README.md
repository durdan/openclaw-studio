# OpenClaw Studio

A standalone design-time visual designer for OpenClaw-native agent systems. Build multi-agent architectures visually, configure agents using the real SOUL.md specification, and publish workspace files ready for `openclaw gateway start`.

**This is a design tool, not a runtime.** It generates the workspace files that OpenClaw reads at startup.

## What It Does

```
┌─────────────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│   Visual Designer   │────▶│  Workspace Files  │────▶│  OpenClaw Gateway   │
│   (this app)        │     │  ~/.openclaw/     │     │  localhost:18789    │
│                     │     │  workspace/       │     │                     │
│  - Drag agent nodes │     │  - AGENTS.md      │     │  Reads workspace    │
│  - Configure SOUL   │     │  - agents/*/      │     │  files as system    │
│  - Add skills/tools │     │    SOUL.md        │     │  prompt for each    │
│  - Validate graph   │     │  - skills/*/      │     │  agent              │
│  - Publish          │     │    SKILL.md       │     │                     │
└─────────────────────┘     │  - HEARTBEAT.md   │     └─────────────────────┘
                            │  - gateway.toml   │
                            └──────────────────┘
```

## Quick Start

### Prerequisites

- Node.js 18+
- npm 9+

### Install and Run

```bash
# Install dependencies
npm install

# Terminal 1: Start backend (port 4000)
npm run dev:backend

# Terminal 2: Start frontend (port 3000)
cd packages/frontend && npx next dev
```

Backend requires a `.env` file at `packages/backend/.env`:

```env
OPENROUTER_API_KEY=your-key-here
OPENROUTER_MODEL=google/gemini-2.5-flash
PORT=4000
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## How It Works

### 1. Design

Type a use case prompt (e.g., "Build a content marketing team with SEO and social media"). The AI planner generates 3-6 specialized agents with full OpenClaw configuration, laid out on a visual canvas.

Each agent node on the canvas shows its model and tools inline. Click any node to edit its full configuration in the properties panel.

### 2. Configure

The properties panel matches the real OpenClaw SOUL.md specification:

- **Core Identity** - Role, personality, communication style
- **Responsibilities** - What this agent is responsible for
- **Behavioral Guidelines** - Do rules / Don't rules
- **Handoffs** - @mention patterns for agent-to-agent delegation
- **Model Settings** - Model, temperature, timeout, max tokens
- **Tools & Skills** - What this agent can use
- **SOUL.md Preview** - Live markdown preview of the generated file

### 3. Validate

14 validation rules check the graph before export:
- Agents must have name, role, and goal
- Skills must have a purpose
- Tools must have a binding name and type
- No orphan agents or disconnected tools
- Reused assets must reference existing assets
- Graph must contain at least one agent

### 4. Publish

Three export targets write workspace files that OpenClaw reads directly:

| Target | What It Does |
|--------|-------------|
| **OpenClaw Bundle** | Returns workspace files as JSON (preview/download) |
| **Filesystem** | Writes files directly to `~/.openclaw/` (workspace dirs + openclaw.json) |
| **Git** | Commits workspace files to a Git repo |

## Generated Workspace Structure

When you publish, the Studio generates files matching the real OpenClaw multi-agent layout. Each agent gets its own workspace directory, with a central `openclaw.json` for configuration:

```
~/.openclaw/
├── openclaw.json                          # Central config (agents, models, bindings)
├── workspace/                             # First agent (default)
│   ├── SOUL.md                            # Persona, tone, behavioral boundaries
│   ├── AGENTS.md                          # Operating instructions & workflows
│   ├── IDENTITY.md                        # Agent name & emoji
│   ├── TOOLS.md                           # Tool notes & conventions
│   ├── USER.md                            # Owner info template
│   ├── MEMORY.md                          # Long-term memory
│   ├── HEARTBEAT.md                       # Heartbeat checklist (if configured)
│   └── skills/
│       └── keyword-research/
│           └── SKILL.md                   # YAML frontmatter + prompt
├── workspace-seo-specialist/              # Second agent
│   ├── SOUL.md
│   ├── AGENTS.md
│   ├── IDENTITY.md
│   ├── TOOLS.md
│   ├── USER.md
│   ├── MEMORY.md
│   └── skills/
└── workspace-social-media-manager/        # Third agent
    ├── SOUL.md
    └── ...
```

### openclaw.json (Central Config)

```json
{
  "agents": {
    "defaults": {
      "model": { "primary": "claude-sonnet-4-20250514" }
    },
    "list": [
      {
        "id": "content-strategist",
        "default": true,
        "name": "Content Strategist",
        "workspace": "~/.openclaw/workspace"
      },
      {
        "id": "seo-specialist",
        "name": "SEO Specialist",
        "workspace": "~/.openclaw/workspace-seo-specialist"
      }
    ]
  },
  "bindings": [
    { "agentId": "content-strategist", "match": { "channel": "telegram" } }
  ]
}
```

### SOUL.md (Informal Personality Prompt — No Headers)

SOUL.md is a **raw personality prompt** written in lowercase. This is the official OpenClaw convention — it signals "who I am", not structured config.

```
you are analytical, data-driven, and creative. you communicate in clear,
structured, actionable language. you always base decisions on data and
analytics. you always align content with business objectives. you never
publish without seo review. you never ignore audience engagement metrics.
```

### AGENTS.md (Structured Operating Instructions)

AGENTS.md is the formal "user manual" with markdown headers — role, mission, capabilities, rules.

```markdown
# Content Strategist

## Role
You are Content Strategist, a senior content strategy lead.

## Mission
Plan and execute content strategy that drives organic traffic growth.

## Capabilities
- Develop monthly content calendars
- Coordinate with SEO and social teams
- Track content performance metrics

## Skills
- keyword-research
- content-calendar

## Tools
- firecrawl-cli

## Rules
- Always base decisions on data and analytics
- Always align content with business objectives
- Never publish without SEO review

## Coordination
- @seo-specialist for keyword research
- @social-media-manager for distribution
```

### SKILL.md (Only File with YAML Frontmatter)

```markdown
---
name: keyword-research
description: Research and analyze keywords for content optimization
user-invocable: true
---

# keyword-research

Analyze search volume, competition, and relevance for target keywords.
```

## Architecture

```
openclaw-studio/
├── packages/
│   ├── shared/          # TypeScript types shared between frontend & backend
│   │   └── src/schemas/ # Node configs, graph, export bundle, validation types
│   │
│   ├── backend/         # Express API server (port 4000)
│   │   └── src/
│   │       ├── routes/      # REST endpoints
│   │       ├── services/    # Business logic
│   │       ├── adapters/    # Export adapters (filesystem, openclaw-bundle, git)
│   │       └── db/          # SQLite via better-sqlite3
│   │
│   └── frontend/        # Next.js 14 app (port 3000)
│       └── src/
│           ├── components/
│           │   ├── canvas/      # React Flow canvas + 10 node types
│           │   ├── properties/  # Node config editors (SOUL.md-aligned)
│           │   ├── chat/        # AI assistant panel
│           │   ├── sidebar/     # Design list, templates, asset browser
│           │   ├── output/      # Validation, export preview, reports
│           │   └── prompt/      # Use case prompt input
│           ├── store/           # Zustand stores (canvas, design, chat)
│           ├── hooks/           # Custom React hooks
│           └── lib/             # API client, constants
└── data/                # SQLite database (auto-created)
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, React Flow v12, Zustand, Tailwind CSS |
| Backend | Express, SQLite (better-sqlite3), TypeScript |
| AI | OpenRouter API (configurable model) |
| Monorepo | npm workspaces |

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/designs | List all designs |
| POST | /api/designs | Create a design |
| GET | /api/designs/:id | Get a design |
| PUT | /api/designs/:id | Update a design |
| DELETE | /api/designs/:id | Delete a design |
| GET | /api/designs/:id/versions | List versions |
| POST | /api/designs/:id/versions | Save a version |
| POST | /api/planner/generate | Generate architecture from prompt |
| POST | /api/planner/refine | Refine existing architecture |
| POST | /api/validation/validate | Validate a graph |
| GET | /api/validation/rules | List validation rules |
| POST | /api/export/bundle | Generate export bundle |
| POST | /api/publish | Publish via adapter |
| GET | /api/publish/targets | List export targets |
| POST | /api/chat/sessions | Create chat session |
| POST | /api/chat/sessions/:id/messages | Send chat message |
| GET | /api/health | Health check |

### Node Types

| Type | Purpose | Key Config Fields |
|------|---------|-------------------|
| Agent | AI agent with SOUL.md | role, personality, responsibilities, do/don't rules, handoffs, model |
| Skill | Capability with SKILL.md frontmatter | name, purpose, prompt, input/output schema |
| Tool | External tool binding | tool_type, binding_name, allowed_actions |
| Trigger | Event/schedule/manual trigger | trigger_type, source, schedule |
| Condition | Branching logic | expression_summary |
| Approval | Human-in-the-loop gate | reviewer_type, rationale |
| Output | Result destination | output_type, destination |
| Workspace | Workspace metadata | notes, template_ref |
| Heartbeat | Periodic check-in config | mode, schedule, purpose |
| TemplateReference | Reference to a template | notes |

## Publishing to OpenClaw

OpenClaw has no deployment API. The workspace is just files on disk that the gateway reads at startup. The Studio generates `openclaw.json` + per-agent workspace directories.

### Local Machine (Same Machine as Gateway)

```bash
# 1. Publish from Studio using the "Filesystem" target
#    Default output_dir: ~/.openclaw/
#    This writes openclaw.json + workspace/ + workspace-<agent>/ directories

# 2. Restart the gateway to pick up changes
openclaw restart

# The gateway reads openclaw.json, finds each agent's workspace path,
# loads SOUL.md + AGENTS.md + TOOLS.md as the system prompt,
# and starts serving on port 18789.
```

### Remote Server

Use the **Git** export target:

1. Push workspace files to a Git repo
2. On the server: `git pull` to `~/.openclaw/`, then `openclaw restart`
3. Or set up a CI/CD pipeline that deploys on push

### How OpenClaw Uses the Files

When the gateway starts, for each agent in `openclaw.json`:

1. Reads `SOUL.md` — injected as persona/boundaries in the system prompt
2. Reads `AGENTS.md` — operating instructions, workflows, priorities
3. Reads `TOOLS.md` — available tools and conventions
4. Reads `IDENTITY.md` — agent name and emoji
5. Reads `USER.md` — owner info and preferences
6. Reads `HEARTBEAT.md` — periodic check-in checklist (if present)
7. Reads `MEMORY.md` — curated long-term memory
8. Loads skills from `skills/` directory (SKILL.md with YAML frontmatter)

All workspace files are injected into "Project Context" each turn (per-file limit: 20,000 chars, total: 150,000 chars). Updating a SOUL.md is picked up on the next agent session.

## Development

```bash
# Type-check all packages
npx tsc --noEmit -p packages/shared/tsconfig.json
npx tsc --noEmit -p packages/backend/tsconfig.json
npx tsc --noEmit -p packages/frontend/tsconfig.json

# Build all packages
npm run build

# Format code
npm run format
```

### Database

SQLite database is auto-created at `data/openclaw-studio.db` on first backend start. Migrations run automatically. The database stores designs, versions, templates, assets, export targets, and publish run history.

5 architecture templates are seeded on first run (coordinator, pipeline, peer-to-peer, hub-spoke, event-driven).

## License

Private

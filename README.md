# OpenClaw Studio

A visual designer for OpenClaw AI agent systems. Describe your use case in plain English, and the Studio generates fully configured agents ready to publish directly to a running OpenClaw Gateway.

**Design-time only** — generates workspace files that OpenClaw reads at startup. Publishes via Gateway WebSocket RPC.

```
┌─────────────────────┐         ┌─────────────────────┐
│   OpenClaw Studio   │──WS────▶│  OpenClaw Gateway   │
│                     │  RPC    │                     │
│  Landing Page       │         │  agents.create      │
│  ─▶ AI Chat         │         │  agents.files.set   │
│  ─▶ Canvas          │         │  skills.install     │
│  ─▶ Properties      │         │  config.patch       │
│  ─▶ Publish         │         │  chat.send (wake)   │
│                     │         │                     │
└─────────────────────┘         └─────────────────────┘
```

## Features

- **AI-powered design** — Describe your use case, get 3-6 specialized agents with full OpenClaw configuration
- **8 real-world templates** — Email Intelligence, DevOps Automation, Brain & Hands, Compliance Monitor, Marketing Growth, Data Analytics, Multi-Agent Full Stack, Business Ops
- **ClawHub skill browser** — Search 45,000+ community skills from ClawHub registry, auto-install on publish
- **Gateway WebSocket RPC publishing** — Direct publish to a running gateway with Ed25519 device auth or token auth
- **Smart re-publish** — Preserves USER.md and MEMORY.md on re-publish, skips config.patch if unchanged
- **Light/dark theme** — Toggle via sidebar, persisted in localStorage
- **14 validation rules** — Pre-publish gate blocks errors, shows warnings
- **Live file preview** — Browse all generated workspace files before publishing

## Quick Start

### Prerequisites

- Node.js 18+ and npm 9+
- An [OpenRouter](https://openrouter.ai/) API key
- An OpenClaw Gateway (for publishing)

### Install and Run

```bash
git clone https://github.com/durdan/openclaw-studio.git
cd openclaw-studio
npm install
```

Create `packages/backend/.env`:

```env
OPENROUTER_API_KEY=your-key-here
OPENROUTER_MODEL=google/gemini-2.5-flash
PORT=4000
```

Start in two terminals:

```bash
# Terminal 1: Backend (port 4000)
npm run dev:backend

# Terminal 2: Frontend (port 3000)
cd packages/frontend && npx next dev
```

Open [http://localhost:3000](http://localhost:3000).

## How It Works

### 1. Start from Landing Page

Choose your starting point:
- **AI prompt** — Describe your use case in plain English
- **Templates** — Pick from 8 real-world architecture templates based on production OpenClaw deployments
- **Blank canvas** — Start from scratch

### 2. Design with AI Chat

The AI generates 3-6 specialized agents with full OpenClaw configuration:

> "Build a customer support team with ticket triage and escalation"

Refine by continuing the conversation:

> "Add a knowledge base agent" · "Change Aura's model to MiniMax M2.1" · "Give Echo a firecrawl-cli tool"

### 3. Configure & Browse Skills

Click any node on the canvas to open the properties panel:

- **AGENTS.md** — Name, role, goal, capabilities, responsibilities, do/don't rules
- **SOUL.md** — Structured personality (## Core Truths, ## Boundaries, ## Vibe, ## Continuity)
- **Skills** — Browse ClawHub registry to search and attach real community skills
- **Channel Binding** — Telegram, WhatsApp, Discord, Slack, WebSocket
- **Model** — Primary + fallback model selection
- **Handoffs** — `@agent-name` delegation patterns
- **LLM Settings** — Temperature, max tokens, timeout

### 4. Validate

14 rules check agents, skills, tools, heartbeats, and graph structure:

- **Automatic** — 2 seconds after graph changes, updates colored dots on nodes
- **Manual** — Click Validate in the floating bar
- **Pre-publish gate** — Errors block publishing

### 5. Publish to Gateway

Publishes directly to a running OpenClaw Gateway via WebSocket RPC:

1. **agents.create** — Create workspace directories on gateway
2. **agents.update** — Register agent metadata
3. **agents.files.set** — Push SOUL.md, AGENTS.md, IDENTITY.md, TOOLS.md, HEARTBEAT.md (preserves USER.md + MEMORY.md on re-publish)
4. **skills.install** — Install ClawHub skills per-agent
5. **config.patch** — Update openclaw.json (agents list, bindings, `tools.exec.host: "gateway"`, channel defaults). Skipped if unchanged to avoid token rotation.
6. **sessions.patch + chat.send** — Wake agents with bootstrap instructions

Authentication supports Ed25519 device keys (`~/.openclaw/identity/device.json`) or token-based auth.

## Templates

8 architecture templates based on real OpenClaw production use cases:

| Template | Agents | Description |
|----------|--------|-------------|
| Email Intelligence | 3 | Inbox monitoring across 10 mailboxes, triage, auto-response |
| DevOps Automation | 3 | Sentry alerts → diagnose → fix PR pipeline |
| Brain & Hands | 2 | OpenClaw reasoning + n8n execution split |
| Compliance Monitor | 3 | Playwright + AI regulatory assessment |
| Marketing Growth | 3 | 7-platform social, SEO, competitor intel |
| Data Analytics | 3 | KPI dashboards, expense tracking, anomaly detection |
| Multi-Agent Full Stack | 3 | Inbox + Neo + Pulse with cross-agent routing |
| Business Ops | 3 | Morning briefs, calendar, tasks, expenses |

Each template includes real skills (email-cli, github-cli, browser-automation, firecrawl-cli, etc.), tools, and handoff patterns.

## ClawHub Skill Browser

Search and attach skills from the ClawHub registry (45,000+ community skills):

1. Click **Browse ClawHub** on any skill node
2. Search by keyword (email, github, scraping, etc.)
3. Click a skill to auto-fill name, description, and tags
4. On publish, Studio calls `skills.install` RPC to install the skill on the gateway

Requires a running gateway connection for search. Skills are installed per-agent, not gateway-wide.

## Generated Files

```
~/.openclaw/
├── openclaw.json              # Central config (agents, models, bindings, tools.exec.host)
├── workspace/                 # First agent (default)
│   ├── SOUL.md               # Structured personality (## Core Truths, ## Boundaries, ## Vibe)
│   ├── AGENTS.md             # Operating manual (Role, Mission, Capabilities, Red Lines)
│   ├── IDENTITY.md           # Self-identity (name, creature, vibe, emoji)
│   ├── TOOLS.md              # Local environment notes
│   ├── USER.md               # About the human owner (preserved on re-publish)
│   ├── MEMORY.md             # Long-term memory (preserved on re-publish)
│   ├── HEARTBEAT.md          # Periodic task checklist
│   └── skills/
│       └── email-cli/
│           └── SKILL.md      # YAML frontmatter + markdown prompt
├── workspace-agent2/          # Additional agents
│   └── (same structure)
└── ...
```

| File | Format | Purpose |
|------|--------|---------|
| **SOUL.md** | Structured markdown with `##` headers | Personality: Core Truths, Boundaries, Vibe, Continuity |
| **AGENTS.md** | Structured markdown | Operating manual: Role, Mission, Capabilities, Red Lines, Memory |
| **SKILL.md** | YAML frontmatter + markdown | Only file with frontmatter |
| **openclaw.json** | JSON | Agent list, model defaults, channel bindings, tools config |

## Architecture

```
openclaw-studio/
├── packages/
│   ├── shared/          # TypeScript types (node configs, graph, export types)
│   ├── backend/         # Express API (port 4000)
│   │   └── src/
│   │       ├── routes/      # REST endpoints + gateway skill proxy
│   │       ├── services/    # Business logic (planner, export, validation, gateway-rpc)
│   │       ├── adapters/    # Export adapters (gateway, openclaw-bundle, filesystem, git)
│   │       └── db/          # SQLite via better-sqlite3
│   └── frontend/        # Next.js 14 (port 3000)
│       └── src/
│           ├── components/
│           │   ├── canvas/      # React Flow canvas + node types
│           │   ├── properties/  # Node config editors + ClawHub skill browser
│           │   ├── chat/        # AI chat panel
│           │   ├── layout/      # Landing page, sidebar, theme toggle
│           │   └── export/      # Publish dialog with file browser
│           ├── store/           # Zustand stores (canvas, design, chat)
│           └── lib/             # API client, constants
├── docs/                # Documentation
│   ├── architecture.md  # Architecture with Mermaid diagrams
│   └── user-guide.md    # Step-by-step user guide
└── packages/backend/data/  # SQLite database (auto-created)
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, React Flow v12, Zustand, Tailwind CSS |
| Backend | Express, SQLite (better-sqlite3), TypeScript |
| AI | OpenRouter API (configurable model) |
| Gateway RPC | WebSocket protocol v3, Ed25519 device auth |
| Monorepo | npm workspaces |

## Documentation

- **[Architecture Guide](docs/architecture.md)** — System overview, data flows, Mermaid diagrams, API reference, validation rules
- **[User Guide](docs/user-guide.md)** — Step-by-step guide: design, configure, validate, publish

## Development

```bash
# Type-check all packages
npx tsc --noEmit -p packages/shared/tsconfig.json
npx tsc --noEmit -p packages/backend/tsconfig.json
npx tsc --noEmit -p packages/frontend/tsconfig.json

# Build
npm run build

# Format
npm run format
```

Database auto-creates at `packages/backend/data/openclaw-studio.db` on first backend start. 8 architecture templates are seeded on first run.

## License

Private

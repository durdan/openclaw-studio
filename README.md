# OpenClaw Studio

A visual designer for OpenClaw AI agent systems. Describe your use case in plain English, and the Studio generates fully configured agents ready to publish to OpenClaw.

**Design-time only** — generates workspace files that OpenClaw reads at startup.

```
┌─────────────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│   OpenClaw Studio   │────▶│  Workspace Files  │────▶│  OpenClaw Gateway   │
│                     │     │  ~/.openclaw/     │     │                     │
│  AI Chat ─▶ Canvas  │     │  workspace/       │     │  Reads files as     │
│  ─▶ Properties      │     │  - SOUL.md        │     │  system prompt for  │
│  ─▶ Publish         │     │  - AGENTS.md      │     │  each agent         │
│                     │     │  - skills/        │     │                     │
│                     │     │  openclaw.json    │     │  openclaw restart   │
└─────────────────────┘     └──────────────────┘     └─────────────────────┘
```

## Quick Start

### Prerequisites

- Node.js 18+ and npm 9+
- An [OpenRouter](https://openrouter.ai/) API key

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

## Studio Layout

Three-panel layout inspired by CrewAI Studio:

```
┌──────────────┬──────────────────────────┬───────────────┐
│              │                          │               │
│   AI Chat    │        Canvas            │  Properties   │
│   (Left)     │       (Center)           │   (Right)     │
│              │                          │               │
│  - Describe  │  - Agent nodes           │  - AGENTS.md  │
│  - Refine    │  - Visual layout         │  - SOUL.md    │
│  - Iterate   │  - Validate / Publish    │  - Model      │
│              │                          │  - Tools      │
│              │                          │  - Bindings   │
└──────────────┴──────────────────────────┴───────────────┘
```

| Panel | Purpose |
|-------|---------|
| **Chat** (left, 400px) | AI-powered builder. Describe your use case, refine agents. Always visible. |
| **Canvas** (center, flex) | Visual layout of your agent team. Floating Validate + Publish bar. |
| **Properties** (right, 340px) | Edit agent config. Appears when you click a node. |

## How It Works

### 1. Design with AI Chat

Type a use case — the AI generates 3-6 specialized agents with full OpenClaw configuration:

> "Build a customer support team with ticket triage and escalation"

Refine by continuing the conversation:

> "Add a knowledge base agent" · "Change Aura's model to MiniMax M2.1" · "Give Echo a firecrawl-cli tool"

### 2. Configure

Click any agent on the canvas to open the properties panel:

- **AGENTS.md** — Name, role, goal, capabilities, rules
- **SOUL.md** — Informal lowercase personality prompt
- **Channel Binding** — Telegram, WhatsApp, Discord, Slack, WebSocket
- **Model** — Primary + fallback model selection
- **Tools & Skills** — Tool bindings and skill references
- **Handoffs** — `@agent-name` delegation patterns
- **LLM Settings** — Temperature, max tokens, timeout

### 3. Validate

14 rules check your design: agents need names/roles/goals, skills need purposes, tools need bindings, graph needs at least one agent.

### 4. Publish

1. **Generate Preview** — browse all workspace files before publishing
2. **Publish to OpenClaw** — writes files to `~/.openclaw/` (configurable)
3. **Download Files** — download workspace files for manual deployment
4. Run `openclaw restart` to pick up changes

## Key Concept: Agents Are Independent

OpenClaw agents don't form a pipeline. Each agent is a **fully isolated brain** with its own workspace directory. They coordinate via:

- **Channel bindings** in `openclaw.json` — route messages to specific agents
- **Handoffs** via `@agent-name` mentions in AGENTS.md
- **No edges needed** on the canvas — agents sit independently

## Generated Files

```
~/.openclaw/
├── openclaw.json              # Central config (agents, models, bindings)
├── workspace/                 # First agent (default)
│   ├── SOUL.md               # Lowercase personality prompt
│   ├── AGENTS.md             # Structured operating instructions
│   ├── IDENTITY.md           # Agent name & role
│   ├── TOOLS.md              # Tool bindings
│   ├── USER.md               # Owner info
│   ├── MEMORY.md             # Long-term memory
│   └── skills/
│       └── keyword-research/
│           └── SKILL.md      # YAML frontmatter + prompt
├── workspace-echo/            # Second agent
│   ├── SOUL.md
│   ├── AGENTS.md
│   └── ...
└── workspace-sentinel/        # Third agent
```

### File Formats

| File | Format | Purpose |
|------|--------|---------|
| **SOUL.md** | Lowercase prose, no headers | Personality: "you are analytical, data-driven..." |
| **AGENTS.md** | Structured markdown (`##` headers) | Role, Mission, Capabilities, Rules, Coordination |
| **SKILL.md** | YAML frontmatter + markdown | Only file with frontmatter |
| **openclaw.json** | JSON | Agent list, model defaults, channel bindings |

## Architecture

```
openclaw-studio/
├── packages/
│   ├── shared/          # TypeScript types (node configs, graph, export types)
│   ├── backend/         # Express API (port 4000)
│   │   └── src/
│   │       ├── routes/      # REST endpoints
│   │       ├── services/    # Business logic (planner, export, validation)
│   │       ├── adapters/    # Export adapters (filesystem, openclaw-bundle)
│   │       └── db/          # SQLite via better-sqlite3
│   └── frontend/        # Next.js 14 (port 3000)
│       └── src/
│           ├── components/
│           │   ├── canvas/      # React Flow canvas + node types
│           │   ├── properties/  # Node config editors
│           │   ├── chat/        # AI chat panel
│           │   └── export/      # Publish dialog with file browser
│           ├── store/           # Zustand stores (canvas, design, chat)
│           └── lib/             # API client, constants
├── docs/                # Documentation
│   ├── architecture.md  # Architecture with Mermaid diagrams
│   └── user-guide.md    # Step-by-step user guide
└── data/                # SQLite database (auto-created)
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, React Flow v12, Zustand, Tailwind CSS |
| Backend | Express, SQLite (better-sqlite3), TypeScript |
| AI | OpenRouter API (configurable model) |
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

Database auto-creates at `data/openclaw-studio.db` on first backend start. 5 architecture templates are seeded on first run.

## License

Private

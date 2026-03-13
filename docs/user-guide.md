# OpenClaw Studio — User Guide

## Prerequisites

- **Node.js 18+** and **npm 9+**
- An **OpenRouter API key** (for AI chat and planner features)
- An **OpenClaw Gateway** running (for publishing and ClawHub skill search)

---

## Installation

```bash
# Clone the repository
git clone https://github.com/durdan/openclaw-studio.git
cd openclaw-studio

# Install all dependencies (monorepo)
npm install
```

---

## Configuration

Create `packages/backend/.env`:

```env
OPENROUTER_API_KEY=your-openrouter-key-here
OPENROUTER_MODEL=google/gemini-2.5-flash
PORT=4000
```

Supported models via OpenRouter: Claude Sonnet/Opus, GPT-4o, Gemini 2.5 Flash/Pro, MiniMax M2.1, and more.

---

## Running the Studio

Open **two terminals**:

```bash
# Terminal 1: Start backend (port 4000)
npm run dev:backend

# Terminal 2: Start frontend (port 3000)
cd packages/frontend && npx next dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Studio Layout

The Studio opens to a **landing page** with three entry points:

1. **AI Prompt** — Describe your use case in plain English
2. **Templates** — Choose from 8 real-world architecture templates
3. **Blank Canvas** — Start from scratch

Once inside a design, you see a 3-panel layout:

```
┌──────┬──────────────────────────┬───────────────┐
│      │                          │               │
│ Side │        Canvas            │  Properties   │
│ bar  │       (Center)           │   (Right)     │
│      │                          │               │
│ Chat │  - Agent/Skill/Tool      │  - AGENTS.md  │
│ Nav  │    nodes                 │  - SOUL.md    │
│      │  - Visual layout         │  - Skills     │
│      │                          │  - Model      │
│ Theme│  [Validate] [Publish]    │  - Bindings   │
└──────┴──────────────────────────┴───────────────┘
```

| Panel | Purpose |
|-------|---------|
| **Sidebar** (left) | AI Chat, navigation, theme toggle (light/dark) |
| **Canvas** (center) | Visual layout of your agent team. Floating Validate + Publish bar. |
| **Properties** (right) | Edit node config. Appears when you click a node. |

Toggle between **light** and **dark** themes using the theme button in the sidebar.

---

## Step 1: Design Your Agent Team

### Using Templates (Quick Start)

Pick from 8 production-ready templates on the landing page:

- **Email Intelligence** — Inbox monitoring across 10 mailboxes
- **DevOps Automation** — Sentry alerts → diagnose → fix PR
- **Brain & Hands** — OpenClaw reasoning + n8n execution
- **Compliance Monitor** — Playwright + AI regulatory assessment
- **Marketing Growth** — 7-platform social, SEO, competitor intel
- **Data Analytics** — KPI dashboards, expense tracking
- **Multi-Agent Full Stack** — 3-agent system with cross-routing
- **Business Ops** — Morning briefs, calendar, tasks

Each template comes with pre-configured agents, skills, tools, and handoff patterns.

### Using AI Chat (Recommended)

The AI chat panel is the primary way to build custom workflows.

1. Type a use case description:
   > "Build a customer support team with ticket triage, response drafting, and escalation"

2. Click **Send** (or press Enter)

3. The AI will:
   - Analyze your use case
   - Generate 3-6 specialized agents
   - Place them on the canvas
   - Configure roles, skills, tools, and personality

4. **Refine** by continuing the conversation:
   > "Add a knowledge base agent that maintains FAQ documents"
   > "Change Aura's model to MiniMax M2.1"
   > "Give Echo a firecrawl-cli tool"

---

## Step 2: Configure Agents

Click any agent node on the canvas to open the **Properties Panel** on the right.

### Properties Sections

Each section maps to a real OpenClaw workspace file:

#### AGENTS.md (Operating Instructions)
- **Name** — Agent name (e.g., "Aura", "Echo", "Sentinel")
- **Goal / Mission** — What this agent does
- **Description** — Short description
- **Capabilities** — One per line. Maps to `## Capabilities` in AGENTS.md
- **Rules** — One per line. Maps to `## Rules` in AGENTS.md

#### SOUL.md (Personality)
- **Personality** — Structured markdown describing who the agent is
  > Generates `## Core Truths`, `## Boundaries`, `## Vibe`, `## Continuity` sections
- **Communication Style** — How the agent talks
- **Do rules** — Behaviors the agent always follows (maps to `## Boundaries`)
- **Don't rules** — Behaviors the agent never exhibits (maps to `## Boundaries`)

#### Channel Binding (openclaw.json)
- **Channel** — Telegram, WhatsApp, Discord, Slack, or WebSocket
- **Account ID** — Maps to a specific bot token or phone number
- **Default Agent** — Checkbox to make this the fallback agent

#### Model
- **Primary Model** — Claude Sonnet 4, GPT-4o, MiniMax M2.1, Gemini, etc.
- **Fallback Model** — Used when primary is unavailable

#### Tools & Skills
- **Tools** — One per line (e.g., Gmail, Telegram, GitHub, Slack)
- **Skills** — Browse ClawHub to search and attach real community skills (see below)

#### Handoffs (Coordination)
- **Handoff Rules** — How this agent delegates to others
  > Example: "When you need keyword data, ask @SEOAnalyst"

#### LLM Settings
- Temperature, Max Tokens, Timeout

#### File Previews
- **SOUL.md Preview** — See the generated lowercase personality prompt
- **AGENTS.md Preview** — See the structured operating instructions

---

## Step 3: Validate

Validation runs at **three points** in the workflow:

### Automatic Validation (After AI Changes)
Every time the AI generates or modifies agents on the canvas, validation runs automatically after a 2-second delay. You'll see validation dots appear on each node:

| Dot Color | Meaning |
|-----------|---------|
| Green | All checks passed |
| Yellow | Has warnings (non-blocking) |
| Red | Has errors (blocks publishing) |
| Gray | Not yet validated / incomplete |

### Manual Validation (Validate Button)
Click the **Validate** button in the floating bar at the bottom of the canvas. A toast notification shows the result:
- **Green toast**: "All validation checks passed"
- **Yellow toast**: "Valid with N warning(s)"
- **Red toast**: "N error(s), N warning(s)"

The Validate button also shows a live badge:
- Red count badge = number of errors
- Yellow count badge = number of warnings
- Green dot = all clear

### Pre-Publish Validation (Export Dialog)
When you open the Publish dialog, validation runs automatically. If there are errors:
- All errors and warnings are listed inline in the dialog
- **Generate Preview** and **Publish to OpenClaw** buttons are blocked
- You must fix errors before publishing (warnings are allowed)

### Validation Rules (14 Total)

| Rule | Severity | What it checks |
|------|----------|---------------|
| Agent has name | Error | Every agent needs a name |
| Agent has role | Error | Every agent needs a role |
| Agent has goal | Error | Every agent needs a goal/description |
| Skill has purpose | Error | Skills must describe their purpose |
| Skill has output | Warning | Skills should have output_schema |
| Tool has binding | Error | Tools need a binding name |
| Tool has type | Error | Tools need a tool_type |
| Heartbeat has schedule | Error | Heartbeat needs a schedule |
| Heartbeat has mode | Error | Heartbeat needs a mode |
| Approval has rationale | Warning | Approvals should explain why |
| Graph has agent | Error | At least one agent required |
| No orphan agents | Warning | Agents should have connections |
| No disconnected tools | Warning | Tools should connect to agent/skill |
| Reused asset ref | Error | Reuse mode 'existing' needs a reference |

---

## Step 3.5: Browse & Attach ClawHub Skills

Click any **Skill node** on the canvas to open its properties panel, then click **Browse ClawHub**:

1. Search by keyword (email, github, scraping, database, etc.)
2. Browse results showing name, description, version, and tags
3. Click a skill to auto-fill its configuration
4. The skill is marked with a green "ClawHub" badge
5. On publish, Studio calls `skills.install` RPC to install it on the gateway per-agent

> Requires a running gateway connection. You can also type skill names manually.

---

## Step 4: Publish to Gateway

Click the **Publish** button (floating bar on canvas).

### Validation Gate
The Publish dialog automatically validates your design. Errors block publishing.

### Preview Workspace Files

Click **Generate Preview** to browse all files before publishing:
```
workspace/
  SOUL.md, AGENTS.md, IDENTITY.md, TOOLS.md, USER.md, MEMORY.md, HEARTBEAT.md
workspace-agent2/
  (same structure)
openclaw.json
```

### Publish to Gateway (Recommended)

Studio publishes directly to a running OpenClaw Gateway via WebSocket RPC:

1. Configure gateway URL (e.g., `ws://localhost:18789`) and optional token
2. Click **Publish to Gateway**
3. Studio executes the full provisioning flow:
   - Creates agent workspaces
   - Pushes workspace files (skips USER.md + MEMORY.md on re-publish)
   - Installs ClawHub skills per-agent
   - Patches openclaw.json config (adds `tools.exec.host: "gateway"`)
   - Wakes agents with bootstrap instructions

Authentication uses Ed25519 device keys if available (`~/.openclaw/identity/device.json`), or falls back to token auth.

### Smart Re-publish

When publishing to a gateway where agents already exist:
- **USER.md and MEMORY.md are preserved** — won't overwrite data the agent has learned
- **Config patch is skipped if unchanged** — avoids gateway restarts that rotate agent tokens
- **tools.exec.host** is only set if not already configured

### Download Files
Click **Download Files** to download workspace files for manual deployment.

---

## Understanding OpenClaw Agents

### Key Concept: Agents Are Independent

In OpenClaw, each agent is a **fully isolated brain**. They don't form a pipeline or DAG. Instead:

- Each agent has its own **workspace directory** with separate files
- Agents are routed via **channel bindings** in `openclaw.json`
- Agents delegate via **handoffs** (mentioning `@agent-name` in AGENTS.md)
- Agent-to-agent messaging is **off by default**

This means your agents on the canvas **don't need to be connected with edges**. They sit independently, each configured with their own personality, skills, and channel binding.

### Generated File Structure

```
~/.openclaw/
├── openclaw.json                    # Central config
│
├── workspace/                       # First agent (default)
│   ├── SOUL.md                     # "you are precise, methodical..."
│   ├── AGENTS.md                   # ## Role, ## Mission, ## Rules
│   ├── IDENTITY.md                 # Name + Role
│   ├── TOOLS.md                    # Tool bindings
│   ├── USER.md                     # Owner info (fill in)
│   ├── MEMORY.md                   # Long-term memory
│   ├── HEARTBEAT.md                # Periodic checklist (if configured)
│   └── skills/
│       └── keyword-research/
│           └── SKILL.md            # YAML frontmatter + prompt
│
├── workspace-echo/                  # Second agent
│   ├── SOUL.md
│   ├── AGENTS.md
│   └── ...
│
└── workspace-sentinel/              # Third agent
    ├── SOUL.md
    ├── AGENTS.md
    └── ...
```

### File Formats

| File | Format | Purpose |
|------|--------|---------|
| **SOUL.md** | Structured markdown with `##` headers | Personality: Core Truths, Boundaries, Vibe, Continuity |
| **AGENTS.md** | Structured markdown with `##` headers | Operating manual: Role, Mission, Capabilities, Red Lines, Memory |
| **SKILL.md** | YAML frontmatter + markdown | Only file with frontmatter: `---\nname: ...\n---` |
| **openclaw.json** | JSON | Agent list, model defaults, channel bindings, tools config |
| **IDENTITY.md** | Markdown | Self-identity (name, creature, vibe, emoji, avatar) |
| **TOOLS.md** | Markdown | Local environment notes (not auto-managed bindings) |
| **USER.md** | Markdown | About the human owner (preserved on re-publish) |
| **MEMORY.md** | Markdown | Long-term curated memory (preserved on re-publish) |
| **HEARTBEAT.md** | Markdown | Periodic task checklist (empty = skip heartbeats) |

### Channel Bindings

Each agent can be bound to a messaging channel:

```json
{
  "bindings": [
    { "agentId": "aura", "match": { "channel": "telegram", "accountId": "support_bot" } },
    { "agentId": "echo", "match": { "channel": "whatsapp", "accountId": "response_bot" } }
  ]
}
```

Routing priority: peer > parentPeer > guildId+roles > guildId > teamId > accountId > channel > fallback (default agent).

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Enter` | Send chat message |
| `Shift + Enter` | New line in chat |
| `Ctrl/Cmd + E` | Open export dialog |
| `Escape` | Close properties panel |

---

## Tips

1. **Start with a template** — Pick the closest match from 8 real-world templates, then customize with AI chat.

2. **Browse ClawHub** — Use the skill browser to find real community skills instead of typing names manually.

3. **Set channel bindings** — Assign each agent to a channel (Telegram, WhatsApp, etc.) in the Channel Binding section.

4. **Preview before publishing** — Always use "Generate Preview" to inspect workspace files before pushing to gateway.

5. **Re-publish safely** — Studio preserves USER.md and MEMORY.md on re-publish, so your agent's learned data is safe.

6. **Agents don't need edges** — Unlike pipeline tools, OpenClaw agents are independent. Use handoffs for coordination.

7. **Gateway auto-wakes agents** — After publish, Studio sends a wakeup message to each agent automatically. No manual `openclaw restart` needed.

8. **Theme toggle** — Switch between light and dark themes using the toggle in the sidebar.

---

## Troubleshooting

### Backend won't start
- Check `packages/backend/.env` exists with `OPENROUTER_API_KEY`
- Ensure port 4000 is available: `lsof -i :4000`
- Check Node.js version: `node --version` (needs 18+)

### AI chat not responding
- Verify your OpenRouter API key is valid
- Check the backend console for error messages
- Try a different model in `.env`

### Export shows 500 error
- Ensure the backend is running on port 4000
- The design must have at least one agent node
- Check the backend terminal for the actual error message

### React Flow canvas is blank
- Resize the browser window (triggers re-render)
- Check browser console for errors
- Ensure the frontend is running on port 3000

### Gateway publish fails
- Verify the gateway is running and reachable at the configured URL
- Check the gateway URL format: `ws://localhost:18789` or `wss://host:18789`
- If using token auth, ensure `controlUi.allowInsecureAuth` is enabled on the gateway
- If using device auth, verify `~/.openclaw/identity/device.json` exists
- Check the backend terminal for detailed RPC error messages

### ClawHub skill search not working
- Skill search requires a running gateway connection
- The gateway proxies ClawHub searches — ensure the gateway has internet access
- You can still type skill names manually without search

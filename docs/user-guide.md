# OpenClaw Studio — User Guide

## Prerequisites

- **Node.js 18+** and **npm 9+**
- An **OpenRouter API key** (for AI chat and planner features)
- **OpenClaw** installed on the target machine (for publishing)

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

The Studio has a 3-panel layout inspired by CrewAI Studio:

```
┌──────────────┬──────────────────────────┬───────────────┐
│              │                          │               │
│   AI Chat    │        Canvas            │  Properties   │
│   (Left)     │       (Center)           │   (Right)     │
│              │                          │               │
│  - Build     │  - Agent nodes           │  - AGENTS.md  │
│  - Refine    │  - Skill nodes           │  - SOUL.md    │
│  - Iterate   │  - Visual layout         │  - Model      │
│              │                          │  - Tools      │
│  [Send]      │  [Validate] [Publish]    │  - Bindings   │
└──────────────┴──────────────────────────┴───────────────┘
```

| Panel | Width | Purpose |
|-------|-------|---------|
| **Left** | 400px | AI Chat — primary builder. Always visible. |
| **Center** | Flex | Canvas — visual layout of your agent team. |
| **Right** | 340px | Properties — appears when you click a node. |

---

## Step 1: Design Your Agent Team

### Using AI Chat (Recommended)

The AI chat panel on the left is the primary way to build workflows.

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

### Suggestion Cards

If you're not sure what to build, click one of the suggestion cards:
- "Build a customer support team with ticket triage and escalation"
- "Create a content marketing crew with SEO and social media"
- "Design a research agent that summarizes findings"
- "Set up a DevOps pipeline with monitoring and alerting"

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
- **Personality** — Informal lowercase prose describing how the agent communicates
  > Example: "you are precise, methodical, and concise. you don't over-explain."
- **Communication Style** — How the agent talks
- **Do rules** — Behaviors the agent always follows
- **Don't rules** — Behaviors the agent never exhibits

#### Channel Binding (openclaw.json)
- **Channel** — Telegram, WhatsApp, Discord, Slack, or WebSocket
- **Account ID** — Maps to a specific bot token or phone number
- **Default Agent** — Checkbox to make this the fallback agent

#### Model
- **Primary Model** — Claude Sonnet 4, GPT-4o, MiniMax M2.1, Gemini, etc.
- **Fallback Model** — Used when primary is unavailable

#### Tools & Skills
- **Tools** — One per line (e.g., Browser, FileSystem, Shell)
- **Skills** — One per line (e.g., firecrawl-cli, github-cli)

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

## Step 4: Publish to OpenClaw

Click the **Publish** button (floating bar on canvas, or upload icon in chat header).

### Validation Gate
The Publish dialog automatically validates your design on open. If errors exist, they are shown inline and the Publish/Preview buttons are disabled until you fix them.

### Preview Workspace Files

1. Click **Generate Preview** to see all files that will be created
2. Browse the file tree on the left:
   ```
   workspace/
     SOUL.md
     AGENTS.md
     IDENTITY.md
     TOOLS.md
     USER.md
     MEMORY.md
   workspace-echo/
     SOUL.md
     AGENTS.md
     ...
   openclaw.json
   ```
3. Click any file to see its content on the right

### Publish Options

#### Write to Filesystem (Recommended)
1. Set the output directory (default: `~/.openclaw`)
2. Click **Publish to OpenClaw**
3. Files are written directly to disk
4. Run `openclaw restart` to pick up changes

#### Download Files
Click **Download Files** to download all workspace files to your machine. Useful for reviewing before deploying to a remote server.

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
| **SOUL.md** | Lowercase prose, no headers | Personality prompt: "you are analytical, data-driven..." |
| **AGENTS.md** | Structured markdown with `##` headers | Operating instructions: Role, Mission, Capabilities, Rules |
| **SKILL.md** | YAML frontmatter + markdown | Only file with frontmatter: `---\nname: ...\n---` |
| **openclaw.json** | JSON | Agent list, model defaults, channel bindings |
| **IDENTITY.md** | Markdown | Agent name and role |
| **TOOLS.md** | Markdown | Tool binding notes |
| **USER.md** | Markdown | Owner preferences (fill in yourself) |
| **MEMORY.md** | Markdown | Long-term memory (curated over time) |

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

1. **Start with AI chat** — Describe your use case in plain English. The AI understands OpenClaw deeply and will generate proper agents.

2. **Click to configure** — After the AI generates agents, click each node to fine-tune the personality, tools, and rules.

3. **Set channel bindings** — Assign each agent to a channel (Telegram, WhatsApp, etc.) in the Channel Binding section.

4. **Preview before publishing** — Always use "Generate Preview" to inspect the workspace files before writing to disk.

5. **SOUL.md is lowercase** — This is an official OpenClaw convention. The personality prompt should be informal lowercase prose, not structured markdown.

6. **Agents don't need edges** — Unlike pipeline tools, OpenClaw agents are independent. Use handoffs for coordination.

7. **Run `openclaw restart`** — After publishing, restart the gateway to pick up the new workspace files.

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

### Published files not picked up by OpenClaw
- Verify files are in `~/.openclaw/` (check with `ls ~/.openclaw/`)
- Run `openclaw restart` after publishing
- Check `openclaw.json` has the correct workspace paths

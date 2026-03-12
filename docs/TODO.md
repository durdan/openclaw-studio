# OpenClaw Studio — TODO / Roadmap

## Completed

- [x] 3-panel layout (Chat / Canvas / Properties) inspired by CrewAI Studio
- [x] AI chat generates 3-6 specialized agents from use case description
- [x] Agent properties panel (AGENTS.md, SOUL.md, Model, Tools, Skills, Handoffs, LLM Settings)
- [x] Channel binding config (Telegram, WhatsApp, Discord, Slack, WebSocket)
- [x] Publish flow with file browser preview + filesystem write
- [x] 14 validation rules (agent, skill, tool, heartbeat, graph-level)
- [x] 3-tier validation: auto (2s debounce), manual (toast + badge), pre-publish gate
- [x] Validation dots on canvas nodes (green/yellow/red/gray)
- [x] LLM system prompt rewritten with accurate OpenClaw knowledge
- [x] Graph context includes agent config details (role, model, channel, skills)
- [x] Documentation: architecture (Mermaid diagrams), user guide, README

---

## Phase 6: Mission Control Integration

### Background

[OpenClaw Mission Control](https://github.com/abhi1693/openclaw-mission-control) is the runtime operations dashboard for OpenClaw (FastAPI + Next.js + Postgres). It connects to the OpenClaw Gateway via WebSocket RPC (port 18789, protocol v3) and manages agent lifecycle, sessions, tasks, approvals, and template sync.

Studio = design-time. Mission Control = runtime ops. They are complementary.

### Gateway WebSocket Protocol (Reference)

- Endpoint: `ws://host:18789` (or `wss://`)
- Auth: token-based or device identity (asymmetric key pairing)
- Message format: `{ type: "req", id: uuid, method: "...", params: {...} }`
- Response: `{ type: "res", id: uuid, ok: true/false, payload: {...} }`
- Protocol version: 3
- Scopes: `operator.read`, `operator.admin`, `operator.approvals`, `operator.pairing`

### Key Gateway RPC Methods

| Category | Methods |
|----------|---------|
| Agent lifecycle | `agents.list`, `agents.create`, `agents.update`, `agents.delete` |
| Workspace files | `agents.files.list`, `agents.files.get`, `agents.files.set` |
| Sessions | `sessions.list`, `sessions.patch`, `sessions.reset`, `sessions.delete` |
| Chat | `chat.send`, `chat.history`, `chat.abort` |
| Config | `config.get`, `config.set`, `config.patch`, `config.apply` |
| Heartbeat | `set-heartbeats`, `last-heartbeat`, `wake` |
| Cron | `cron.list`, `cron.add`, `cron.update`, `cron.remove` |
| Skills | `skills.status`, `skills.install`, `skills.update` |

### Integration Path A: Gateway Direct (Priority)

Publish directly to a running OpenClaw Gateway via WebSocket RPC — no Mission Control needed. Best for solo users and quick deploy.

- [ ] **Gateway connection settings UI** — Gateway URL (`ws://localhost:18789`), auth token, allow insecure TLS toggle
- [ ] **Gateway WebSocket client** (backend) — Implement RPC client matching protocol v3 (connect, send req, await res)
- [ ] **Gateway publish adapter** — New `GatewayAdapter` that:
  - Calls `agents.create` for new agents (or `agents.update` for existing)
  - Calls `agents.files.set` for each workspace file (SOUL.md, AGENTS.md, IDENTITY.md, TOOLS.md, USER.md, MEMORY.md, HEARTBEAT.md)
  - Calls `config.patch` to update openclaw.json agent list + bindings
  - Calls `set-heartbeats` for agents with heartbeat config
  - Calls `wake` to reload agent config
- [ ] **Gateway status check** — `health` RPC call to verify connectivity before publish
- [ ] **Publish dialog: "Push to Gateway" option** — alongside existing Filesystem and Download options
- [ ] **Live agent list from gateway** — Call `agents.list` to show which agents already exist on the gateway, enable update vs create

### Integration Path B: Mission Control API

Publish through Mission Control's REST API — for teams using MC for operations.

- [ ] **MC connection settings UI** — MC API URL (`http://localhost:8000`), auth token (bearer), organization ID
- [ ] **MC publish adapter** — New `MissionControlAdapter` that:
  - Calls `POST /api/v1/agents` to create agents (maps Studio agent → MC agent model)
  - Calls `PATCH /api/v1/agents/{id}` to update agent templates (soul_template, identity_template, identity_profile)
  - Calls `POST /api/v1/gateways/{id}/templates/sync` to bulk provision
  - Maps Studio channel bindings → MC gateway bindings
- [ ] **MC gateway selector** — Fetch available gateways via `GET /api/v1/gateways`, let user pick target
- [ ] **Board integration** — Optionally assign agents to MC boards during publish
- [ ] **Publish dialog: "Push to Mission Control" option**

### Integration Path C: Import from Gateway/MC

- [ ] **Import agents from gateway** — Call `agents.list` + `agents.files.get` to pull existing agent configs into Studio for editing
- [ ] **Import from Mission Control** — Call `GET /api/v1/agents` to pull MC-managed agents into Studio canvas
- [ ] **Round-trip editing** — Edit existing agents in Studio, push changes back

---

## Phase 7: Enhanced Studio Features

- [ ] **Session viewer** — Connect to gateway, show live chat sessions per agent (via `chat.history`)
- [ ] **Cron job designer** — Visual cron schedule builder, push via `cron.add` RPC
- [ ] **Skill browser** — Browse and install skills from OpenClaw skill repo (`skills.install` RPC)
- [ ] **Agent testing** — Send test message to agent via `chat.send`, show response in Studio
- [ ] **Template library** — Save/load agent configurations as reusable templates
- [ ] **Multi-gateway** — Manage multiple gateway connections, publish different agents to different gateways
- [ ] **Diff view** — Before publish, show diff between current gateway state and Studio design

---

## Phase 8: Production Readiness

- [ ] **Persistent sessions** — Save chat sessions to DB (currently in-memory)
- [ ] **User authentication** — Login, user accounts, design ownership
- [ ] **Design versioning** — Version history with diff and rollback
- [ ] **Collaborative editing** — Multiple users editing same design
- [ ] **Export to Git** — Push workspace files to a Git repo (adapter exists but needs testing)
- [ ] **CI/CD integration** — GitHub Actions / webhook to auto-publish on merge

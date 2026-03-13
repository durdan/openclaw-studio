# OpenClaw Studio — Architecture

## System Overview

OpenClaw Studio is a **design-time visual designer** for OpenClaw multi-agent systems. It generates workspace files (`SOUL.md`, `AGENTS.md`, `openclaw.json`, etc.) that the OpenClaw gateway reads at startup. **It is not a runtime.**

```mermaid
graph LR
    subgraph Studio ["OpenClaw Studio (Design Time)"]
        UI[Visual Designer<br/>Next.js + React Flow]
        API[Backend API<br/>Express + SQLite]
        UI -->|REST API| API
    end

    subgraph Runtime ["OpenClaw Gateway (Runtime)"]
        GW[Gateway Core<br/>Message Router]
        AG1[Agent 1]
        AG2[Agent 2]
        GW --> AG1
        GW --> AG2
    end

    API -->|"WebSocket RPC<br/>agents.files.set<br/>skills.install<br/>config.patch"| Runtime
```

---

## High-Level Architecture

```mermaid
graph TB
    subgraph Frontend ["packages/frontend (Next.js 14, port 3000)"]
        Chat[Chat Panel<br/>AI Builder]
        Canvas[React Flow Canvas<br/>Agent Nodes]
        Props[Properties Panel<br/>OpenClaw Config]
        Export[Export Dialog<br/>File Preview + Publish]

        Chat -->|workflow_action| Canvas
        Canvas -->|node select| Props
        Canvas -->|publish| Export
    end

    subgraph Stores ["Zustand Stores"]
        DS[Design Store<br/>activeDesign, graph]
        CS[Chat Store<br/>sessions, messages]
        CAS[Canvas Store<br/>selection, node ops]
    end

    subgraph Backend ["packages/backend (Express, port 4000)"]
        Routes[REST Routes]
        Services[Services Layer]
        Adapters[Export Adapters]
        DB[(SQLite)]

        Routes --> Services
        Services --> DB
        Services --> Adapters
    end

    subgraph Shared ["packages/shared"]
        Types[TypeScript Types<br/>Graph, NodeConfig, ExportBundle]
    end

    Frontend --> Stores
    Stores -->|HTTP| Routes
    Frontend -.->|imports| Types
    Backend -.->|imports| Types

    subgraph External ["External"]
        OR[OpenRouter API<br/>LLM Provider]
    end

    Services -->|chat, planner| OR
```

---

## Data Flow

### 1. AI Chat → Canvas Flow

```mermaid
sequenceDiagram
    participant User
    participant ChatPanel
    participant ChatStore
    participant Backend as Chat Service
    participant OpenRouter as OpenRouter API
    participant DesignStore
    participant Canvas

    User->>ChatPanel: "Build a support team"
    ChatPanel->>ChatStore: sendMessageStream()
    ChatStore->>Backend: POST /api/chat/sessions/:id/stream
    Backend->>Backend: Build messages + graph context
    Backend->>OpenRouter: POST chat/completions (stream)
    OpenRouter-->>Backend: SSE chunks
    Backend-->>ChatStore: SSE: text deltas + workflow_action
    ChatStore->>ChatStore: Parse workflow_action JSON
    ChatStore->>ChatPanel: Display message
    ChatPanel->>DesignStore: applyWorkflowAction()
    DesignStore->>Canvas: Update graph (nodes + edges)
    Canvas->>Canvas: Re-render agent cards
```

### 2. Publish Flow

```mermaid
sequenceDiagram
    participant User
    participant ExportDialog
    participant API as Backend API
    participant ExportSvc as Export Service
    participant Adapter as OpenClaw Bundle Adapter
    participant FS as Filesystem

    User->>ExportDialog: Click "Publish"
    ExportDialog->>API: POST /api/publish/preview {graph}
    API->>ExportSvc: generateBundle(design)
    ExportSvc->>ExportSvc: Extract agents, skills, tools
    ExportSvc->>ExportSvc: Validate graph (14 rules)
    ExportSvc->>Adapter: translate(bundle)
    Adapter->>Adapter: Generate SOUL.md, AGENTS.md, etc.
    Adapter-->>ExportDialog: {files, openclaw_json}
    ExportDialog->>ExportDialog: Show file browser preview

    User->>ExportDialog: Click "Publish to Gateway"
    ExportDialog->>API: POST /api/publish {graph, target: gateway}
    API->>Adapter: GatewayAdapter.publish()
    Adapter->>GW: agents.create + agents.update (per agent)
    Adapter->>GW: agents.files.set (SOUL.md, AGENTS.md, etc.)
    Note over Adapter: Skips USER.md + MEMORY.md on re-publish
    Adapter->>GW: skills.install (ClawHub skills per agent)
    Adapter->>GW: config.patch (agents list, bindings, tools.exec.host)
    Note over Adapter: Skipped if config unchanged
    Adapter->>GW: sessions.patch + chat.send (wake agents)
    GW-->>ExportDialog: Success (N agents, M files)
```

---

## Backend Architecture

### Route → Service → Adapter Stack

```mermaid
graph LR
    subgraph Routes
        R1[/api/designs]
        R2[/api/planner]
        R3[/api/chat]
        R4[/api/validation]
        R5[/api/publish]
        R6[/api/export]
    end

    subgraph Services
        S1[Design Service]
        S2[Planner Service]
        S3[Chat Service]
        S4[Validation Service]
        S5[Export Service]
    end

    subgraph Adapters
        A1[Filesystem Adapter]
        A2[OpenClaw Bundle Adapter]
        A3[Git Adapter]
        A4[Gateway Direct Adapter]
    end

    subgraph GatewayRPC ["Gateway WebSocket RPC"]
        GW[Gateway WS Client<br/>Protocol v3]
    end

    R1 --> S1
    R2 --> S2
    R3 --> S3
    R4 --> S4
    R5 --> S5
    R6 --> S5

    S5 --> A1
    S5 --> A2
    S5 --> A3
    S5 --> A4

    A1 -->|delegates| A2
    A3 -->|delegates| A1
    A4 -->|delegates| A2
    A4 -->|"agents.files.set<br/>skills.install<br/>config.patch"| GW

    S1 --> DB[(SQLite)]
    S3 --> OR[OpenRouter API]
    S2 --> OR
```

### API Endpoints

| Method | Path | Service | Description |
|--------|------|---------|-------------|
| GET | `/api/designs` | Design | List all designs |
| POST | `/api/designs` | Design | Create design |
| GET | `/api/designs/:id` | Design | Get design |
| PUT | `/api/designs/:id` | Design | Update design |
| DELETE | `/api/designs/:id` | Design | Delete design |
| GET | `/api/designs/:id/versions` | Design | List versions |
| POST | `/api/designs/:id/versions` | Design | Save version snapshot |
| POST | `/api/planner/generate` | Planner | Generate agents from prompt |
| POST | `/api/planner/refine` | Planner | Refine existing plan |
| POST | `/api/chat/sessions` | Chat | Create chat session |
| POST | `/api/chat/sessions/:id/messages` | Chat | Send message (non-streaming) |
| POST | `/api/chat/sessions/:id/stream` | Chat | Send message (SSE streaming) |
| DELETE | `/api/chat/sessions/:id` | Chat | Delete session |
| POST | `/api/validation/validate` | Validation | Validate graph (14 rules) |
| GET | `/api/validation/rules` | Validation | List validation rules |
| POST | `/api/export/bundle` | Export | Generate export bundle |
| POST | `/api/publish` | Export + Adapter | Publish to target |
| POST | `/api/publish/preview` | Export + Adapter | Preview workspace files |
| GET | `/api/publish/targets` | Publish | List export targets |
| POST | `/api/publish/gateway/skills/search` | Gateway RPC | Search ClawHub skills via gateway |
| POST | `/api/publish/gateway/skills/list` | Gateway RPC | List installed skills on gateway |
| POST | `/api/publish/gateway/skills/install` | Gateway RPC | Install a ClawHub skill on gateway |
| GET | `/api/health` | — | Health check |

---

## Database Schema

```mermaid
erDiagram
    studio_designs {
        TEXT id PK
        TEXT name
        TEXT description
        TEXT status "draft|reviewed|approved|exported"
        TEXT use_case_prompt
        TEXT planner_output_json
        TEXT graph_json
        TEXT export_bundle_json
        TEXT created_by
        TEXT created_at
        TEXT updated_at
    }

    studio_design_versions {
        TEXT id PK
        TEXT design_id FK
        INTEGER version_number
        TEXT graph_json
        TEXT planner_output_json
        TEXT export_bundle_json
        TEXT change_summary
        TEXT created_at
    }

    studio_templates {
        TEXT id PK
        TEXT name
        TEXT template_type
        TEXT description
        TEXT template_json
        TEXT created_at
        TEXT updated_at
    }

    studio_assets_catalog {
        TEXT id PK
        TEXT asset_type
        TEXT source_type
        TEXT source_ref
        TEXT name
        TEXT metadata_json
        INTEGER reusable
        TEXT created_at
        TEXT updated_at
    }

    studio_export_targets {
        TEXT id PK
        TEXT name
        TEXT target_type
        TEXT config_json
        INTEGER is_active
        TEXT created_at
        TEXT updated_at
    }

    studio_publish_runs {
        TEXT id PK
        TEXT design_id FK
        TEXT export_target_id FK
        TEXT status
        TEXT request_json
        TEXT response_json
        TEXT created_at
        TEXT updated_at
    }

    studio_designs ||--o{ studio_design_versions : "has versions"
    studio_designs ||--o{ studio_publish_runs : "published via"
    studio_export_targets ||--o{ studio_publish_runs : "target for"
```

---

## Frontend Architecture

### Component Tree

```mermaid
graph TB
    App[StudioLayout]

    App --> ChatPanel[Chat Panel<br/>Left, 400px, always visible]
    App --> CanvasArea[Canvas Area<br/>Center, flex-1]
    App --> PropsPanel[Properties Panel<br/>Right, 340px, on node select]

    ChatPanel --> Branding[OpenClaw Branding + Actions]
    ChatPanel --> DesignSummary[Design Summary Card]
    ChatPanel --> Messages[Chat Messages]
    ChatPanel --> Suggestions[Suggestion Cards]
    ChatPanel --> ChatInput[Chat Input + Send]

    CanvasArea --> ReactFlow[React Flow Canvas]
    CanvasArea --> FloatingBar[Floating Action Bar<br/>Validate + Publish]
    CanvasArea --> ExportDialog[Export Dialog<br/>File Preview + Publish]

    ReactFlow --> AgentNode[Agent Node]
    ReactFlow --> SkillNode[Skill Node]
    ReactFlow --> ToolNode[Tool Node]
    ReactFlow --> TriggerNode[Trigger Node]
    ReactFlow --> OtherNodes[Condition, Approval,<br/>Output, Workspace,<br/>Heartbeat, TemplateRef]

    PropsPanel --> AgentProps[Agent Properties<br/>AGENTS.md, SOUL.md, Model,<br/>Tools, Bindings, Handoffs,<br/>LLM Settings, Previews]
    PropsPanel --> SkillProps[Skill Properties<br/>+ ClawHub Browser]
    PropsPanel --> ToolProps[Tool Properties]
    PropsPanel --> OtherProps[Other Properties]

    SkillProps --> SkillBrowser[ClawHub Skill Browser<br/>Search 45K+ skills]
```

### Zustand Store Architecture

```mermaid
graph TB
    subgraph DesignStore ["Design Store"]
        DS_State["designs[], activeDesign, plannerOutput,<br/>validationResult, isLoading, error"]
        DS_Actions["loadDesigns(), createDesign(), saveDesign(),<br/>updateGraph(), generatePlan(), validateDesign()"]
    end

    subgraph ChatStore ["Chat Store"]
        CS_State["sessionId, messages[], isStreaming, error"]
        CS_Actions["createSession(), sendMessageStream(),<br/>clearSession(), clearError()"]
    end

    subgraph CanvasStore ["Canvas Store"]
        CAS_State["selectedNodeId, selectedNodeType,<br/>selectedEdgeId, zoomLevel"]
        CAS_Actions["selectNode(), clearSelection(),<br/>updateNodeConfig(), addNode(), removeNode()"]
    end

    ChatStore -->|"applyWorkflowAction()"| DesignStore
    CanvasStore -->|"updateNodeConfig()"| DesignStore
    DesignStore -->|"activeDesign.graph"| ReactFlow[React Flow Canvas]
```

---

## Node Type System

```mermaid
graph TB
    subgraph NodeTypes ["10 Node Types"]
        Agent["Agent<br/>🟣 indigo<br/>SOUL.md + AGENTS.md"]
        Skill["Skill<br/>🟢 emerald<br/>SKILL.md (YAML frontmatter)"]
        Tool["Tool<br/>🟡 amber<br/>TOOLS.md binding"]
        Trigger["Trigger<br/>🔴 rose<br/>event/schedule/manual"]
        Condition["Condition<br/>🔵 cyan<br/>branching logic"]
        Approval["Approval<br/>🟣 purple<br/>human-in-loop gate"]
        Output["Output<br/>🟢 teal<br/>result destination"]
        Workspace["Workspace<br/>🔵 blue<br/>metadata"]
        Heartbeat["Heartbeat<br/>💗 pink<br/>periodic check-in"]
        TemplateRef["Template Ref<br/>reference"]
    end

    subgraph EdgeTypes ["9 Edge Relations"]
        E1[Invokes]
        E2[Uses]
        E3[Triggers]
        E4[RoutesTo]
        E5[DependsOn]
        E6[Approves]
        E7[WritesTo]
        E8[ManagedBy]
        E9[GroupedUnder]
    end
```

---

## Gateway WebSocket RPC

Studio communicates with the OpenClaw Gateway using WebSocket RPC (protocol v3). The `gateway-rpc.ts` service handles connection, authentication, and message exchange.

### Authentication Modes

| Mode | Client ID | When Used | Requirements |
|------|-----------|-----------|-------------|
| **Device** (default) | `gateway-client` | `~/.openclaw/identity/device.json` exists | Ed25519 device keys (paired device) |
| **Token** | `openclaw-control-ui` | Fallback when no device keys | `controlUi.allowInsecureAuth` on gateway |
| **Auto** | — | Default behavior | Tries device first, falls back to token |

### RPC Methods Used

| Method | Step | Purpose |
|--------|------|---------|
| `health` | Pre-check | Verify gateway is reachable |
| `agents.create` | Provisioning | Create agent workspace directory |
| `agents.update` | Provisioning | Register agent name + workspace path |
| `agents.files.set` | Provisioning | Push workspace files (SOUL.md, AGENTS.md, etc.) |
| `skills.search` | Skill Browser | Search ClawHub registry for skills |
| `skills.install` | Provisioning | Install ClawHub skill for an agent |
| `config.get` | Config | Read current openclaw.json + hash |
| `config.patch` | Config | Update agents list, bindings, tools.exec.host |
| `sessions.patch` | Wake | Ensure agent session exists |
| `chat.send` | Wake | Send bootstrap message to start agent |

### Smart Re-publish Behavior

- **USER.md and MEMORY.md** are skipped on re-publish (agent already exists) to preserve user data and agent memories
- **config.patch** is skipped if the config is unchanged (avoids gateway restarts that rotate agent tokens)
- **tools.exec.host: "gateway"** is added only if not already set (won't override user's choice)

---

## OpenClaw Workspace File Generation

```mermaid
graph TB
    subgraph Input ["Studio Graph"]
        AgentNodes["Agent Nodes<br/>(AgentNodeConfig)"]
        SkillNodes["Skill Nodes<br/>(SkillNodeConfig)"]
    end

    subgraph Adapter ["OpenClaw Bundle Adapter"]
        GenSoul["generateSoulMd()<br/>Lowercase personality prose"]
        GenAgents["generateAgentsMd()<br/>Structured ## Role, ## Mission, ## Rules"]
        GenIdentity["generateIdentityMd()<br/>Name + Role"]
        GenTools["generateToolsMd()<br/>Tool bindings"]
        GenUser["generateUserMd()<br/>Owner template"]
        GenMemory["generateMemoryMd()<br/>Long-term memory"]
        GenHeartbeat["generateHeartbeatMd()<br/>Schedule + checklist"]
        GenSkill["generateSkillMd()<br/>YAML frontmatter + markdown"]
        GenConfig["generateOpenClawJson()<br/>agents list + bindings"]
    end

    subgraph Output ["~/.openclaw/"]
        SOUL["workspace/SOUL.md"]
        AGENTS["workspace/AGENTS.md"]
        IDENTITY["workspace/IDENTITY.md"]
        TOOLS["workspace/TOOLS.md"]
        USER["workspace/USER.md"]
        MEMORY["workspace/MEMORY.md"]
        HEARTBEAT["workspace/HEARTBEAT.md"]
        SKILLMD["workspace/skills/x/SKILL.md"]
        JSON["openclaw.json"]
    end

    AgentNodes --> GenSoul --> SOUL
    AgentNodes --> GenAgents --> AGENTS
    AgentNodes --> GenIdentity --> IDENTITY
    AgentNodes --> GenTools --> TOOLS
    AgentNodes --> GenUser --> USER
    AgentNodes --> GenMemory --> MEMORY
    AgentNodes --> GenHeartbeat --> HEARTBEAT
    SkillNodes --> GenSkill --> SKILLMD
    AgentNodes --> GenConfig --> JSON
```

---

## Validation Flow

Validation runs at three points — silently after AI changes, on manual trigger, and as a gate before publish:

```mermaid
graph TB
    subgraph Triggers ["Validation Triggers"]
        T1["AI generates/modifies graph"]
        T2["User clicks Validate button"]
        T3["User opens Publish dialog"]
    end

    subgraph AutoValidation ["Auto-Validation (useValidation hook)"]
        Debounce["Wait 2 seconds<br/>(debounce)"]
        T1 --> Debounce
    end

    subgraph ManualValidation ["Manual Validation"]
        T2 --> CallAPI
    end

    subgraph PublishGate ["Publish Gate"]
        T3 --> CallAPI
    end

    Debounce --> CallAPI["POST /api/validation/validate<br/>(send graph)"]

    subgraph Backend ["Backend Validation Service"]
        CallAPI --> RunRules["Run 14 rules"]
        RunRules --> UpdateNodes["Update node.validation_state<br/>(valid/warning/invalid/incomplete)"]
        UpdateNodes --> ReturnResult["Return ValidationResult<br/>{valid, errors[], warnings[]}"]
    end

    subgraph UI ["UI Feedback"]
        ReturnResult --> NodeDots["Canvas: Update node dots<br/>🟢 green / 🟡 yellow / 🔴 red"]
        ReturnResult --> Badge["Validate button: Count badge<br/>red=errors, yellow=warnings, green=ok"]
        ReturnResult --> Toast["Toast notification<br/>(manual validate only)"]
        ReturnResult --> DialogBanner["Publish dialog: Error/warning list<br/>+ block Publish if errors"]
    end
```

### Validation State on Nodes

Each node on the canvas shows a colored validation dot:

| State | Color | Meaning |
|-------|-------|---------|
| `valid` | Green | All checks passed |
| `warning` | Yellow | Has warnings (non-blocking) |
| `invalid` | Red | Has errors (blocks publish) |
| `incomplete` | Gray | Not yet validated |

---

## Validation Rules

14 rules run before export:

| # | Rule ID | Severity | Check |
|---|---------|----------|-------|
| 1 | `agent-has-name` | error | Agent must have a name |
| 2 | `agent-has-goal` | error | Agent must have goal or description |
| 3 | `agent-has-role` | error | Agent must have a role |
| 4 | `skill-has-purpose` | error | Skill must have a purpose |
| 5 | `skill-has-output` | warning | Skill should have output_schema |
| 6 | `tool-has-binding` | error | Tool must have binding_name |
| 7 | `tool-has-type` | error | Tool must have tool_type |
| 8 | `heartbeat-has-schedule` | error | Heartbeat must have schedule |
| 9 | `heartbeat-has-mode` | error | Heartbeat must have mode |
| 10 | `approval-has-rationale` | warning | Approval should have rationale |
| 11 | `graph-has-agent` | error | Graph must have at least 1 agent |
| 12 | `no-orphan-agents` | warning | Agents should have connections |
| 13 | `no-disconnected-tools` | warning | Tools should connect to agent/skill |
| 14 | `reused-asset-ref-present` | error | Reuse mode 'existing' needs reference |

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | Next.js 14 | App framework |
| Canvas | React Flow v12 (@xyflow/react) | Visual node editor |
| State | Zustand | State management |
| Styling | Tailwind CSS | Utility-first CSS |
| Backend | Express.js | REST API server |
| Database | SQLite (better-sqlite3) | Persistent storage |
| AI | OpenRouter API | LLM for chat + planner |
| Types | TypeScript | Shared type system |
| Monorepo | npm workspaces | Package management |

---

## Directory Structure

```
openclaw-studio/
├── docs/                          # Documentation
├── packages/
│   ├── shared/                    # Shared TypeScript types
│   │   └── src/
│   │       ├── index.ts           # Barrel export
│   │       └── schemas/           # Type definitions
│   │           ├── graph.ts       # StudioGraph, StudioNode, enums
│   │           ├── node-configs.ts # AgentNodeConfig, SkillNodeConfig, etc.
│   │           ├── design.ts      # StudioDesign, ExportTarget
│   │           ├── planner.ts     # PlannerInput/Output, suggestions
│   │           ├── export-bundle.ts # AgentDefinition, ExportBundle
│   │           ├── validation.ts  # ValidationResult, rules
│   │           └── adapter.ts     # IExportAdapter, PublishResult
│   │
│   ├── backend/                   # Express API (port 4000)
│   │   └── src/
│   │       ├── index.ts           # Entry point, route mounting
│   │       ├── config.ts          # Environment config
│   │       ├── db/                # SQLite setup + migrations
│   │       ├── routes/            # REST endpoints (8 routers + gateway skill proxy)
│   │       ├── services/          # Business logic (7 services + gateway-rpc)
│   │       ├── adapters/          # Export adapters (4: filesystem, openclaw-bundle, git, gateway)
│   │       └── middleware/        # Error handler
│   │
│   └── frontend/                  # Next.js 14 (port 3000)
│       └── src/
│           ├── app/               # Next.js app router
│           ├── components/
│           │   ├── layout/        # StudioLayout (3-panel)
│           │   ├── canvas/        # React Flow canvas + 10 node types
│           │   ├── chat/          # AI chat panel + input
│           │   ├── properties/    # Node config editors (9 types) + ClawHub skill browser
│           │   ├── export/        # Export dialog with file preview
│           │   ├── common/        # Modal, Toast, Badge, ThemeToggle
│           │   ├── sidebar/       # Design list, templates, assets
│           │   ├── output/        # Validation, architecture reports
│           │   ├── prompt/        # Use case prompt (legacy)
│           │   └── versioning/    # Version history, diff
│           ├── store/             # Zustand stores (3)
│           ├── hooks/             # Custom React hooks
│           └── lib/               # API client, constants
│
└── packages/backend/data/             # SQLite database (auto-created)
```

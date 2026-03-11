export type ReuseMode = 'existing' | 'template' | 'new';

export interface AgentNodeConfig {
  // AGENTS.md registry fields
  name: string;
  description: string;
  model: string;

  // SOUL.md - Core Identity
  role: string;
  goal?: string; // backward compat with planner/export
  personality?: string;
  communication_style?: string;

  // SOUL.md - Responsibilities
  responsibilities?: string[];

  // SOUL.md - Behavioral Guidelines
  do_rules?: string[];
  dont_rules?: string[];

  // SOUL.md - Handoffs (agent-to-agent communication)
  handoffs?: string[];

  // SOUL.md - Example Interactions
  example_interactions?: string;

  // SOUL.md - Additional Rules
  rules?: string[];

  // Gateway / Model config
  model_fallback?: string;
  timeout_seconds?: number;
  max_tokens?: number;
  temperature?: number;

  // Channel binding (openclaw.json bindings)
  channel_binding?: {
    channel: string; // telegram, whatsapp, discord, slack, websocket
    accountId?: string;
  };
  is_default?: boolean;

  // Sandbox & tool restrictions (per-agent in openclaw.json)
  sandbox_mode?: 'all' | 'none';
  tools_allow?: string[];
  tools_deny?: string[];

  // Tools assigned to this agent (binding names)
  tools?: string[];

  // Skills assigned to this agent
  skills?: string[];

  // References
  manager_agent_ref?: string;
  workspace_ref?: string;
  heartbeat_ref?: string;
  reuse_mode: ReuseMode;
  existing_asset_ref?: string;
}

export interface SkillNodeConfig {
  name: string;
  purpose: string;
  prompt_summary: string;
  // SKILL.md frontmatter
  user_invocable?: boolean;
  tags?: string[];
  // Schemas
  input_schema?: Record<string, unknown>;
  output_schema?: Record<string, unknown>;
  reuse_mode: ReuseMode;
  existing_asset_ref?: string;
}

export interface ToolNodeConfig {
  tool_type: string;
  binding_name: string;
  tool_description?: string;
  auth_mode_metadata?: Record<string, unknown>;
  allowed_actions: string[];
  reuse_mode: ReuseMode;
  existing_asset_ref?: string;
}

export interface TriggerNodeConfig {
  trigger_type: 'event' | 'schedule' | 'manual';
  source: string;
  schedule?: string;
  conditions?: string;
}

export interface ConditionNodeConfig {
  expression_summary: string;
  branch_metadata?: Record<string, unknown>;
}

export interface ApprovalNodeConfig {
  required: boolean;
  reviewer_type: string;
  rationale: string;
}

export interface OutputNodeConfig {
  output_type: string;
  destination: string;
  summary: string;
}

export interface WorkspaceNodeConfig {
  workspace_template_ref?: string;
  notes: string;
  metadata_summary?: string;
}

export interface HeartbeatNodeConfig {
  mode: 'interval' | 'cron' | 'event';
  schedule: string;
  purpose: string;
  escalation_summary?: string;
}

export type NodeConfig =
  | AgentNodeConfig
  | SkillNodeConfig
  | ToolNodeConfig
  | TriggerNodeConfig
  | ConditionNodeConfig
  | ApprovalNodeConfig
  | OutputNodeConfig
  | WorkspaceNodeConfig
  | HeartbeatNodeConfig;

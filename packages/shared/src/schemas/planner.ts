import { StudioGraph } from './graph';
import { ReuseMode } from './node-configs';

export interface AssetCatalogEntry {
  id: string;
  asset_type: string;
  source_type: string;
  source_ref: string;
  name: string;
  metadata_json?: Record<string, unknown>;
  reusable: boolean;
  created_at: string;
  updated_at: string;
}

export interface PlannerInput {
  use_case_prompt: string;
  existing_assets?: AssetCatalogEntry[];
}

export interface AgentSuggestion {
  name: string;
  role: string;
  goal: string;
  description: string;
  manager_agent_ref?: string;
  workspace_ref?: string;
  heartbeat_ref?: string;
  reuse_mode: ReuseMode;
  existing_asset_ref?: string;
  sub_agents?: AgentSuggestion[];
  skills: string[];
  tools: string[];
}

export interface ReusableAssetRef {
  asset_id: string;
  asset_type: string;
  name: string;
  reason: string;
}

export interface ProposedAsset {
  asset_type: string;
  name: string;
  description: string;
  rationale: string;
}

export interface SkillSuggestion {
  name: string;
  purpose: string;
  prompt_summary: string;
  input_schema?: Record<string, unknown>;
  output_schema?: Record<string, unknown>;
  reuse_mode: ReuseMode;
  existing_asset_ref?: string;
}

export interface ToolSuggestion {
  tool_type: string;
  binding_name: string;
  allowed_actions: string[];
  auth_mode_metadata?: Record<string, unknown>;
  reuse_mode: ReuseMode;
  existing_asset_ref?: string;
}

export interface TriggerSuggestion {
  trigger_type: 'event' | 'schedule' | 'manual';
  source: string;
  schedule?: string;
  conditions?: string;
}

export interface HeartbeatSuggestion {
  mode: 'interval' | 'cron' | 'event';
  schedule: string;
  purpose: string;
  escalation_summary?: string;
}

export interface ApprovalSuggestion {
  required: boolean;
  reviewer_type: string;
  rationale: string;
}

export interface OutputSuggestion {
  output_type: string;
  destination: string;
  summary: string;
}

export interface PlannerOutput {
  use_case_summary: string;
  recommended_architecture_name: string;
  top_level_goal: string;
  top_level_agent: AgentSuggestion;
  sub_agents: AgentSuggestion[];
  reusable_assets: ReusableAssetRef[];
  proposed_new_assets: ProposedAsset[];
  skills: SkillSuggestion[];
  tools: ToolSuggestion[];
  triggers: TriggerSuggestion[];
  heartbeat: HeartbeatSuggestion[];
  approvals: ApprovalSuggestion[];
  outputs: OutputSuggestion[];
  guardrails: string[];
  assumptions: string[];
  graph_seed: StudioGraph;
}

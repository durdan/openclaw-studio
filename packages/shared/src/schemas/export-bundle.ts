import { StudioGraph } from './graph';
import { ValidationResult } from './validation';

export interface AgentDefinition {
  name: string;
  role: string;
  goal: string;
  description: string;
  model: string;
  workspace_files: Record<string, string>;
  heartbeat_config?: HeartbeatDefinition;
  skills: string[];
  tools: string[];

  // SOUL.md fields
  personality?: string;
  communication_style?: string;
  responsibilities?: string[];
  do_rules?: string[];
  dont_rules?: string[];
  handoffs?: string[];
  rules?: string[];
  example_interactions?: string;

  // LLM settings
  temperature?: number;
  timeout_seconds?: number;
  max_tokens?: number;
  model_fallback?: string;

  // Channel binding (openclaw.json)
  channel_binding?: {
    channel: string;
    accountId?: string;
  };
  is_default?: boolean;

  // Sandbox & tool restrictions
  sandbox_mode?: 'all' | 'none';
  tools_allow?: string[];
  tools_deny?: string[];
}

export interface SkillDefinition {
  name: string;
  description: string;
  purpose: string;
  prompt_summary: string;
  input_schema?: Record<string, unknown>;
  output_schema?: Record<string, unknown>;
}

export interface HeartbeatDefinition {
  mode: 'interval' | 'cron' | 'event';
  schedule: string;
  purpose: string;
  escalation_summary?: string;
}

export interface AgentDeployment {
  agent_name: string;
  runtime_requirements: string[];
  env_vars: string[];
  notes: string;
}

export interface DeploymentRecommendation {
  agents: AgentDeployment[];
  dependencies: string[];
  notes: string[];
}

export interface ExportBundle {
  design_summary_md: string;
  graph: StudioGraph;
  reusable_asset_report: Record<string, unknown>;
  proposed_new_asset_report: Record<string, unknown>;
  validation_report: ValidationResult;
  agent_definitions: AgentDefinition[];
  skill_definitions: SkillDefinition[];
  heartbeat_definitions: HeartbeatDefinition[];
  workspace_metadata: Record<string, unknown>;
  deployment_recommendation: DeploymentRecommendation;
}

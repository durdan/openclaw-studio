import { NodeConfig } from './node-configs';

export enum NodeType {
  Agent = 'agent',
  Skill = 'skill',
  Tool = 'tool',
  Trigger = 'trigger',
  Condition = 'condition',
  Approval = 'approval',
  Output = 'output',
  Workspace = 'workspace',
  Heartbeat = 'heartbeat',
  TemplateReference = 'template_reference',
}

export enum EdgeRelationType {
  Invokes = 'invokes',
  Uses = 'uses',
  Triggers = 'triggers',
  RoutesTo = 'routes_to',
  DependsOn = 'depends_on',
  Approves = 'approves',
  WritesTo = 'writes_to',
  ManagedBy = 'managed_by',
  GroupedUnder = 'grouped_under',
}

export enum ValidationState {
  Valid = 'valid',
  Warning = 'warning',
  Incomplete = 'incomplete',
  Invalid = 'invalid',
}

export interface GraphMetadata {
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
  version: number;
}

export interface StudioNode {
  id: string;
  type: NodeType;
  label: string;
  config: NodeConfig;
  reused_asset_ref?: string;
  proposed_new: boolean;
  validation_state: ValidationState;
  position: { x: number; y: number };
}

export interface StudioEdge {
  id: string;
  source: string;
  target: string;
  relation_type: EdgeRelationType;
  metadata?: Record<string, unknown>;
}

export interface StudioGraph {
  nodes: StudioNode[];
  edges: StudioEdge[];
  metadata: GraphMetadata;
}

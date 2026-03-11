import { StudioGraph } from './graph';
import { PlannerOutput } from './planner';
import { ExportBundle } from './export-bundle';

export enum DesignStatus {
  Draft = 'draft',
  Reviewed = 'reviewed',
  Approved = 'approved',
  Exported = 'exported',
}

export interface StudioDesign {
  id: string;
  name: string;
  description: string;
  status: DesignStatus;
  use_case_prompt: string;
  planner_output?: PlannerOutput;
  graph?: StudioGraph;
  export_bundle?: ExportBundle;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface StudioDesignVersion {
  id: string;
  design_id: string;
  version_number: number;
  graph: StudioGraph;
  planner_output?: PlannerOutput;
  export_bundle?: ExportBundle;
  change_summary: string;
  created_at: string;
}

export interface StudioTemplate {
  id: string;
  name: string;
  template_type: string;
  description: string;
  template_json: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

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

export interface ExportTarget {
  id: string;
  name: string;
  target_type: string;
  config_json?: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PublishRun {
  id: string;
  design_id: string;
  export_target_id: string;
  status: string;
  request_json?: Record<string, unknown>;
  response_json?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

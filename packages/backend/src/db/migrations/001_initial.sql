-- OpenClaw Studio initial schema

CREATE TABLE IF NOT EXISTS studio_designs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'reviewed', 'approved', 'exported')),
  use_case_prompt TEXT NOT NULL DEFAULT '',
  planner_output_json TEXT,
  graph_json TEXT,
  export_bundle_json TEXT,
  created_by TEXT NOT NULL DEFAULT 'system',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS studio_design_versions (
  id TEXT PRIMARY KEY,
  design_id TEXT NOT NULL REFERENCES studio_designs(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  graph_json TEXT NOT NULL,
  planner_output_json TEXT,
  export_bundle_json TEXT,
  change_summary TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (design_id, version_number)
);

CREATE TABLE IF NOT EXISTS studio_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  template_type TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  template_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS studio_assets_catalog (
  id TEXT PRIMARY KEY,
  asset_type TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_ref TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL,
  metadata_json TEXT,
  reusable INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS studio_export_targets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  target_type TEXT NOT NULL,
  config_json TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS studio_publish_runs (
  id TEXT PRIMARY KEY,
  design_id TEXT NOT NULL REFERENCES studio_designs(id) ON DELETE CASCADE,
  export_target_id TEXT NOT NULL REFERENCES studio_export_targets(id),
  status TEXT NOT NULL DEFAULT 'pending',
  request_json TEXT,
  response_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_design_versions_design_id ON studio_design_versions(design_id);
CREATE INDEX IF NOT EXISTS idx_publish_runs_design_id ON studio_publish_runs(design_id);
CREATE INDEX IF NOT EXISTS idx_assets_catalog_type ON studio_assets_catalog(asset_type);
CREATE INDEX IF NOT EXISTS idx_assets_catalog_reusable ON studio_assets_catalog(reusable);

import type { StudioDesign, StudioDesignVersion } from '@openclaw-studio/shared';
import { DesignStatus } from '@openclaw-studio/shared';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db';

interface DesignRow {
  id: string;
  name: string;
  description: string;
  status: string;
  use_case_prompt: string;
  planner_output_json: string | null;
  graph_json: string | null;
  export_bundle_json: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface VersionRow {
  id: string;
  design_id: string;
  version_number: number;
  graph_json: string;
  planner_output_json: string | null;
  export_bundle_json: string | null;
  change_summary: string;
  created_at: string;
}

function parseDesignRow(row: DesignRow): StudioDesign {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    status: row.status as DesignStatus,
    use_case_prompt: row.use_case_prompt,
    planner_output: row.planner_output_json ? JSON.parse(row.planner_output_json) : undefined,
    graph: row.graph_json ? JSON.parse(row.graph_json) : undefined,
    export_bundle: row.export_bundle_json ? JSON.parse(row.export_bundle_json) : undefined,
    created_by: row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function parseVersionRow(row: VersionRow): StudioDesignVersion {
  return {
    id: row.id,
    design_id: row.design_id,
    version_number: row.version_number,
    graph: JSON.parse(row.graph_json),
    planner_output: row.planner_output_json ? JSON.parse(row.planner_output_json) : undefined,
    export_bundle: row.export_bundle_json ? JSON.parse(row.export_bundle_json) : undefined,
    change_summary: row.change_summary,
    created_at: row.created_at,
  };
}

export class DesignService {
  async list(): Promise<StudioDesign[]> {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM studio_designs ORDER BY updated_at DESC').all() as DesignRow[];
    return rows.map(parseDesignRow);
  }

  async getById(id: string): Promise<StudioDesign | null> {
    const db = getDb();
    const row = db.prepare('SELECT * FROM studio_designs WHERE id = ?').get(id) as DesignRow | undefined;
    if (!row) return null;
    return parseDesignRow(row);
  }

  async create(data: Partial<StudioDesign>): Promise<StudioDesign> {
    const db = getDb();
    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO studio_designs (id, name, description, status, use_case_prompt, planner_output_json, graph_json, export_bundle_json, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.name || 'Untitled',
      data.description || '',
      data.status || DesignStatus.Draft,
      data.use_case_prompt || '',
      data.planner_output ? JSON.stringify(data.planner_output) : null,
      data.graph ? JSON.stringify(data.graph) : null,
      data.export_bundle ? JSON.stringify(data.export_bundle) : null,
      data.created_by || 'system',
      now,
      now,
    );

    return (await this.getById(id))!;
  }

  async update(id: string, data: Partial<StudioDesign>): Promise<StudioDesign | null> {
    const db = getDb();
    const existing = await this.getById(id);
    if (!existing) return null;

    const now = new Date().toISOString();
    const fields: string[] = [];
    const values: unknown[] = [];

    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
    if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description); }
    if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status); }
    if (data.use_case_prompt !== undefined) { fields.push('use_case_prompt = ?'); values.push(data.use_case_prompt); }
    if (data.planner_output !== undefined) { fields.push('planner_output_json = ?'); values.push(JSON.stringify(data.planner_output)); }
    if (data.graph !== undefined) { fields.push('graph_json = ?'); values.push(JSON.stringify(data.graph)); }
    if (data.export_bundle !== undefined) { fields.push('export_bundle_json = ?'); values.push(JSON.stringify(data.export_bundle)); }

    fields.push('updated_at = ?');
    values.push(now);
    values.push(id);

    db.prepare(`UPDATE studio_designs SET ${fields.join(', ')} WHERE id = ?`).run(...values);

    return (await this.getById(id))!;
  }

  async delete(id: string): Promise<boolean> {
    const db = getDb();
    const result = db.prepare('DELETE FROM studio_designs WHERE id = ?').run(id);
    return result.changes > 0;
  }

  async getVersions(designId: string): Promise<StudioDesignVersion[]> {
    const db = getDb();
    const rows = db.prepare(
      'SELECT * FROM studio_design_versions WHERE design_id = ? ORDER BY version_number DESC'
    ).all(designId) as VersionRow[];
    return rows.map(parseVersionRow);
  }

  async createVersion(designId: string, changeSummary: string): Promise<StudioDesignVersion | null> {
    const db = getDb();
    const design = await this.getById(designId);
    if (!design) return null;
    if (!design.graph) return null;

    // Get max version number
    const maxRow = db.prepare(
      'SELECT COALESCE(MAX(version_number), 0) as max_ver FROM studio_design_versions WHERE design_id = ?'
    ).get(designId) as { max_ver: number };
    const nextVersion = maxRow.max_ver + 1;

    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO studio_design_versions (id, design_id, version_number, graph_json, planner_output_json, export_bundle_json, change_summary, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      designId,
      nextVersion,
      JSON.stringify(design.graph),
      design.planner_output ? JSON.stringify(design.planner_output) : null,
      design.export_bundle ? JSON.stringify(design.export_bundle) : null,
      changeSummary || '',
      now,
    );

    const row = db.prepare('SELECT * FROM studio_design_versions WHERE id = ?').get(id) as VersionRow;
    return parseVersionRow(row);
  }
}

export const designService = new DesignService();

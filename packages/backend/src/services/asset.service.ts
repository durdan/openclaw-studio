import type { AssetCatalogEntry } from '@openclaw-studio/shared';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db';

interface AssetRow {
  id: string;
  asset_type: string;
  source_type: string;
  source_ref: string;
  name: string;
  metadata_json: string | null;
  reusable: number;
  created_at: string;
  updated_at: string;
}

function parseRow(row: AssetRow): AssetCatalogEntry {
  return {
    id: row.id,
    asset_type: row.asset_type,
    source_type: row.source_type,
    source_ref: row.source_ref,
    name: row.name,
    metadata_json: row.metadata_json ? JSON.parse(row.metadata_json) : undefined,
    reusable: row.reusable === 1,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export class AssetService {
  async list(): Promise<AssetCatalogEntry[]> {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM studio_assets_catalog ORDER BY updated_at DESC').all() as AssetRow[];
    return rows.map(parseRow);
  }

  async getById(id: string): Promise<AssetCatalogEntry | null> {
    const db = getDb();
    const row = db.prepare('SELECT * FROM studio_assets_catalog WHERE id = ?').get(id) as AssetRow | undefined;
    if (!row) return null;
    return parseRow(row);
  }

  async create(data: Partial<AssetCatalogEntry>): Promise<AssetCatalogEntry> {
    const db = getDb();
    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO studio_assets_catalog (id, asset_type, source_type, source_ref, name, metadata_json, reusable, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.asset_type || 'agent',
      data.source_type || 'local',
      data.source_ref || '',
      data.name || 'New Asset',
      data.metadata_json ? JSON.stringify(data.metadata_json) : null,
      data.reusable !== false ? 1 : 0,
      now,
      now,
    );

    return (await this.getById(id))!;
  }

  async update(id: string, data: Partial<AssetCatalogEntry>): Promise<AssetCatalogEntry | null> {
    const db = getDb();
    const existing = await this.getById(id);
    if (!existing) return null;

    const now = new Date().toISOString();
    const fields: string[] = [];
    const values: unknown[] = [];

    if (data.asset_type !== undefined) { fields.push('asset_type = ?'); values.push(data.asset_type); }
    if (data.source_type !== undefined) { fields.push('source_type = ?'); values.push(data.source_type); }
    if (data.source_ref !== undefined) { fields.push('source_ref = ?'); values.push(data.source_ref); }
    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
    if (data.metadata_json !== undefined) { fields.push('metadata_json = ?'); values.push(JSON.stringify(data.metadata_json)); }
    if (data.reusable !== undefined) { fields.push('reusable = ?'); values.push(data.reusable ? 1 : 0); }

    fields.push('updated_at = ?');
    values.push(now);
    values.push(id);

    db.prepare(`UPDATE studio_assets_catalog SET ${fields.join(', ')} WHERE id = ?`).run(...values);

    return (await this.getById(id))!;
  }

  async delete(id: string): Promise<boolean> {
    const db = getDb();
    const result = db.prepare('DELETE FROM studio_assets_catalog WHERE id = ?').run(id);
    return result.changes > 0;
  }

  async search(query: string, assetType?: string): Promise<AssetCatalogEntry[]> {
    const db = getDb();
    let sql = 'SELECT * FROM studio_assets_catalog WHERE name LIKE ?';
    const params: unknown[] = [`%${query}%`];

    if (assetType) {
      sql += ' AND asset_type = ?';
      params.push(assetType);
    }

    sql += ' ORDER BY updated_at DESC';

    const rows = db.prepare(sql).all(...params) as AssetRow[];
    return rows.map(parseRow);
  }

  async getReusable(assetType?: string): Promise<AssetCatalogEntry[]> {
    const db = getDb();
    let sql = 'SELECT * FROM studio_assets_catalog WHERE reusable = 1';
    const params: unknown[] = [];

    if (assetType) {
      sql += ' AND asset_type = ?';
      params.push(assetType);
    }

    sql += ' ORDER BY updated_at DESC';

    const rows = db.prepare(sql).all(...params) as AssetRow[];
    return rows.map(parseRow);
  }
}

export const assetService = new AssetService();

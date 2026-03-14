/**
 * ClawHub Skill Cache — clones github.com/openclaw/skills, parses _meta.json
 * files, and indexes them in SQLite with FTS5 for instant local search.
 *
 * Sync runs on backend startup (non-blocking) and can be triggered manually.
 * Incremental sync uses git diff to only re-index changed files.
 */
import { execFile } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { getDb } from '../db';

const execFileAsync = promisify(execFile);

const REPO_URL = 'https://github.com/openclaw/skills.git';
const CACHE_DIR = path.join(os.homedir(), '.openclaw-studio', 'clawhub-skills-cache');
const SKILLS_SUBDIR = 'skills'; // skills are under skills/ in the repo

export interface ClawHubSkill {
  slug: string;
  name: string;
  description: string;
  version?: string;
  author?: string;
  tags?: string[];
  downloads?: number;
  source_url?: string;
}

export interface SyncState {
  status: 'pending' | 'syncing' | 'success' | 'error';
  skill_count: number;
  last_sync_at?: string;
  last_commit_hash?: string;
  error_message?: string;
  repo_path?: string;
}

export interface SyncResult {
  success: boolean;
  skillCount: number;
  message: string;
}

// ─── Sync State ─────────────────────────────────────────────────────

export function getSyncState(): SyncState {
  const db = getDb();
  const row = db.prepare('SELECT * FROM clawhub_sync_state WHERE id = 1').get() as Record<string, unknown> | undefined;
  if (!row) {
    return { status: 'pending', skill_count: 0 };
  }
  return {
    status: (row.status as string) as SyncState['status'],
    skill_count: (row.skill_count as number) || 0,
    last_sync_at: row.last_sync_at as string | undefined,
    last_commit_hash: row.last_commit_hash as string | undefined,
    error_message: row.error_message as string | undefined,
    repo_path: row.repo_path as string | undefined,
  };
}

function updateSyncState(updates: Partial<SyncState>) {
  const db = getDb();
  const fields: string[] = [];
  const values: unknown[] = [];

  if (updates.status !== undefined) { fields.push('status = ?'); values.push(updates.status); }
  if (updates.skill_count !== undefined) { fields.push('skill_count = ?'); values.push(updates.skill_count); }
  if (updates.last_sync_at !== undefined) { fields.push('last_sync_at = ?'); values.push(updates.last_sync_at); }
  if (updates.last_commit_hash !== undefined) { fields.push('last_commit_hash = ?'); values.push(updates.last_commit_hash); }
  if (updates.error_message !== undefined) { fields.push('error_message = ?'); values.push(updates.error_message); }
  if (updates.repo_path !== undefined) { fields.push('repo_path = ?'); values.push(updates.repo_path); }

  if (fields.length > 0) {
    db.prepare(`UPDATE clawhub_sync_state SET ${fields.join(', ')} WHERE id = 1`).run(...values);
  }
}

// ─── Git Operations ─────────────────────────────────────────────────

async function hasGit(): Promise<boolean> {
  try {
    await execFileAsync('git', ['--version']);
    return true;
  } catch {
    return false;
  }
}

async function getHeadHash(repoPath: string): Promise<string> {
  const { stdout } = await execFileAsync('git', ['-C', repoPath, 'rev-parse', 'HEAD']);
  return stdout.trim();
}

async function cloneRepo(): Promise<void> {
  const parentDir = path.dirname(CACHE_DIR);
  if (!fs.existsSync(parentDir)) {
    fs.mkdirSync(parentDir, { recursive: true });
  }

  console.log(`ClawHub: Cloning ${REPO_URL} (shallow)...`);
  await execFileAsync('git', [
    'clone', '--depth', '1', '--filter=blob:none', '--sparse',
    REPO_URL, CACHE_DIR,
  ], { timeout: 120_000 });

  // Set up sparse checkout for _meta.json files only
  try {
    await execFileAsync('git', ['-C', CACHE_DIR, 'sparse-checkout', 'init']);
    await execFileAsync('git', ['-C', CACHE_DIR, 'sparse-checkout', 'set', 'skills']);
    console.log('ClawHub: Sparse checkout configured for skills/');
  } catch (err) {
    console.warn('ClawHub: Sparse checkout failed, using full clone:', (err as Error).message);
  }
}

async function pullRepo(): Promise<void> {
  console.log('ClawHub: Pulling latest changes...');
  await execFileAsync('git', ['-C', CACHE_DIR, 'pull', '--ff-only'], { timeout: 60_000 });
}

async function getChangedMetaFiles(oldHash: string, newHash: string): Promise<string[]> {
  try {
    const { stdout } = await execFileAsync('git', [
      '-C', CACHE_DIR, 'diff', '--name-only', '--diff-filter=AM',
      `${oldHash}..${newHash}`, '--', 'skills/**/_meta.json',
    ]);
    return stdout.trim().split('\n').filter(Boolean);
  } catch {
    return []; // fall back to full scan
  }
}

// ─── Parsing ────────────────────────────────────────────────────────

interface ParsedSkill {
  slug: string;
  name: string;
  description: string;
  version?: string;
  author?: string;
  tags?: string[];
  downloads?: number;
  source_url?: string;
  meta_json: string;
}

function parseMetaJson(filePath: string, author: string, skillSlug: string): ParsedSkill | null {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const meta = JSON.parse(raw);

    // _meta.json can have various shapes — be defensive
    const slug = meta.slug || meta.name || skillSlug;
    const name = meta.displayName || meta.name || slug;
    const description = meta.summary || meta.description || '';
    const version = meta.latestVersion?.version || meta.version || undefined;
    const tags = Array.isArray(meta.tags) ? meta.tags :
      (meta.latestVersion?.tags ? Object.keys(meta.latestVersion.tags) : undefined);
    const downloads = meta.stats?.downloads || meta.downloads || 0;

    return {
      slug,
      name,
      description,
      version,
      author: meta.owner?.handle || author,
      tags,
      downloads,
      source_url: `https://github.com/openclaw/skills/tree/main/skills/${author}/${skillSlug}`,
      meta_json: raw,
    };
  } catch {
    return null;
  }
}

function scanAllMetaFiles(): ParsedSkill[] {
  const skillsDir = path.join(CACHE_DIR, SKILLS_SUBDIR);
  if (!fs.existsSync(skillsDir)) return [];

  const skills: ParsedSkill[] = [];
  const authors = fs.readdirSync(skillsDir, { withFileTypes: true });

  for (const authorEntry of authors) {
    if (!authorEntry.isDirectory()) continue;
    const authorDir = path.join(skillsDir, authorEntry.name);

    let skillDirs: fs.Dirent[];
    try {
      skillDirs = fs.readdirSync(authorDir, { withFileTypes: true });
    } catch { continue; }

    for (const skillEntry of skillDirs) {
      if (!skillEntry.isDirectory()) continue;
      const metaPath = path.join(authorDir, skillEntry.name, '_meta.json');
      if (!fs.existsSync(metaPath)) continue;

      const parsed = parseMetaJson(metaPath, authorEntry.name, skillEntry.name);
      if (parsed) skills.push(parsed);
    }
  }

  return skills;
}

function scanSpecificFiles(relativePaths: string[]): ParsedSkill[] {
  const skills: ParsedSkill[] = [];
  for (const relPath of relativePaths) {
    const fullPath = path.join(CACHE_DIR, relPath);
    if (!fs.existsSync(fullPath)) continue;

    // Path is like: skills/{author}/{slug}/_meta.json
    const parts = relPath.split('/');
    if (parts.length < 4) continue;
    const author = parts[1];
    const slug = parts[2];

    const parsed = parseMetaJson(fullPath, author, slug);
    if (parsed) skills.push(parsed);
  }
  return skills;
}

// ─── Database Operations ────────────────────────────────────────────

function upsertSkills(skills: ParsedSkill[]): void {
  const db = getDb();
  const upsert = db.prepare(`
    INSERT OR REPLACE INTO clawhub_skills (slug, name, description, version, author, tags_json, downloads, source_url, meta_json, indexed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `);

  const batchInsert = db.transaction((batch: ParsedSkill[]) => {
    for (const s of batch) {
      upsert.run(
        s.slug, s.name, s.description, s.version || null,
        s.author || null, s.tags ? JSON.stringify(s.tags) : null,
        s.downloads || 0, s.source_url || null, s.meta_json,
      );
    }
  });

  // Process in batches of 500 for memory efficiency
  const BATCH_SIZE = 500;
  for (let i = 0; i < skills.length; i += BATCH_SIZE) {
    batchInsert(skills.slice(i, i + BATCH_SIZE));
  }
}

// ─── Main Sync ──────────────────────────────────────────────────────

let syncInProgress = false;

export async function syncClawHub(): Promise<SyncResult> {
  if (syncInProgress) {
    return { success: false, skillCount: 0, message: 'Sync already in progress' };
  }

  syncInProgress = true;
  updateSyncState({ status: 'syncing', error_message: '' });

  try {
    // Check git is available
    if (!await hasGit()) {
      const msg = 'git is not installed — ClawHub skill cache requires git';
      updateSyncState({ status: 'error', error_message: msg });
      return { success: false, skillCount: 0, message: msg };
    }

    const isFirstSync = !fs.existsSync(path.join(CACHE_DIR, '.git'));
    let oldHash: string | undefined;

    if (isFirstSync) {
      await cloneRepo();
    } else {
      oldHash = await getHeadHash(CACHE_DIR);
      await pullRepo();
    }

    const newHash = await getHeadHash(CACHE_DIR);

    // Determine which files to parse
    let skills: ParsedSkill[];
    if (!isFirstSync && oldHash && oldHash !== newHash) {
      // Incremental: only changed files
      const changedFiles = await getChangedMetaFiles(oldHash, newHash);
      if (changedFiles.length > 0) {
        console.log(`ClawHub: Indexing ${changedFiles.length} changed files...`);
        skills = scanSpecificFiles(changedFiles);
        upsertSkills(skills);
      } else {
        skills = [];
      }
    } else if (isFirstSync) {
      // Full scan on first sync
      console.log('ClawHub: Full scan of _meta.json files...');
      skills = scanAllMetaFiles();
      console.log(`ClawHub: Parsed ${skills.length} skills, inserting...`);
      upsertSkills(skills);
    } else {
      // No changes
      console.log('ClawHub: Already up to date');
      skills = [];
    }

    const db = getDb();
    const count = (db.prepare('SELECT COUNT(*) as count FROM clawhub_skills').get() as { count: number }).count;

    updateSyncState({
      status: 'success',
      skill_count: count,
      last_sync_at: new Date().toISOString(),
      last_commit_hash: newHash,
      repo_path: CACHE_DIR,
    });

    const msg = isFirstSync
      ? `Initial sync complete: ${count} skills indexed`
      : skills.length > 0
        ? `Incremental sync: ${skills.length} skills updated (${count} total)`
        : `Already up to date (${count} skills)`;

    console.log(`ClawHub: ${msg}`);
    return { success: true, skillCount: count, message: msg };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown sync error';
    console.error(`ClawHub sync error: ${msg}`);
    updateSyncState({ status: 'error', error_message: msg });
    return { success: false, skillCount: 0, message: msg };
  } finally {
    syncInProgress = false;
  }
}

// ─── Search & Query ─────────────────────────────────────────────────

function sanitizeFtsQuery(query: string): string {
  // Escape special FTS5 characters and convert to prefix search
  const tokens = query
    .replace(/['"*(){}[\]^~:]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 0);

  if (tokens.length === 0) return '""';
  // Each token as a prefix match
  return tokens.map((t) => `"${t}"*`).join(' ');
}

function rowToSkill(row: Record<string, unknown>): ClawHubSkill {
  return {
    slug: row.slug as string,
    name: row.name as string,
    description: row.description as string,
    version: row.version as string | undefined,
    author: row.author as string | undefined,
    tags: row.tags_json ? JSON.parse(row.tags_json as string) : undefined,
    downloads: row.downloads as number | undefined,
    source_url: row.source_url as string | undefined,
  };
}

export function searchSkills(query: string, limit = 20): ClawHubSkill[] {
  const db = getDb();

  if (!query.trim()) {
    // Return popular skills when no query
    const rows = db.prepare(
      'SELECT * FROM clawhub_skills ORDER BY downloads DESC LIMIT ?',
    ).all(limit) as Record<string, unknown>[];
    return rows.map(rowToSkill);
  }

  const ftsQuery = sanitizeFtsQuery(query);
  try {
    const rows = db.prepare(`
      SELECT s.*
      FROM clawhub_skills_fts fts
      JOIN clawhub_skills s ON s.rowid = fts.rowid
      WHERE clawhub_skills_fts MATCH ?
      ORDER BY rank
      LIMIT ?
    `).all(ftsQuery, limit) as Record<string, unknown>[];
    return rows.map(rowToSkill);
  } catch {
    // FTS query failed — fall back to LIKE
    const rows = db.prepare(
      `SELECT * FROM clawhub_skills WHERE name LIKE ? OR description LIKE ? OR slug LIKE ? LIMIT ?`,
    ).all(`%${query}%`, `%${query}%`, `%${query}%`, limit) as Record<string, unknown>[];
    return rows.map(rowToSkill);
  }
}

export function listSkills(options?: { offset?: number; limit?: number }): { skills: ClawHubSkill[]; total: number } {
  const db = getDb();
  const limit = options?.limit || 20;
  const offset = options?.offset || 0;

  const total = (db.prepare('SELECT COUNT(*) as count FROM clawhub_skills').get() as { count: number }).count;
  const rows = db.prepare(
    'SELECT * FROM clawhub_skills ORDER BY downloads DESC LIMIT ? OFFSET ?',
  ).all(limit, offset) as Record<string, unknown>[];

  return { skills: rows.map(rowToSkill), total };
}

export function getSkill(slug: string): ClawHubSkill | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM clawhub_skills WHERE slug = ?').get(slug) as Record<string, unknown> | undefined;
  return row ? rowToSkill(row) : null;
}

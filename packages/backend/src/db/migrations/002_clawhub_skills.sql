-- ClawHub skill cache (indexed from github.com/openclaw/skills)
CREATE TABLE IF NOT EXISTS clawhub_skills (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  version TEXT,
  author TEXT,
  tags_json TEXT,
  downloads INTEGER DEFAULT 0,
  source_url TEXT,
  meta_json TEXT,
  indexed_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_clawhub_skills_name ON clawhub_skills(name);
CREATE INDEX IF NOT EXISTS idx_clawhub_skills_author ON clawhub_skills(author);

-- FTS5 virtual table for full-text search
CREATE VIRTUAL TABLE IF NOT EXISTS clawhub_skills_fts USING fts5(
  slug,
  name,
  description,
  tags_text,
  content='clawhub_skills',
  content_rowid='rowid'
);

-- Triggers to keep FTS in sync
CREATE TRIGGER IF NOT EXISTS clawhub_skills_ai AFTER INSERT ON clawhub_skills BEGIN
  INSERT INTO clawhub_skills_fts(rowid, slug, name, description, tags_text)
  VALUES (new.rowid, new.slug, new.name, new.description,
          COALESCE((SELECT group_concat(value, ' ') FROM json_each(new.tags_json)), ''));
END;

CREATE TRIGGER IF NOT EXISTS clawhub_skills_ad AFTER DELETE ON clawhub_skills BEGIN
  INSERT INTO clawhub_skills_fts(clawhub_skills_fts, rowid, slug, name, description, tags_text)
  VALUES ('delete', old.rowid, old.slug, old.name, old.description,
          COALESCE((SELECT group_concat(value, ' ') FROM json_each(old.tags_json)), ''));
END;

CREATE TRIGGER IF NOT EXISTS clawhub_skills_au AFTER UPDATE ON clawhub_skills BEGIN
  INSERT INTO clawhub_skills_fts(clawhub_skills_fts, rowid, slug, name, description, tags_text)
  VALUES ('delete', old.rowid, old.slug, old.name, old.description,
          COALESCE((SELECT group_concat(value, ' ') FROM json_each(old.tags_json)), ''));
  INSERT INTO clawhub_skills_fts(rowid, slug, name, description, tags_text)
  VALUES (new.rowid, new.slug, new.name, new.description,
          COALESCE((SELECT group_concat(value, ' ') FROM json_each(new.tags_json)), ''));
END;

-- Sync state tracking (singleton row)
CREATE TABLE IF NOT EXISTS clawhub_sync_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  repo_path TEXT,
  last_commit_hash TEXT,
  last_sync_at TEXT,
  skill_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',
  error_message TEXT
);

INSERT OR IGNORE INTO clawhub_sync_state (id, status) VALUES (1, 'pending');

import Database from 'better-sqlite3';
import path from 'path';

const db = new Database(path.join(process.cwd(), 'delta-social.db'));
db.pragma('journal_mode = WAL');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT DEFAULT (datetime('now')),
    topic TEXT,
    angle TEXT,
    delta_feature TEXT,
    validation_score INTEGER,
    cta TEXT,
    instagram_caption TEXT,
    linkedin_caption TEXT,
    x_caption TEXT,
    slides_json TEXT,
    visual_direction_json TEXT,
    drive_folder_url TEXT,
    status TEXT DEFAULT 'researching',
    ig_post_id TEXT,
    li_post_id TEXT,
    x_post_id TEXT,
    posted_at TEXT,
    reach INTEGER,
    saves INTEGER,
    clicks INTEGER,
    score REAL,
    low_saves INTEGER DEFAULT 0,
    low_reach INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS scheduled_checks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id INTEGER,
    check_at TEXT,
    check_type TEXT,
    completed INTEGER DEFAULT 0
  );
`);

export function getRun(id: number) {
  return db.prepare('SELECT * FROM runs WHERE id = ?').get(id) as any;
}

export function getAllRuns() {
  return db.prepare('SELECT * FROM runs ORDER BY created_at DESC').all() as any[];
}

export function createRun() {
  const result = db.prepare("INSERT INTO runs (status) VALUES ('researching')").run();
  return result.lastInsertRowid as number;
}

export function updateRun(id: number, fields: Record<string, any>) {
  const keys = Object.keys(fields);
  const sets = keys.map(k => `${k} = ?`).join(', ');
  const values = keys.map(k => fields[k]);
  db.prepare(`UPDATE runs SET ${sets} WHERE id = ?`).run(...values, id);
}

export function getRecentRuns(limit: number = 4) {
  return db.prepare('SELECT * FROM runs ORDER BY created_at DESC LIMIT ?').all(limit) as any[];
}

export function getSetting(key: string): string | undefined {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as any;
  return row?.value;
}

export function setSetting(key: string, value: string) {
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value);
}

export function getAllSettings() {
  return db.prepare('SELECT * FROM settings').all() as { key: string; value: string }[];
}

export function scheduleCheck(runId: number, checkAt: string, checkType: string) {
  db.prepare('INSERT INTO scheduled_checks (run_id, check_at, check_type) VALUES (?, ?, ?)').run(runId, checkAt, checkType);
}

export function getPendingChecks() {
  return db.prepare("SELECT * FROM scheduled_checks WHERE completed = 0 AND check_at <= datetime('now')").all() as any[];
}

export function markCheckComplete(id: number) {
  db.prepare('UPDATE scheduled_checks SET completed = 1 WHERE id = ?').run(id);
}

export default db;

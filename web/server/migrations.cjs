// 轻量级数据库迁移系统
const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data.db');

const migrations = [
  {
    name: '001_add_user_fields',
    up(db) {
      const columns = db.prepare("PRAGMA table_info(users)").all().map(c => c.name);
      if (!columns.includes('phone')) {
        db.exec('ALTER TABLE users ADD COLUMN phone TEXT');
        db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone ON users(phone)');
      }
      if (!columns.includes('email_verified')) {
        db.exec('ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0');
      }
      if (!columns.includes('phone_verified')) {
        db.exec('ALTER TABLE users ADD COLUMN phone_verified INTEGER NOT NULL DEFAULT 0');
      }
    },
  },
  {
    name: '002_create_verification_codes',
    up(db) {
      db.exec(`
        CREATE TABLE IF NOT EXISTS verification_codes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          identifier TEXT NOT NULL,
          code_hash TEXT NOT NULL,
          type TEXT NOT NULL,
          purpose TEXT NOT NULL,
          expires_at TEXT NOT NULL,
          used INTEGER NOT NULL DEFAULT 0,
          attempts INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE INDEX IF NOT EXISTS idx_vc_identifier ON verification_codes(identifier, type, purpose);
        CREATE INDEX IF NOT EXISTS idx_vc_expires ON verification_codes(expires_at);
      `);
    },
  },
];

function runMigrations() {
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const applied = db.prepare('SELECT name FROM _migrations').all().map(r => r.name);

  for (const migration of migrations) {
    if (!applied.includes(migration.name)) {
      console.log(`[Migration] Running ${migration.name}...`);
      migration.up(db);
      db.prepare('INSERT INTO _migrations (name) VALUES (?)').run(migration.name);
      console.log(`[Migration] ${migration.name} done.`);
    }
  }

  db.close();
}

module.exports = { runMigrations };

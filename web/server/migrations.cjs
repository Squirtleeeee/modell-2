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
  {
    name: '003_create_device_alerts_messages',
    up(db) {
      db.exec(`
        CREATE TABLE IF NOT EXISTS device_data (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          device_id TEXT NOT NULL,
          user_id INTEGER,
          accel_x REAL, accel_y REAL, accel_z REAL,
          gyro_x REAL, gyro_y REAL, gyro_z REAL,
          fall_detected INTEGER DEFAULT 0,
          steps INTEGER DEFAULT 0,
          battery INTEGER DEFAULT 100,
          activity TEXT DEFAULT 'standing',
          raw_json TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE INDEX IF NOT EXISTS idx_device_user ON device_data(device_id, user_id);
        CREATE INDEX IF NOT EXISTS idx_device_time ON device_data(created_at);

        CREATE TABLE IF NOT EXISTS alerts (
          id TEXT PRIMARY KEY,
          device_id TEXT NOT NULL,
          user_id INTEGER,
          type TEXT NOT NULL,
          time TEXT NOT NULL DEFAULT (datetime('now')),
          status TEXT NOT NULL DEFAULT 'unhandled',
          confidence REAL,
          duration INTEGER,
          location TEXT,
          handler_note TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (user_id) REFERENCES users(id)
        );
        CREATE INDEX IF NOT EXISTS idx_alerts_user ON alerts(user_id);
        CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);

        CREATE TABLE IF NOT EXISTS messages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          from_user_id INTEGER NOT NULL,
          to_user_id INTEGER NOT NULL,
          content TEXT NOT NULL,
          read INTEGER DEFAULT 0,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (from_user_id) REFERENCES users(id),
          FOREIGN KEY (to_user_id) REFERENCES users(id)
        );
        CREATE INDEX IF NOT EXISTS idx_messages_users ON messages(from_user_id, to_user_id);
        CREATE INDEX IF NOT EXISTS idx_messages_time ON messages(created_at);
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

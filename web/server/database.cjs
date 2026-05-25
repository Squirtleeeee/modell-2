// SQLite 数据库初始化
const Database = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');

const DB_PATH = path.join(__dirname, 'data.db');
const db = new Database(DB_PATH);

// 开启 WAL 模式提升并发性能
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// 建表
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    phone TEXT UNIQUE,
    email_verified INTEGER NOT NULL DEFAULT 0,
    phone_verified INTEGER NOT NULL DEFAULT 0,
    password_hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'family',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS password_resets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    used INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS guardianships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ward_id INTEGER NOT NULL,
    guardian_id INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(ward_id, guardian_id),
    FOREIGN KEY (ward_id) REFERENCES users(id),
    FOREIGN KEY (guardian_id) REFERENCES users(id)
  );
`);

// 密码哈希
function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
}

// 用户操作
const User = {
  create(username, email, password, role = 'family', phone = null) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = hashPassword(password, salt);
    const stmt = db.prepare(
      'INSERT INTO users (username, email, password_hash, salt, role, phone) VALUES (?, ?, ?, ?, ?, ?)'
    );
    const result = stmt.run(username, email, hash, salt, role, phone || null);
    return this.findById(result.lastInsertRowid);
  },

  findById(id) {
    const row = db.prepare('SELECT id, username, email, phone, email_verified, phone_verified, role, created_at, updated_at FROM users WHERE id = ?').get(id);
    return row || null;
  },

  findByUsername(username) {
    return db.prepare('SELECT * FROM users WHERE username = ?').get(username) || null;
  },

  findByEmail(email) {
    return db.prepare('SELECT * FROM users WHERE email = ?').get(email) || null;
  },

  findByPhone(phone) {
    return db.prepare('SELECT * FROM users WHERE phone = ?').get(phone) || null;
  },

  verifyPassword(password, user) {
    const hash = hashPassword(password, user.salt);
    return hash === user.password_hash;
  },

  updatePassword(id, newPassword) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = hashPassword(newPassword, salt);
    db.prepare('UPDATE users SET password_hash = ?, salt = ?, updated_at = datetime(\'now\') WHERE id = ?').run(hash, salt, id);
  },

  setEmailVerified(id) {
    db.prepare('UPDATE users SET email_verified = 1, updated_at = datetime(\'now\') WHERE id = ?').run(id);
  },

  setPhoneVerified(id) {
    db.prepare('UPDATE users SET phone_verified = 1, updated_at = datetime(\'now\') WHERE id = ?').run(id);
  },

  setPhone(id, phone) {
    db.prepare('UPDATE users SET phone = ?, phone_verified = 1, updated_at = datetime(\'now\') WHERE id = ?').run(phone, id);
  },

  list() {
    return db.prepare('SELECT id, username, email, phone, email_verified, phone_verified, role, created_at, updated_at FROM users ORDER BY created_at DESC').all();
  },

  count() {
    return db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  },
};

// 密码重置 Token
const PasswordReset = {
  create(userId) {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 3600000).toISOString(); // 1 小时有效
    db.prepare('INSERT INTO password_resets (user_id, token, expires_at) VALUES (?, ?, ?)').run(userId, token, expiresAt);
    return token;
  },

  findByToken(token) {
    return db.prepare('SELECT * FROM password_resets WHERE token = ? AND used = 0').get(token) || null;
  },

  markUsed(token) {
    db.prepare('UPDATE password_resets SET used = 1 WHERE token = ?').run(token);
  },
};

// 监护人关系
const Guardianship = {
  // A 设置 B 为自己的监护人，即：B 监护 A
  addGuardian(wardId, guardianId) {
    if (wardId === guardianId) throw new Error('不能将自己设为监护人');
    try {
      db.prepare('INSERT INTO guardianships (ward_id, guardian_id) VALUES (?, ?)').run(wardId, guardianId);
      return true;
    } catch (e) {
      if (e.message?.includes('UNIQUE')) throw new Error('该用户已经是你的监护人了');
      throw e;
    }
  },

  removeGuardian(wardId, guardianId) {
    db.prepare('DELETE FROM guardianships WHERE ward_id = ? AND guardian_id = ?').run(wardId, guardianId);
  },

  // 我的监护人列表（监护我的人）
  myGuardians(userId) {
    return db.prepare(`
      SELECT u.id, u.username, u.email, u.role, g.created_at as since
      FROM guardianships g
      JOIN users u ON u.id = g.guardian_id
      WHERE g.ward_id = ?
      ORDER BY g.created_at DESC
    `).all(userId);
  },

  // 我监护的人列表（被我监护的人）
  myWards(userId) {
    return db.prepare(`
      SELECT u.id, u.username, u.email, u.role, g.created_at as since
      FROM guardianships g
      JOIN users u ON u.id = g.ward_id
      WHERE g.guardian_id = ?
      ORDER BY g.created_at DESC
    `).all(userId);
  },

  // 获取某用户的全部监护人 ID（用于通知推送）
  guardianIdsOf(wardId) {
    return db.prepare('SELECT guardian_id FROM guardianships WHERE ward_id = ?').all(wardId).map(r => r.guardian_id);
  },

  isGuardian(wardId, guardianId) {
    const row = db.prepare('SELECT id FROM guardianships WHERE ward_id = ? AND guardian_id = ?').get(wardId, guardianId);
    return !!row;
  },
};

// 验证码
const VerificationCode = {
  create(identifier, code, type, purpose) {
    const codeHash = crypto.createHash('sha256').update(code).digest('hex');
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    // 删除同一 identifier+type+purpose 的旧未使用验证码
    db.prepare(
      'DELETE FROM verification_codes WHERE identifier = ? AND type = ? AND purpose = ? AND used = 0'
    ).run(identifier, type, purpose);
    // 清理过期和已使用的验证码
    db.prepare(
      "DELETE FROM verification_codes WHERE expires_at < datetime('now') OR used = 1"
    ).run();
    db.prepare(
      'INSERT INTO verification_codes (identifier, code_hash, type, purpose, expires_at) VALUES (?, ?, ?, ?, ?)'
    ).run(identifier, codeHash, type, purpose, expiresAt);
  },

  verify(identifier, code, type, purpose) {
    const codeHash = crypto.createHash('sha256').update(code).digest('hex');
    const record = db.prepare(
      `SELECT * FROM verification_codes
       WHERE identifier = ? AND type = ? AND purpose = ? AND used = 0 AND expires_at > datetime('now')
       ORDER BY created_at DESC LIMIT 1`
    ).get(identifier, type, purpose);

    if (!record) return { success: false, error: '验证码不存在或已过期' };

    // 增加尝试次数
    const attempts = record.attempts + 1;
    db.prepare('UPDATE verification_codes SET attempts = ? WHERE id = ?').run(attempts, record.id);

    if (attempts > 5) {
      db.prepare('UPDATE verification_codes SET used = 1 WHERE id = ?').run(record.id);
      return { success: false, error: '验证码尝试次数过多，请重新获取' };
    }

    if (record.code_hash !== codeHash) {
      return { success: false, error: '验证码错误' };
    }

    db.prepare('UPDATE verification_codes SET used = 1 WHERE id = ?').run(record.id);
    return { success: true };
  },
};

// 创建默认管理员（首次启动）
if (User.count() === 0) {
  User.create('admin', 'admin@example.com', 'admin123', 'admin');
  console.log('[DB] 默认管理员已创建: admin / admin123');
}

module.exports = { db, User, PasswordReset, Guardianship, VerificationCode };

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

// ========== 设备数据 ==========
const DeviceData = {
  insert(deviceId, userId, data) {
    const stmt = db.prepare(`
      INSERT INTO device_data (device_id, user_id, accel_x, accel_y, accel_z, gyro_x, gyro_y, gyro_z, fall_detected, steps, battery, activity, raw_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const a = data.accel || {};
    const g = data.gyro || {};
    return stmt.run(
      deviceId, userId,
      a.x ?? null, a.y ?? null, a.z ?? null,
      g.x ?? null, g.y ?? null, g.z ?? null,
      data.fall_detected ? 1 : 0,
      data.steps ?? 0,
      data.battery ?? 100,
      data.activity || 'standing',
      JSON.stringify(data)
    );
  },

  // 今日汇总（指定用户）
  todaySummary(userId) {
    const row = db.prepare(`
      SELECT
        COALESCE(SUM(steps), 0) as steps,
        COALESCE(MAX(battery), 0) as battery,
        COALESCE(SUM(CASE WHEN fall_detected = 1 THEN 1 ELSE 0 END), 0) as fall_events,
        COALESCE(ROUND(SUM(CASE WHEN activity = 'walking' THEN 1 ELSE 0 END) / 12.0), 0) as walk_minutes,
        COALESCE(ROUND(SUM(CASE WHEN activity = 'standing' THEN 1 ELSE 0 END) / 12.0), 0) as stand_minutes
      FROM device_data
      WHERE user_id = ? AND date(created_at) = date('now')
    `).get(userId);
    const alertsDb = require('./database.cjs');
    const sedCount = db.prepare("SELECT COUNT(*) as c FROM alerts WHERE user_id = ? AND type = 'sedentary' AND date(created_at) = date('now')").get(userId)?.c || 0;
    return {
      steps: row?.steps || 0,
      walkDurationMin: row?.walk_minutes || 0,
      standDurationMin: row?.stand_minutes || 0,
      fallEvents: row?.fall_events || 0,
      sedentaryAlerts: sedCount,
      battery: row?.battery || 0,
    };
  },

  // 每日活动占比趋势（横/竖/走/摔 百分比）
  dailyActivityTrend(userId, days) {
    const rows = db.prepare(`
      SELECT date(created_at) as date, activity, COUNT(*) as cnt
      FROM device_data
      WHERE user_id = ? AND date(created_at) >= date('now', ?)
      GROUP BY date(created_at), activity
      ORDER BY date(created_at)
    `).all(userId, `-${days - 1} days`);

    const result = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const label = `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const dayRows = rows.filter(r => r.date === key);
      const total = dayRows.reduce((s, r) => s + r.cnt, 0);
      const getPct = (act) => total > 0 ? Math.round((dayRows.find(r => r.activity === act)?.cnt || 0) / total * 100) : 0;
      result.push({ date: label, lying: getPct('lying'), standing: getPct('standing'), walking: getPct('walking'), fallen: getPct('fallen') });
    }
    return result;
  },

  // 7 天趋势（保留兼容）
  weeklyTrend(userId) {
    const deviceRows = db.prepare(`
      SELECT
        date(created_at) as date,
        COALESCE(SUM(steps), 0) as steps,
        COALESCE(SUM(CASE WHEN fall_detected = 1 THEN 1 ELSE 0 END), 0) as falls
      FROM device_data
      WHERE user_id = ? AND created_at >= datetime('now', '-6 days')
      GROUP BY date(created_at)
      ORDER BY date(created_at)
    `).all(userId);
    const alertCounts = db.prepare(`
      SELECT date(created_at) as date, COUNT(*) as cnt
      FROM alerts WHERE user_id = ? AND type = 'sedentary'
      AND created_at >= datetime('now', '-6 days')
      GROUP BY date(created_at)
    `).all(userId);
    const map = {};
    for (const r of deviceRows) map[r.date] = { ...r, sedentary: 0 };
    for (const a of alertCounts) {
      if (map[a.date]) map[a.date].sedentary = a.cnt;
    }
    const result = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const label = `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const r = map[key];
      result.push({
        date: label,
        steps: r?.steps || 0,
        sedentary: r?.sedentary || 0,
        falls: r?.falls || 0,
      });
    }
    return result;
  },

  // 设备当前状态
  deviceStatus(deviceId, userId) {
    const row = db.prepare(`
      SELECT device_id, battery, activity, created_at
      FROM device_data
      WHERE (? IS NULL OR device_id = ?) AND (? IS NULL OR user_id = ?)
      ORDER BY created_at DESC
      LIMIT 1
    `).get(deviceId, deviceId, userId, userId);
    if (!row) return null;
    const online = (Date.now() - new Date(row.created_at).getTime()) < 120000;
    return {
      id: row.device_id,
      status: online ? 'online' : 'offline',
      battery: row.battery,
      currentActivity: row.activity,
      lastHeartbeat: row.created_at,
    };
  },
};

// ========== 告警 ==========
const Alert = {
  list(params = {}) {
    const conditions = ['1=1'];
    const args = [];
    if (params.userId) { conditions.push('user_id = ?'); args.push(params.userId); }
    if (params.type && params.type !== 'all') { conditions.push('type = ?'); args.push(params.type); }
    if (params.status && params.status !== 'all') { conditions.push('status = ?'); args.push(params.status); }
    if (params.dateStart) { conditions.push("date(created_at) >= ?"); args.push(params.dateStart); }
    if (params.dateEnd) { conditions.push("date(created_at) <= ?"); args.push(params.dateEnd); }
    const where = conditions.join(' AND ');
    const total = db.prepare(`SELECT COUNT(*) as count FROM alerts WHERE ${where}`).get(...args).count;
    const list = db.prepare(`SELECT * FROM alerts WHERE ${where} ORDER BY created_at DESC`).all(...args);
    return { list, total };
  },

  create(data) {
    const id = `ALT-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    db.prepare(`
      INSERT INTO alerts (id, device_id, user_id, type, time, status, confidence, duration, location)
      VALUES (?, ?, ?, ?, ?, 'unhandled', ?, ?, ?)
    `).run(id, data.deviceId, data.userId, data.type, new Date().toISOString(), data.confidence ?? null, data.duration ?? null, data.location ?? null);
    return db.prepare('SELECT * FROM alerts WHERE id = ?').get(id);
  },

  updateStatus(id, status, note) {
    db.prepare(`
      UPDATE alerts SET status = ?, handler_note = ?, updated_at = datetime('now') WHERE id = ?
    `).run(status, note || null, id);
    return db.prepare('SELECT * FROM alerts WHERE id = ?').get(id);
  },
};

// ========== 消息 ==========
const Message = {
  send(fromUserId, toUserId, content) {
    const stmt = db.prepare(`
      INSERT INTO messages (from_user_id, to_user_id, content) VALUES (?, ?, ?)
    `);
    const result = stmt.run(fromUserId, toUserId, content);
    return db.prepare(`
      SELECT m.*, u.username as from_username FROM messages m
      JOIN users u ON u.id = m.from_user_id
      WHERE m.id = ?
    `).get(result.lastInsertRowid);
  },

  // 两人的对话历史
  conversation(user1, user2, limit = 50) {
    return db.prepare(`
      SELECT m.*, u.username as from_username FROM messages m
      JOIN users u ON u.id = m.from_user_id
      WHERE (m.from_user_id = ? AND m.to_user_id = ?) OR (m.from_user_id = ? AND m.to_user_id = ?)
      ORDER BY m.created_at ASC
      LIMIT ?
    `).all(user1, user2, user2, user1, limit);
  },

  // 与我相关的最近对话列表
  recentContacts(userId) {
    return db.prepare(`
      SELECT DISTINCT
        CASE WHEN m.from_user_id = ? THEN m.to_user_id ELSE m.from_user_id END as contact_id,
        u.username,
        (SELECT content FROM messages WHERE (from_user_id = ? AND to_user_id = u.id) OR (from_user_id = u.id AND to_user_id = ?) ORDER BY created_at DESC LIMIT 1) as last_msg,
        (SELECT created_at FROM messages WHERE (from_user_id = ? AND to_user_id = u.id) OR (from_user_id = u.id AND to_user_id = ?) ORDER BY created_at DESC LIMIT 1) as last_time
      FROM messages m
      JOIN users u ON u.id = CASE WHEN m.from_user_id = ? THEN m.to_user_id ELSE m.from_user_id END
      WHERE m.from_user_id = ? OR m.to_user_id = ?
      ORDER BY last_time DESC
    `).all(userId, userId, userId, userId, userId, userId, userId, userId);
  },

  markRead(fromUserId, toUserId) {
    db.prepare(`
      UPDATE messages SET read = 1 WHERE from_user_id = ? AND to_user_id = ? AND read = 0
    `).run(fromUserId, toUserId);
  },

  unreadCount(userId) {
    const row = db.prepare(`
      SELECT COUNT(*) as count FROM messages WHERE to_user_id = ? AND read = 0
    `).get(userId);
    return row.count;
  },
};

// ========== 监护人申请 ==========
const GuardianRequest = {
  // A 申请监护 B
  create(fromUserId, toUserId) {
    if (fromUserId === toUserId) throw new Error('不能对自己发起申请');
    if (Guardianship.isGuardian(toUserId, fromUserId)) throw new Error('已是监护人关系');
    try {
      db.prepare('INSERT INTO guardian_requests (from_user_id, to_user_id) VALUES (?, ?)').run(fromUserId, toUserId);
      return db.prepare('SELECT * FROM guardian_requests WHERE from_user_id = ? AND to_user_id = ?').get(fromUserId, toUserId);
    } catch (e) {
      if (e.message?.includes('UNIQUE')) throw new Error('已有待处理的申请');
      throw e;
    }
  },

  // 我收到的申请
  pendingForMe(userId) {
    return db.prepare(`
      SELECT r.*, u.username as from_username, u.email as from_email
      FROM guardian_requests r
      JOIN users u ON u.id = r.from_user_id
      WHERE r.to_user_id = ? AND r.status = 'pending'
      ORDER BY r.created_at DESC
    `).all(userId);
  },

  // 我发出的申请
  sentByMe(userId) {
    return db.prepare(`
      SELECT r.*, u.username as to_username
      FROM guardian_requests r
      JOIN users u ON u.id = r.to_user_id
      WHERE r.from_user_id = ? AND r.status = 'pending'
      ORDER BY r.created_at DESC
    `).all(userId);
  },

  // 同意申请
  accept(requestId, userId) {
    const req = db.prepare('SELECT * FROM guardian_requests WHERE id = ? AND to_user_id = ? AND status = ?').get(requestId, userId, 'pending');
    if (!req) throw new Error('申请不存在或已处理');
    db.prepare("UPDATE guardian_requests SET status = 'accepted', updated_at = datetime('now') WHERE id = ?").run(requestId);
    Guardianship.addGuardian(req.to_user_id, req.from_user_id);
    return req;
  },

  // 拒绝申请
  reject(requestId, userId) {
    const req = db.prepare('SELECT * FROM guardian_requests WHERE id = ? AND to_user_id = ? AND status = ?').get(requestId, userId, 'pending');
    if (!req) throw new Error('申请不存在或已处理');
    db.prepare("UPDATE guardian_requests SET status = 'rejected', updated_at = datetime('now') WHERE id = ?").run(requestId);
    return req;
  },

  // 未读申请数
  pendingCount(userId) {
    const row = db.prepare('SELECT COUNT(*) as count FROM guardian_requests WHERE to_user_id = ? AND status = ?').get(userId, 'pending');
    return row.count;
  },
};

// ========== 设备配置 ==========
const DeviceConfig = {
  get(userId, deviceId = 'EDGI-001') {
    let row = db.prepare('SELECT * FROM device_configs WHERE user_id = ? AND device_id = ?').get(userId, deviceId);
    if (!row) {
      db.prepare('INSERT INTO device_configs (user_id, device_id) VALUES (?, ?)').run(userId, deviceId);
      row = db.prepare('SELECT * FROM device_configs WHERE user_id = ? AND device_id = ?').get(userId, deviceId);
    }
    return {
      sedentaryInterval: row.sedentary_interval,
      sedentaryMode: row.sedentary_mode,
      alertVolume: row.alert_volume,
      fallSensitivity: row.fall_sensitivity,
      voiceEnabled: Boolean(row.voice_enabled ?? 1),
      wifiSsid: row.wifi_ssid || '未配置',
    };
  },

  update(userId, deviceId, config) {
    db.prepare(`
      UPDATE device_configs SET
        sedentary_interval = ?, sedentary_mode = ?, alert_volume = ?,
        fall_sensitivity = ?, voice_enabled = ?, wifi_ssid = ?,
        updated_at = datetime('now')
      WHERE user_id = ? AND device_id = ?
    `).run(
      config.sedentaryInterval ?? 30, config.sedentaryMode ?? 'both',
      config.alertVolume ?? 80, config.fallSensitivity ?? 'standard',
      config.voiceEnabled ? 1 : 0, config.wifiSsid || '未配置',
      userId, deviceId || 'EDGI-001'
    );
    return this.get(userId, deviceId);
  },
};

module.exports = { db, User, PasswordReset, Guardianship, VerificationCode, DeviceData, Alert, Message, GuardianRequest, DeviceConfig };

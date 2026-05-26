// 种子数据脚本 — 创建演示账户和模拟历史数据
// 用法: node server/seed.cjs

const Database = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');

const DB_PATH = path.join(__dirname, 'data.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
}

// 创建用户（不存在才创建）
function ensureUser(username, email, password, role, phone) {
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    console.log(`  ${username} 已存在，跳过`);
    return existing;
  }
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = hashPassword(password, salt);
  const result = db.prepare(
    'INSERT INTO users (username, email, password_hash, salt, role, phone, email_verified, phone_verified) VALUES (?, ?, ?, ?, ?, ?, 1, 1)'
  ).run(username, email, hash, salt, role, phone || null);
  console.log(`  ${username} 创建成功 (${role})`);
  return { id: result.lastInsertRowid };
}

// 创建监护人关系
function ensureGuardianship(wardName, guardianName) {
  const ward = db.prepare('SELECT id FROM users WHERE username = ?').get(wardName);
  const guardian = db.prepare('SELECT id FROM users WHERE username = ?').get(guardianName);
  if (!ward || !guardian) return;
  try {
    db.prepare('INSERT INTO guardianships (ward_id, guardian_id) VALUES (?, ?)').run(ward.id, guardian.id);
    console.log(`  监护关系: ${guardianName} → ${wardName}`);
  } catch (e) {
    if (e.message?.includes('UNIQUE')) {
      console.log(`  监护关系 ${guardianName} → ${wardName} 已存在`);
    }
  }
}

// 生成设备历史数据
function generateDeviceData(deviceId, userId, days) {
  const stmt = db.prepare(`
    INSERT INTO device_data (device_id, user_id, accel_x, accel_y, accel_z, gyro_x, gyro_y, gyro_z, fall_detected, steps, battery, activity, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let totalSteps = 0;
  let count = 0;

  for (let d = days; d >= 0; d--) {
    const date = new Date();
    date.setDate(date.getDate() - d);

    // 每天生成 8:00-22:00 的数据，每 10 分钟一条
    for (let h = 8; h <= 22; h++) {
      for (let m = 0; m < 60; m += 10) {
        date.setHours(h, m, 0, 0);
        const hourWeight = h >= 8 && h <= 10 ? 2 : h >= 16 && h <= 18 ? 2 : h >= 20 ? 0.5 : 1;

        const isWalking = Math.random() < 0.3 * hourWeight;
        const isFall = Math.random() < 0.002; // 极低概率跌倒
        const activity = isFall ? 'fall' : isWalking ? 'walking' : 'standing';
        const stepInc = isWalking ? Math.floor(Math.random() * 80 + 30) : 0;
        totalSteps += stepInc;
        const battery = Math.max(30, 100 - (d * 8) - (h * 0.3) + Math.random() * 5);

        const a = activity === 'walking'
          ? { x: (Math.random() - 0.5) * 0.5, y: Math.random() * 1.5, z: 9.8 + Math.random() }
          : activity === 'fall'
          ? { x: (Math.random() - 0.5) * 6, y: (Math.random() - 0.5) * 6, z: 2 + Math.random() * 3 }
          : { x: (Math.random() - 0.5) * 0.05, y: (Math.random() - 0.5) * 0.05, z: 9.81 };

        stmt.run(
          deviceId, userId,
          a.x, a.y, a.z,
          (Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.3,
          isFall ? 1 : 0,
          totalSteps,
          Math.round(battery),
          activity,
          date.toISOString()
        );
        count++;
      }
    }
  }

  return { count, totalSteps };
}

// 生成历史告警
function generateAlerts(deviceId, userId, days) {
  const stmt = db.prepare(`
    INSERT INTO alerts (id, device_id, user_id, type, time, status, confidence, duration, location, handler_note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const fallLocations = ['客厅', '卧室', '厨房', '卫生间', '走廊'];
  let n = 0;

  for (let d = days; d >= 0; d--) {
    const date = new Date();
    date.setDate(date.getDate() - d);

    // 每天 1-2 次久坐告警
    const sedentaryCount = 1 + Math.floor(Math.random() * 2);
    for (let i = 0; i < sedentaryCount; i++) {
      date.setHours(9 + Math.floor(Math.random() * 12), Math.floor(Math.random() * 60), 0, 0);
      const id = `ALT-${date.getTime()}-S${i}`;
      const statuses = ['handled', 'handled', 'handled', 'processing', 'unhandled'];
      const status = d === 0 ? statuses[Math.floor(Math.random() * 3)] : 'handled';
      stmt.run(id, deviceId, userId, 'sedentary', date.toISOString(), status, null, 30 + Math.floor(Math.random() * 30), null, status === 'handled' ? '已提醒起身活动' : null);
      n++;
    }

    // 约每 3 天一次跌倒告警
    if (Math.random() < 0.35) {
      date.setHours(10 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 60), 0, 0);
      const id = `ALT-${date.getTime()}-F`;
      const status = d <= 1 ? 'handled' : Math.random() < 0.15 ? 'false_alarm' : 'handled';
      const location = fallLocations[Math.floor(Math.random() * fallLocations.length)];
      const note = status === 'false_alarm' ? '用户快速坐下，误触发' : status === 'handled' ? '已电话确认无大碍' : null;
      stmt.run(id, deviceId, userId, 'fall', date.toISOString(), status, 0.85 + Math.random() * 0.12, null, location, note);
      n++;
    }
  }

  return n;
}

// ========== 主流程 ==========
console.log('\n=== 种子数据脚本 ===\n');

console.log('1. 创建演示账户:');
const laowang = ensureUser('laowang', 'laowang@example.com', 'demo123', 'family', '13800001111');
const zhangsan = ensureUser('zhangsan', 'zhangsan@example.com', 'demo123', 'family', '13800002222');
const lihua = ensureUser('lihua', 'lihua@example.com', 'demo123', 'family', '13800003333');

console.log('\n2. 设置监护人关系:');
ensureGuardianship('laowang', 'zhangsan');
ensureGuardianship('laowang', 'lihua');

console.log('\n3. 生成设备历史数据 (laowang, 7天):');
const dataResult = generateDeviceData('EDGI-001', laowang.id, 7);
console.log(`  共 ${dataResult.count} 条数据，累计 ${dataResult.totalSteps} 步`);

console.log('\n4. 生成历史告警:');
const alertCount = generateAlerts('EDGI-001', laowang.id, 7);
console.log(`  共 ${alertCount} 条告警`);

// 5. 生成示例消息
console.log('\n5. 生成示例消息:');
const msgs = [
  { from: 'zhangsan', to: 'laowang', text: '爸，今天身体怎么样？' },
  { from: 'laowang', to: 'zhangsan', text: '挺好的，在楼下散了会步' },
  { from: 'zhangsan', to: 'laowang', text: '那就好，记得按时吃药' },
  { from: 'lihua', to: 'laowang', text: '王叔，明天我来看您' },
  { from: 'laowang', to: 'lihua', text: '好的，路上注意安全' },
];
const msgStmt = db.prepare('INSERT INTO messages (from_user_id, to_user_id, content, created_at) VALUES (?, ?, ?, ?)');
for (let i = 0; i < msgs.length; i++) {
  const m = msgs[i];
  const from = db.prepare('SELECT id FROM users WHERE username = ?').get(m.from);
  const to = db.prepare('SELECT id FROM users WHERE username = ?').get(m.to);
  if (from && to) {
    const t = new Date();
    t.setHours(t.getHours() - (msgs.length - i) * 2);
    msgStmt.run(from.id, to.id, m.text, t.toISOString());
    console.log(`  ${m.from} → ${m.to}: "${m.text}"`);
  }
}

db.close();
console.log('\n=== 种子数据创建完成 ===\n');
console.log('演示账户:');
console.log('  zhangsan / demo123 — 家属（laowang 的监护人）');
console.log('  lihua / demo123 — 家属（laowang 的监护人）');
console.log('  laowang / demo123 — 被监护人');
console.log('  admin / admin123 — 管理员');

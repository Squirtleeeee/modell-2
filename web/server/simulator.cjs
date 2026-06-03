// 设备模拟器 — 模拟嵌入式设备持续上报数据
// 用法: node server/simulator.cjs [token]
//   如果不传 token，自动用 admin/admin123 登录获取
const BASE = process.env.API_URL || 'http://localhost:3001';
const DEVICE_ID = 'EDGI-001';

let token = process.argv[2] || null;
let steps = 0;

async function api(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (token) opts.headers.Authorization = `Bearer ${token}`;
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  return res.json();
}

function randomWalk() {
  // 模拟走路时的加速度波形
  const base = 9.8;
  const amplitude = 0.8 + Math.random() * 1.5;
  const phase = Math.random() * Math.PI * 2;
  return {
    x: (Math.random() - 0.5) * 0.3 * amplitude,
    y: Math.sin(phase) * amplitude,
    z: base + Math.cos(phase * 2) * amplitude * 0.5,
  };
}

function randomStand() {
  // 站立时的小幅波动
  return {
    x: (Math.random() - 0.5) * 0.05,
    y: (Math.random() - 0.5) * 0.05,
    z: 9.81 + (Math.random() - 0.5) * 0.1,
  };
}

function fallAccel() {
  // 跌倒特征：z 轴急剧下降，x/y 大幅抖动
  return {
    x: (Math.random() - 0.5) * 6,
    y: (Math.random() - 0.5) * 6,
    z: 2.0 + Math.random() * 3,
  };
}

function randomLie() {
  // 平躺时的稳定小幅波动
  return {
    x: 0.2 + (Math.random() - 0.5) * 0.1,
    y: (Math.random() - 0.5) * 0.05,
    z: 0.3 + (Math.random() - 0.5) * 0.1,
  };
}

async function sendData(activity, fallDetected) {
  const accel = activity === 'walking' ? randomWalk() : activity === 'fallen' ? fallAccel() : activity === 'lying' ? randomLie() : randomStand();
  const gyro = {
    x: (Math.random() - 0.5) * 0.3,
    y: (Math.random() - 0.5) * 0.3,
    z: (Math.random() - 0.5) * 0.3,
  };
  const stepInc = activity === 'walking' ? Math.floor(Math.random() * 40 + 20) : 0;
  steps += stepInc;
  const battery = Math.max(0, 85 - (steps % 3000) * 0.02);

  const payload = {
    device_id: DEVICE_ID,
    accel,
    gyro,
    fall_detected: fallDetected,
    steps,
    battery: Math.round(battery),
    activity,
  };

  const r = await api('POST', '/api/device/data', payload);
  const icon = fallDetected ? '🆘 跌倒!' : activity === 'walking' ? '🚶' : activity === 'lying' ? '🛌' : '🧍';
  console.log(`${icon} [${new Date().toISOString().slice(11, 19)}] ${activity} | steps=${steps} batt=${Math.round(battery)}% | ${JSON.stringify(r)}`);
}

async function main() {
  // 登录获取 token
  if (!token) {
    console.log('模拟器启动，登录中...');
    const res = await api('POST', '/api/auth/login', { username: 'admin', password: 'admin123' });
    if (res.token) {
      token = res.token;
      console.log('登录成功，开始模拟设备数据上报\n');
    } else {
      console.error('登录失败:', res);
      process.exit(1);
    }
  }

  const states = ['lying', 'standing', 'walking'];
  let cycle = 0;
  setInterval(async () => {
    cycle++;
    const fall = cycle % 50 === 25;
    const activity = fall ? 'fallen' : states[cycle % 3];
    await sendData(activity, fall);
  }, 5000);
}

main().catch(console.error);

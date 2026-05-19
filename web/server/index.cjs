// Express 后端 — 登录认证 + 静态文件托管（统一端口）
const express = require('express');
const cors = require('cors');
const path = require('path');
const authRoutes = require('./routes/auth.cjs');
const { User, Guardianship } = require('./database.cjs');
const { requireAuth } = require('./middleware/auth.cjs');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// API 路由
app.use('/api/auth', authRoutes);
app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

// 监护人路由（内联）
app.get('/api/guardians', requireAuth, (req, res) => {
  const guardians = Guardianship.myGuardians(req.user.id);
  const wards = Guardianship.myWards(req.user.id);
  res.json({ guardians, wards });
});
app.post('/api/guardians', requireAuth, (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: '请输入用户名' });
  const guardian = User.findByUsername(username);
  if (!guardian) return res.status(404).json({ error: '用户不存在' });
  try {
    Guardianship.addGuardian(req.user.id, guardian.id);
    res.status(201).json({ guardian: User.findById(guardian.id) });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});
app.delete('/api/guardians/:id', requireAuth, (req, res) => {
  const guardianId = parseInt(req.params.id);
  if (!Guardianship.isGuardian(req.user.id, guardianId)) {
    return res.status(404).json({ error: '未找到该监护人关系' });
  }
  Guardianship.removeGuardian(req.user.id, guardianId);
  res.json({ message: '已移除监护人' });
});

// 托管前端静态文件（dist 目录）
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));

// SPA 回退：前端路由交给 React Router 处理
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  // 如果请求的不是静态文件（无扩展名），返回 index.html
  if (!path.extname(req.path)) {
    res.sendFile(path.join(distPath, 'index.html'));
  } else {
    next();
  }
});

app.listen(PORT, () => {
  console.log(`\n  服务已启动: http://localhost:${PORT}`);
  console.log(`  前端页面: http://localhost:${PORT}/`);
  console.log(`  API 健康: http://localhost:${PORT}/api/health\n`);
});

// Express 后端 — API + 静态文件 + WebSocket
const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const { runMigrations } = require('./migrations.cjs');
const authRoutes = require('./routes/auth.cjs');
const dashboardRoutes = require('./routes/dashboard.cjs');
const deviceRoutes = require('./routes/device.cjs');
const alertsRoutes = require('./routes/alerts.cjs');
const messagesRoutes = require('./routes/messages.cjs');
const guardianRoutes = require('./routes/guardians.cjs');

// 运行数据库迁移
runMigrations();

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*', methods: ['GET', 'POST'] } });
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// 注入 io 到请求上下文，供消息路由使用
app.set('io', io);

// API 路由
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/device', deviceRoutes);
app.use('/api/alerts', alertsRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/guardians', guardianRoutes);
app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

// WebSocket 连接管理
io.on('connection', (socket) => {
  console.log('[WS] 客户端连接:', socket.id);

  // 用户上线：加入个人房间
  socket.on('join', (userId) => {
    socket.join(`user:${userId}`);
    socket.userId = userId;
    console.log(`[WS] 用户 ${userId} 上线`);
  });

  // 发送消息（实时）
  socket.on('send_message', (data) => {
    const { to, content } = data;
    if (!socket.userId || !to || !content) return;
    const { Message } = require('./database.cjs');
    const msg = Message.send(socket.userId, to, content);
    io.to(`user:${to}`).emit('new_message', msg);
    socket.emit('new_message', msg);
  });

  socket.on('disconnect', () => {
    console.log('[WS] 客户端断开:', socket.id);
  });
});

// 托管前端静态文件（dist 目录）
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));

// SPA 回退
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  if (!path.extname(req.path)) {
    res.sendFile(path.join(distPath, 'index.html'));
  } else {
    next();
  }
});

server.listen(PORT, () => {
  console.log(`\n  服务已启动: http://localhost:${PORT}`);
  console.log(`  前端页面: http://localhost:${PORT}/`);
  console.log(`  API 健康: http://localhost:${PORT}/api/health`);
  console.log(`  WebSocket: ws://localhost:${PORT}\n`);
});

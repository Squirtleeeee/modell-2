// 认证路由: 注册 / 登录 / 找回密码 / 获取用户信息
const { Router } = require('express');
const { User, PasswordReset } = require('../database.cjs');
const { generateToken, requireAuth } = require('../middleware/auth.cjs');

const router = Router();

// POST /api/auth/register
router.post('/register', (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: '用户名、邮箱和密码不能为空' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: '密码长度不能少于 6 位' });
  }
  if (User.findByUsername(username)) {
    return res.status(409).json({ error: '用户名已存在' });
  }
  if (User.findByEmail(email)) {
    return res.status(409).json({ error: '邮箱已被注册' });
  }

  const user = User.create(username, email, password, 'family');
  const token = generateToken(user);
  res.status(201).json({ token, user: { id: user.id, username: user.username, email: user.email, role: user.role } });
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码不能为空' });
  }

  const user = User.findByUsername(username);
  if (!user) {
    return res.status(401).json({ error: '用户名或密码错误' });
  }
  if (!User.verifyPassword(password, user)) {
    return res.status(401).json({ error: '用户名或密码错误' });
  }

  const token = generateToken(user);
  res.json({
    token,
    user: { id: user.id, username: user.username, email: user.email, role: user.role },
  });
});

// GET /api/auth/me — 获取当前登录用户信息
router.get('/me', requireAuth, (req, res) => {
  const user = User.findById(req.user.id);
  if (!user) return res.status(404).json({ error: '用户不存在' });
  res.json({ user });
});

// POST /api/auth/forgot-password — 发送重置密码 Token
router.post('/forgot-password', (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: '请输入邮箱' });

  const user = User.findByEmail(email);
  if (!user) {
    // 不暴露用户是否存在，统一返回成功
    return res.json({ message: '如果该邮箱已注册，您将收到重置密码的链接' });
  }

  const token = PasswordReset.create(user.id);
  // 开发模式下输出 Token 到控制台（生产环境应发邮件）
  console.log(`\n[密码重置] 用户: ${user.username}, Token: ${token}\n`);
  res.json({
    message: '如果该邮箱已注册，您将收到重置密码的链接',
    // 开发模式返回 token（生产环境去掉这行）
    devToken: token,
  });
});

// POST /api/auth/reset-password — 使用 Token 重置密码
router.post('/reset-password', (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) {
    return res.status(400).json({ error: 'Token 和新密码不能为空' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: '密码长度不能少于 6 位' });
  }

  const record = PasswordReset.findByToken(token);
  if (!record) {
    return res.status(400).json({ error: '无效或已过期的重置链接' });
  }
  if (new Date(record.expires_at) < new Date()) {
    return res.status(400).json({ error: '重置链接已过期，请重新申请' });
  }

  User.updatePassword(record.user_id, newPassword);
  PasswordReset.markUsed(token);
  res.json({ message: '密码重置成功，请使用新密码登录' });
});

module.exports = router;

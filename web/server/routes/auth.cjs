// 认证路由: 注册 / 登录 / 找回密码 / 获取用户信息 / 验证码
const { Router } = require('express');
const { User, PasswordReset, VerificationCode } = require('../database.cjs');
const { generateToken, requireAuth } = require('../middleware/auth.cjs');
const { sendVerificationCodeEmail, sendPasswordResetEmail } = require('../services/email.cjs');
const { sendVerificationCodeSms, sendLoginCodeSms } = require('../services/sms.cjs');
const { sendCodeLimiter, verifyCodeLimiter, loginLimiter, registerLimiter } = require('../middleware/rateLimit.cjs');

const router = Router();

// POST /api/auth/register — 注册（含邮箱验证码）
router.post('/register', registerLimiter, (req, res) => {
  const { username, email, password, emailCode, phone } = req.body;

  if (!username || !email || !password || !emailCode) {
    return res.status(400).json({ error: '用户名、邮箱、密码和邮箱验证码不能为空' });
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

  // 验证邮箱验证码
  const result = VerificationCode.verify(email, emailCode, 'email', 'register');
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  if (phone) {
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      return res.status(400).json({ error: '手机号格式不正确' });
    }
    if (User.findByPhone(phone)) {
      return res.status(409).json({ error: '手机号已被注册' });
    }
  }

  const user = User.create(username, email, password, 'family', phone);
  User.setEmailVerified(user.id);
  if (phone) User.setPhoneVerified(user.id);

  const token = generateToken(user);
  const safeUser = { id: user.id, username: user.username, email: user.email, phone: user.phone, email_verified: 1, phone_verified: phone ? 1 : 0, role: user.role };
  res.status(201).json({ token, user: safeUser });
});

// POST /api/auth/login — 登录（用户名+密码 / 手机号+密码）
router.post('/login', loginLimiter, (req, res) => {
  const { username, password, loginType } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: '账号和密码不能为空' });
  }

  let user;
  if (loginType === 'phone_password') {
    user = User.findByPhone(username);
  } else {
    user = User.findByUsername(username);
  }

  if (!user) {
    return res.status(401).json({ error: '账号或密码错误' });
  }
  if (!User.verifyPassword(password, user)) {
    return res.status(401).json({ error: '账号或密码错误' });
  }

  const token = generateToken(user);
  const safeUser = { id: user.id, username: user.username, email: user.email, phone: user.phone, email_verified: !!user.email_verified, phone_verified: !!user.phone_verified, role: user.role };
  res.json({ token, user: safeUser });
});

// POST /api/auth/login-by-sms — 短信验证码登录
router.post('/login-by-sms', loginLimiter, (req, res) => {
  const { phone, code } = req.body;

  if (!phone || !code) {
    return res.status(400).json({ error: '手机号和验证码不能为空' });
  }
  if (!/^1[3-9]\d{9}$/.test(phone)) {
    return res.status(400).json({ error: '手机号格式不正确' });
  }

  const user = User.findByPhone(phone);
  if (!user) {
    return res.status(401).json({ error: '该手机号未注册' });
  }

  const result = VerificationCode.verify(phone, code, 'sms', 'login');
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  const token = generateToken(user);
  const safeUser = { id: user.id, username: user.username, email: user.email, phone: user.phone, email_verified: !!user.email_verified, phone_verified: !!user.phone_verified, role: user.role };
  res.json({ token, user: safeUser });
});

// POST /api/auth/send-email-code — 发送邮箱验证码
router.post('/send-email-code', sendCodeLimiter, async (req, res) => {
  const { email, purpose } = req.body;

  if (!email || !purpose) {
    return res.status(400).json({ error: '邮箱和用途不能为空' });
  }
  if (!['register', 'reset_password'].includes(purpose)) {
    return res.status(400).json({ error: '无效的验证码用途' });
  }

  if (purpose === 'register') {
    if (User.findByEmail(email)) {
      return res.status(409).json({ error: '该邮箱已被注册' });
    }
  }

  const code = String(Math.floor(100000 + Math.random() * 900000));
  VerificationCode.create(email, code, 'email', purpose);

  try {
    await sendVerificationCodeEmail(email, code);
  } catch (e) {
    console.error('[Email] 发送失败:', e.message);
  }

  res.json({ message: '验证码已发送至您的邮箱，5分钟内有效' });
});

// POST /api/auth/send-sms-code — 发送短信验证码
router.post('/send-sms-code', sendCodeLimiter, async (req, res) => {
  const { phone, purpose } = req.body;

  if (!phone || !purpose) {
    return res.status(400).json({ error: '手机号和用途不能为空' });
  }
  if (!['register', 'login', 'reset_password'].includes(purpose)) {
    return res.status(400).json({ error: '无效的验证码用途' });
  }
  if (!/^1[3-9]\d{9}$/.test(phone)) {
    return res.status(400).json({ error: '手机号格式不正确' });
  }

  if (purpose === 'register' && User.findByPhone(phone)) {
    return res.status(409).json({ error: '该手机号已被注册' });
  }
  if (purpose === 'login' && !User.findByPhone(phone)) {
    return res.json({ message: '如果该手机号已注册，您将收到验证码' });
  }

  const code = String(Math.floor(100000 + Math.random() * 900000));
  VerificationCode.create(phone, code, 'sms', purpose);

  try {
    if (purpose === 'login') {
      await sendLoginCodeSms(phone);
    } else {
      await sendVerificationCodeSms(phone);
    }
  } catch (e) {
    console.error('[SMS] 发送失败:', e.message);
  }

  res.json({ message: '验证码已发送' });
});

// POST /api/auth/verify-code — 通用验证码校验
router.post('/verify-code', verifyCodeLimiter, (req, res) => {
  const { identifier, code, type, purpose } = req.body;

  if (!identifier || !code || !type || !purpose) {
    return res.status(400).json({ error: '参数不完整' });
  }

  const result = VerificationCode.verify(identifier, code, type, purpose);
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  res.json({ verified: true });
});

// GET /api/auth/me — 获取当前登录用户信息
router.get('/me', requireAuth, (req, res) => {
  const user = User.findById(req.user.id);
  if (!user) return res.status(404).json({ error: '用户不存在' });
  res.json({ user });
});

// POST /api/auth/forgot-password — 发送密码重置验证码
router.post('/forgot-password', sendCodeLimiter, async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: '请输入邮箱' });

  const user = User.findByEmail(email);
  if (!user) {
    return res.json({ message: '如果该邮箱已注册，您将收到验证码' });
  }

  const code = String(Math.floor(100000 + Math.random() * 900000));
  VerificationCode.create(email, code, 'email', 'reset_password');

  try {
    await sendPasswordResetEmail(email, code);
  } catch (e) {
    console.error('[Email] 发送失败:', e.message);
  }

  res.json({ message: '如果该邮箱已注册，您将收到验证码' });
});

// POST /api/auth/reset-password — 使用验证码重置密码
router.post('/reset-password', verifyCodeLimiter, (req, res) => {
  const { email, code, newPassword } = req.body;
  if (!email || !code || !newPassword) {
    return res.status(400).json({ error: '邮箱、验证码和新密码不能为空' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: '密码长度不能少于 6 位' });
  }

  const user = User.findByEmail(email);
  if (!user) {
    return res.status(400).json({ error: '该邮箱未注册' });
  }

  const result = VerificationCode.verify(email, code, 'email', 'reset_password');
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  User.updatePassword(user.id, newPassword);
  res.json({ message: '密码重置成功，请使用新密码登录' });
});

module.exports = router;

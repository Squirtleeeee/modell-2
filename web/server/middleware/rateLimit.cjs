// API 频率限制中间件
const rateLimit = require('express-rate-limit');

const sendCodeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 1,
  message: { error: '操作过于频繁，请60秒后再试' },
  keyGenerator: (req) => req.body?.email || req.body?.phone || 'unknown',
  standardHeaders: true,
  legacyHeaders: false,
});

const verifyCodeLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 5,
  message: { error: '验证尝试次数过多，请5分钟后再试' },
  standardHeaders: true,
  legacyHeaders: false,
});

const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: '登录尝试过于频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false,
});

const registerLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  message: { error: '注册请求过于频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { sendCodeLimiter, verifyCodeLimiter, loginLimiter, registerLimiter };

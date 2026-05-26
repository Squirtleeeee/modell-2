// 告警路由
const { Router } = require('express');
const { Alert } = require('../database.cjs');
const { requireAuth } = require('../middleware/auth.cjs');

const router = Router();

// GET /api/alerts — 告警列表
router.get('/', requireAuth, (req, res) => {
  const { type, status } = req.query;
  res.json(Alert.list({ userId: req.user.id, type, status }));
});

// PUT /api/alerts/:id — 更新告警状态
router.put('/:id', requireAuth, (req, res) => {
  const { status, note } = req.body;
  const alert = Alert.updateStatus(req.params.id, status, note);
  if (!alert) return res.status(404).json({ error: '告警不存在' });
  res.json(alert);
});

module.exports = router;

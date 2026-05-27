// 监护人路由：申请 / 同意 / 拒绝 / 管理
const { Router } = require('express');
const { User, Guardianship, GuardianRequest } = require('../database.cjs');
const { requireAuth } = require('../middleware/auth.cjs');

const router = Router();

// GET /api/guardians — 我的监护人 + 我监护的人
router.get('/', requireAuth, (req, res) => {
  const guardians = Guardianship.myGuardians(req.user.id);
  const wards = Guardianship.myWards(req.user.id);
  res.json({ guardians, wards });
});

// GET /api/guardians/requests — 申请列表（收到的 + 发出的）
router.get('/requests', requireAuth, (req, res) => {
  res.json({
    received: GuardianRequest.pendingForMe(req.user.id),
    sent: GuardianRequest.sentByMe(req.user.id),
  });
});

// POST /api/guardians/request — 发送监护人申请
router.post('/request', requireAuth, (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: '请输入用户名' });

  const target = User.findByUsername(username) || User.findByEmail(username) || User.findByPhone(username);
  if (!target) return res.status(404).json({ error: '用户不存在，请检查输入的用户名/邮箱/手机号' });

  try {
    const request = GuardianRequest.create(req.user.id, target.id);

    const io = req.app.get('io');
    if (io) {
      io.to(`user:${target.id}`).emit('new_request', {
        id: request.id,
        from_user_id: req.user.id,
        from_username: req.user.username,
      });
    }

    res.status(201).json(request);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// PUT /api/guardians/request/:id/accept — 同意申请
router.put('/request/:id/accept', requireAuth, (req, res) => {
  try {
    const request = GuardianRequest.accept(parseInt(req.params.id), req.user.id);

    const io = req.app.get('io');
    if (io) {
      io.to(`user:${request.from_user_id}`).emit('request_accepted', {
        id: request.id,
        to_user_id: req.user.id,
        to_username: req.user.username,
      });
    }

    res.json({ message: '已同意申请，双方互为监护人' });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// PUT /api/guardians/request/:id/reject — 拒绝申请
router.put('/request/:id/reject', requireAuth, (req, res) => {
  try {
    GuardianRequest.reject(parseInt(req.params.id), req.user.id);
    res.json({ message: '已拒绝申请' });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// DELETE /api/guardians/:id — 移除监护人
router.delete('/:id', requireAuth, (req, res) => {
  const guardianId = parseInt(req.params.id);
  if (!Guardianship.isGuardian(req.user.id, guardianId)) {
    return res.status(404).json({ error: '未找到该监护人关系' });
  }
  Guardianship.removeGuardian(req.user.id, guardianId);
  res.json({ message: '已移除监护人' });
});

// GET /api/guardians/notifications — 未读通知数
router.get('/notifications/count', requireAuth, (req, res) => {
  const pendingReqs = GuardianRequest.pendingCount(req.user.id);
  const { Message } = require('../database.cjs');
  const unreadMsgs = Message.unreadCount(req.user.id);
  res.json({ requests: pendingReqs, messages: unreadMsgs, total: pendingReqs + unreadMsgs });
});

module.exports = router;

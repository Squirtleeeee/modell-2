// 消息路由
const { Router } = require('express');
const { Message } = require('../database.cjs');
const { requireAuth } = require('../middleware/auth.cjs');

const router = Router();

// GET /api/messages/contacts — 最近联系人列表（含监护关系）
router.get('/contacts', requireAuth, (req, res) => {
  const { Guardianship, User } = require('../database.cjs');
  const msgContacts = Message.recentContacts(req.user.id);
  const guardianList = Guardianship.myGuardians(req.user.id);
  const wardList = Guardianship.myWards(req.user.id);

  // 合并消息联系人和监护人/被监护人，去重
  const seen = new Set();
  const allContacts = [];

  for (const c of msgContacts) {
    seen.add(c.contact_id);
    allContacts.push(c);
  }

  for (const g of [...guardianList, ...wardList]) {
    if (!seen.has(g.id)) {
      seen.add(g.id);
      allContacts.push({
        contact_id: g.id,
        username: g.username,
        last_msg: null,
        last_time: null,
      });
    }
  }

  res.json(allContacts);
});

// GET /api/messages/:userId — 与某用户的对话
router.get('/:userId', requireAuth, (req, res) => {
  const messages = Message.conversation(req.user.id, parseInt(req.params.userId));
  Message.markRead(parseInt(req.params.userId), req.user.id);
  res.json(messages);
});

// POST /api/messages — 发送消息
router.post('/', requireAuth, (req, res) => {
  const { to, content } = req.body;
  if (!to || !content) return res.status(400).json({ error: '接收人和内容不能为空' });
  const msg = Message.send(req.user.id, to, content);

  // 通过 WebSocket 推送（如果已注入 io）
  const io = req.app.get('io');
  if (io) {
    io.to(`user:${to}`).emit('new_message', msg);
  }

  res.status(201).json(msg);
});

// GET /api/messages/unread/count — 未读消息数
router.get('/unread/count', requireAuth, (req, res) => {
  res.json({ count: Message.unreadCount(req.user.id) });
});

module.exports = router;

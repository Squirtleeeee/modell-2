// 监护人路由: 添加 / 删除 / 查看监护人关系
const { Router } = require('express');
const { User, Guardianship } = require('../database.cjs');
const { requireAuth } = require('../middleware/auth.cjs');

const router = Router();
router.use(requireAuth);

// GET /api/guardians — 我的监护人列表 + 我监护的人列表
router.get('/', (req, res) => {
  const guardians = Guardianship.myGuardians(req.user.id);
  const wards = Guardianship.myWards(req.user.id);
  res.json({ guardians, wards });
});

// POST /api/guardians — 添加监护人（通过用户名）
router.post('/', (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: '请输入用户名' });

  const guardian = User.findByUsername(username);
  if (!guardian) return res.status(404).json({ error: '用户不存在' });

  try {
    Guardianship.addGuardian(req.user.id, guardian.id);
    // 返回监护人信息
    const guardianInfo = User.findById(guardian.id);
    res.status(201).json({ guardian: guardianInfo });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// DELETE /api/guardians/:id — 删除监护人
router.delete('/:id', (req, res) => {
  const guardianId = parseInt(req.params.id);
  if (!Guardianship.isGuardian(req.user.id, guardianId)) {
    return res.status(404).json({ error: '未找到该监护人关系' });
  }
  Guardianship.removeGuardian(req.user.id, guardianId);
  res.json({ message: '已移除监护人' });
});

module.exports = router;

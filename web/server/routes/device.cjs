// 设备数据路由：上报 + 查询
const { Router } = require('express');
const { DeviceData, DeviceConfig } = require('../database.cjs');
const { requireAuth } = require('../middleware/auth.cjs');

const router = Router();

// POST /api/device/data — 设备/模拟器上报数据
router.post('/data', requireAuth, (req, res) => {
  const { device_id, accel, gyro, fall_detected, steps, battery, activity } = req.body;
  if (!device_id) return res.status(400).json({ error: 'device_id 不能为空' });

  DeviceData.insert(device_id, req.user.id, {
    accel: accel || {},
    gyro: gyro || {},
    fall_detected: !!fall_detected,
    steps: steps ?? 0,
    battery: battery ?? 100,
    activity: activity || 'standing',
  });

  // 如果检测到跌倒，自动生成告警
  if (fall_detected) {
    const { Alert } = require('../database.cjs');
    Alert.create({
      deviceId: device_id,
      userId: req.user.id,
      type: 'fall',
      confidence: 0.95,
    });
  }

  // 通过 WebSocket 广播最新数据给该用户的监护人
  const io = req.app.get('io');
  if (io) {
    const { Guardianship } = require('../database.cjs');
    const guardianIds = Guardianship.guardianIdsOf(req.user.id);
    guardianIds.forEach((gid) => io.to(`user:${gid}`).emit('device_update', {
      userId: req.user.id,
      steps,
      battery,
      activity,
      fall_detected: !!fall_detected,
    }));
    // 也推送给用户自己
    io.to(`user:${req.user.id}`).emit('device_update', {
      userId: req.user.id,
      steps,
      battery,
      activity,
      fall_detected: !!fall_detected,
    });
  }

  res.json({ success: true });
});

// GET /api/device/status — 设备当前状态
router.get('/status', requireAuth, (req, res) => {
  const { device_id } = req.query;
  const status = DeviceData.deviceStatus(device_id || null, req.user.id);
  if (!status) {
    return res.json({
      id: device_id || 'EDGI-001',
      status: 'offline',
      battery: 0,
      currentActivity: 'unknown',
      lastHeartbeat: null,
    });
  }
  res.json(status);
});

// GET /api/device/config — 获取设备配置
router.get('/config', requireAuth, (req, res) => {
  const { device_id } = req.query;
  res.json(DeviceConfig.get(req.user.id, device_id || 'EDGI-001'));
});

// PUT /api/device/config — 保存设备配置
router.put('/config', requireAuth, (req, res) => {
  const { device_id, ...config } = req.body;
  const result = DeviceConfig.update(req.user.id, device_id || 'EDGI-001', config);
  res.json(result);
});

module.exports = router;

// 设备数据路由：上报 + 查询
const { Router } = require('express');
const { DeviceData, User } = require('../database.cjs');
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

// GET /api/device/config — 设备参数（当前为模拟默认值）
router.get('/config', requireAuth, (req, res) => {
  res.json({
    sedentaryInterval: 30,
    sedentaryMode: 'both',
    alertVolume: 80,
    fallSensitivity: 'standard',
  });
});

module.exports = router;

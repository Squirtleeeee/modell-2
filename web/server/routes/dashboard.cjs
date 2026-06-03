// Dashboard 数据路由
const { Router } = require('express');
const { DeviceData } = require('../database.cjs');
const { requireAuth } = require('../middleware/auth.cjs');

const router = Router();

// GET /api/dashboard/overview — 今日概览 KPI
router.get('/overview', requireAuth, (req, res) => {
  res.json(DeviceData.todaySummary(req.user.id));
});

// GET /api/dashboard/activity-trend?days=7 — 每日活动占比趋势（横/竖/走/摔）
router.get('/activity-trend', requireAuth, (req, res) => {
  const days = parseInt(req.query.days) || 7;
  res.json(DeviceData.dailyActivityTrend(req.user.id, days));
});

module.exports = router;

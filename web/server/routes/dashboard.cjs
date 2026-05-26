// Dashboard 数据路由
const { Router } = require('express');
const { DeviceData } = require('../database.cjs');
const { requireAuth } = require('../middleware/auth.cjs');

const router = Router();

// GET /api/dashboard/overview — 今日概览 KPI
router.get('/overview', requireAuth, (req, res) => {
  res.json(DeviceData.todaySummary(req.user.id));
});

// GET /api/dashboard/hourly — 24 小时活动分布
router.get('/hourly', requireAuth, (req, res) => {
  res.json(DeviceData.hourlyActivity(req.user.id));
});

// GET /api/dashboard/weekly — 7 天趋势
router.get('/weekly', requireAuth, (req, res) => {
  res.json(DeviceData.weeklyTrend(req.user.id));
});

module.exports = router;

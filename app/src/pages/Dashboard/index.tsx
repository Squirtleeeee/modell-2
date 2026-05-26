import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, Statistic, Typography, Tag, Spin, Flex, theme as antTheme } from 'antd';
import {
  FallOutlined,
  AimOutlined,
  ThunderboltOutlined,
  FieldTimeOutlined,
  RiseOutlined,
  WarningOutlined,
  AlertOutlined,
  RightOutlined,
} from '@ant-design/icons';
import * as echarts from 'echarts';
import ReactECharts from 'echarts-for-react';
import {
  fetchDashboardOverview,
  fetchHourlyActivity,
  fetchWeeklyTrend,
} from '../../api';
import type { AlertRecord } from '../../mock/data';
import { useSocket } from '../../hooks/useSocket';
import { mockAlerts } from '../../mock/data';

const { Title, Text } = Typography;

interface Overview {
  steps: number;
  walkDurationMin: number;
  standDurationMin: number;
  fallEvents: number;
  sedentaryAlerts: number;
}

export default function Dashboard() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [hourlyData, setHourlyData] = useState<{ hour: string; steps: number; standing: number; walking: number }[]>([]);
  const [weeklyTrend, setWeeklyTrend] = useState<{ date: string; steps: number; sedentary: number; falls: number }[]>([]);
  const [recentAlerts, setRecentAlerts] = useState<AlertRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const { token } = antTheme.useToken();
  const { connected, join, on } = useSocket();
  const [chartKey, setChartKey] = useState(0);

  const loadKpi = async () => { setOverview(await fetchDashboardOverview()); };

  const loadCharts = async () => {
    const [hourly, weekly] = await Promise.all([fetchHourlyActivity(), fetchWeeklyTrend()]);
    setHourlyData(hourly); setWeeklyTrend(weekly); setRecentAlerts(mockAlerts.slice(0, 3));
  };

  const loadAll = async () => {
    setLoading(true);
    const [ov, hourly, weekly] = await Promise.all([fetchDashboardOverview(), fetchHourlyActivity(), fetchWeeklyTrend()]);
    setOverview(ov); setHourlyData(hourly); setWeeklyTrend(weekly);
    setRecentAlerts(mockAlerts.slice(0, 3)); setLoading(false);
  };

  useEffect(() => { loadAll(); }, []);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try { const u = JSON.parse(userStr); if (u.id) join(u.id); } catch { /* ignore */ }
    }
  }, [connected]);

  useEffect(() => {
    return on('device_update', () => { loadKpi(); });
  }, [on]);

  useEffect(() => {
    if (loading) return;
    const timer = setInterval(() => { loadCharts(); setChartKey(k => k + 1); }, 30000);
    return () => clearInterval(timer);
  }, [loading]);

  if (loading) {
    return (
      <Flex justify="center" align="center" style={{ height: 300 }}>
        <Spin size="large" />
      </Flex>
    );
  }

  const hourlyChartOption = {
    tooltip: { trigger: 'axis' as const },
    legend: { data: ['步数', '站立', '行走'], top: 0, textStyle: { fontSize: 11 } },
    grid: { top: 32, right: 12, bottom: 48, left: 40 },
    xAxis: {
      type: 'category' as const,
      data: hourlyData.map((h) => h.hour),
      axisLabel: { rotate: 45, fontSize: 9, margin: 4 },
    },
    yAxis: { type: 'value' as const, name: '步/分钟', nameTextStyle: { fontSize: 10 } },
    series: [
      { name: '步数', type: 'bar', data: hourlyData.map((h) => h.steps), itemStyle: { color: token.colorPrimary }, barMaxWidth: 10 },
      { name: '站立', type: 'line', data: hourlyData.map((h) => h.standing), itemStyle: { color: token.colorWarning }, smooth: true, symbol: 'none' },
      { name: '行走', type: 'line', data: hourlyData.map((h) => h.walking), itemStyle: { color: token.colorSuccess }, smooth: true, symbol: 'none' },
    ],
  };

  const weeklyChartOption = {
    tooltip: { trigger: 'axis' as const },
    legend: { data: ['步数', '久坐'], top: 0, textStyle: { fontSize: 11 } },
    grid: { top: 32, right: 24, bottom: 40, left: 44 },
    xAxis: { type: 'category' as const, data: weeklyTrend.map((d) => d.date), axisLabel: { fontSize: 10 } },
    yAxis: [
      { type: 'value' as const, name: '步数', nameTextStyle: { fontSize: 10 } },
      { type: 'value' as const, name: '次', nameTextStyle: { fontSize: 10 } },
    ],
    series: [
      {
        name: '步数', type: 'bar', data: weeklyTrend.map((d) => d.steps),
        itemStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: '#E8725A' }, { offset: 1, color: '#F0A080' }]) },
        barMaxWidth: 14,
      },
      { name: '久坐', type: 'line', yAxisIndex: 1, data: weeklyTrend.map((d) => d.sedentary), itemStyle: { color: '#F0A04B' }, symbolSize: 6 },
    ],
  };

  return (
    <div style={{ paddingBottom: 8 }}>
      <Title level={5} style={{ marginBottom: 12 }}>数据看板</Title>

      {/* KPI Cards - 2 per row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
        <Card size="small" style={{ textAlign: 'center' }}>
          <Statistic title="今日步数" value={overview?.steps} suffix="步" prefix={<RiseOutlined />} valueStyle={{ color: token.colorPrimary, fontSize: 20 }} />
        </Card>
        <Card size="small" style={{ textAlign: 'center' }}>
          <Statistic title="行走时长" value={overview?.walkDurationMin} suffix="分钟" prefix={<AimOutlined />} valueStyle={{ color: token.colorSuccess, fontSize: 20 }} />
        </Card>
        <Card size="small" style={{ textAlign: 'center' }}>
          <Statistic title="静坐/站立" value={overview?.standDurationMin} suffix="分钟" prefix={<FieldTimeOutlined />} valueStyle={{ color: token.colorWarning, fontSize: 20 }} />
        </Card>
        <Card size="small" style={{ textAlign: 'center', borderColor: overview?.fallEvents ? '#E05555' : undefined }}>
          <Statistic title="摔倒事件" value={overview?.fallEvents} suffix="次" prefix={<FallOutlined />} valueStyle={{ color: overview?.fallEvents ? '#E05555' : '#4DB6AC', fontSize: 20 }} />
        </Card>
        <Card size="small" style={{ textAlign: 'center' }}>
          <Statistic title="久坐提醒" value={overview?.sedentaryAlerts} suffix="次" prefix={<WarningOutlined />} valueStyle={{ color: token.colorWarning, fontSize: 20 }} />
        </Card>
        <Card size="small" style={{ textAlign: 'center' }}>
          <Statistic title="设备电量" value={72} suffix="%" prefix={<ThunderboltOutlined />} valueStyle={{ color: '#4DB6AC', fontSize: 20 }} />
        </Card>
      </div>

      {/* Charts */}
      <Card title={<Text strong style={{ fontSize: 14 }}>今日活动分布</Text>} size="small" style={{ marginBottom: 12 }}>
        <ReactECharts key={chartKey} option={hourlyChartOption} style={{ height: 220 }} />
      </Card>
      <Card title={<Text strong style={{ fontSize: 14 }}>近 7 天趋势</Text>} size="small" style={{ marginBottom: 12 }}>
        <ReactECharts key={chartKey + 100} option={weeklyChartOption} style={{ height: 220 }} />
      </Card>

      {/* Recent Alerts */}
      <Card
        size="small"
        title={<Flex align="center" gap={6}><AlertOutlined style={{ color: '#E05555' }} /><Text strong style={{ fontSize: 14 }}>最近报警</Text></Flex>}
        extra={<Link to="/alerts"><Text type="secondary" style={{ fontSize: 12 }}>全部 <RightOutlined /></Text></Link>}
      >
        {recentAlerts.map((a) => (
          <Flex key={a.id} justify="space-between" align="center" style={{ padding: '8px 0', borderBottom: '1px solid #F5F0EC' }}>
            <div>
              <Tag color={a.type === 'fall' ? 'error' : 'warning'} style={{ fontSize: 11 }}>
                {a.type === 'fall' ? '摔倒' : '久坐'}
              </Tag>
              <Text style={{ fontSize: 12, marginLeft: 4 }}>{a.time.slice(5)}</Text>
            </div>
            <Tag
              color={a.status === 'unhandled' ? 'red' : a.status === 'handled' ? 'green' : 'processing'}
              style={{ fontSize: 11 }}
            >
              {a.status === 'unhandled' ? '未处理' : a.status === 'handled' ? '已处理' : '处理中'}
            </Tag>
          </Flex>
        ))}
      </Card>
    </div>
  );
}

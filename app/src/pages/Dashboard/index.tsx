import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, Statistic, Typography, Tag, Spin, Flex, Segmented, theme as antTheme } from 'antd';
import {
  FallOutlined,
  AimOutlined,
  ThunderboltOutlined,
  FieldTimeOutlined,
  WarningOutlined,
  AlertOutlined,
  RightOutlined,
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import {
  fetchDashboardOverview,
  fetchActivityTrend,
  fetchAlerts,
} from '../../api';
import type { AlertRecord } from '../../mock/data';
import { useSocket } from '../../hooks/useSocket';

const { Title, Text } = Typography;

interface Overview {
  steps: number;
  walkDurationMin: number;
  standDurationMin: number;
  fallEvents: number;
  sedentaryAlerts: number;
  battery: number;
}

const trendDaysOptions = [
  { label: '7天', value: 7 },
  { label: '30天', value: 30 },
];

const activityLabel: Record<string, string> = { lying: '平躺', standing: '站立/正坐', walking: '行走' };
const activityColor: Record<string, string> = { lying: '#4DB6AC', standing: '#F0A04B', walking: '#52c41a' };

export default function Dashboard() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [trendData, setTrendData] = useState<{ date: string; lying: number; standing: number; walking: number; fallen: number }[]>([]);
  const [trendDays, setTrendDays] = useState(7);
  const [recentAlerts, setRecentAlerts] = useState<AlertRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const { token } = antTheme.useToken();
  const { connected, join, on } = useSocket();
  const [chartKey, setChartKey] = useState(0);

  const loadKpi = async () => { setOverview(await fetchDashboardOverview()); };

  const loadCharts = async () => {
    const [trend, alerts] = await Promise.all([
      fetchActivityTrend(trendDays),
      fetchAlerts().then(d => (d as { list: AlertRecord[] }).list?.slice(0, 3) || []),
    ]);
    setTrendData(trend);
    setRecentAlerts(alerts);
  };

  const loadAll = async () => {
    setLoading(true);
    const [ov, trend, alerts] = await Promise.all([
      fetchDashboardOverview(),
      fetchActivityTrend(trendDays),
      fetchAlerts().then(d => (d as { list: AlertRecord[] }).list?.slice(0, 3) || []),
    ]);
    setOverview(ov); setTrendData(trend); setRecentAlerts(alerts); setLoading(false);
  };

  useEffect(() => { loadAll(); }, []);

  useEffect(() => {
    if (!loading) { fetchActivityTrend(trendDays).then(setTrendData); setChartKey(k => k + 1); }
  }, [trendDays]);

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
  }, [loading, trendDays]);

  if (loading) {
    return (
      <Flex justify="center" align="center" style={{ height: 300 }}>
        <Spin size="large" />
      </Flex>
    );
  }

  const trendChartOption = {
    tooltip: {
      trigger: 'axis' as const,
      formatter: (params: { seriesName: string; value: number; marker: string }[]) => {
        let html = '';
        for (const p of params) html += `${p.marker} ${p.seriesName}: ${p.value}%<br/>`;
        return html;
      },
    },
    legend: { data: ['平躺', '站立/正坐', '行走'], top: 0, textStyle: { fontSize: 11 } },
    grid: { top: 32, right: 16, bottom: 48, left: 44 },
    xAxis: {
      type: 'category' as const,
      data: trendData.map((d) => d.date),
      axisLabel: { rotate: trendDays === 30 ? 60 : 0, fontSize: 9, margin: 4 },
    },
    yAxis: { type: 'value' as const, name: '%', max: 100, nameTextStyle: { fontSize: 10 } },
    series: ['lying', 'standing', 'walking'].map((key) => ({
      name: activityLabel[key],
      type: 'line',
      data: trendData.map((d) => (d as unknown as Record<string, number>)[key]),
      itemStyle: { color: activityColor[key] },
      smooth: true,
      symbol: 'none',
    })),
  };

  return (
    <div style={{ paddingBottom: 8 }}>
      <Title level={5} style={{ marginBottom: 12 }}>数据看板</Title>

      {/* KPI Cards - 2 per row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
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
          <Statistic title="长时间不活动提醒" value={overview?.sedentaryAlerts} suffix="次" prefix={<WarningOutlined />} valueStyle={{ color: token.colorWarning, fontSize: 20 }} />
        </Card>
        <Card size="small" style={{ textAlign: 'center' }}>
          <Statistic title="设备电量" value={overview?.battery ?? '--'} suffix="%" prefix={<ThunderboltOutlined />} valueStyle={{ color: '#4DB6AC', fontSize: 20 }} />
        </Card>
      </div>

      {/* Activity Trend Chart */}
      <Card
        size="small"
        title={<Text strong style={{ fontSize: 14 }}>活动趋势</Text>}
        extra={<Segmented options={trendDaysOptions} value={trendDays} onChange={(v) => setTrendDays(v as number)} size="small" />}
        style={{ marginBottom: 12 }}
      >
        <ReactECharts key={chartKey} option={trendChartOption} style={{ height: 220 }} />
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

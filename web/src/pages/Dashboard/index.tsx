import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Row, Col, Card, Statistic, Typography, Table, Tag, Spin, Flex, Segmented, theme as antTheme } from 'antd';
import {
  FallOutlined,
  AimOutlined,
  ThunderboltOutlined,
  FieldTimeOutlined,
  RiseOutlined,
  WarningOutlined,
  AlertOutlined,
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import {
  fetchDashboardOverview,
  fetchActivityTrend,
  fetchAlerts,
} from '../../api';
import type { AlertRecord } from '../../mock/data';
import { useSocket } from '../../hooks/useSocket';
import { useIsMobile } from '../../hooks/useMediaQuery';

const { Title, Text } = Typography;

interface Overview {
  steps: number;
  walkDurationMin: number;
  standDurationMin: number;
  fallEvents: number;
  sedentaryAlerts: number;
  battery: number;
}

const alertColumns = [
  { title: '时间', dataIndex: 'time', key: 'time', width: 170 },
  {
    title: '类型',
    dataIndex: 'type',
    key: 'type',
    width: 90,
    render: (t: string) =>
      t === 'fall' ? (
        <Tag color="error">摔倒</Tag>
      ) : (
        <Tag color="warning">久坐/久站</Tag>
      ),
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    width: 90,
    render: (s: string) => {
      const map: Record<string, { color: string; text: string }> = {
        unhandled: { color: 'red', text: '未处理' },
        processing: { color: 'processing', text: '处理中' },
        handled: { color: 'green', text: '已处理' },
        false_alarm: { color: 'default', text: '误报' },
      };
      const item = map[s] || { color: 'default', text: s };
      return <Tag color={item.color}>{item.text}</Tag>;
    },
  },
  {
    title: '备注',
    dataIndex: 'handlerNote',
    key: 'handlerNote',
    ellipsis: true,
  },
];

const trendDaysOptions = [
  { label: '7天', value: 7 },
  { label: '30天', value: 30 },
];

const activityLabel: Record<string, string> = { lying: '横着', standing: '竖着', walking: '走着' };
const activityColor: Record<string, string> = { lying: '#4DB6AC', standing: '#F0A04B', walking: '#52c41a' };

export default function Dashboard() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [trendData, setTrendData] = useState<{ date: string; lying: number; standing: number; walking: number; fallen: number }[]>([]);
  const [trendDays, setTrendDays] = useState(7);
  const [recentAlerts, setRecentAlerts] = useState<AlertRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const { token } = antTheme.useToken();
  const isMobile = useIsMobile();
  const { connected, join, on } = useSocket();
  const [chartKey, setChartKey] = useState(0);

  const loadKpi = async () => {
    const ov = await fetchDashboardOverview();
    setOverview(ov);
  };

  const loadCharts = async () => {
    const [trend, alerts] = await Promise.all([
      fetchActivityTrend(trendDays),
      fetchAlerts().then(d => (d as { list: AlertRecord[] }).list?.slice(0, 5) || []),
    ]);
    setTrendData(trend);
    setRecentAlerts(alerts);
  };

  const loadAll = async () => {
    setLoading(true);
    const [ov, trend, alerts] = await Promise.all([
      fetchDashboardOverview(),
      fetchActivityTrend(trendDays),
      fetchAlerts().then(d => (d as { list: AlertRecord[] }).list?.slice(0, 5) || []),
    ]);
    setOverview(ov);
    setTrendData(trend);
    setRecentAlerts(alerts);
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, []);

  // 切换天数时重新加载趋势
  useEffect(() => {
    if (!loading) {
      fetchActivityTrend(trendDays).then(setTrendData);
      setChartKey(k => k + 1);
    }
  }, [trendDays]);

  // WebSocket 实时刷新 KPI（轻量）
  useEffect(() => {
    const { user } = JSON.parse(localStorage.getItem('user') || '{}');
    if (user?.id) join(user.id);
  }, [connected]);

  useEffect(() => {
    return on('device_update', () => { loadKpi(); });
  }, [on]);

  // 图表 30 秒刷新一次（重量）
  useEffect(() => {
    if (loading) return;
    const timer = setInterval(() => { loadCharts(); setChartKey(k => k + 1); }, 30000);
    return () => clearInterval(timer);
  }, [loading, trendDays]);

  if (loading) {
    return (
      <Flex justify="center" align="center" style={{ height: 400 }}>
        <Spin size="large" tip="加载中..." />
      </Flex>
    );
  }

  const trendChartOption = {
    tooltip: {
      trigger: 'axis' as const,
      formatter: (params: { seriesName: string; value: number; marker: string }[]) => {
        let html = '';
        for (const p of params) {
          html += `${p.marker} ${p.seriesName}: ${p.value}%<br/>`;
        }
        return html;
      },
    },
    legend: {
      data: ['横着', '竖着', '走着'],
      top: 0,
    },
    grid: { top: 40, right: 24, bottom: 48, left: 56 },
    xAxis: {
      type: 'category' as const,
      data: trendData.map((d) => d.date),
      axisLabel: { rotate: trendDays === 30 ? 60 : 0, fontSize: 10, margin: 8 },
    },
    yAxis: {
      type: 'value' as const,
      name: '%',
      max: 100,
      nameTextStyle: { fontSize: 11 },
    },
    series: (['lying', 'standing', 'walking'] as const).map((key) => ({
      name: activityLabel[key],
      type: 'line',
      data: trendData.map((d) => d[key]),
      itemStyle: { color: activityColor[key] },
      smooth: true,
      symbol: 'circle',
      symbolSize: 4,
    })),
  };

  return (
    <div>
      <Title level={4} style={{ marginBottom: 24 }}>
        数据看板
      </Title>

      {/* KPI Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card hoverable>
            <Statistic
              title="今日步数"
              value={overview?.steps}
              suffix="步"
              prefix={<RiseOutlined />}
              valueStyle={{ color: token.colorPrimary }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card hoverable>
            <Statistic
              title="行走时长"
              value={overview?.walkDurationMin}
              suffix="分钟"
              prefix={<AimOutlined />}
              valueStyle={{ color: token.colorSuccess }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card hoverable>
            <Statistic
              title="站立/静坐时长"
              value={overview?.standDurationMin}
              suffix="分钟"
              prefix={<FieldTimeOutlined />}
              valueStyle={{ color: token.colorWarning }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card hoverable style={{ borderColor: overview?.fallEvents ? '#E05555' : undefined }}>
            <Statistic
              title="摔倒事件"
              value={overview?.fallEvents}
              suffix="次"
              prefix={<FallOutlined />}
              valueStyle={{ color: overview?.fallEvents ? '#E05555' : '#4DB6AC' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card hoverable>
            <Statistic
              title="久坐提醒"
              value={overview?.sedentaryAlerts}
              suffix="次"
              prefix={<WarningOutlined />}
              valueStyle={{ color: token.colorWarning }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card hoverable>
            <Statistic
              title="设备电量"
              value={overview?.battery ?? '--'}
              suffix="%"
              prefix={<ThunderboltOutlined />}
              valueStyle={{ color: '#4DB6AC' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Activity Trend Chart */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={24}>
          <Card
            title="活动趋势"
            extra={
              <Segmented
                options={trendDaysOptions}
                value={trendDays}
                onChange={(v) => setTrendDays(v as number)}
                size="small"
              />
            }
          >
            <ReactECharts key={chartKey} option={trendChartOption} style={{ height: isMobile ? 280 : 360 }} />
          </Card>
        </Col>
      </Row>

      {/* Recent Alerts */}
      <Card
        title={
          <Flex align="center" gap={8}>
            <AlertOutlined />
            <Text strong>最近报警</Text>
          </Flex>
        }
        extra={
          <Link to="/alerts">查看全部</Link>
        }
      >
        <Table
          columns={alertColumns}
          dataSource={recentAlerts}
          rowKey="id"
          pagination={false}
          size="middle"
          scroll={{ x: 600 }}
        />
      </Card>
    </div>
  );
}

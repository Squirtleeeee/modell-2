import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Row, Col, Card, Statistic, Typography, Table, Tag, Spin, Flex, theme as antTheme } from 'antd';
import {
  FallOutlined,
  AimOutlined,
  ThunderboltOutlined,
  FieldTimeOutlined,
  RiseOutlined,
  WarningOutlined,
  AlertOutlined,
} from '@ant-design/icons';
import * as echarts from 'echarts';
import ReactECharts from 'echarts-for-react';
import {
  fetchDashboardOverview,
  fetchHourlyActivity,
  fetchWeeklyTrend,
} from '../../api';
import type { AlertRecord } from '../../mock/data';
import { mockAlerts } from '../../mock/data';
import { useIsMobile } from '../../hooks/useMediaQuery';

const { Title, Text } = Typography;

interface Overview {
  steps: number;
  walkDurationMin: number;
  standDurationMin: number;
  fallEvents: number;
  sedentaryAlerts: number;
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

export default function Dashboard() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [hourlyData, setHourlyData] = useState<{ hour: string; steps: number; standing: number; walking: number }[]>([]);
  const [weeklyTrend, setWeeklyTrend] = useState<{ date: string; steps: number; sedentary: number; falls: number }[]>([]);
  const [recentAlerts, setRecentAlerts] = useState<AlertRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const { token } = antTheme.useToken();
  const isMobile = useIsMobile();

  useEffect(() => {
    const load = async () => {
      const [ov, hourly, weekly] = await Promise.all([
        fetchDashboardOverview(),
        fetchHourlyActivity(),
        fetchWeeklyTrend(),
      ]);
      setOverview(ov);
      setHourlyData(hourly);
      setWeeklyTrend(weekly);
      setRecentAlerts(mockAlerts.slice(0, 5));
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <Flex justify="center" align="center" style={{ height: 400 }}>
        <Spin size="large" tip="加载中..." />
      </Flex>
    );
  }

  const hourlyChartOption = {
    tooltip: { trigger: 'axis' as const },
    legend: {
      data: ['步数', '站立(分钟)', '行走(分钟)'],
      top: 0,
    },
    grid: { top: 40, right: 24, bottom: 60, left: 56 },
    xAxis: {
      type: 'category' as const,
      data: hourlyData.map((h) => h.hour),
      axisLabel: { rotate: 45, fontSize: 10, margin: 8 },
    },
    yAxis: {
      type: 'value' as const,
      name: '步数 / 分钟',
      nameTextStyle: { fontSize: 11 },
    },
    series: [
      {
        name: '步数',
        type: 'bar',
        data: hourlyData.map((h) => h.steps),
        itemStyle: { color: token.colorPrimary },
        barMaxWidth: 12,
      },
      {
        name: '站立(分钟)',
        type: 'line',
        data: hourlyData.map((h) => h.standing),
        itemStyle: { color: token.colorWarning },
        smooth: true,
      },
      {
        name: '行走(分钟)',
        type: 'line',
        data: hourlyData.map((h) => h.walking),
        itemStyle: { color: token.colorSuccess },
        smooth: true,
      },
    ],
  };

  const weeklyChartOption = {
    tooltip: { trigger: 'axis' as const },
    legend: { data: ['步数', '久坐次数'], top: 0 },
    grid: { top: 40, right: 32, bottom: 48, left: 56 },
    xAxis: {
      type: 'category' as const,
      data: weeklyTrend.map((d) => d.date),
      axisLabel: { margin: 8 },
    },
    yAxis: [
      {
        type: 'value' as const,
        name: '步数',
        nameTextStyle: { fontSize: 11 },
      },
      {
        type: 'value' as const,
        name: '次数',
        nameTextStyle: { fontSize: 11 },
      },
    ],
    series: [
      {
        name: '步数',
        type: 'bar',
        data: weeklyTrend.map((d) => d.steps),
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#E8725A' },
            { offset: 1, color: '#F0A080' },
          ]),
        },
        barMaxWidth: 20,
      },
      {
        name: '久坐次数',
        type: 'line',
        yAxisIndex: 1,
        data: weeklyTrend.map((d) => d.sedentary),
        itemStyle: { color: '#F0A04B' },
        symbol: 'circle',
        symbolSize: 8,
      },
    ],
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
              value={72}
              suffix="%"
              prefix={<ThunderboltOutlined />}
              valueStyle={{ color: '#4DB6AC' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Charts */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={14}>
          <Card title="今日活动分布">
            <ReactECharts option={hourlyChartOption} style={{ height: isMobile ? 260 : 320 }} />
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card title="近 7 天趋势">
            <ReactECharts option={weeklyChartOption} style={{ height: isMobile ? 260 : 320 }} />
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

import { useEffect, useState, useCallback } from 'react';
import {
  Card,
  Table,
  Tag,
  Select,
  DatePicker,
  Button,
  Space,
  Modal,
  Descriptions,
  Input,
  message,
  Typography,
  Row,
  Col,
  Flex,
} from 'antd';
import { AlertOutlined, CheckCircleOutlined, WarningOutlined, SearchOutlined } from '@ant-design/icons';
import { fetchAlerts, updateAlertStatus } from '../../api';
import type { AlertRecord } from '../../mock/data';
import { useIsMobile } from '../../hooks/useMediaQuery';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { RangePicker } = DatePicker;

export default function Alerts() {
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState<[string, string] | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<AlertRecord | null>(null);
  const [handlerNote, setHandlerNote] = useState('');
  const isMobile = useIsMobile();

  const load = useCallback(async () => {
    setLoading(true);
    const params: Record<string, string> = { type: typeFilter, status: statusFilter };
    if (dateRange) { params.dateStart = dateRange[0]; params.dateEnd = dateRange[1]; }
    const res = await fetchAlerts(params as never);
    setAlerts(res.list);
    setTotal(res.total);
    setLoading(false);
  }, [typeFilter, statusFilter, dateRange]);

  useEffect(() => {
    load();
  }, [load]);

  const handleStatusChange = async (id: string, status: string) => {
    await updateAlertStatus(id, status, handlerNote);
    message.success(`报警 ${id} 已标记为 ${status}`);
    setHandlerNote('');
    setDetailVisible(false);
    load();
  };

  const columns = [
    {
      title: '报警编号',
      dataIndex: 'id',
      key: 'id',
      width: 170,
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (t: string) =>
        t === 'fall' ? (
          <Tag color="error" icon={<WarningOutlined />}>摔倒</Tag>
        ) : (
          <Tag color="warning">久坐/久站</Tag>
        ),
    },
    {
      title: '时间',
      dataIndex: 'time',
      key: 'time',
      width: 180,
      sorter: (a: AlertRecord, b: AlertRecord) => a.time.localeCompare(b.time),
      defaultSortOrder: 'descend' as const,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
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
      filters: [
        { text: '未处理', value: 'unhandled' },
        { text: '处理中', value: 'processing' },
        { text: '已处理', value: 'handled' },
        { text: '误报', value: 'false_alarm' },
      ],
      onFilter: (value: React.Key | boolean, record: AlertRecord) => record.status === String(value),
    },
    {
      title: '置信度/时长',
      key: 'detail',
      width: 120,
      render: (_: unknown, record: AlertRecord) =>
        record.type === 'fall'
          ? `置信度 ${((record.confidence ?? 0) * 100).toFixed(0)}%`
          : `持续 ${record.duration} 分钟`,
    },
    {
      title: '备注',
      dataIndex: 'handlerNote',
      key: 'handlerNote',
      ellipsis: true,
      render: (v: string) => v || '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_: unknown, record: AlertRecord) => (
        <Space>
          <Button
            type="link"
            size="small"
            onClick={() => {
              setSelectedAlert(record);
              setHandlerNote(record.handlerNote || '');
              setDetailVisible(true);
            }}
          >
            详情
          </Button>
          {record.status === 'unhandled' && (
            <Button
              type="primary"
              size="small"
              danger
              icon={<CheckCircleOutlined />}
              onClick={() => handleStatusChange(record.id, 'processing')}
            >
              处理
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Title level={4} style={{ marginBottom: 24 }}>
        <AlertOutlined style={{ marginRight: 8 }} />
        报警记录
      </Title>

      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[16, 12]} align="middle">
          <Col xs={24} sm={8} md={6}>
            <Select
              value={typeFilter}
              onChange={setTypeFilter}
              style={{ width: '100%' }}
              options={[
                { value: 'all', label: '全部类型' },
                { value: 'fall', label: '摔倒' },
                { value: 'sedentary', label: '久坐/久站' },
              ]}
            />
          </Col>
          <Col xs={24} sm={8} md={6}>
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: '100%' }}
              options={[
                { value: 'all', label: '全部状态' },
                { value: 'unhandled', label: '未处理' },
                { value: 'processing', label: '处理中' },
                { value: 'handled', label: '已处理' },
                { value: 'false_alarm', label: '误报' },
              ]}
            />
          </Col>
          <Col xs={24} sm={8} md={8}>
            <RangePicker
              style={{ width: '100%' }}
              placeholder={['开始日期', '结束日期']}
              onChange={(dates) => {
                if (dates && dates[0] && dates[1]) {
                  setDateRange([dates[0].format('YYYY-MM-DD'), dates[1].format('YYYY-MM-DD')]);
                } else {
                  setDateRange(null);
                }
              }}
            />
          </Col>
          <Col xs={24} sm={0} md={4}>
            <Button icon={<SearchOutlined />} type="primary" onClick={load}>
              查询
            </Button>
          </Col>
        </Row>
      </Card>

      <Card>
        <Table
          columns={columns}
          dataSource={alerts}
          rowKey="id"
          loading={loading}
          pagination={{
            total,
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (t) => `共 ${t} 条记录`,
          }}
          size="middle"
          scroll={{ x: 800 }}
        />
      </Card>

      {/* Detail Modal */}
      <Modal
        title={
          <Flex align="center" gap={8}>
            <AlertOutlined
              style={{ color: selectedAlert?.type === 'fall' ? '#E05555' : '#F0A04B' }}
            />
            报警详情
          </Flex>
        }
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={null}
        width={isMobile ? '100%' : 520}
        style={{ maxWidth: 520, margin: isMobile ? 0 : undefined }}
      >
        {selectedAlert && (
          <>
            <Descriptions column={1} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="编号">{selectedAlert.id}</Descriptions.Item>
              <Descriptions.Item label="类型">
                {selectedAlert.type === 'fall' ? (
                  <Tag color="error">摔倒</Tag>
                ) : (
                  <Tag color="warning">久坐/久站</Tag>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="时间">{selectedAlert.time}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag
                  color={
                    selectedAlert.status === 'unhandled'
                      ? 'red'
                      : selectedAlert.status === 'processing'
                        ? 'processing'
                        : 'green'
                  }
                >
                  {selectedAlert.status}
                </Tag>
              </Descriptions.Item>
              {selectedAlert.type === 'fall' && (
                <>
                  <Descriptions.Item label="置信度">
                    <Text strong style={{ color: '#E05555' }}>
                      {((selectedAlert.confidence ?? 0) * 100).toFixed(0)}%
                    </Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="位置">{selectedAlert.location || '未知'}</Descriptions.Item>
                </>
              )}
              {selectedAlert.type === 'sedentary' && (
                <Descriptions.Item label="持续时长">{selectedAlert.duration} 分钟</Descriptions.Item>
              )}
              <Descriptions.Item label="处理备注">{selectedAlert.handlerNote || '暂无'}</Descriptions.Item>
            </Descriptions>

            {selectedAlert.status !== 'handled' && selectedAlert.status !== 'false_alarm' && (
              <>
                <TextArea
                  rows={3}
                  placeholder="添加处理备注..."
                  value={handlerNote}
                  onChange={(e) => setHandlerNote(e.target.value)}
                  style={{ marginBottom: 16 }}
                />
                <Flex gap={8} justify="flex-end">
                  <Button
                    onClick={() => handleStatusChange(selectedAlert.id, 'false_alarm')}
                  >
                    标记为误报
                  </Button>
                  <Button
                    type="primary"
                    onClick={() => handleStatusChange(selectedAlert.id, 'handled')}
                    icon={<CheckCircleOutlined />}
                  >
                    确认处理完成
                  </Button>
                </Flex>
              </>
            )}
          </>
        )}
      </Modal>
    </div>
  );
}

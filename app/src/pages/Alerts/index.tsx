import { useEffect, useState, useCallback } from 'react';
import {
  Card, Tag, Select, Button, Modal, Descriptions, Input, message, Typography, Flex, Space, Empty, Spin,
} from 'antd';
import { AlertOutlined, CheckCircleOutlined, WarningOutlined, FilterOutlined } from '@ant-design/icons';
import { fetchAlerts, updateAlertStatus } from '../../api';
import type { AlertRecord } from '../../mock/data';

const { Title, Text } = Typography;

export default function Alerts() {
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState<string[] | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<AlertRecord | null>(null);
  const [handlerNote, setHandlerNote] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const params: Record<string, string> = { type: typeFilter, status: statusFilter };
    if (dateRange) { params.dateStart = dateRange[0]; params.dateEnd = dateRange[1]; }
    const res = await fetchAlerts(params as never);
    setAlerts(res.list);
    setTotal(res.total);
    setLoading(false);
  }, [typeFilter, statusFilter, dateRange]);

  useEffect(() => { load(); }, [load]);

  const handleStatusChange = async (id: string, status: string) => {
    await updateAlertStatus(id, status, handlerNote);
    message.success(`报警已标记`);
    setHandlerNote('');
    setDetailVisible(false);
    load();
  };

  const statusMap: Record<string, { color: string; text: string }> = {
    unhandled: { color: '#E05555', text: '未处理' },
    processing: { color: '#F0A04B', text: '处理中' },
    handled: { color: '#4DB6AC', text: '已处理' },
    false_alarm: { color: '#8B7E74', text: '误报' },
  };

  if (loading && alerts.length === 0) {
    return <Flex justify="center" style={{ paddingTop: 60 }}><Spin size="large" /></Flex>;
  }

  return (
    <div style={{ paddingBottom: 8 }}>
      <Flex justify="space-between" align="center" style={{ marginBottom: 12 }}>
        <Title level={5} style={{ margin: 0 }}>报警记录</Title>
        <Button size="small" icon={<FilterOutlined />} onClick={() => setShowFilters(!showFilters)}>
          筛选
        </Button>
      </Flex>

      {showFilters && (
        <Card size="small" style={{ marginBottom: 12 }}>
          <Flex vertical gap={8}>
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
          </Flex>
        </Card>
      )}

      {alerts.length === 0 ? (
        <Empty description="暂无报警记录" />
      ) : (
        <Flex vertical gap={8}>
          {alerts.map((a) => (
            <Card
              key={a.id}
              size="small"
              onClick={() => { setSelectedAlert(a); setHandlerNote(a.handlerNote || ''); setDetailVisible(true); }}
              style={{ cursor: 'pointer', borderLeft: `3px solid ${a.type === 'fall' ? '#E05555' : '#F0A04B'}` }}
            >
              <Flex justify="space-between" align="center">
                <Flex vertical gap={2}>
                  <Flex align="center" gap={6}>
                    <Tag color={a.type === 'fall' ? 'error' : 'warning'} style={{ fontSize: 11 }}>
                      {a.type === 'fall' ? '摔倒' : '久坐'}
                    </Tag>
                    <Text style={{ fontSize: 12 }}>{a.time}</Text>
                  </Flex>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {a.type === 'fall' ? `置信度 ${((a.confidence ?? 0) * 100).toFixed(0)}% · ${a.location || '未知'}` : `持续 ${a.duration} 分钟`}
                  </Text>
                </Flex>
                <Tag color={statusMap[a.status]?.color} style={{ fontSize: 11 }}>
                  {statusMap[a.status]?.text}
                </Tag>
              </Flex>
            </Card>
          ))}
        </Flex>
      )}

      <Text type="secondary" style={{ display: 'block', textAlign: 'center', marginTop: 12, fontSize: 12 }}>
        共 {total} 条记录
      </Text>

      {/* Detail Modal */}
      <Modal
        title={
          <Flex align="center" gap={6}>
            <WarningOutlined style={{ color: selectedAlert?.type === 'fall' ? '#E05555' : '#F0A04B' }} />
            报警详情
          </Flex>
        }
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={null}
        width="100%"
        style={{ maxWidth: 480, top: 20 }}
      >
        {selectedAlert && (
          <>
            <Descriptions column={1} size="small" style={{ marginBottom: 12 }}>
              <Descriptions.Item label="编号">{selectedAlert.id}</Descriptions.Item>
              <Descriptions.Item label="类型">
                <Tag color={selectedAlert.type === 'fall' ? 'error' : 'warning'}>
                  {selectedAlert.type === 'fall' ? '摔倒' : '久坐/久站'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="时间">{selectedAlert.time}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={statusMap[selectedAlert.status]?.color}>{statusMap[selectedAlert.status]?.text}</Tag>
              </Descriptions.Item>
              {selectedAlert.type === 'fall' && (
                <>
                  <Descriptions.Item label="置信度">
                    <Text strong style={{ color: '#E05555' }}>{((selectedAlert.confidence ?? 0) * 100).toFixed(0)}%</Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="位置">{selectedAlert.location || '未知'}</Descriptions.Item>
                </>
              )}
              {selectedAlert.type === 'sedentary' && (
                <Descriptions.Item label="持续时长">{selectedAlert.duration} 分钟</Descriptions.Item>
              )}
            </Descriptions>
            {selectedAlert.status !== 'handled' && selectedAlert.status !== 'false_alarm' && (
              <>
                <Input.TextArea
                  rows={2}
                  placeholder="处理备注..."
                  value={handlerNote}
                  onChange={(e) => setHandlerNote(e.target.value)}
                  style={{ marginBottom: 12 }}
                />
                <Flex gap={8} justify="flex-end" wrap="wrap">
                  <Button size="small" onClick={() => handleStatusChange(selectedAlert.id, 'false_alarm')}>标记误报</Button>
                  <Button type="primary" size="small" icon={<CheckCircleOutlined />} onClick={() => handleStatusChange(selectedAlert.id, 'handled')}>确认处理</Button>
                </Flex>
              </>
            )}
          </>
        )}
      </Modal>
    </div>
  );
}

import { useEffect, useState } from 'react';
import {
  Card, Table, Button, Modal, Input, message, Tag, Typography, Flex, Popconfirm, Empty, Row, Col,
} from 'antd';
import {
  TeamOutlined, UserAddOutlined, DeleteOutlined, UserOutlined, SafetyCertificateOutlined,
  BellOutlined, MessageOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';
import { useIsMobile } from '../../hooks/useMediaQuery';

const { Title, Text } = Typography;

interface UserInfo {
  id: number;
  username: string;
  email: string;
  role: string;
  since?: string;
}

export default function Guardians() {
  const { token } = useAuth();
  const [guardians, setGuardians] = useState<UserInfo[]>([]);
  const [wards, setWards] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [addUsername, setAddUsername] = useState('');
  const [adding, setAdding] = useState(false);
  const isMobile = useIsMobile();

  const api = (url: string, options: RequestInit = {}) =>
    fetch(url, {
      ...options,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(options.headers || {}) },
    }).then((r) => r.json().then((d) => ({ ok: r.ok, data: d })));

  const load = async () => {
    setLoading(true);
    const res = await api('/api/guardians');
    if (res.ok) {
      setGuardians(res.data.guardians);
      setWards(res.data.wards);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    if (!addUsername.trim()) return;
    setAdding(true);
    const res = await api('/api/guardians', {
      method: 'POST',
      body: JSON.stringify({ username: addUsername.trim() }),
    });
    if (res.ok) {
      message.success(`${addUsername} 已设为监护人，后续报警和语音消息将通知对方`);
      setAddUsername('');
      setModalOpen(false);
      load();
    } else {
      message.error(res.data.error);
    }
    setAdding(false);
  };

  const handleRemove = async (id: number) => {
    const res = await api(`/api/guardians/${id}`, { method: 'DELETE' });
    if (res.ok) {
      message.success('已移除监护人');
      load();
    } else {
      message.error(res.data.error);
    }
  };

  const guardianColumns = [
    { title: '用户名', dataIndex: 'username', key: 'username', render: (v: string) => <Text strong>{v}</Text> },
    { title: '邮箱', dataIndex: 'email', key: 'email' },
    {
      title: '角色', dataIndex: 'role', key: 'role', width: 80,
      render: (r: string) => <Tag color={r === 'admin' ? 'gold' : 'blue'}>{r === 'admin' ? '管理员' : '家属'}</Tag>,
    },
    {
      title: '操作', key: 'action', width: 100,
      render: (_: unknown, record: UserInfo) => (
        <Popconfirm title="确认移除此监护人？" onConfirm={() => handleRemove(record.id)} okText="确认" cancelText="取消">
          <Button type="link" danger size="small" icon={<DeleteOutlined />}>移除</Button>
        </Popconfirm>
      ),
    },
  ];

  const wardColumns = [
    { title: '用户名', dataIndex: 'username', key: 'username', render: (v: string) => <Text strong>{v}</Text> },
    { title: '邮箱', dataIndex: 'email', key: 'email' },
    {
      title: '状态', key: 'status', width: 100,
      render: () => <Tag color="green">正常监护中</Tag>,
    },
  ];

  return (
    <div>
      <Title level={4} style={{ marginBottom: 8 }}>
        <TeamOutlined style={{ marginRight: 8 }} />
        监护人管理
      </Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
        设置监护人后，摔倒报警、久坐提醒和语音消息将自动通知你的监护人
      </Text>

      <Row gutter={[16, 16]}>
        {/* 我的监护人 */}
        <Col xs={24} lg={14}>
          <Card
            title={
              <Flex align="center" gap={8}>
                <SafetyCertificateOutlined style={{ color: '#4DB6AC' }} />
                <Text strong>我的监护人（监护我的人）</Text>
              </Flex>
            }
            extra={
              <Button type="primary" icon={<UserAddOutlined />} onClick={() => setModalOpen(true)}>
                添加监护人
              </Button>
            }
          >
            {guardians.length === 0 ? (
              <Empty description="尚未添加监护人" image={Empty.PRESENTED_IMAGE_SIMPLE}>
                <Button type="primary" onClick={() => setModalOpen(true)}>添加监护人</Button>
              </Empty>
            ) : (
              <Table columns={guardianColumns} dataSource={guardians} rowKey="id" loading={loading} pagination={false} size="middle" scroll={{ x: 500 }} />
            )}
          </Card>
        </Col>

        {/* 我监护的人 */}
        <Col xs={24} lg={10}>
          <Card
            title={
              <Flex align="center" gap={8}>
                <UserOutlined style={{ color: '#E8725A' }} />
                <Text strong>我监护的人</Text>
              </Flex>
            }
          >
            {wards.length === 0 ? (
              <Empty description="暂未监护任何人" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <Table columns={wardColumns} dataSource={wards} rowKey="id" loading={loading} pagination={false} size="middle" scroll={{ x: 500 }} />
            )}
          </Card>
        </Col>
      </Row>

      {/* 功能预告 */}
      <Card
        size="small"
        style={{ marginTop: 16, background: '#FFFBF0', border: '1px dashed #F0A04B' }}
      >
        <Flex align="center" gap={12}>
          <BellOutlined style={{ fontSize: 20, color: '#F0A04B' }} />
          <div>
            <Text strong style={{ color: '#8B7E74' }}>监护人通知机制（开发中）</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 12 }}>
              设置监护人后，系统将在以下情况自动推送通知：
              <Tag color="error" style={{ marginLeft: 4 }}>摔倒报警</Tag>
              <Tag color="warning" style={{ marginLeft: 4 }}>久坐/久站提醒</Tag>
              <MessageOutlined style={{ marginLeft: 4 }} /> <Text type="secondary" style={{ fontSize: 12 }}>语音消息</Text>
            </Text>
          </div>
        </Flex>
      </Card>

      {/* Add Guardian Modal */}
      <Modal
        title="添加监护人"
        open={modalOpen}
        onCancel={() => { setModalOpen(false); setAddUsername(''); }}
        onOk={handleAdd}
        confirmLoading={adding}
        okText="确认添加"
        cancelText="取消"
        width={isMobile ? '100%' : 480}
        style={{ maxWidth: 480, margin: isMobile ? 0 : undefined }}
      >
        <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
          输入对方的用户名，将其设为你的监护人。对方将收到你的摔倒报警、久坐提醒和语音消息通知。
        </Text>
        <Input
          prefix={<UserOutlined />}
          placeholder="输入用户名"
          value={addUsername}
          onChange={(e) => setAddUsername(e.target.value)}
          onPressEnter={handleAdd}
          size="large"
        />
      </Modal>
    </div>
  );
}

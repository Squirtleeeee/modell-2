import { useEffect, useState } from 'react';
import {
  Card, Button, Modal, Input, message, Tag, Typography, Flex, Popconfirm, Empty, Spin,
} from 'antd';
import {
  TeamOutlined, UserAddOutlined, DeleteOutlined, UserOutlined,
  SafetyCertificateOutlined, BellOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';

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

  const api = (url: string, options: RequestInit = {}) =>
    fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
    }).then((r) => r.json().then((d) => ({ ok: r.ok, data: d })));

  const load = async () => {
    setLoading(true);
    const res = await api('/api/guardians');
    if (res.ok) { setGuardians(res.data.guardians); setWards(res.data.wards); }
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
      message.success(`${addUsername} 已设为监护人`);
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
    if (res.ok) { message.success('已移除'); load(); }
    else { message.error(res.data.error); }
  };

  if (loading && guardians.length === 0) {
    return <Flex justify="center" style={{ paddingTop: 60 }}><Spin size="large" /></Flex>;
  }

  return (
    <div style={{ paddingBottom: 8 }}>
      <Flex justify="space-between" align="center" style={{ marginBottom: 12 }}>
        <Title level={5} style={{ margin: 0 }}>监护人管理</Title>
        <Button type="primary" size="small" icon={<UserAddOutlined />} onClick={() => setModalOpen(true)}>添加</Button>
      </Flex>

      {/* 我的监护人 */}
      <Card
        size="small"
        title={<Flex align="center" gap={6}><SafetyCertificateOutlined style={{ color: '#4DB6AC' }} /><Text strong style={{ fontSize: 14 }}>我的监护人</Text></Flex>}
        style={{ marginBottom: 12 }}
      >
        {guardians.length === 0 ? (
          <Empty description="暂无监护人" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <Flex vertical gap={8}>
            {guardians.map((g) => (
              <Card key={g.id} size="small" bodyStyle={{ padding: 10 }}>
                <Flex justify="space-between" align="center">
                  <Flex align="center" gap={8}>
                    <UserOutlined style={{ fontSize: 20, color: '#E8725A' }} />
                    <Flex vertical gap={2}>
                      <Text strong style={{ fontSize: 14 }}>{g.username}</Text>
                      <Tag color={g.role === 'admin' ? 'gold' : 'blue'} style={{ fontSize: 10, lineHeight: '16px' }}>
                        {g.role === 'admin' ? '管理员' : '家属'}
                      </Tag>
                    </Flex>
                  </Flex>
                  <Popconfirm title="确认移除？" onConfirm={() => handleRemove(g.id)}>
                    <Button type="link" danger size="small" icon={<DeleteOutlined />}>移除</Button>
                  </Popconfirm>
                </Flex>
              </Card>
            ))}
          </Flex>
        )}
      </Card>

      {/* 我监护的人 */}
      <Card
        size="small"
        title={<Flex align="center" gap={6}><TeamOutlined style={{ color: '#E8725A' }} /><Text strong style={{ fontSize: 14 }}>我监护的人</Text></Flex>}
        style={{ marginBottom: 12 }}
      >
        {wards.length === 0 ? (
          <Empty description="暂未监护任何人" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <Flex vertical gap={8}>
            {wards.map((w) => (
              <Card key={w.id} size="small" bodyStyle={{ padding: 10 }}>
                <Flex align="center" gap={8}>
                  <UserOutlined style={{ fontSize: 20, color: '#4DB6AC' }} />
                  <Flex vertical gap={2}>
                    <Text strong style={{ fontSize: 14 }}>{w.username}</Text>
                    <Text type="secondary" style={{ fontSize: 11 }}>{w.email}</Text>
                  </Flex>
                  <Tag color="green" style={{ marginLeft: 'auto', fontSize: 10 }}>正常监护中</Tag>
                </Flex>
              </Card>
            ))}
          </Flex>
        )}
      </Card>

      {/* 通知机制预告 */}
      <Card size="small" style={{ background: '#FFFBF0', border: '1px dashed #F0A04B' }}>
        <Flex gap={8}>
          <BellOutlined style={{ fontSize: 18, color: '#F0A04B', marginTop: 2 }} />
          <div>
            <Text strong style={{ color: '#8B7E74', fontSize: 12 }}>通知机制（开发中）</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 11 }}>
              摔倒报警、久坐提醒和语音消息将自动通知你的监护人。
            </Text>
          </div>
        </Flex>
      </Card>

      {/* Add Modal */}
      <Modal
        title="添加监护人"
        open={modalOpen}
        onCancel={() => { setModalOpen(false); setAddUsername(''); }}
        onOk={handleAdd}
        confirmLoading={adding}
        okText="确认"
        cancelText="取消"
        width="100%"
        style={{ maxWidth: 400, top: 20 }}
      >
        <Text type="secondary" style={{ display: 'block', marginBottom: 12, fontSize: 13 }}>
          输入对方的用户名，将其设为你的监护人。
        </Text>
        <Input
          prefix={<UserOutlined />}
          placeholder="输入用户名"
          value={addUsername}
          onChange={(e) => setAddUsername(e.target.value)}
          size="large"
        />
      </Modal>
    </div>
  );
}

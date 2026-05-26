import { useEffect, useState, useCallback } from 'react';
import {
  Card, Table, Button, Modal, Input, message, Tag, Typography, Flex, Popconfirm, Empty, Row, Col, List, Space,
} from 'antd';
import {
  TeamOutlined, UserAddOutlined, DeleteOutlined, UserOutlined, SafetyCertificateOutlined,
  BellOutlined, CheckOutlined, CloseOutlined, SearchOutlined, ClockCircleOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../hooks/useSocket';
import { useIsMobile } from '../../hooks/useMediaQuery';

const { Title, Text } = Typography;

interface UserInfo {
  id: number;
  username: string;
  email: string;
  role: string;
  since?: string;
}

interface GuardianRequest {
  id: number;
  from_user_id: number;
  to_user_id: number;
  from_username?: string;
  to_username?: string;
  status: string;
  created_at: string;
}

export default function Guardians() {
  const { token, user } = useAuth();
  const { join, on } = useSocket();
  const [guardians, setGuardians] = useState<UserInfo[]>([]);
  const [wards, setWards] = useState<UserInfo[]>([]);
  const [receivedReqs, setReceivedReqs] = useState<GuardianRequest[]>([]);
  const [sentReqs, setSentReqs] = useState<GuardianRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchModal, setSearchModal] = useState(false);
  const [searchName, setSearchName] = useState('');
  const [searching, setSearching] = useState(false);
  const isMobile = useIsMobile();

  const api = useCallback((url: string, options: RequestInit = {}) =>
    fetch(url, {
      ...options,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(options.headers || {}) },
    }).then((r) => r.json().then((d) => ({ ok: r.ok, data: d }))),
  [token]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [relRes, reqRes] = await Promise.all([
      api('/api/guardians'),
      api('/api/guardians/requests'),
    ]);
    if (relRes.ok) { setGuardians(relRes.data.guardians); setWards(relRes.data.wards); }
    if (reqRes.ok) { setReceivedReqs(reqRes.data.received); setSentReqs(reqRes.data.sent); }
    setLoading(false);
  }, [api]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // WebSocket: 上线 + 监听申请状态变化
  useEffect(() => {
    if (user) join(user.id);
  }, [user, join]);

  useEffect(() => {
    const unsub1 = on('new_request', () => loadAll());
    const unsub2 = on('request_accepted', () => loadAll());
    return () => { unsub1(); unsub2(); };
  }, [on, loadAll]);

  // 搜索用户并发起申请
  const handleSearch = async () => {
    if (!searchName.trim()) return;
    setSearching(true);
    const res = await api('/api/guardians/request', {
      method: 'POST',
      body: JSON.stringify({ username: searchName.trim() }),
    });
    if (res.ok) {
      message.success(`已向 ${searchName} 发送监护人申请`);
      setSearchName('');
      setSearchModal(false);
      loadAll();
    } else {
      message.error(res.data.error);
    }
    setSearching(false);
  };

  // 同意申请
  const handleAccept = async (id: number) => {
    const res = await api(`/api/guardians/request/${id}/accept`, { method: 'PUT' });
    if (res.ok) { message.success('已同意，双方互为监护人'); loadAll(); }
    else message.error(res.data.error);
  };

  // 拒绝申请
  const handleReject = async (id: number) => {
    const res = await api(`/api/guardians/request/${id}/reject`, { method: 'PUT' });
    if (res.ok) { message.success('已拒绝'); loadAll(); }
    else message.error(res.data.error);
  };

  // 移除监护人
  const handleRemove = async (id: number) => {
    const res = await api(`/api/guardians/${id}`, { method: 'DELETE' });
    if (res.ok) { message.success('已移除'); loadAll(); }
    else message.error(res.data.error);
  };

  const guardianCols = [
    { title: '用户名', dataIndex: 'username', key: 'username', render: (v: string) => <Text strong>{v}</Text> },
    { title: '邮箱', dataIndex: 'email', key: 'email' },
    { title: '角色', dataIndex: 'role', key: 'role', width: 80, render: (r: string) => <Tag color={r === 'admin' ? 'gold' : 'blue'}>{r === 'admin' ? '管理员' : '家属'}</Tag> },
    { title: '操作', key: 'action', width: 100, render: (_: unknown, rec: UserInfo) => (
      <Popconfirm title="确认移除？" onConfirm={() => handleRemove(rec.id)} okText="确认" cancelText="取消">
        <Button type="link" danger size="small" icon={<DeleteOutlined />}>移除</Button>
      </Popconfirm>
    )},
  ];

  const wardCols = [
    { title: '用户名', dataIndex: 'username', key: 'username', render: (v: string) => <Text strong>{v}</Text> },
    { title: '邮箱', dataIndex: 'email', key: 'email' },
    { title: '状态', key: 'status', width: 100, render: () => <Tag color="green">正常监护中</Tag> },
  ];

  return (
    <div>
      <Flex align="center" justify="space-between" style={{ marginBottom: 16 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>
            <TeamOutlined style={{ marginRight: 8 }} />
            监护人管理
          </Title>
        </div>
        <Button type="primary" icon={<UserAddOutlined />} onClick={() => setSearchModal(true)}>
          搜索用户
        </Button>
      </Flex>
      <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
        搜索对方用户名发送监护申请，对方同意后即可互相监护、在线聊天
      </Text>

      {/* 收到的申请 */}
      {receivedReqs.length > 0 && (
        <Card
          size="small"
          title={<><BellOutlined style={{ color: '#E8725A' }} /> <Text strong>收到的申请</Text></>}
          style={{ marginBottom: 16, borderColor: '#E8725A' }}
        >
          <List
            dataSource={receivedReqs}
            renderItem={(r) => (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F5F0EC' }}>
                <div>
                  <Text strong>{r.from_username}</Text>
                  <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>{r.created_at?.slice(0, 16)}</Text>
                </div>
                <Space>
                  <Button type="primary" size="small" icon={<CheckOutlined />} onClick={() => handleAccept(r.id)}>同意</Button>
                  <Button size="small" icon={<CloseOutlined />} onClick={() => handleReject(r.id)}>拒绝</Button>
                </Space>
              </div>
            )}
          />
        </Card>
      )}

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <Card title={<><SafetyCertificateOutlined style={{ color: '#4DB6AC' }} /> <Text strong>我的监护人</Text></>}>
            {guardians.length === 0 ? (
              <Empty description="尚未添加监护人" image={Empty.PRESENTED_IMAGE_SIMPLE}>
                <Button type="primary" icon={<SearchOutlined />} onClick={() => setSearchModal(true)}>搜索用户</Button>
              </Empty>
            ) : (
              <Table columns={guardianCols} dataSource={guardians} rowKey="id" loading={loading} pagination={false} size="middle" scroll={{ x: 500 }} />
            )}
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <Card title={<><UserOutlined style={{ color: '#E8725A' }} /> <Text strong>我监护的人</Text></>}>
            {wards.length === 0 ? (
              <Empty description="暂未监护任何人" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <Table columns={wardCols} dataSource={wards} rowKey="id" loading={loading} pagination={false} size="middle" scroll={{ x: 500 }} />
            )}
          </Card>

          {/* 发出的申请 */}
          {sentReqs.length > 0 && (
            <Card title={<><ClockCircleOutlined /> <Text strong>发出的申请</Text></>} size="small" style={{ marginTop: 16 }}>
              {sentReqs.map((r) => (
                <Tag key={r.id} color="processing" style={{ marginBottom: 4 }}>
                  等待 {r.to_username} 同意
                </Tag>
              ))}
            </Card>
          )}
        </Col>
      </Row>

      {/* 搜索 Modal */}
      <Modal
        title="搜索用户"
        open={searchModal}
        onCancel={() => { setSearchModal(false); setSearchName(''); }}
        onOk={handleSearch}
        confirmLoading={searching}
        okText="发送监护申请"
        cancelText="取消"
        width={isMobile ? '100%' : 440}
        style={{ maxWidth: 440 }}
      >
        <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
          输入对方的用户名，发送监护人申请。对方同意后即可互相监护、在线聊天。
        </Text>
        <Input
          prefix={<UserOutlined />}
          placeholder="输入用户名"
          value={searchName}
          onChange={(e) => setSearchName(e.target.value)}
          onPressEnter={handleSearch}
          size="large"
        />
      </Modal>
    </div>
  );
}

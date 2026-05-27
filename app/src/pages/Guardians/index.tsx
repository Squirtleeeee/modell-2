import { useEffect, useState, useCallback } from 'react';
import {
  Card, Button, Modal, Input, message, Tag, Typography, Flex, Popconfirm, Empty, Space,
} from 'antd';
import {
  TeamOutlined, UserAddOutlined, DeleteOutlined, UserOutlined,
  SafetyCertificateOutlined, BellOutlined, CheckOutlined, CloseOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../hooks/useSocket';

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
  useEffect(() => { if (user) join(user.id); }, [user, join]);
  useEffect(() => {
    const u1 = on('new_request', () => loadAll());
    const u2 = on('request_accepted', () => loadAll());
    return () => { u1(); u2(); };
  }, [on, loadAll]);

  const handleSearch = async () => {
    if (!searchName.trim()) return;
    setSearching(true);
    const res = await api('/api/guardians/request', { method: 'POST', body: JSON.stringify({ username: searchName.trim() }) });
    if (res.ok) { message.success(`已向 ${searchName} 发送申请`); setSearchName(''); setSearchModal(false); loadAll(); }
    else message.error(res.data.error);
    setSearching(false);
  };

  const handleAccept = async (id: number) => {
    const res = await api(`/api/guardians/request/${id}/accept`, { method: 'PUT' });
    if (res.ok) { message.success('已同意'); loadAll(); }
    else message.error(res.data.error);
  };

  const handleReject = async (id: number) => {
    const res = await api(`/api/guardians/request/${id}/reject`, { method: 'PUT' });
    if (res.ok) { message.success('已拒绝'); loadAll(); }
    else message.error(res.data.error);
  };

  const handleRemove = async (id: number) => {
    const res = await api(`/api/guardians/${id}`, { method: 'DELETE' });
    if (res.ok) { message.success('已移除'); loadAll(); }
    else message.error(res.data.error);
  };

  return (
    <div style={{ paddingBottom: 16 }}>
      <Flex align="center" justify="space-between" style={{ marginBottom: 12 }}>
        <Title level={5} style={{ margin: 0 }}><TeamOutlined style={{ marginRight: 6 }} />监护人管理</Title>
        <Button type="primary" size="small" icon={<UserAddOutlined />} onClick={() => setSearchModal(true)}>搜索用户</Button>
      </Flex>
      <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 16 }}>
        搜索用户名发送监护申请，同意后可在线聊天
      </Text>

      {receivedReqs.length > 0 && (
        <Card size="small" title={<><BellOutlined style={{ color: '#E8725A' }} /> 收到的申请</>} style={{ marginBottom: 12, borderColor: '#E8725A' }}>
          {receivedReqs.map((r) => (
            <Flex key={r.id} justify="space-between" align="center" style={{ padding: '6px 0', borderBottom: '1px solid #F5F0EC' }}>
              <div>
                <Text strong>{r.from_username}</Text>
                <Text type="secondary" style={{ marginLeft: 6, fontSize: 11 }}>{r.created_at?.slice(5, 16)}</Text>
              </div>
              <Space>
                <Button type="primary" size="small" icon={<CheckOutlined />} onClick={() => handleAccept(r.id)}>同意</Button>
                <Button size="small" icon={<CloseOutlined />} onClick={() => handleReject(r.id)}>拒绝</Button>
              </Space>
            </Flex>
          ))}
        </Card>
      )}

      <Card size="small" title={<><SafetyCertificateOutlined style={{ color: '#4DB6AC' }} /> 我的监护人</>} style={{ marginBottom: 12 }}>
        {guardians.length === 0 ? (
          <Empty description="尚未添加监护人" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          guardians.map((g) => (
            <Flex key={g.id} justify="space-between" align="center" style={{ padding: '8px 0', borderBottom: '1px solid #F5F0EC' }}>
              <div>
                <Text strong>{g.username}</Text>
                <Tag color={g.role === 'admin' ? 'gold' : 'blue'} style={{ marginLeft: 6, fontSize: 11 }}>{g.role === 'admin' ? '管理员' : '家属'}</Tag>
              </div>
              <Popconfirm title="确认移除？" onConfirm={() => handleRemove(g.id)} okText="确认" cancelText="取消">
                <Button type="link" danger size="small" icon={<DeleteOutlined />} />
              </Popconfirm>
            </Flex>
          ))
        )}
      </Card>

      <Card size="small" title={<><UserOutlined style={{ color: '#E8725A' }} /> 我监护的人</>} style={{ marginBottom: 12 }}>
        {wards.length === 0 ? (
          <Empty description="暂未监护任何人" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          wards.map((w) => (
            <div key={w.id} style={{ padding: '8px 0', borderBottom: '1px solid #F5F0EC' }}>
              <Text strong>{w.username}</Text>
              <Tag color="green" style={{ marginLeft: 6, fontSize: 11 }}>正常监护中</Tag>
            </div>
          ))
        )}
      </Card>

      {sentReqs.length > 0 && (
        <Card size="small" title={<><ClockCircleOutlined /> 发出的申请</>}>
          {sentReqs.map((r) => (
            <Tag key={r.id} color="processing" style={{ marginBottom: 4 }}>等待 {r.to_username} 同意</Tag>
          ))}
        </Card>
      )}

      <Modal title="搜索用户" open={searchModal} onCancel={() => { setSearchModal(false); setSearchName(''); }} onOk={handleSearch} confirmLoading={searching} okText="发送监护申请" cancelText="取消" width="100%" style={{ maxWidth: 400 }}>
        <Text type="secondary" style={{ display: 'block', marginBottom: 12, fontSize: 13 }}>输入对方的用户名、邮箱或手机号，发送监护人申请。</Text>
        <Input prefix={<UserOutlined />} placeholder="用户名/邮箱/手机号" value={searchName} onChange={(e) => setSearchName(e.target.value)} onPressEnter={handleSearch} />
      </Modal>
    </div>
  );
}

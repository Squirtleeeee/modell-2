import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Card, Form, Input, Button, Typography, message, Flex } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';

const { Title, Text } = Typography;

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const from = (location.state as { from?: string })?.from || '/';
  const serverUrl = localStorage.getItem('server_url');

  const handleLogin = async (values: { username: string; password: string }) => {
    setLoading(true);
    try {
      await login(values.username, values.password);
      message.success('登录成功');
      navigate(from, { replace: true });
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Flex justify="center" align="center" style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #F5F0EC 0%, #EDE5DB 100%)', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        {!localStorage.getItem('server_url') && (
          <div style={{
            background: '#F0FAF7', border: '1px solid #A7E0D0', borderRadius: 8,
            padding: '8px 14px', marginBottom: 16, fontSize: 12,
          }}>
            <Text type="secondary">当前服务器：{serverUrl}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 11 }}>如需修改，点击右上角齿轮图标</Text>
          </div>
        )}
        <Card style={{ borderRadius: 12, boxShadow: '0 8px 32px rgba(61, 50, 44, 0.12)' }}>
          <Flex vertical align="center" style={{ marginBottom: 24 }}>
            <Title level={3} style={{ marginBottom: 4 }}>行动安全守护系统</Title>
            <Text type="secondary">登录您的账户</Text>
          </Flex>

          <Form layout="vertical" onFinish={handleLogin} size="large">
            <Form.Item name="username" rules={[{ required: true, message: '请输入用户名' }]}>
              <Input prefix={<UserOutlined />} placeholder="用户名" />
            </Form.Item>
            <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
              <Input.Password prefix={<LockOutlined />} placeholder="密码" />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading} block>
                登录
              </Button>
            </Form.Item>
          </Form>

          <Flex justify="space-between">
            <Link to="/forgot-password">忘记密码？</Link>
            <Link to="/register">注册新账户</Link>
          </Flex>

          <Flex justify="center" style={{ marginTop: 16 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              默认管理员: admin / admin123
            </Text>
          </Flex>
        </Card>
      </div>
    </Flex>
  );
}

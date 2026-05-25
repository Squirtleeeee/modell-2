import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Card, Form, Input, Button, Typography, message, Flex, Tabs } from 'antd';
import { UserOutlined, LockOutlined, PhoneOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';

const { Title, Text } = Typography;

export default function Login() {
  const { login, loginByPhonePassword, loginBySms, sendSmsCode } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [smsSeconds, setSmsSeconds] = useState(0);
  const from = (location.state as { from?: string })?.from || '/';

  // SMS countdown
  const startSmsCountdown = () => {
    setSmsSeconds(60);
    const timer = setInterval(() => {
      setSmsSeconds((s) => {
        if (s <= 1) { clearInterval(timer); return 0; }
        return s - 1;
      });
    }, 1000);
  };

  // Tab 1: 用户名+密码
  const handleUsernameLogin = async (values: { username: string; password: string }) => {
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

  // Tab 2: 手机号+密码
  const handlePhonePasswordLogin = async (values: { phone: string; password: string }) => {
    setLoading(true);
    try {
      await loginByPhonePassword(values.phone, values.password);
      message.success('登录成功');
      navigate(from, { replace: true });
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : '登录失败');
    } finally {
      setLoading(false);
    }
  };

  // Tab 3: 短信验证码登录
  const handleSmsLogin = async (values: { phone: string; code: string }) => {
    setLoading(true);
    try {
      await loginBySms(values.phone, values.code);
      message.success('登录成功');
      navigate(from, { replace: true });
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : '登录失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSendSms = async (phone: string) => {
    try {
      await sendSmsCode(phone, 'login');
      message.success('验证码已发送');
      startSmsCountdown();
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : '发送失败');
    }
  };

  const tabItems = [
    {
      key: 'username',
      label: '账号密码登录',
      children: (
        <Form layout="vertical" onFinish={handleUsernameLogin} size="large">
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
      ),
    },
    {
      key: 'phone_password',
      label: '手机号登录',
      children: (
        <Form layout="vertical" onFinish={handlePhonePasswordLogin} size="large">
          <Form.Item name="phone" rules={[
            { required: true, message: '请输入手机号' },
            { pattern: /^1[3-9]\d{9}$/, message: '请输入有效的手机号' },
          ]}>
            <Input prefix={<PhoneOutlined />} placeholder="手机号" />
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
      ),
    },
    {
      key: 'sms',
      label: '短信验证码登录',
      children: (
        <Form layout="vertical" onFinish={handleSmsLogin} size="large">
          <Form.Item name="phone" rules={[
            { required: true, message: '请输入手机号' },
            { pattern: /^1[3-9]\d{9}$/, message: '请输入有效的手机号' },
          ]}>
            <Input prefix={<PhoneOutlined />} placeholder="手机号" />
          </Form.Item>
          <Form.Item name="code" rules={[{ required: true, message: '请输入验证码' }]}>
            <Input
              prefix={<SafetyCertificateOutlined />}
              placeholder="短信验证码"
              maxLength={6}
              suffix={
                <Button
                  type="link"
                  size="small"
                  disabled={smsSeconds > 0}
                  onClick={() => {
                    const phone = (document.querySelector('input[placeholder="手机号"]') as HTMLInputElement)?.value;
                    if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
                      message.warning('请先输入有效的手机号');
                      return;
                    }
                    handleSendSms(phone);
                  }}
                >
                  {smsSeconds > 0 ? `重新发送(${smsSeconds}s)` : '获取验证码'}
                </Button>
              }
            />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              登录
            </Button>
          </Form.Item>
        </Form>
      ),
    },
  ];

  return (
    <Flex justify="center" align="center" style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #F5F0EC 0%, #EDE5DB 100%)', padding: 16 }}>
      <Card style={{ width: '100%', maxWidth: 400, borderRadius: 12, boxShadow: '0 8px 32px rgba(61, 50, 44, 0.12)' }}>
        <Flex vertical align="center" style={{ marginBottom: 24 }}>
          <Title level={3} style={{ marginBottom: 4 }}>行动安全守护系统</Title>
          <Text type="secondary">登录您的账户</Text>
        </Flex>

        <Tabs items={tabItems} centered />

        <Flex justify="space-between" style={{ marginTop: -8 }}>
          <Link to="/forgot-password">忘记密码？</Link>
          <Link to="/register">注册新账户</Link>
        </Flex>

        <Flex justify="center" style={{ marginTop: 16 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            默认管理员: admin / admin123
          </Text>
        </Flex>
      </Card>
    </Flex>
  );
}

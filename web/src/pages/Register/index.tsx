import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, Form, Input, Button, Typography, message, Flex } from 'antd';
import { UserOutlined, MailOutlined, LockOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';

const { Title, Text } = Typography;

export default function Register() {
  const { register, sendEmailCode } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [emailSeconds, setEmailSeconds] = useState(0);
  const [emailCode, setEmailCode] = useState('');

  const startEmailCountdown = () => {
    setEmailSeconds(60);
    const timer = setInterval(() => {
      setEmailSeconds((s) => {
        if (s <= 1) { clearInterval(timer); return 0; }
        return s - 1;
      });
    }, 1000);
  };

  const handleSendEmailCode = async () => {
    const email = (document.querySelector('input[placeholder="邮箱"]') as HTMLInputElement)?.value;
    if (!email) {
      message.warning('请先输入邮箱');
      return;
    }
    try {
      const res = await sendEmailCode(email, 'register');
      message.success('验证码已发送');
      if (res.code) setEmailCode(res.code);
      startEmailCountdown();
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : '发送失败');
    }
  };

  const handleSubmit = async (values: {
    username: string;
    email: string;
    password: string;
    emailCode: string;
  }) => {
    setLoading(true);
    try {
      await register(values.username, values.email, values.password, values.emailCode);
      message.success('注册成功');
      navigate('/', { replace: true });
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : '注册失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Flex justify="center" align="center" style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #F5F0EC 0%, #EDE5DB 100%)', padding: 16 }}>
      <Card style={{ width: '100%', maxWidth: 440, borderRadius: 12, boxShadow: '0 8px 32px rgba(61, 50, 44, 0.12)' }}>
        <Flex vertical align="center" style={{ marginBottom: 32 }}>
          <Title level={3} style={{ marginBottom: 4 }}>注册新账户</Title>
          <Text type="secondary">创建您的家属账户以监护家人</Text>
        </Flex>

        <Form layout="vertical" onFinish={handleSubmit} size="large">
          <Form.Item name="username" rules={[{ required: true, message: '请输入用户名' }]}>
            <Input prefix={<UserOutlined />} placeholder="用户名" />
          </Form.Item>

          <Form.Item name="email" rules={[
            { required: true, message: '请输入邮箱' },
            { type: 'email', message: '请输入有效的邮箱地址' },
          ]}>
            <Input prefix={<MailOutlined />} placeholder="邮箱" />
          </Form.Item>

          {emailCode && (
            <div style={{ background: '#F6FFED', border: '1px solid #B7EB8F', borderRadius: 6, padding: '6px 12px', marginBottom: 12, textAlign: 'center' }}>
              <Text type="secondary" style={{ fontSize: 12 }}>验证码：</Text>
              <Text strong style={{ fontSize: 20, color: '#52C41A', letterSpacing: 4, marginLeft: 8 }}>{emailCode}</Text>
            </div>
          )}
          <Form.Item name="emailCode" rules={[{ required: true, message: '请输入邮箱验证码' }]}>
            <Input
              prefix={<SafetyCertificateOutlined />}
              placeholder="邮箱验证码"
              maxLength={6}
              suffix={
                <Button type="link" size="small" disabled={emailSeconds > 0} onClick={handleSendEmailCode}>
                  {emailSeconds > 0 ? `重新发送(${emailSeconds}s)` : '发送验证码'}
                </Button>
              }
            />
          </Form.Item>

          <Form.Item name="password" rules={[
            { required: true, message: '请输入密码' },
            { min: 6, message: '密码长度不能少于 6 位' },
          ]}>
            <Input.Password prefix={<LockOutlined />} placeholder="密码（至少 6 位）" />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            dependencies={['password']}
            rules={[
              { required: true, message: '请确认密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) return Promise.resolve();
                  return Promise.reject(new Error('两次输入的密码不一致'));
                },
              }),
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="确认密码" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              注册
            </Button>
          </Form.Item>
        </Form>

        <Flex justify="center">
          <Text>已有账户？<Link to="/login">立即登录</Link></Text>
        </Flex>
      </Card>
    </Flex>
  );
}

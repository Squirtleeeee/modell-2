import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, Form, Input, Button, Typography, message, Flex, Steps } from 'antd';
import { MailOutlined, LockOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';

const { Title } = Typography;

export default function ForgotPassword() {
  const { forgotPassword, resetPassword } = useAuth();
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSeconds, setEmailSeconds] = useState(0);

  const startEmailCountdown = () => {
    setEmailSeconds(60);
    const timer = setInterval(() => {
      setEmailSeconds((s) => {
        if (s <= 1) { clearInterval(timer); return 0; }
        return s - 1;
      });
    }, 1000);
  };

  const handleSendEmail = async (values: { email: string }) => {
    setLoading(true);
    try {
      await forgotPassword(values.email);
      setEmail(values.email);
      message.success('验证码已发送');
      startEmailCountdown();
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : '请求失败');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (values: { code: string; newPassword: string }) => {
    setLoading(true);
    try {
      await resetPassword(email, values.code, values.newPassword);
      message.success('密码重置成功，请使用新密码登录');
      setStep(2);
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : '重置失败');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      await forgotPassword(email);
      message.success('验证码已重新发送');
      startEmailCountdown();
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : '发送失败');
    }
  };

  return (
    <Flex justify="center" align="center" style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #F5F0EC 0%, #EDE5DB 100%)', padding: 16 }}>
      <Card style={{ width: '100%', maxWidth: 440, borderRadius: 12, boxShadow: '0 8px 32px rgba(61, 50, 44, 0.12)' }}>
        <Flex vertical align="center" style={{ marginBottom: 24 }}>
          <Title level={3} style={{ marginBottom: 4 }}>找回密码</Title>
        </Flex>

        <Steps
          current={step}
          size="small"
          items={[
            { title: '验证邮箱' },
            { title: '重置密码' },
            { title: '完成' },
          ]}
          style={{ marginBottom: 32 }}
        />

        {step === 0 && (
          <Form layout="vertical" onFinish={handleSendEmail} size="large">
            <Form.Item name="email" rules={[
              { required: true, message: '请输入注册时使用的邮箱' },
              { type: 'email', message: '请输入有效的邮箱地址' },
            ]}>
              <Input prefix={<MailOutlined />} placeholder="注册邮箱" />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading} block>
                发送验证码
              </Button>
            </Form.Item>
          </Form>
        )}

        {step === 1 && (
          <Form layout="vertical" onFinish={handleReset} size="large">
            <Form.Item label="验证码已发送至：">
              <Typography.Text strong>{email}</Typography.Text>
            </Form.Item>
            <Form.Item name="code" rules={[{ required: true, message: '请输入验证码' }]}>
              <Input
                prefix={<SafetyCertificateOutlined />}
                placeholder="6位验证码"
                maxLength={6}
                suffix={
                  <Button type="link" size="small" disabled={emailSeconds > 0} onClick={handleResend}>
                    {emailSeconds > 0 ? `重新发送(${emailSeconds}s)` : '重新发送'}
                  </Button>
                }
              />
            </Form.Item>
            <Form.Item name="newPassword" rules={[
              { required: true, message: '请输入新密码' },
              { min: 6, message: '密码长度不能少于 6 位' },
            ]}>
              <Input.Password prefix={<LockOutlined />} placeholder="新密码（至少 6 位）" />
            </Form.Item>
            <Form.Item
              name="confirmPassword"
              dependencies={['newPassword']}
              rules={[
                { required: true, message: '请确认新密码' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('newPassword') === value) return Promise.resolve();
                    return Promise.reject(new Error('两次输入的密码不一致'));
                  },
                }),
              ]}
            >
              <Input.Password prefix={<LockOutlined />} placeholder="确认新密码" />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading} block>
                重置密码
              </Button>
            </Form.Item>
          </Form>
        )}

        {step === 2 && (
          <Flex vertical align="center" gap={16}>
            <Typography.Text type="success" style={{ fontSize: 16 }}>密码重置成功！</Typography.Text>
            <Link to="/login">
              <Button type="primary" size="large">返回登录</Button>
            </Link>
          </Flex>
        )}

        <Flex justify="center" style={{ marginTop: 16 }}>
          <Link to="/login">返回登录</Link>
        </Flex>
      </Card>
    </Flex>
  );
}

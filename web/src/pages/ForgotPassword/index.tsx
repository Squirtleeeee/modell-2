import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, Form, Input, Button, Typography, message, Flex, Steps, Alert } from 'antd';
import { MailOutlined, LockOutlined, KeyOutlined } from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';

const { Title } = Typography;

export default function ForgotPassword() {
  const { forgotPassword, resetPassword } = useAuth();
  const [step, setStep] = useState(0);
  const [devToken, setDevToken] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendEmail = async (values: { email: string }) => {
    setLoading(true);
    try {
      const result = await forgotPassword(values.email);
      if (result.devToken) setDevToken(result.devToken);
      setStep(1);
      message.success('重置链接已生成');
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : '请求失败');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (values: { token: string; newPassword: string }) => {
    setLoading(true);
    try {
      await resetPassword(values.token, values.newPassword);
      message.success('密码重置成功，请使用新密码登录');
      setStep(2);
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : '重置失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Flex justify="center" align="center" style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #F5F0EC 0%, #EDE5DB 100%)' }}>
      <Card style={{ width: 440, borderRadius: 12, boxShadow: '0 8px 32px rgba(61, 50, 44, 0.12)' }}>
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
                发送重置链接
              </Button>
            </Form.Item>
          </Form>
        )}

        {step === 1 && (
          <>
            {devToken && (
              <Alert
                type="info"
                message="开发模式"
                description={`重置 Token: ${devToken}`}
                style={{ marginBottom: 16, wordBreak: 'break-all' }}
              />
            )}
            <Form layout="vertical" onFinish={handleReset} size="large">
              <Form.Item name="token" initialValue={devToken} rules={[{ required: true, message: '请输入重置 Token' }]}>
                <Input prefix={<KeyOutlined />} placeholder="重置 Token（请查看开发控制台输出）" />
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
          </>
        )}

        {step === 2 && (
          <Flex vertical align="center" gap={16}>
            <Alert type="success" message="密码重置成功！" showIcon />
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

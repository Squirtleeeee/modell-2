import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, Form, Input, Button, Typography, message, Flex } from 'antd';
import { UserOutlined, MailOutlined, LockOutlined } from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';

const { Title, Text } = Typography;

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values: { username: string; email: string; password: string }) => {
    setLoading(true);
    try {
      await register(values.username, values.email, values.password);
      message.success('注册成功');
      navigate('/', { replace: true });
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : '注册失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Flex justify="center" align="center" style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #F5F0EC 0%, #EDE5DB 100%)' }}>
      <Card style={{ width: 400, borderRadius: 12, boxShadow: '0 8px 32px rgba(61, 50, 44, 0.12)' }}>
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

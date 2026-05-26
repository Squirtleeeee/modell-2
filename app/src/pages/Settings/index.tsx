import { useState, useEffect } from 'react';
import { Card, Input, Button, message, Typography, Flex, Tag } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, LinkOutlined, SaveOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const DEFAULT_URL = 'http://192.168.1.165:3001';
const STORAGE_KEY = 'server_url';

export default function Settings() {
  const [url, setUrl] = useState(localStorage.getItem(STORAGE_KEY) || '');
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState<'unknown' | 'ok' | 'fail'>('unknown');

  useEffect(() => {
    // 首次进入自动检测连接
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setUrl(saved);
      testConnection(saved);
    }
  }, []);

  const testConnection = async (testUrl?: string) => {
    const u = testUrl || url;
    if (!u) return;
    setTesting(true);
    setStatus('unknown');
    try {
      const res = await fetch(`${u}/api/health`, { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        setStatus('ok');
        message.success('连接成功');
      } else {
        setStatus('fail');
        message.error('服务器返回错误');
      }
    } catch {
      setStatus('fail');
      message.error('无法连接服务器，请检查地址和网络');
    }
    setTesting(false);
  };

  const handleSave = () => {
    const trimmed = url.trim().replace(/\/+$/, '');
    if (!trimmed) {
      message.warning('请输入服务器地址');
      return;
    }
    localStorage.setItem(STORAGE_KEY, trimmed);
    setUrl(trimmed);
    message.success('已保存，请重新打开 App 使配置生效');
    testConnection(trimmed);
  };

  const handleReset = () => {
    localStorage.removeItem(STORAGE_KEY);
    setUrl('');
    setStatus('unknown');
    message.info('已清除配置');
  };

  return (
    <div style={{ padding: '0 0 16px' }}>
      <Title level={5} style={{ marginBottom: 16 }}>
        <LinkOutlined style={{ marginRight: 6 }} />
        服务器设置
      </Title>

      <Card size="small" style={{ marginBottom: 12 }}>
        <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 12 }}>
          配置后端服务器地址，App 需要连接到后端才能正常使用（登录、数据看板、聊天等功能）。
        </Text>

        <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 4 }}>服务器地址</Text>
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder={`例如: ${DEFAULT_URL}`}
          style={{ marginBottom: 12 }}
          size="large"
          onPressEnter={handleSave}
        />

        <Flex gap={8} style={{ marginBottom: 8 }}>
          <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} block>
            保存
          </Button>
          <Button
            icon={status === 'ok' ? <CheckCircleOutlined /> : status === 'fail' ? <CloseCircleOutlined /> : <LinkOutlined />}
            onClick={() => testConnection()}
            loading={testing}
            block
            style={{ borderColor: status === 'ok' ? '#4DB6AC' : status === 'fail' ? '#E05555' : undefined }}
          >
            {testing ? '检测中...' : '测试连接'}
          </Button>
        </Flex>

        {status === 'ok' && (
          <Tag color="success" icon={<CheckCircleOutlined />} style={{ fontSize: 13, padding: '4px 10px' }}>
            连接正常 — 请重新打开 App
          </Tag>
        )}
        {status === 'fail' && (
          <Tag color="error" icon={<CloseCircleOutlined />} style={{ fontSize: 13, padding: '4px 10px' }}>
            连接失败 — 请检查地址和网络
          </Tag>
        )}

        {url && (
          <Button type="link" danger size="small" onClick={handleReset} style={{ padding: 0, marginTop: 8 }}>
            清除配置
          </Button>
        )}
      </Card>

      <Card size="small" title="常见地址" style={{ marginBottom: 12 }}>
        <Flex vertical gap={6}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            <strong>同 WiFi：</strong>电脑的局域网 IP + 端口，如 {DEFAULT_URL}
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            <strong>公网域名：</strong>Serveo 固定域名，如 https://mobility-guardian.serveousercontent.com
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            <strong>本机调试：</strong>http://localhost:3001
          </Text>
        </Flex>
      </Card>

      <Card size="small" title="使用说明">
        <Text type="secondary" style={{ fontSize: 12 }}>
          1. 确保电脑已启动后端服务（{'\n'}
          2. 输入电脑的局域网 IP 或公网域名{'\n'}
          3. 点击"测试连接"确认能连通{'\n'}
          4. 点击"保存"后，重新打开 App 生效{'\n'}
          5. 手机和电脑需连同一 WiFi（局域网方式）
        </Text>
      </Card>
    </div>
  );
}

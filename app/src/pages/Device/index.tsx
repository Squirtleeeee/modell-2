import { useEffect, useState } from 'react';
import {
  Card,
  Descriptions,
  Tag,
  Button,
  Slider,
  Select,
  Switch,
  Form,
  message,
  Spin,
  Flex,
  Typography,
  Row,
  Col,
  Divider,
  Badge,
  Progress,
  Space,
} from 'antd';
import {
  SettingOutlined,
  WifiOutlined,
  LinkOutlined,
  SaveOutlined,
  ReloadOutlined,
  AudioOutlined,
  ThunderboltOutlined,
  SignalFilled,
} from '@ant-design/icons';
import { fetchDeviceStatus, fetchDeviceConfig, updateDeviceConfig } from '../../api';

const { Title, Text } = Typography;

interface DeviceInfo {
  id: string;
  name: string;
  bindTime: string;
  status: 'online' | 'offline';
  battery: number;
  firmwareVersion: string;
  wifiSignal: number;
  currentActivity: string;
  lastHeartbeat: string;
}

interface DeviceConfig {
  sedentaryInterval: number;
  sedentaryMode: string;
  alertVolume: number;
  fallSensitivity: string;
  wifiSsid: string;
  voiceEnabled: boolean;
}

const activityLabels: Record<string, { color: string; text: string }> = {
  standing: { color: 'processing', text: '站立/静坐' },
  walking: { color: 'green', text: '行走中' },
  fall: { color: 'red', text: '摔倒!' },
  step: { color: 'cyan', text: '踏步' },
};

export default function Device() {
  const [device, setDevice] = useState<DeviceInfo | null>(null);
  const [config, setConfig] = useState<DeviceConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const loadData = async () => {
    setLoading(true);
    const [d, c] = await Promise.all([fetchDeviceStatus(), fetchDeviceConfig()]);
    setDevice(d);
    setConfig(c);
    form.setFieldsValue(c);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async () => {
    const values = await form.validateFields();
    setSaving(true);
    await updateDeviceConfig(values);
    setConfig(values);
    setSaving(false);
    message.success('配置已保存，将同步至设备');
  };

  if (loading) {
    return (
      <Flex justify="center" align="center" style={{ height: 400 }}>
        <Spin size="large" tip="加载设备信息..." />
      </Flex>
    );
  }

  return (
    <div>
      <Title level={4} style={{ marginBottom: 24 }}>
        <SettingOutlined style={{ marginRight: 8 }} />
        设备管理
      </Title>

      {/* Device Status */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={10}>
          <Card
            title={
              <Flex align="center" gap={8}>
                <Badge status={device?.status === 'online' ? 'success' : 'error'} />
                <Text strong>设备状态</Text>
              </Flex>
            }
            extra={
              <Button icon={<ReloadOutlined />} size="small" onClick={loadData}>
                刷新
              </Button>
            }
          >
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="设备编号">{device?.id}</Descriptions.Item>
              <Descriptions.Item label="设备名称">{device?.name}</Descriptions.Item>
              <Descriptions.Item label="在线状态">
                <Badge
                  status={device?.status === 'online' ? 'success' : 'error'}
                  text={device?.status === 'online' ? '在线' : '离线'}
                />
              </Descriptions.Item>
              <Descriptions.Item label="当前活动">
                {device?.currentActivity && (
                  <Tag color={activityLabels[device.currentActivity]?.color}>
                    {activityLabels[device.currentActivity]?.text || device.currentActivity}
                  </Tag>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="电量">
                <Flex align="center" gap={8}>
                  <Progress
                    percent={device?.battery}
                    size="small"
                    style={{ width: 120 }}
                    strokeColor={
                      (device?.battery ?? 0) > 50 ? '#4DB6AC' : '#F0A04B'
                    }
                  />
                  <Text>{device?.battery}%</Text>
                </Flex>
              </Descriptions.Item>
              <Descriptions.Item label="固件版本">{device?.firmwareVersion}</Descriptions.Item>
              <Descriptions.Item label="最后心跳">{device?.lastHeartbeat}</Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        <Col xs={24} lg={14}>
          <Card title={<Text strong>连接信息</Text>}>
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12}>
                <Card size="small" style={{ background: '#FAF6F2' }}>
                  <Flex align="center" gap={12}>
                    <WifiOutlined style={{ fontSize: 28, color: '#4DB6AC' }} />
                    <div>
                      <Text strong>Wi-Fi 6 连接</Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {config?.wifiSsid || '未配置'}
                      </Text>
                      <br />
                      <Flex align="center" gap={4}>
                        <SignalFilled style={{ color: '#4DB6AC', fontSize: 12 }} />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          信号强度 {device?.wifiSignal ?? 0}%
                        </Text>
                      </Flex>
                    </div>
                  </Flex>
                </Card>
              </Col>
              <Col xs={24} sm={12}>
                <Card size="small" style={{ background: '#FAF6F2' }}>
                  <Flex align="center" gap={12}>
                    <LinkOutlined style={{ fontSize: 28, color: '#5C4A3E' }} />
                    <div>
                      <Text strong>蓝牙 5.2 备用</Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        CYW55512 HCI UART
                      </Text>
                      <br />
                      <Tag color="default" style={{ fontSize: 11 }}>仅 Wi-Fi 断连时启用</Tag>
                    </div>
                  </Flex>
                </Card>
              </Col>
              <Col xs={24} sm={12}>
                <Card size="small" style={{ background: '#FAF6F2' }}>
                  <Flex align="center" gap={12}>
                    <AudioOutlined style={{ fontSize: 28, color: '#E8725A' }} />
                    <div>
                      <Text strong>语音消息</Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        ES8388 Audio Codec (I2S)
                      </Text>
                      <br />
                      <Switch
                        checked={config?.voiceEnabled}
                        size="small"
                        checkedChildren="开"
                        unCheckedChildren="关"
                        onChange={async (v) => {
                          await updateDeviceConfig({ voiceEnabled: v });
                          setConfig((prev) => (prev ? { ...prev, voiceEnabled: v } : prev));
                        }}
                      />
                    </div>
                  </Flex>
                </Card>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      {/* Device Config */}
      <Card
        title={
          <Flex align="center" gap={8}>
            <SettingOutlined />
            <Text strong>参数配置</Text>
          </Flex>
        }
        extra={
          <Space>
            <Button onClick={() => form.resetFields()}>重置</Button>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={saving}
              onClick={handleSave}
            >
              保存配置
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical" initialValues={config || {}}>
          <Row gutter={[24, 8]}>
            <Col xs={24} sm={12} md={8}>
              <Form.Item name="sedentaryInterval" label="久坐/久站提醒间隔（分钟）">
                <Slider
                  min={15}
                  max={60}
                  step={15}
                  marks={{ 15: '15', 30: '30', 45: '45', 60: '60' }}
                  tooltip={{ formatter: (v) => `每 ${v} 分钟` }}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item name="sedentaryMode" label="检测模式">
                <Select
                  options={[
                    { value: 'both', label: '久坐 + 久站均检测' },
                    { value: 'sitting', label: '仅检测久坐' },
                    { value: 'standing', label: '仅检测久站' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item name="fallSensitivity" label="摔倒检测灵敏度">
                <Select
                  options={[
                    { value: 'standard', label: '标准（推荐）' },
                    { value: 'high', label: '高灵敏' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item name="alertVolume" label="报警音量">
                <Slider
                  min={0}
                  max={100}
                  step={10}
                  marks={{ 0: '静音', 50: '50', 100: '最大' }}
                  tooltip={{ formatter: (v) => `${v}%` }}
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>

        <Divider />

        {/* Embedded device integration placeholder */}
        <Card
          size="small"
          style={{ background: '#FFFBF0', border: '1px dashed #F0A04B' }}
        >
          <Flex align="center" gap={8}>
            <ThunderboltOutlined style={{ fontSize: 18, color: '#F0A04B' }} />
            <div>
              <Text strong style={{ color: '#8B7E74' }}>
                嵌入式端对接预留
              </Text>
              <br />
              <Text type="secondary" style={{ fontSize: 12 }}>
                MQTT Broker 地址、设备绑定二维码、OTA 固件升级等功能将在嵌入式端接入后启用。
                当前配置修改会暂存，对接后自动同步至 PSoC E84 Edgi-Talk 设备。
              </Text>
            </div>
          </Flex>
        </Card>
      </Card>
    </div>
  );
}

// ============================================================
// API Layer — 当前使用 Mock 数据，后续替换为真实 HTTP 调用
//
// 切换方式：将对应函数体改为 fetch/axios 调用即可
// 示例：
//   export const getDashboardOverview = () =>
//     fetch('/api/dashboard/overview').then(r => r.json());
// ============================================================

import {
  mockDevice,
  mockTodayOverview,
  mockHourlyActivity,
  mockWeeklyTrend,
  mockAlerts,
  mockDeviceConfig,
} from '../mock/data';
import type { AlertRecord } from '../mock/data';

// 模拟网络延迟
const delay = (ms = 400) => new Promise((r) => setTimeout(r, ms));

// ---------- Dashboard API ----------
export const fetchDashboardOverview = async () => {
  await delay();
  return { ...mockTodayOverview };
};

export const fetchHourlyActivity = async () => {
  await delay();
  return [...mockHourlyActivity];
};

export const fetchWeeklyTrend = async () => {
  await delay();
  return [...mockWeeklyTrend];
};

// ---------- Alerts API ----------
export const fetchAlerts = async (params?: {
  type?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ list: AlertRecord[]; total: number }> => {
  await delay();
  let list = [...mockAlerts];
  if (params?.type && params.type !== 'all') {
    list = list.filter((a) => a.type === params.type);
  }
  if (params?.status && params.status !== 'all') {
    list = list.filter((a) => a.status === params.status);
  }
  return { list, total: list.length };
};

export const updateAlertStatus = async (
  id: string,
  status: string,
  note?: string
) => {
  await delay(200);
  const alert = mockAlerts.find((a) => a.id === id);
  if (alert) {
    alert.status = status as AlertRecord['status'];
    if (note) alert.handlerNote = note;
  }
  return { success: true };
};

// ---------- Device API ----------
export const fetchDeviceStatus = async () => {
  await delay();
  return { ...mockDevice };
};

export const fetchDeviceConfig = async () => {
  await delay();
  return { ...mockDeviceConfig };
};

export const updateDeviceConfig = async (config: Record<string, unknown>) => {
  await delay(200);
  Object.assign(mockDeviceConfig, config);
  return { success: true };
};

// ---------- 对接嵌入式端的接口预留 ----------
// BLE / Wi-Fi 数据上报入口（后续嵌入式端对接）
export const reportDeviceEvent = async (event: {
  type: string;
  timestamp: string;
  payload: Record<string, unknown>;
}) => {
  // TODO: 嵌入式端通过 Wi-Fi MQTT 或 BLE 上报事件
  await delay(100);
  console.log('[Device Event]', event);
  return { success: true };
};

// MQTT 连接状态（后续对接嵌入式端）
export const getMqttStatus = async () => {
  await delay();
  return { connected: false, broker: 'mqtt://localhost:1883', topic: 'edgi/#' };
};

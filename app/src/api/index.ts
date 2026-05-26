// API Layer — 真实 HTTP 调用 + Mock 兜底（移动端）
// 修改 SERVER_URL 为你的后端地址（演示时填电脑局域网 IP）
import {
  mockDevice,
  mockTodayOverview,
  mockHourlyActivity,
  mockWeeklyTrend,
  mockAlerts,
  mockDeviceConfig,
} from '../mock/data';
import type { AlertRecord } from '../mock/data';

// ========== 配置：修改为你的后端地址 ==========
const SERVER_URL = localStorage.getItem('server_url') || 'http://192.168.1.100:3001';
const TOKEN_KEY = 'token';

function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

async function request<T>(path: string, options?: RequestInit, fallback?: T): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const res = await fetch(`${SERVER_URL}${path}`, { ...options, headers });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: '请求失败' }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return await res.json();
  } catch (e) {
    if (fallback !== undefined) {
      console.warn(`[API] ${path} 服务不可用，使用 Mock 数据`);
      return fallback;
    }
    throw e;
  }
}

// ========== Dashboard API ==========

export const fetchDashboardOverview = async () => {
  return request('/api/dashboard/overview', {}, mockTodayOverview);
};

export const fetchHourlyActivity = async () => {
  return request('/api/dashboard/hourly', {}, mockHourlyActivity);
};

export const fetchWeeklyTrend = async () => {
  return request('/api/dashboard/weekly', {}, mockWeeklyTrend);
};

// ========== Alerts API ==========

export const fetchAlerts = async (params?: {
  type?: string;
  status?: string;
}): Promise<{ list: AlertRecord[]; total: number }> => {
  const qs = new URLSearchParams();
  if (params?.type && params.type !== 'all') qs.set('type', params.type);
  if (params?.status && params.status !== 'all') qs.set('status', params.status);
  const qsStr = qs.toString();
  const url = `/api/alerts${qsStr ? `?${qsStr}` : ''}`;

  try {
    return await request<{ list: AlertRecord[]; total: number }>(url);
  } catch {
    let list = [...mockAlerts];
    if (params?.type && params.type !== 'all') list = list.filter((a) => a.type === params.type);
    if (params?.status && params.status !== 'all') list = list.filter((a) => a.status === params.status);
    return { list, total: list.length };
  }
};

export const updateAlertStatus = async (id: string, status: string, note?: string) => {
  try {
    return await request(`/api/alerts/${id}`, { method: 'PUT', body: JSON.stringify({ status, note }) });
  } catch {
    const alert = mockAlerts.find((a) => a.id === id);
    if (alert) {
      alert.status = status as AlertRecord['status'];
      if (note) alert.handlerNote = note;
    }
    return { success: true };
  }
};

// ========== Device API ==========

export const fetchDeviceStatus = async () => {
  try {
    return await request<typeof mockDevice>('/api/device/status');
  } catch {
    return { ...mockDevice };
  }
};

export const fetchDeviceConfig = async () => {
  try {
    return await request<typeof mockDeviceConfig>('/api/device/config');
  } catch {
    return { ...mockDeviceConfig };
  }
};

export const updateDeviceConfig = async (config: Record<string, unknown>) => {
  try {
    return await request('/api/device/config', { method: 'PUT', body: JSON.stringify(config) });
  } catch {
    Object.assign(mockDeviceConfig, config);
    return { success: true };
  }
};

// ========== 消息 API ==========

export const fetchContacts = async (): Promise<{ contact_id: number; username: string; last_msg: string; last_time: string }[]> => {
  try {
    return await request<{ contact_id: number; username: string; last_msg: string; last_time: string }[]>('/api/messages/contacts');
  } catch {
    return [];
  }
};

export const fetchMessages = async (userId: number): Promise<unknown[]> => {
  try {
    return await request<unknown[]>(`/api/messages/${userId}`);
  } catch {
    return [];
  }
};

export const sendMessage = async (to: number, content: string) => {
  return request('/api/messages', { method: 'POST', body: JSON.stringify({ to, content }) });
};

export const fetchUnreadCount = async () => {
  try {
    const data = await request<{ count: number }>('/api/messages/unread/count');
    return data.count || 0;
  } catch {
    return 0;
  }
};

// ========== 嵌入式设备对接入口 ==========

export const reportDeviceEvent = async (event: {
  type: string;
  timestamp: string;
  payload: Record<string, unknown>;
}) => {
  console.log('[Device Event]', event);
  return { success: true };
};

export const getMqttStatus = async () => {
  try {
    return await request('/api/device/mqtt-status');
  } catch {
    return { connected: false, broker: 'mqtt://localhost:1883', topic: 'edgi/#' };
  }
};

// 导出服务器地址，供设置页面使用
export { SERVER_URL };

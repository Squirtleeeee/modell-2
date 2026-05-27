// Mock data — 后续对接真实 API 时替换

// --------------- Device ---------------
export const mockDevice = {
  id: 'EDGI-001',
  name: '行动安全守护设备 A1',
  bindTime: '2026-05-10 14:30:00',
  status: 'online' as const,
  battery: 72,
  firmwareVersion: 'v1.2.3',
  wifiSignal: 85,
  currentActivity: 'standing',
  lastHeartbeat: '2026-05-19 14:25:01',
};

// --------------- Dashboard ---------------
export const mockTodayOverview = {
  steps: 4328,
  walkDurationMin: 45,
  standDurationMin: 180,
  fallEvents: 0,
  sedentaryAlerts: 2,
  battery: 85,
};

export const mockHourlyActivity = Array.from({ length: 24 }, (_, hour) => {
  const active = hour >= 6 && hour <= 20;
  return {
    hour: `${hour.toString().padStart(2, '0')}:00`,
    steps: active ? Math.floor(Math.random() * 600 + 50) : Math.floor(Math.random() * 30),
    standing: active ? Math.floor(Math.random() * 20 + 5) : Math.floor(Math.random() * 30 + 10),
    walking: active ? Math.floor(Math.random() * 15 + 2) : 0,
  };
});

export const mockWeeklyTrend = [
  { date: '05-13', steps: 5120, sedentary: 3, falls: 0 },
  { date: '05-14', steps: 6843, sedentary: 2, falls: 0 },
  { date: '05-15', steps: 3209, sedentary: 4, falls: 0 },
  { date: '05-16', steps: 7812, sedentary: 1, falls: 0 },
  { date: '05-17', steps: 5634, sedentary: 2, falls: 1 },
  { date: '05-18', steps: 9081, sedentary: 1, falls: 0 },
  { date: '05-19', steps: 4328, sedentary: 2, falls: 0 },
];

// --------------- Alerts ---------------
export interface AlertRecord {
  id: string;
  type: 'fall' | 'sedentary';
  time: string;
  status: 'unhandled' | 'processing' | 'handled' | 'false_alarm';
  confidence?: number;
  duration?: number;
  location?: string;
  handlerNote?: string;
}

export const mockAlerts: AlertRecord[] = [
  {
    id: 'ALT-20260519-001',
    type: 'sedentary',
    time: '2026-05-19 14:00:23',
    status: 'handled',
    duration: 45,
    handlerNote: '已提醒用户起身活动',
  },
  {
    id: 'ALT-20260519-002',
    type: 'sedentary',
    time: '2026-05-19 10:30:15',
    status: 'processing',
    duration: 30,
  },
  {
    id: 'ALT-20260518-001',
    type: 'fall',
    time: '2026-05-18 16:22:08',
    status: 'handled',
    confidence: 0.97,
    location: '客厅',
    handlerNote: '用户在客厅滑倒，已电话确认无大碍',
  },
  {
    id: 'ALT-20260517-001',
    type: 'fall',
    time: '2026-05-17 09:15:44',
    status: 'false_alarm',
    confidence: 0.82,
    location: '卧室',
    handlerNote: '用户快速坐到床上，误触发，已由用户手动取消',
  },
  {
    id: 'ALT-20260516-001',
    type: 'sedentary',
    time: '2026-05-16 15:45:30',
    status: 'handled',
    duration: 60,
    handlerNote: '久坐60分钟已提醒',
  },
  {
    id: 'ALT-20260515-001',
    type: 'sedentary',
    time: '2026-05-15 11:20:10',
    status: 'unhandled',
    duration: 30,
  },
  {
    id: 'ALT-20260514-001',
    type: 'fall',
    time: '2026-05-14 20:08:55',
    status: 'handled',
    confidence: 0.95,
    location: '厨房',
    handlerNote: '摔倒后立即联系，邻居已上门查看',
  },
];

// --------------- Device Config ---------------
export const mockDeviceConfig = {
  sedentaryInterval: 30,       // 分钟
  sedentaryMode: 'both',       // 'sitting' | 'standing' | 'both'
  alertVolume: 80,             // 0-100
  fallSensitivity: 'standard', // 'standard' | 'high'
  wifiSsid: 'Home-WiFi-5G',
  voiceEnabled: true,
};

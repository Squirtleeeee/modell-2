# 行动安全守护系统 — 摔倒检测与健康监护平台

面向行动不便者（老年人、术后康复者、残障人士等）的智能监护平台。通过可穿戴设备采集运动数据，利用深度学习模型实时检测摔倒事件，提供 **网页管理后台** 和 **Android 移动端 App**，为亲属/监护人提供远程监护能力。

> 硬件平台：Infineon PSoC E84 Edgi-Talk 开发板 + BMI160 IMU 传感器

---

## 目录

- [系统架构](#系统架构)
- [技术栈](#技术栈)
- [项目结构](#项目结构)
- [数据库设计](#数据库设计)
- [已实现功能](#已实现功能)
- [API 接口文档](#api-接口文档)
- [快速开始 — 网页端](#快速开始--网页端)
- [快速开始 — 移动端](#快速开始--移动端)
- [公网访问（固定域名）](#公网访问固定域名)
- [设备模拟器](#设备模拟器)
- [后续规划](#后续规划)
- [UI/UX 设计规范](#uiux-设计规范)

---

## 系统架构

```
┌──────────────────────────────────────────────────────────────┐
│              网页端 (Web 管理后台)                              │
│     React 19 · Ant Design 6 · ECharts · HashRouter            │
│     端口: 5174 (dev) / 3001 (生产)                             │
└────────────────────────┬─────────────────────────────────────┘
                         │ HTTP / WebSocket (socket.io)
┌────────────────────────┼─────────────────────────────────────┐
│              移动端 (Android APK)                              │
│     React 19 · Capacitor 8 · antd-mobile · PWA                │
│     底部 Tab 导航 · Service Worker 离线缓存                     │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│              Express 5 后端 (server/index.cjs)                 │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ REST API                                            │    │
│  │ /api/auth/*    认证（注册/登录/验证码/密码重置）         │    │
│  │ /api/dashboard/* 数据看板（概览/24h/7d）               │    │
│  │ /api/device/*  设备数据上报 + 状态查询                  │    │
│  │ /api/alerts/*  告警列表 + 状态管理                     │    │
│  │ /api/messages/* 用户消息（联系人/对话/发送）             │    │
│  │ /api/guardians 监护人管理                             │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │ Socket.io WebSocket                                 │    │
│  │ 实时推送: 设备数据 · 告警通知 · 用户消息               │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │ 静态文件托管 (dist/ → SPA 回退)                       │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           SQLite 数据库 (server/data.db)               │   │
│  │  users · password_resets · guardianships               │   │
│  │  verification_codes · device_data · alerts · messages  │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
                         ▲
                         │ Wi-Fi / BLE（嵌入式端对接预留）
┌──────────────────────────────────────────────────────────────┐
│         嵌入式端 (PSoC E84 Edgi-Talk — 规划中)                 │
│                                                              │
│  BMI160 IMU → TFLite 推理 (M55 + NPU) → 报警 → BLE/Wi-Fi → 后端 │
└──────────────────────────────────────────────────────────────┘
```

---

## 技术栈

| 层级 | 网页端 | 移动端 |
|------|--------|--------|
| 框架 | React 19 + TypeScript | React 19 + TypeScript |
| 构建 | Vite 8 | Vite 8 |
| UI | Ant Design 6 | antd-mobile 5 + Ant Design 6 |
| 图表 | ECharts 6 | ECharts 6 |
| 路由 | React Router 7 (HashRouter) | React Router 7 (HashRouter) |
| 原生壳 | — | Capacitor 8 (Android) |
| 离线 | — | Service Worker (PWA) |

| 层级 | 技术 |
|------|------|
| 后端框架 | Express 5 |
| 数据库 | SQLite (better-sqlite3, WAL 模式) |
| 认证 | JWT (HMAC-SHA256, 7 天) + PBKDF2-SHA512 |
| 实时通信 | Socket.io (WebSocket) |
| 邮件 | Resend API → QQ SMTP → Mock 三级降级 |
| 短信 | 阿里云短信 SDK → Mock 降级 |
| 频率限制 | express-rate-limit |

---

## 项目结构

```
web/                                  # 项目根目录
│
├── README.md                         # 本文件
├── 快速启动教程.md                     # 零基础快速上手指南
│
├── web/                              # 网页端 + 后端
│   ├── package.json                  # 依赖 + 脚本
│   ├── vite.config.ts                # Vite 配置
│   ├── index.html                    # HTML 入口
│   │
│   ├── server/                       # Express 后端
│   │   ├── index.cjs                 # 入口（API + WebSocket + 静态文件）
│   │   ├── database.cjs              # SQLite 初始化 + 7 个数据模型
│   │   ├── data.db                   # 数据库文件（自动生成）
│   │   ├── migrations.cjs            # 数据库迁移系统
│   │   ├── simulator.cjs             # 设备数据模拟器
│   │   ├── middleware/
│   │   │   ├── auth.cjs              # JWT 签发 + 鉴权中间件
│   │   │   └── rateLimit.cjs         # 频率限制
│   │   ├── routes/
│   │   │   ├── auth.cjs              # 认证路由
│   │   │   ├── dashboard.cjs         # 看板数据路由
│   │   │   ├── device.cjs            # 设备数据路由
│   │   │   ├── alerts.cjs            # 告警路由
│   │   │   └── messages.cjs          # 消息路由
│   │   └── services/
│   │       ├── email.cjs             # 邮件发送
│   │       └── sms.cjs               # 短信发送
│   │
│   ├── src/                          # React 前端
│   │   ├── App.tsx                   # 路由 + 主题 + AuthProvider
│   │   ├── theme/index.ts            # 主题配色
│   │   ├── context/AuthContext.tsx   # 全局认证状态
│   │   ├── hooks/useMediaQuery.ts    # 响应式 Hook
│   │   ├── api/index.ts              # API 层（真实请求 + Mock 兜底）
│   │   ├── mock/data.ts              # Mock 数据
│   │   ├── components/
│   │   │   ├── Layout/index.tsx      # 桌面侧边栏 / 移动端抽屉
│   │   │   └── ProtectedRoute/       # 路由守卫
│   │   └── pages/
│   │       ├── Login/                # 登录（3 种方式）
│   │       ├── Register/             # 注册（邮箱验证码）
│   │       ├── ForgotPassword/       # 找回密码
│   │       ├── Dashboard/            # 数据看板
│   │       ├── Alerts/               # 报警记录
│   │       ├── Device/               # 设备管理
│   │       └── Guardians/            # 监护人管理
│   │
│   └── dist/                         # 构建产物
│
├── app/                              # 移动端 Android App
│   ├── package.json                  # 移动端依赖
│   ├── vite.config.ts                # Vite 配置
│   ├── capacitor.config.ts           # Capacitor 配置
│   │
│   ├── src/
│   │   ├── App.tsx                   # 路由 + 底部 Tab 布局
│   │   ├── hooks/
│   │   │   ├── useMediaQuery.ts      # 响应式 Hook
│   │   │   └── useNetworkStatus.ts   # 网络状态检测
│   │   ├── api/index.ts              # API 层（可配置后端地址）
│   │   ├── components/
│   │   │   └── MobileLayout/         # 底部 Tab 导航栏
│   │   └── pages/                    # 与网页端页面一一对应
│   │
│   ├── public/
│   │   ├── manifest.json             # PWA 清单
│   │   ├── sw.js                     # Service Worker
│   │   └── icons/                    # PWA 图标
│   │
│   ├── dist/                         # Web 构建产物（被打包进 APK）
│   └── android/                      # Capacitor Android 项目
│       ├── build.gradle
│       ├── settings.gradle
│       ├── init.gradle               # 国内镜像 + Java 17 兼容配置
│       └── app/
│           ├── build.gradle
│           └── build/outputs/apk/debug/app-debug.apk
│
├── models/                           # 训练好的 ML 模型
│   └── tflite_export/
│       ├── fall_detection_float32.tflite    # 1.02MB
│       └── fall_detection_int8.tflite       # 319KB（嵌入式端用）
│
├── data/                             # 训练数据
└── outputs/                          # 模型评估结果
```

---

## 数据库设计

### users

| 列 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 自增主键 |
| username | TEXT UNIQUE | 用户名 |
| email | TEXT UNIQUE | 邮箱 |
| phone | TEXT UNIQUE | 手机号（可选） |
| email_verified | INTEGER | 邮箱已验证 0/1 |
| phone_verified | INTEGER | 手机号已验证 0/1 |
| password_hash | TEXT | PBKDF2-SHA512 哈希 |
| salt | TEXT | 随机盐值 |
| role | TEXT | admin / family |

### device_data

| 列 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 自增主键 |
| device_id | TEXT | 设备标识 |
| user_id | INTEGER FK | 所属用户 |
| accel_x/y/z | REAL | 加速度计数据 |
| gyro_x/y/z | REAL | 陀螺仪数据 |
| fall_detected | INTEGER | 是否检测到跌倒 |
| steps | INTEGER | 累计步数 |
| battery | INTEGER | 电量百分比 |
| activity | TEXT | standing / walking / fall |
| created_at | TEXT | 上报时间 |

### alerts

| 列 | 类型 | 说明 |
|------|------|------|
| id | TEXT PK | 告警编号（ALT-时间戳-随机码） |
| device_id | TEXT | 设备标识 |
| user_id | INTEGER FK | 所属用户 |
| type | TEXT | fall / sedentary |
| status | TEXT | unhandled / processing / handled / false_alarm |
| confidence | REAL | 置信度 |
| duration | INTEGER | 持续时长（久坐告警） |
| location | TEXT | 位置描述 |
| handler_note | TEXT | 处理备注 |

### messages

| 列 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 自增主键 |
| from_user_id | INTEGER FK | 发送者 |
| to_user_id | INTEGER FK | 接收者 |
| content | TEXT | 消息内容 |
| read | INTEGER | 已读 0/1 |
| created_at | TEXT | 发送时间 |

---

## 已实现功能

### 用户认证
- 3 种登录方式：用户名+密码 / 手机号+密码 / 手机号+短信验证码
- 注册需邮箱验证码，可选填手机号
- 忘记密码走邮箱验证码重置
- JWT 鉴权 + PBKDF2-SHA512 密码哈希
- 角色权限（admin / family）
- API 频率限制（防暴力破解 + 防批量注册）

### 数据看板（Dashboard）
- 6 个 KPI 卡片（步数/行走时长/站立时长/跌倒事件/久坐提醒/电量）
- 24 小时活动分布柱状折线图
- 7 天趋势图（双 Y 轴）
- 跌倒事件时卡片边框变红
- **数据源**：优先走 `/api/dashboard/*` 真实 API，后端未启动时自动回退 Mock

### 报警管理
- 告警列表 + 类型/状态筛选
- 详情弹窗 + 状态流转（未处理→处理中→已处理/误报）
- **跌倒检测自动生成告警**：设备上报 `fall_detected: true` → 后端自动写入 alerts 表

### 设备管理
- 设备状态监控（在线/离线/电量/当前活动）
- 参数配置（久坐间隔/检测模式/灵敏度/音量）
- 设备数据上报接口 `POST /api/device/data`

### 监护人对偶系统
- 多对多关系，添加/移除监护人
- 不能自监护 + 防重复

### 用户消息
- 一对一聊天（REST API + WebSocket 实时推送）
- 未读消息计数

### 设备模拟器
- `node server/simulator.cjs` 模拟设备持续上报
- 自动生成步数、电量、活动状态，周期性触发跌倒

### WebSocket 实时推送
- 设备数据 → 后端 → WebSocket → 前端实时更新
- 用户消息实时送达

### 移动端 App
- Android APK 打包成功（`app-debug.apk` 4.8MB）
- 底部 Tab 导航（看板/告警/设备/守护）
- 网络状态检测 + Service Worker 离线缓存
- 后端地址可配置

---

## API 接口文档

### 认证 — `/api/auth`

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| POST | `/api/auth/register` | — | 注册（需邮箱验证码） |
| POST | `/api/auth/login` | — | 用户名/手机号+密码登录 |
| POST | `/api/auth/login-by-sms` | — | 短信验证码登录 |
| GET | `/api/auth/me` | Bearer | 获取当前用户信息 |
| POST | `/api/auth/send-email-code` | — | 发送邮箱验证码 |
| POST | `/api/auth/send-sms-code` | — | 发送短信验证码 |
| POST | `/api/auth/verify-code` | — | 通用验证码校验 |
| POST | `/api/auth/forgot-password` | — | 发送密码重置验证码 |
| POST | `/api/auth/reset-password` | — | 使用验证码重置密码 |

### 数据看板 — `/api/dashboard`

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/api/dashboard/overview` | Bearer | 今日概览 KPI |
| GET | `/api/dashboard/hourly` | Bearer | 24 小时活动分布 |
| GET | `/api/dashboard/weekly` | Bearer | 7 天趋势 |

### 设备数据 — `/api/device`

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| POST | `/api/device/data` | Bearer | 上报设备数据（跌倒自动生成告警） |
| GET | `/api/device/status` | Bearer | 查询设备状态 |
| GET | `/api/device/config` | Bearer | 获取设备配置 |

### 告警 — `/api/alerts`

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/api/alerts` | Bearer | 告警列表（支持 type/status 筛选） |
| PUT | `/api/alerts/:id` | Bearer | 更新告警状态 + 备注 |

### 消息 — `/api/messages`

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/api/messages/contacts` | Bearer | 最近联系人 |
| GET | `/api/messages/:userId` | Bearer | 与某用户对话记录 |
| POST | `/api/messages` | Bearer | 发送消息 |
| GET | `/api/messages/unread/count` | Bearer | 未读消息数 |

### 监护人 — `/api/guardians`

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/api/guardians` | Bearer | 我的监护人 + 我监护的人 |
| POST | `/api/guardians` | Bearer | 添加监护人 |
| DELETE | `/api/guardians/:id` | Bearer | 移除监护人 |

### 系统

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/health` | 健康检查 |

### 设备数据上报格式

```json
{
  "device_id": "EDGI-001",
  "accel": { "x": 0.1, "y": -0.2, "z": 9.8 },
  "gyro": { "x": 0.01, "y": 0.02, "z": 0 },
  "fall_detected": false,
  "steps": 120,
  "battery": 85,
  "activity": "walking"
}
```

---

## 快速开始 — 网页端

### 前置条件
- Node.js >= 18

### 安装并启动

```bash
cd web/web
npm install
npm run build
npm run server
```

浏览器打开 `http://localhost:3001`，用 `admin / admin123` 登录。

### 默认账户

| 用户名 | 密码 | 角色 |
|--------|------|------|
| admin | admin123 | 管理员 |
| zhangsan | demo123 | 家属 |
| lihua | demo123 | 家属 |
| laowang | demo123 | 被监护人 |

> 首次启动自动创建 admin 账户。其他演示账户需手动注册。

### 开发模式（前端热更新）

```bash
# 终端 1：后端
npm run server

# 终端 2：前端（Vite HMR，端口 5174）
npm run dev
```

---

## 快速开始 — 移动端

### 前置条件
- Java 17（Zulu JDK）
- Android SDK（Build Tools 36.1.0+，Platform android-36）

### 构建 APK

```bash
cd app
npm install
npm run build

cd android
./gradlew assembleDebug --init-script init.gradle
```

APK 生成在 `app/android/app/build/outputs/apk/debug/app-debug.apk`。

### 安装到手机

1. 将 APK 传到手机，点击安装
2. 进入 App 后，在设置页填入后端地址
3. 后端地址为电脑局域网 IP + 端口，如 `http://192.168.1.165:3001`

### 修改后端地址

在 `app/src/api/index.ts` 顶部修改 `SERVER_URL` 默认值：

```ts
const SERVER_URL = localStorage.getItem('server_url') || 'http://你的IP:3001';
```

---

## 公网访问（固定域名）

使用 Serveo SSH 隧道，将本地后端暴露到公网固定域名。

### 一次性配置

1. 生成 SSH 密钥：`ssh-keygen -t rsa -b 4096 -f ~/.ssh/id_rsa_serveo -N ""`
2. 注册 [Serveo](https://console.serveo.net) → SSH Keys → 添加公钥
3. Domains → Add Domain → 预约子域名（如 `mobility-guardian`）

### 每次启动

```bash
# 窗口 1：后端
cd web/web
npm run build
npm run server

# 窗口 2：公网隧道
ssh -i ~/.ssh/id_rsa_serveo -R mobility-guardian:80:localhost:3001 serveo.net
```

访问 `https://mobility-guardian.serveousercontent.com`（换成你预约的子域名）。

---

## 设备模拟器

在拿到真实嵌入式设备之前，用模拟器脚本产生测试数据：

```bash
cd web/web
node server/simulator.cjs
```

模拟器会：
- 每 2 秒上报一次设备数据
- 交替切换 standing / walking 状态
- 约每 100 秒触发一次跌倒（自动生成告警）
- 自动用 admin 账户登录

---

## 后续规划

| 方向 | 内容 |
|------|------|
| 嵌入式端对接 | BMI160 IMU → TFLite 推理 → MQTT/Wi-Fi → 后端 |
| 推送通知 | FCM/APNs 推送（跌倒告警、久坐提醒） |
| 语音消息 | 嵌入式端录音 → 上传 → 监护人播放 |
| iOS App | Capacitor iOS 平台适配 |
| 深色模式 | 主题切换 |
| 管理面板 | 用户管理 + 系统统计 |

---

## UI/UX 设计规范

| 用途 | 色值 | 说明 |
|------|------|------|
| 主色 | `#E8725A` | 暖珊瑚 — 关怀、急迫 |
| 辅助色 | `#4DB6AC` | 青绿 — 健康、安心 |
| 警告 | `#F0A04B` | 暖橙 — 提醒 |
| 错误 | `#E05555` | 柔红 — 紧急 |
| 文字 | `#3D322C` | 深棕 — 温暖不刺眼 |
| 背景 | `#F5F0EC` | 暖灰 — 柔和 |
| 边框 | `#E8E0D8` | 浅灰 |

- **响应式断点**：768px（桌面/移动）
- **触摸目标**：≥ 36px
- **卡片圆角**：10px
- **侧边栏**：深色渐变 `#3D322C → #5C4A3E`

---

## 许可证

MIT License

# 行动安全守护系统 — 摔倒检测与健康监护平台

面向行动不便者（老年人、术后康复者、残障人士等）的智能监护平台。通过可穿戴设备采集运动数据，利用深度学习模型实时检测摔倒事件，提供 **网页管理后台** 和 **Android 移动端 App**，为亲属/监护人提供远程监护能力。

> 硬件平台：Infineon PSoC E84 Edgi-Talk 开发板 + BMI160 IMU 传感器
> 云端部署：Railway（`modell-2-production.up.railway.app`）

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
- [云端部署（Railway）](#云端部署railway)
- [设备模拟器](#设备模拟器)
- [种子数据](#种子数据)
- [在线聊天 — 完整流程](#在线聊天--完整流程)
- [后续规划](#后续规划)
- [UI/UX 设计规范](#uiux-设计规范)

---

## 系统架构

```
┌──────────────────────────────────────────────────────────────┐
│              网页端 (Web 管理后台)                              │
│     React 19 · Ant Design 6 · ECharts · HashRouter            │
│     生产模式端口: 3001                                         │
└────────────────────────┬─────────────────────────────────────┘
                         │ HTTP / WebSocket (socket.io)
┌────────────────────────┼─────────────────────────────────────┐
│              移动端 (Android APK)                              │
│     React 19 · Capacitor 8 · antd-mobile · PWA                │
│     底部 Tab 导航 · Service Worker · 默认连云端                │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│              Express 5 后端 (server/index.cjs)                 │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ REST API                                            │    │
│  │ /api/auth/*    认证（注册/登录/验证码/密码重置）         │    │
│  │ /api/dashboard/* 数据看板（概览/活动趋势）               │    │
│  │ /api/device/*  设备数据上报 + 状态 + 配置               │    │
│  │ /api/alerts/*  告警列表 + 状态管理 + 日期筛选           │    │
│  │ /api/messages/* 用户消息（联系人/对话/发送）             │    │
│  │ /api/guardians 监护人管理 + 申请/同意/拒绝              │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │ Socket.io WebSocket                                 │    │
│  │ 实时推送: 设备数据 · 告警通知 · 用户消息 · 申请通知    │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │ 静态文件托管 (dist/ → SPA 回退)                       │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           SQLite 数据库 (server/data.db)               │   │
│  │  users · device_data · alerts · messages              │   │
│  │  guardianships · guardian_requests · device_configs    │   │
│  │  verification_codes · password_resets                  │   │
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
| 云端部署 | Railway（自动从 GitHub 部署） |
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
│   ├── nixpacks.toml                 # Railway 部署配置
│   ├── package.json                  # 依赖 + 脚本
│   ├── vite.config.ts                # Vite 配置
│   │
│   ├── server/                       # Express 后端
│   │   ├── index.cjs                 # 入口（API + WebSocket + 静态文件）
│   │   ├── database.cjs              # SQLite 初始化 + 9 个数据模型
│   │   ├── migrations.cjs            # 数据库迁移系统（5 个迁移）
│   │   ├── simulator.cjs             # 设备数据模拟器
│   │   ├── seed.cjs                  # 演示种子数据脚本
│   │   ├── middleware/
│   │   │   ├── auth.cjs              # JWT 签发 + 鉴权中间件
│   │   │   └── rateLimit.cjs         # 频率限制
│   │   ├── routes/
│   │   │   ├── auth.cjs              # 认证路由
│   │   │   ├── dashboard.cjs         # 看板数据路由
│   │   │   ├── device.cjs            # 设备数据 + 配置路由
│   │   │   ├── alerts.cjs            # 告警路由
│   │   │   ├── guardians.cjs         # 监护人路由（申请/同意/拒绝）
│   │   │   └── messages.cjs          # 消息路由
│   │   └── services/
│   │       ├── email.cjs             # 邮件发送
│   │       └── sms.cjs               # 短信发送
│   │
│   ├── src/                          # React 前端
│   │   ├── App.tsx                   # 路由 + 主题 + AuthProvider
│   │   ├── context/AuthContext.tsx   # 全局认证状态
│   │   ├── hooks/useSocket.ts        # WebSocket 连接 Hook
│   │   ├── hooks/useMediaQuery.ts    # 响应式 Hook
│   │   ├── api/index.ts              # API 层（真实请求 + Mock 兜底）
│   │   ├── mock/data.ts              # Mock 数据
│   │   ├── components/
│   │   │   ├── Layout/index.tsx      # 桌面侧边栏 / 移动端抽屉
│   │   │   └── ProtectedRoute/       # 路由守卫
│   │   └── pages/
│   │       ├── Login/                # 登录（3 种方式）
│   │       ├── Register/             # 注册（邮箱验证码，Mock 模式页面显示验证码）
│   │       ├── ForgotPassword/       # 找回密码
│   │       ├── Dashboard/            # 数据看板
│   │       ├── Alerts/               # 报警记录
│   │       ├── Device/               # 设备管理
│   │       ├── Guardians/            # 监护人管理（搜索+申请+列表）
│   │       └── Messages/             # 在线实时聊天
│   │
│   └── dist/                         # 构建产物
│
├── app/                              # 移动端 Android App
│   ├── package.json                  # 移动端依赖
│   ├── capacitor.config.ts           # Capacitor 配置
│   │
│   ├── src/
│   │   ├── api/index.ts              # API 层（默认连 Railway 云端）
│   │   ├── hooks/useSocket.ts        # WebSocket（动态读取服务器地址）
│   │   ├── context/AuthContext.tsx   # 认证状态（拼接服务器前缀）
│   │   ├── components/
│   │   │   └── MobileLayout/         # 底部 Tab 导航栏
│   │   └── pages/
│   │       ├── Login/                # 登录（未配置时引导进设置页）
│   │       ├── Settings/             # 服务器地址配置（⚙齿轮图标入口）
│   │       ├── Dashboard/            # 数据看板
│   │       ├── Alerts/               # 报警记录
│   │       ├── Device/               # 设备管理
│   │       ├── Guardians/            # 监护人管理
│   │       └── Messages/             # 在线实时聊天
│   │
│   ├── dist/                         # Web 构建产物（被打包进 APK）
│   └── android/                      # Capacitor Android 项目
│       ├── init.gradle               # 国内镜像 + Java 17 兼容配置
│       └── app/build/outputs/apk/debug/app-debug.apk
│
├── models/                           # ML 模型（已移除，嵌入式端独立训练）
├── data/                             # 训练数据（已移除）
└── outputs/                          # 模型评估结果（已移除）
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
| activity | TEXT | lying / standing / walking / fallen |

### alerts

| 列 | 类型 | 说明 |
|------|------|------|
| id | TEXT PK | 告警编号（ALT-时间戳-随机码） |
| device_id | TEXT | 设备标识 |
| user_id | INTEGER FK | 所属用户 |
| type | TEXT | fall / sedentary |
| status | TEXT | unhandled / processing / handled / false_alarm |

### messages

| 列 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 自增主键 |
| from_user_id | INTEGER FK | 发送者 |
| to_user_id | INTEGER FK | 接收者 |
| content | TEXT | 消息内容 |
| read | INTEGER | 已读 0/1 |

### guardian_requests

| 列 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 自增主键 |
| from_user_id | INTEGER FK | 申请发起者 |
| to_user_id | INTEGER FK | 申请接收者 |
| status | TEXT | pending / accepted / rejected |
| UNIQUE(from_user_id, to_user_id) | — | 防止重复申请 |

### device_configs

| 列 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 自增主键 |
| user_id | INTEGER FK UNIQUE | 所属用户 |
| sedentary_interval | INTEGER | 久坐提醒间隔（分钟） |
| sedentary_mode | TEXT | 检测模式 |
| alert_volume | INTEGER | 告警音量 |
| fall_sensitivity | TEXT | 跌倒灵敏度 |

---

## 已实现功能

### 用户认证
- 用户名+密码登录
- ~~手机号登录/短信验证码登录~~（已移除）
- 注册需邮箱验证码（验证码通过 Resend 发送真实邮件）
- 忘记密码走邮箱验证码重置
- JWT 鉴权 + PBKDF2-SHA512 密码哈希 + 角色权限
- API 频率限制（防暴力破解 + 防批量注册）

### 数据看板（Dashboard）
- 5 个 KPI 卡片（行走时长/站立静坐时长/摔倒事件/长时间不活动提醒/电量）
- 活动趋势折线图：7 天/30 天切换，展示平躺/站立正坐/行走每日占比（ECharts）
- KPI 通过 WebSocket 实时刷新，图表每 30 秒刷新（避免频繁重绘）
- 数据优先走真实 API，后端未启动时自动回退 Mock

### 报警管理
- 告警列表 + 类型/状态/日期范围筛选
- 状态流转（未处理→处理中→已处理/误报）
- 跌倒检测自动生成告警 + 久坐告警实时统计

### 设备管理
- 设备状态监控 + 参数配置（久坐间隔/检测模式/灵敏度/音量/语音开关/WiFi）
- 配置持久化到 SQLite，刷新不丢失
- 配置持久化到 SQLite（device_configs 表）
- 设备数据上报接口 `POST /api/device/data`
- MQTT 连接状态查询 `GET /api/device/mqtt-status`

### 监护人对偶系统
- **申请制**：搜索用户名/邮箱/手机号 → 发送申请 → 同意/拒绝 → 建立关系
- 多对多关系，防自监护 + 防重复申请
- WebSocket 实时推送申请通知（右上角红点提醒）

### 用户消息（在线聊天）
- 联系人来源：监护关系自动成为联系人 + 有消息记录的用户
- 一对一实时聊天：REST API 写入 + WebSocket 实时推送
- 聊天页面：网页端分栏布局，移动端全屏切换
- 未读消息计数 + 侧边栏/顶栏红点角标

### 设备模拟器
- `node server/simulator.cjs` 模拟设备持续上报（每 5 秒）
- 自动生成步数、电量、活动状态，周期性触发跌倒

### WebSocket 实时推送
- 设备数据 / 告警通知 / 用户消息 / 申请通知 实时送达

### 移动端 App
- Android APK（5.6MB），默认连 Railway 云端
- 底部 Tab 导航（看板/告警/设备/守护/消息）
- 服务器地址可配置（齿轮图标入口），支持测试连接
- 首次安装无需任何配置，打开即用

### 云端部署
- Railway 自动部署，推送 GitHub 即更新
- 固定域名 `modell-2-production.up.railway.app`，24h 运行

---

## API 接口文档

### 认证 — `/api/auth`

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| POST | `/api/auth/register` | — | 注册（需邮箱验证码） |
| POST | `/api/auth/login` | — | 用户名+密码登录 |
| ~~POST~~ | ~~`/api/auth/login-by-sms`~~ | — | ~~（已移除）~~ |
| GET | `/api/auth/me` | Bearer | 获取当前用户信息 |
| POST | `/api/auth/send-email-code` | — | 发送邮箱验证码 |
| ~~POST~~ | ~~`/api/auth/send-sms-code`~~ | — | ~~（已移除）~~ |
| POST | `/api/auth/forgot-password` | — | 发送密码重置验证码 |
| POST | `/api/auth/reset-password` | — | 使用验证码重置密码 |

### 数据看板 — `/api/dashboard`

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/api/dashboard/overview` | Bearer | 今日概览（活动时长/摔倒/不活动提醒/电量） |
| GET | `/api/dashboard/activity-trend?days=7` | Bearer | 每日活动占比趋势（平躺/站立正坐/行走/摔倒） |

### 设备数据 — `/api/device`

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| POST | `/api/device/data` | Bearer | 上报设备数据（跌倒自动生成告警） |
| GET | `/api/device/status` | Bearer | 查询设备状态 |
| GET | `/api/device/config` | Bearer | 获取设备配置 |
 | GET | `/api/device/mqtt-status` | Bearer | MQTT 连接状态 |
| PUT | `/api/device/config` | Bearer | 保存设备配置 |
 | GET | `/api/device/mqtt-status` | Bearer | MQTT 连接状态 |

### 告警 — `/api/alerts`

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/api/alerts` | Bearer | 告警列表（支持 type/status/dateStart/dateEnd 筛选） |
| PUT | `/api/alerts/:id` | Bearer | 更新告警状态 + 备注 |

### 消息 — `/api/messages`

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/api/messages/contacts` | Bearer | 联系人列表（含监护关系） |
| GET | `/api/messages/:userId` | Bearer | 与某用户对话记录 |
| POST | `/api/messages` | Bearer | 发送消息 |
| GET | `/api/messages/unread/count` | Bearer | 未读消息数 |

### 监护人 — `/api/guardians`

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/api/guardians` | Bearer | 我的监护人 + 我监护的人 |
| GET | `/api/guardians/requests` | Bearer | 收到的 + 发出的申请列表 |
| POST | `/api/guardians/request` | Bearer | 发送监护申请（用户名/邮箱/手机号均可） |
| PUT | `/api/guardians/request/:id/accept` | Bearer | 同意申请 |
| PUT | `/api/guardians/request/:id/reject` | Bearer | 拒绝申请 |
| DELETE | `/api/guardians/:id` | Bearer | 移除监护人 |
| GET | `/api/guardians/notifications/count` | Bearer | 未读通知数 |

---

## 快速开始 — 网页端

### 方式 1：直接访问云端（推荐）

浏览器打开 `https://modell-2-production.up.railway.app`，注册账号即可使用。

### 方式 2：本地运行

```bash
cd web/web
npm install
npm run build
npm run server
```

浏览器打开 `http://localhost:3001`。

### 默认账户

| 用户名 | 密码 | 角色 |
|--------|------|------|
| admin | admin123 | 管理员 |

> 首次启动自动创建 admin。其他演示账户可自行注册，或运行 `node server/seed.cjs` 生成。

---

## 快速开始 — 移动端

### 直接安装 APK

将 `app/android/app/build/outputs/apk/debug/app-debug.apk` 传到手机，安装即用。APK 已预配置 Railway 云端地址，无需任何设置。

### 构建 APK

```bash
cd app
npm install
npm run build

rm -rf android/app/build
cp -r dist android/app/src/main/assets/public
cd android
./gradlew assembleDebug --init-script init.gradle --offline
```

> 首次构建不要用 `--offline`，让 Gradle 下载依赖。之后每次改前端代码重新构建用上述命令。

---

## 云端部署（Railway）

项目部署在 [Railway](https://railway.app)，推送 GitHub 自动部署。

**已部署地址**：`https://modell-2-production.up.railway.app`

### 配置说明

- `nixpacks.toml`：Node.js 22 + `npm install` + `npm run build` + `node server/index.cjs`
- Root Directory：`web`
- 数据库 SQLite 文件在 Railway 容器内，免费额度 5 美元/月
- 免费实例每次部署会重置数据库（可通过 Railway Volume 持久化）

---

## 设备模拟器

在拿到真实嵌入式设备之前，用模拟器脚本产生测试数据：

```bash
cd web/web
node server/simulator.cjs
```

模拟器会：
- 每 5 秒上报一次设备数据
- 循环切换 lying / standing / walking 状态
- 约每 250 秒触发一次跌倒（自动生成告警）
- 自动用 admin 账户登录

---

## 种子数据

一键生成演示账户、历史数据和示例消息：

```bash
cd web/web
node server/seed.cjs
```

生成内容：
- **演示账户**：zhangsan / lihua / laowang（密码均为 `demo123`）
- **监护人关系**：zhangsan + lihua 共同监护 laowang
- **7 天历史数据**：720 条设备数据，累计 18,381 步
- **15 条历史告警**：含跌倒 + 久坐，含误报

---

## 在线聊天 — 完整流程

```
A 注册登录 → 搜索 B 的用户名 → 发送监护人申请
  → B 收到 WebSocket 实时推送（右上角红点+1）
  → B 点进「监护人管理」→「收到的申请」→ 点「同意」
  → A 收到 WebSocket 推送「申请已通过」
  → 双方联系人列表出现对方
  → 双方点击进入聊天 → 发消息 → 对方实时收到
```

聊天消息同时写入数据库 + Socket.io 实时推送到对方。网页端和移动端均支持。

---

## 后续规划

| 方向 | 内容 |
|------|------|
| 嵌入式端对接 | BMI160 IMU → TFLite 推理 → MQTT/Wi-Fi → 后端 |
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

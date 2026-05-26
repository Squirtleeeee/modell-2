# 行动安全守护系统 — 摔倒检测与健康监护平台

面向行动不便者（老年人、术后康复者、残障人士、慢性病患等）的智能监护 Web 平台。通过可穿戴设备采集运动数据，利用深度学习模型实时检测摔倒事件，结合 Web 管理后台为亲属/监护人提供远程监护能力。

> 硬件平台：Infineon PSoC E84 Edgi-Talk 开发板 + BMI160 IMU 传感器

---

## 目录

- [技术栈](#技术栈)
- [系统架构](#系统架构)
- [数据库设计](#数据库设计)
- [已实现功能](#已实现功能)
  - [用户认证系统](#1-用户认证系统)
  - [移动端适配](#2-移动端适配)
  - [数据看板](#3-数据看板)
  - [报警记录管理](#4-报警记录管理)
  - [设备管理](#5-设备管理)
  - [监护人系统](#6-监护人系统)
- [API 接口文档](#api-接口文档)
- [项目结构](#项目结构)
- [快速开始](#快速开始)
- [部署方式](#部署方式)
- [未实现 / 规划中的功能](#未实现--规划中的功能)
  - [嵌入式端对接](#一嵌入式端对接---psoc-e84-edgi-talk)
  - [摔倒检测与报警闭环](#二摔倒检测与报警闭环)
  - [久坐久站提醒](#三久坐久站提醒)
  - [语音消息](#四语音消息)
  - [移动端 App](#五移动端-app-flutter)
  - [系统增强功能](#六系统增强功能)
- [UI/UX 设计规范](#uiux-设计规范)

---

## 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| 前端框架 | React + TypeScript | 19.x / 6.x |
| 构建工具 | Vite | 8.x |
| UI 组件库 | Ant Design | 6.x |
| 图表库 | ECharts (echarts-for-react) | 6.x |
| 路由 | React Router (HashRouter) | 7.x |
| 后端框架 | Express | 5.x |
| 数据库 | SQLite (better-sqlite3) | — |
| 认证 | JWT (jsonwebtoken) | — |
| 密码哈希 | PBKDF2-SHA512 (Node.js crypto) | — |
| 邮件服务 | Resend API / Nodemailer (SMTP) / Mock 三级降级 | — |
| 邮件 SDK | Resend + Nodemailer | — |
| 短信服务 | 阿里云短信 SDK (Mock fallback) | — |
| 频率限制 | express-rate-limit | — |
| AI 推理引擎 | TFLite Micro / Ethos-U55 NPU | 嵌入式端 |
| 实时操作系统 | RT-Thread | 嵌入式端 |
| 图形库 | LVGL | 嵌入式端 MIPI-DSI 屏幕 |

---

## 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│              浏览器 (Web 管理后台)                             │
│     React 19 · Ant Design 6 · ECharts 6 · HashRouter        │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP / WebSocket (规划中)
                       ▼
┌─────────────────────────────────────────────────────────────┐
│           Express 5 后端 (server/index.cjs)                   │
│                                                             │
│  ┌──────────────────┐  ┌──────────────────┐                 │
│  │ REST API 路由     │  │ 静态文件托管       │                 │
│  │ /api/auth/*      │  │ dist/ → index.html │                │
│  │ /api/guardians   │  │ (SPA 回退)        │                 │
│  └────────┬─────────┘  └──────────────────┘                 │
│           │                                                  │
│  ┌────────┴─────────────────────────────────────────┐       │
│  │              SQLite 数据库 (data.db)               │       │
│  │  users · password_resets · guardianships · verification_codes │       │
│  └──────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────┘
                       ▲
                       │ Wi-Fi 6 / BLE 5.2 (规划中)
┌─────────────────────────────────────────────────────────────┐
│         嵌入式端 (PSoC E84 Edgi-Talk — 规划中)               │
│                                                             │
│  BMI160 IMU → AI 推理 (M55 + NPU) → 报警 → BLE/Wi-Fi → 云端  │
│  ES8388 音频 Codec · MIPI-DSI 800×480 触摸屏 · TF 卡存储     │
└─────────────────────────────────────────────────────────────┘
```

---

## 数据库设计

### users 表

| 列 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 自增主键 |
| username | TEXT UNIQUE | 用户名 |
| email | TEXT UNIQUE | 邮箱 |
| phone | TEXT (UNIQUE INDEX) | 手机号（可选，唯一） |
| email_verified | INTEGER | 邮箱是否已验证 (0/1) |
| phone_verified | INTEGER | 手机号是否已验证 (0/1) |
| password_hash | TEXT | PBKDF2-SHA512 哈希 |
| salt | TEXT | 随机盐值 (16 bytes) |
| role | TEXT | 'admin' 管理员 / 'family' 家属 |
| created_at | TEXT | 创建时间 |
| updated_at | TEXT | 更新时间 |

### password_resets 表

| 列 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 自增主键 |
| user_id | INTEGER FK | 关联 users.id |
| token | TEXT UNIQUE | 重置 Token (32 bytes hex) |
| expires_at | TEXT | 过期时间 (1 小时有效) |
| used | INTEGER | 是否已使用 (0/1) |

### guardianships 表

| 列 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 自增主键 |
| ward_id | INTEGER FK | 被监护人 ID (关联 users.id) |
| guardian_id | INTEGER FK | 监护人 ID (关联 users.id) |
| created_at | TEXT | 建立时间 |
| UNIQUE(ward_id, guardian_id) | — | 防止重复绑定 |

### verification_codes 表

| 列 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 自增主键 |
| identifier | TEXT | 邮箱地址或手机号 |
| code_hash | TEXT | 验证码 SHA-256 哈希 |
| type | TEXT | 'email' 邮箱 / 'sms' 短信 |
| purpose | TEXT | 'register' / 'login' / 'reset_password' |
| expires_at | TEXT | 过期时间 (5 分钟有效) |
| used | INTEGER | 是否已使用 (0/1) |
| attempts | INTEGER | 错误尝试次数 (≥5 次自动作废) |
| created_at | TEXT | 创建时间 |

---

## 已实现功能

### 1. 用户认证系统

完整的注册、登录、鉴权、密码重置流程。

**密码安全模型：**

```
用户密码 → PBKDF2-SHA512 (随机盐, 10000 次迭代, 64 字节输出) → password_hash
```

每次注册/改密生成新的 16 字节随机盐，哈希结果存为 hex 字符串。验证时用相同盐值重新计算哈希比对。

**JWT Token 机制：**

- 签发算法：HMAC-SHA256
- 有效期：7 天
- 载荷：{ id, username, email, role }
- 存储：浏览器 localStorage

**前端安全措施：**

- AuthContext 全局状态管理登录状态
- ProtectedRoute 组件拦截未登录访问，自动跳转登录页
- 登录/注册页采用独立布局（无侧边栏），未登录用户无法访问内部页面
- Token 过期后 API 返回 401，前端清除本地状态并跳转登录页
- 应用启动时验证 Token 有效性（调用 GET /api/auth/me），无效则清除

**角色权限：**

| 角色 | 权限 |
|------|------|
| admin (管理员) | 全部页面访问，页面顶部显示金色"管理员"标签 |
| family (家属) | 数据看板、报警记录、设备管理、监护人管理 |

**三种登录方式：**

| 方式 | 入参 | 说明 |
|------|------|------|
| 用户名 + 密码 | { username, password } | 原有方式，保持不变 |
| 手机号 + 密码 | { username: phone, password, loginType: "phone_password" } | 通过手机号查找用户并验证密码 |
| 手机号 + 短信验证码 | { phone, code } | 发送 6 位验证码到手机，验证后登录 |

**邮箱验证码机制：**

- 注册时必须通过邮箱验证：输入邮箱 → 点击"发送验证码"→ QQ邮箱 SMTP 发送 6 位数字验证码 → 输入验证码完成注册
- 忘记密码走验证码流程：输入邮箱 → 收验证码 → 输入验证码 + 新密码 → 重置成功
- 验证码 5 分钟有效，SHA-256 哈希存储于 verification_codes 表
- 错误尝试超过 5 次自动作废，需重新获取
- Mock 降级模式：未配置 SMTP 时验证码输出到控制台，开发环境可直接使用

**短信验证码机制：**

- 支持阿里云短信服务，通过 `SMS_PROVIDER` 环境变量切换 (`alicloud` / `mock`)
- 默认 Mock 模式：验证码输出到服务端控制台，开发环境无需配置短信模板
- 生产环境需配置阿里云 AccessKey、签名和模板 ID

**密码重置流程：**

1. 用户输入注册邮箱
2. 后端生成 6 位验证码，存入 verification_codes 表（5 分钟有效）
3. 通过 QQ邮箱 SMTP 发送验证码邮件（Mock 模式输出到控制台）
4. 用户输入验证码 + 新密码完成重置

**默认账户：**

| 用户名 | 密码 | 角色 |
|--------|------|------|
| admin | admin123 | 管理员 |

首次启动时自动创建。数据库文件为 `server/data.db`，删除后重新启动即可重置。

**API 频率限制：**

| 端点 | 限制 | 说明 |
|------|------|------|
| 发送验证码 | 1 次 / 60 秒 / identifier | 按邮箱或手机号限流 |
| 验证码校验 | 5 次 / 5 分钟 / IP | 防止暴力破解验证码 |
| 登录 | 10 次 / 1 分钟 / IP | 防止暴力破解密码 |
| 注册 | 3 次 / 1 分钟 / IP | 防止批量注册 |

---

### 2. 移动端适配

**响应式策略：**以 768px 为桌面/移动断点 (Ant Design md 断点)，一套代码同时适配桌面和移动浏览器。

| 特性 | 桌面端 (≥768px) | 移动端 (<768px) |
|------|----------------|-----------------|
| 导航 | 深色渐变侧边栏，可折叠 | 顶部汉堡菜单按钮，Drawer 抽屉滑出 |
| 页面内容边距 | 24px | 12px |
| 认证卡片 | 固定宽度 400-440px | `max-width` + `width: calc(100% - 32px)` 自适应 |
| KPI 卡片 | 6 列并排 | 极窄屏单列，逐步扩展 |
| 图表高度 | 320px | 260px（节省纵向空间） |
| 表格 | 正常 | 横向滚动 (`scroll.x`) |
| Modal 弹窗 | 固定宽度 520px | `width: 100%`, `maxWidth: 520px` |
| 顶栏 | 显示用户名 | 隐藏用户名文字，仅保留头像 |

**新增前端 Hook：**`src/hooks/useMediaQuery.ts` 提供 `useMediaQuery(query)` 和 `useIsMobile()` 快捷方法。

---

### 3. 数据看板

**KPI 卡片（6 个）：**

- 今日步数、行走时长、站立/静坐时长
- 摔倒事件（有事件时卡片边框变红）
- 久坐提醒、设备电量

**图表：**

- 今日活动分布：24 小时步数柱状图 + 站立时长折线 + 行走时长折线
- 近 7 天趋势：每日步数渐变柱状图 + 久坐次数折线（双 Y 轴）

**最近报警：**展示最近 5 条，包含时间、类型标签、状态、备注。

**数据来源：**当前使用 Mock 数据（`src/mock/data.ts`），提供 24 小时活动分布、7 天趋势样本、报警记录。对接嵌入式端后全部替换为 API 调用。

---

### 4. 报警记录管理

- 列表：编号、类型（摔倒红色/久坐橙色）、时间（默认降序）、状态、置信度/时长、备注
- 筛选：按类型 + 按状态 + 日期范围
- 分页：每页 10 条，可切换
- 详情弹窗：完整报警信息 + 处理备注 + 操作按钮
- 状态流转：未处理 → 处理中 → 已处理 / 误报

---

### 5. 设备管理

**状态监控：**设备编号、名称、在线状态指示灯、当前活动 Tag、电量进度条、固件版本、最后心跳时间。

**连接信息卡片：**Wi-Fi 6（SSID + 信号强度）、蓝牙 5.2 备用说明、语音消息开关。

**参数配置：**

| 参数 | 默认值 | 范围 |
|------|--------|------|
| 久坐/久站提醒间隔 | 30 分钟 | 15/30/45/60 |
| 检测模式 | 久坐+久站 | 仅久坐/仅久站/两者 |
| 摔倒检测灵敏度 | 标准 | 标准/高灵敏 |
| 报警音量 | 80% | 0-100% |

**嵌入式对接预留区：**黄色虚线框，标注 MQTT Broker、设备绑定、OTA 固件升级待接入。

---

### 6. 监护人系统

**关系模型：**多对多关系，一个用户可有多个监护人，一个监护人可监护多人。ward_id + guardian_id 唯一约束防止重复。

**API：**

- GET `/api/guardians` — 返回我的监护人列表 + 我监护的人列表
- POST `/api/guardians` — 通过用户名添加监护人
- DELETE `/api/guardians/:id` — 移除监护人

**业务规则：**不能将自己设为监护人、不能重复添加。

**前端页面：**左侧「我的监护人」表格（可移除）、右侧「我监护的人」表格、添加弹窗搜索用户名。功能预告卡片说明后续通知机制。

**技术预留：**`Guardianship.guardianIdsOf(wardId)` 返回监护人 ID 数组，后续摔倒/久坐/语音消息直接调用此方法获取通知目标。

---

## API 接口文档

### 认证 API — `/api/auth`

| 方法 | 路径 | 鉴权 | 入参 | 出参 |
|------|------|------|------|------|
| POST | `/api/auth/register` | 否 | { username, email, password, emailCode, phone? } | { token, user } |
| POST | `/api/auth/login` | 否 | { username, password, loginType? } | { token, user } |
| POST | `/api/auth/login-by-sms` | 否 | { phone, code } | { token, user } |
| GET | `/api/auth/me` | Bearer | — | { user } |
| POST | `/api/auth/send-email-code` | 否 | { email, purpose } | { message } |
| POST | `/api/auth/send-sms-code` | 否 | { phone, purpose } | { message } |
| POST | `/api/auth/verify-code` | 否 | { identifier, code, type, purpose } | { verified } |
| POST | `/api/auth/forgot-password` | 否 | { email } | { message } |
| POST | `/api/auth/reset-password` | 否 | { email, code, newPassword } | { message } |

### 监护人 API — `/api/guardians`

| 方法 | 路径 | 鉴权 | 入参 | 出参 |
|------|------|------|------|------|
| GET | `/api/guardians` | Bearer | — | { guardians, wards } |
| POST | `/api/guardians` | Bearer | { username } | { guardian } |
| DELETE | `/api/guardians/:id` | Bearer | — | { message } |

### 系统 API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/health` | 健康检查 → { ok, time } |

### 错误格式

```json
{ "error": "错误描述" }
```

HTTP 状态码：400 参数错误、401 未登录、403 权限不足、404 不存在、409 冲突。

---

## 项目结构

```
web/
├── index.html                     # HTML 入口
├── package.json                   # 依赖 + 脚本 (dev/build/server/start)
├── vite.config.ts                 # Vite 构建 (代码分割 + API 代理 + 隧道白名单)
│
├── server/                        # Express 后端
│   ├── index.cjs                  # 入口 (API + 静态文件 + SPA 回退)
│   ├── database.cjs               # SQLite 初始化 + 4 个数据模型
│   ├── data.db                    # SQLite 数据库文件 (自动生成)
│   ├── migrations.cjs             # 数据库迁移系统 (自动升级旧库)
│   ├── middleware/
│   │   ├── auth.cjs               # JWT 签发 + 鉴权中间件
│   │   └── rateLimit.cjs          # API 频率限制 (发送/校验/登录/注册)
│   ├── routes/auth.cjs            # 认证路由 (注册/登录/找回密码/验证码)
│   └── services/
│       ├── email.cjs              # 邮件发送 (Resend / SMTP / Mock 三级降级)
│       └── sms.cjs                # 短信发送 (阿里云 + Mock fallback)
│
├── src/                           # React 前端
│   ├── App.tsx                    # 根: 路由 + 主题 + AuthProvider
│   ├── theme/index.ts             # Ant Design 主题 (暖珊瑚+青绿)
│   ├── context/AuthContext.tsx    # 全局认证状态 (3 种登录方式)
│   ├── hooks/
│   │   └── useMediaQuery.ts       # 响应式媒体查询 Hook
│   ├── api/index.ts               # API 层 (Mock, 预留 fetch 切换)
│   ├── mock/data.ts               # Mock 数据源
│   ├── components/
│   │   ├── Layout/index.tsx       # 主布局 (桌面侧边栏 / 移动端抽屉菜单)
│   │   └── ProtectedRoute/       # 路由保护
│   └── pages/
│       ├── Login/index.tsx        # 登录 (3 个 Tab 切换登录方式)
│       ├── Register/index.tsx     # 注册 (含邮箱验证码)
│       ├── ForgotPassword/        # 找回密码 (邮箱验证码流程)
│       ├── Dashboard/index.tsx    # 数据看板 (响应式 KPI + 图表)
│       ├── Alerts/index.tsx       # 报警记录 (响应式表格 + Modal)
│       ├── Device/index.tsx       # 设备管理
│       └── Guardians/index.tsx    # 监护人管理
│
├── dist/                          # 构建产物
├── start-tunnel.bat               # 一键启动隧道
├── oss-deploy.cjs                 # OSS 上传脚本
└── DEPLOY.md                      # 部署详细说明
```

---

## 快速开始

### 前置条件

- Node.js >= 18
- Windows 10/11（自带 SSH）

### 环境变量（可选配置）

以下变量无需配置即可运行，未配置时自动降级为 Mock 模式（验证码输出到控制台）：

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `RESEND_API_KEY` | Resend API Key（`re_` 开头） | (空) |
| `RESEND_FROM` | 发件人地址，如 `系统名称 <noreply@你的域名.com>` | `onboarding@resend.dev` |
| `SMTP_USER` | QQ 邮箱地址（备用） | (空) |
| `SMTP_PASS` | QQ 邮箱授权码（备用） | (空) |
| `SMS_PROVIDER` | 短信提供商：`alicloud` / `mock` | `mock` |
| `ALICLOUD_ACCESS_KEY_ID` | 阿里云 AccessKey | (空，使用 Mock) |
| `ALICLOUD_ACCESS_KEY_SECRET` | 阿里云 AccessKey Secret | (空，使用 Mock) |
| `ALICLOUD_SMS_SIGN_NAME` | 短信签名 | `行动安全守护` |
| `ALICLOUD_SMS_TEMPLATE_CODE` | 短信模板 ID | (空，使用 Mock) |

**邮件发送策略（三级降级）：**

1. Resend API → 2. QQ邮箱 SMTP → 3. Mock（控制台打印）

**启用 Resend（推荐，支持任意邮箱）：**
```bash
# Windows
set RESEND_API_KEY=re_xxxxxxxx
npm run server

# Linux / macOS
export RESEND_API_KEY="re_xxxxxxxx"
```

> Resend 免费 100 封/天。测试模式下仅发给自己的邮箱；验证域名后可发给任意用户。注册：`https://resend.com`

**启用 QQ 邮箱（备用）：**
```bash
set SMTP_USER=your-qq@qq.com
set SMTP_PASS=your_authorization_code
```

QQ 邮箱授权码获取：QQ邮箱 → 设置 → 账户 → POP3/SMTP 服务 → 开启并获取授权码。

### 开发模式

```bash
cd web && npm install

# 终端 1：后端
npm run server              # 端口 3001

# 终端 2：前端 (含 API 代理)
npm run dev                 # 端口 5173 → proxy /api → 3001
```

### 生产模式

```bash
npm run build               # 构建前端
npm run server              # 端口 3001，API + 静态文件统一端口
```

访问 `http://localhost:3001`。

### 一键公网访问

**临时隧道（每次域名随机）：**

```bash
start-tunnel.bat            # 自动构建 → 启动服务 → SSH 隧道
```

**固定域名隧道（推荐，需先配置）：**

1. 注册 [Serveo](https://console.serveo.net) 账号，添加 SSH 公钥
2. 在 Domains 页面预约固定子域名（如 `mobility-guardian`）
3. 启动：

```bash
# 窗口 1
npm run build && npm run server

# 窗口 2（用预约时的密钥）
ssh -i ~/.ssh/id_rsa_serveo -R 你的名字:80:localhost:3001 serveo.net
```

> 详细步骤见 [快速启动教程](../快速启动教程.md) 中的「部署到公网」章节。

---

## 部署方式

### 方式 1：VPS + Nginx (推荐生产)

```bash
npm run build
scp -r dist/* root@<服务器IP>:/var/www/html/
# Nginx 配置见 DEPLOY.md
```

### 方式 2：阿里云 OSS 静态托管

```bash
npm run build
node oss-deploy.cjs upload
```
需在 OSS 控制台关闭「强制下载」。详见 `DEPLOY.md`。

### 方式 3：Serveo SSH 隧道 (推荐演示/测试)

免费、无需服务器，得到一个固定的公网域名。

**准备工作（只需做一次）：**

1. 生成 SSH 密钥：`ssh-keygen -t rsa -b 4096 -f ~/.ssh/id_rsa_serveo -N ""`
2. 注册 [Serveo](https://console.serveo.net) → SSH Keys → 添加公钥（`~/.ssh/id_rsa_serveo.pub`）
3. Domains → Add Domain → 预约固定子域名

**每次启动：**

```bash
# 窗口 1：本地服务
npm run build && npm run server

# 窗口 2：公网隧道
ssh -i ~/.ssh/id_rsa_serveo -R 你的名字:80:localhost:3001 serveo.net
```

访问 `https://你的名字.serveousercontent.com`。

> `-i` 参数指定注册时用的密钥，不可省略。详细教程见 [快速启动教程](../快速启动教程.md)。

---

## 未实现 / 规划中的功能

---

### 一、嵌入式端对接 — PSoC E84 Edgi-Talk

| 功能 | 优先级 | 说明 |
|------|--------|------|
| BMI160 IMU 数据采集 | 极高 | SPI 接口，6 轴数据，104Hz 采样 |
| AI 模型推理 | 极高 | InceptionTime (INT8 319KB)，M55 + Ethos-U55 NPU |
| Wi-Fi 6 联网 (CYW55512) | 极高 | lwIP 协议栈，MQTT 上报设备事件 |
| BLE 5.2 备用通信 | 高 | CYW55512 HCI UART，Wi-Fi 断开时自动切换 |
| RT-Thread 系统移植 | 极高 | RT-Thread Studio + GCC Arm Embedded |
| LVGL 屏幕 UI | 高 | MIPI-DSI 800×480 触摸屏 |

---

### 二、摔倒检测与报警闭环

| 功能 | 优先级 | 说明 |
|------|--------|------|
| 本地声光报警 | 极高 | 蜂鸣器 PWM + LED SOS 闪烁 + 屏幕 SOS |
| 误报取消 | 极高 | 10 秒内按键取消，标记误报 |
| 远程通知监护人 | 极高 | Wi-Fi MQTT → 云端 → 推送 → 监护人 |
| 双路径冗余 | 高 | Wi-Fi 优先，蓝牙经手机 App 中转 |
| 振动马达触觉反馈 | 中 | GPIO + MOSFET 驱动 |

**技术要点：**

- 确认窗口：连续 2 次推理均为 "fall" 才报警
- 陀螺仪角速度辅助区分摔倒与快速坐下
- BMI160 硬件 any-motion 中断 (< 10ms 响应，无需 CPU)
- 滑动窗口推理：每 0.5s 推理一次，延迟从 5s 降至 ~2.5s

**Web 端待做：**新增 API 接收设备上报摔倒事件，存入数据库，通过 WebSocket 推送通知给在线监护人。

---

### 三、久坐/久站提醒

| 功能 | 优先级 | 说明 |
|------|--------|------|
| 姿态累计计时 | 高 | AI 输出 "standing" 期间计数器累计 |
| 用户可设阈值 | 高 | 15/30/45/60 分钟，Web 端配置同步 |
| 本地温和提醒 | 高 | 蓝色 LED + 短促提示音（区别于摔倒） |
| 远程通知监护人 | 高 | 云端推送久坐提醒 |

**技术要点：**

- 纯逻辑判断，不需要新模型
- 检测到 walk/step/fall 时计数器自动归零
- 仅检测久坐和久站两种静止状态

**Web 端待做：**设备页配置滑块已就绪，需实现配置下发 API。

---

### 四、语音消息

| 功能 | 优先级 | 说明 |
|------|--------|------|
| 录音/播放 | 高 | ES8388 ADC/DAC，I2S 接口，16kHz/16bit |
| ADPCM 编解码 | 高 | 16kHz → 32kbps，30 秒约 120KB |
| TF 卡存储 | 中 | SDIO + FatFs，循环缓冲 50 条 |
| Wi-Fi 上传云端 | 高 | HTTPS 上传 OSS |
| BLE 备用传输 | 中 | 2M PHY |
| RT-Thread Audio 框架 | 高 | Audio Device Framework 驱动 ES8388 |

**Web 端待做：**语音消息管理页面、上传/下载 API、消息已读状态。

---

### 五、移动端 App (Flutter)

> 注：Web 端已完成响应式适配（768px 断点），手机浏览器可直接使用。Flutter 原生 App 作为后续增强项。

| 功能 | 优先级 |
|------|--------|
| 账户 + 设备绑定 | 高 |
| 实时监控 + 报警推送 | 极高 |
| 语音消息 | 高 |
| 设备设置 + 亲友管理 | 中 |

---

### 六、系统增强功能

**通信与后端：**

- MQTT Broker (EMQX)：设备 ↔ 云端双向通信
- WebSocket：实时推送报警给 Web 端
- ~~邮件服务：找回密码 Token 通过真实邮件发送~~ → ✅ 已实现（QQ邮箱 SMTP + Mock 降级）
- ~~短信验证：手机号验证码登录~~ → ✅ 已实现（阿里云短信 + Mock 降级）
- ~~移动端适配：Web 响应式布局~~ → ✅ 已实现（768px 断点，抽屉菜单，表格横向滚动）
- MySQL 迁移：生产环境数据库升级
- Redis 缓存：在线状态、消息队列

**设备高级功能：**

- 计步器：基于 walk/step 输出 + 加速度峰值检测
- 睡眠监测：加速度幅值阈值判断清醒/浅睡/深睡
- 智能电源管理：4 模式自动切换（活跃/待机/低功耗/休眠）
- OTA 固件升级：BLE 接收新固件 → 双 Bank Flash
- 设备自检：IMU/Flash/BLE/电池/蜂鸣器开机 5 项检查
- 本地数据记录：TF 卡 JSON 活动日志
- CapSense 触控：PSoC 6 原生触摸
- 姿态唤醒：抬腕自动亮屏

**Web 端扩展：**

- 语音消息管理页面
- 活动详情页面（按日/周/月）
- 管理员面板（用户管理 + 系统统计）
- 深色模式 / 主题切换

---

## UI/UX 设计规范

基于 UI/UX Pro Max 方法论设计。

**配色：**

| 用途 | 色值 | 说明 |
|------|------|------|
| 主色 | `#E8725A` | 暖珊瑚 — 关怀、急迫 |
| 辅助色 | `#4DB6AC` | 青绿 — 健康、安心 |
| 警告 | `#F0A04B` | 暖橙 — 提醒 |
| 错误 | `#E05555` | 柔红 — 紧急 |
| 文字 | `#3D322C` | 深棕 — 温暖不刺眼 |
| 背景 | `#F5F0EC` | 暖灰 — 柔和 |
| 边框 | `#E8E0D8` | 浅灰 |

**排版：**基准字号 15px，标题 18-28px，触摸目标 ≥ 64×38px。

**侧边栏：**深色渐变 `#3D322C → #5C4A3E`，折叠支持。

**卡片：**圆角 10px，悬停阴影，KPI 彩色数值。

**响应式：**xs/sm/md/lg 四级栅格，手机/平板/桌面适配。

---

## 许可证

MIT License

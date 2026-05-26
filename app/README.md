# 行动安全守护系统 — 移动端

基于 React + Capacitor 的移动端应用，与 Web 端共享后端 API。

---

## 与 Web 端的区别

| 特性 | Web 端 | 移动端 |
|------|--------|--------|
| 目录 | `web/` | `app/` |
| 导航 | 侧边栏（桌面）/ 抽屉（移动） | 底部 Tab 栏 |
| 列表 | Ant Design Table | 卡片式布局 |
| 安装方式 | 浏览器访问 | PWA 安装到桌面 / APK |
| 离线 | 不支持 | Service Worker 缓存 |
| 原生能力 | 无 | Capacitor（相机、推送、存储） |

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 框架 | React 19 + TypeScript |
| 构建 | Vite 8 |
| UI | Ant Design 6（移动端优化） |
| 路由 | React Router 7 (HashRouter) |
| 图表 | ECharts 6 |
| PWA | Service Worker + Web App Manifest |
| 原生壳 | Capacitor（计划中） |
| 后端 | 共享 `web/server/` Express + SQLite |

---

## 快速开始

### 前置条件

- Node.js >= 18
- 后端服务已启动（`web/server/`，端口 3001）

### 开发模式

```bash
cd app
npm install
npm run dev          # 端口 5174 → API 代理到 3001
```

手机浏览器访问 `http://你的电脑IP:5174` 即可预览。

> 手机和电脑需连同一 Wi-Fi。

### 生产构建

```bash
npm run build
```

构建产物在 `dist/`。

---

## 项目结构

```
app/
├── index.html                      # PWA meta 标签 + manifest link
├── package.json                    # 移动端依赖（不含后端）
├── vite.config.ts                  # API 代理到 3001
│
├── public/
│   ├── manifest.json               # PWA 应用清单
│   ├── sw.js                       # Service Worker 离线缓存
│   └── icons/                      # PWA 图标
│
└── src/
    ├── main.tsx                    # 入口 + SW 注册
    ├── App.tsx                     # 路由（底部 Tab 布局）
    ├── index.css                   # 移动端全局样式（含 safe-area）
    ├── theme/index.ts              # 主题配色（同 Web 端）
    ├── context/AuthContext.tsx     # 认证状态（共享 Web API）
    ├── api/index.ts                # API 层（Mock，同 Web 端）
    ├── mock/data.ts                # Mock 数据（同 Web 端）
    ├── hooks/
    │   ├── useMediaQuery.ts        # 响应式 Hook
    │   └── useNetworkStatus.ts     # 在线/离线检测
    ├── components/
    │   ├── MobileLayout/index.tsx  # 底部 Tab 导航布局
    │   └── ProtectedRoute/        # 路由守卫
    └── pages/
        ├── Login/index.tsx         # 登录（3 种方式）
        ├── Register/index.tsx      # 注册（含邮箱验证码）
        ├── ForgotPassword/         # 忘记密码
        ├── Dashboard/index.tsx     # 看板（2 列 KPI + 图表）
        ├── Alerts/index.tsx        # 告警（卡片式列表）
        ├── Device/index.tsx        # 设备管理
        └── Guardians/index.tsx     # 监护人（卡片式列表）
```

---

## 页面导航

底部 Tab 栏 4 个入口：

| Tab | 页面 | 功能 |
|-----|------|------|
| 看板 | Dashboard | KPI 卡片 + 活动图表 + 最近报警 |
| 告警 | Alerts | 卡片式报警列表 + 筛选 + 处理 |
| 设备 | Device | 设备状态 + 参数配置 |
| 守护 | Guardians | 监护人/被监护人卡片列表 |

---

## PWA 功能

- **可安装到桌面**：浏览器访问时提示"添加到主屏幕"
- **离线缓存**：Service Worker 缓存核心页面
- **全屏模式**：`display: standalone`，隐藏浏览器 UI
- **安全区域适配**：`safe-area-inset-*` 适配刘海屏

---

## Capacitor 打包（后续）

```
npm run capacitor:init     # 初始化
npm run capacitor:add      # 添加 Android 平台
npm run capacitor:sync     # 同步 Web 代码到原生
npm run capacitor:open     # 用 Android Studio 打开并编译 APK
```

---

## 默认账户

| 用户名 | 密码 | 角色 |
|--------|------|------|
| admin | admin123 | 管理员 |
| zhangsan | demo123 | 家属 |
| lihua | demo123 | 家属 |
| laowang | demo123 | 被监护人 |

> 详细部署说明见 [快速启动教程](./快速启动教程.md)

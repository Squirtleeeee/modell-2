# 部署说明

## 当前可用：本地预览 + Serveo 隧道

### 一键启动

**Windows：** 双击 `start-tunnel.bat`

**命令行：**
```bash
cd web
npm run build                           # 构建
npx vite preview --host 0.0.0.0 --port 4173 &   # 启动预览
ssh -R 80:localhost:4173 serveo.net     # 开启隧道
```

SSH 会输出一个 `https://xxx.serveousercontent.com` 地址，用浏览器打开即可。

### 前置条件
- 安装了 Node.js
- Windows 10+ 自带 SSH，不需要额外安装
- 无需注册任何账号

---

## 正式上线方案

当前隧道方案适合开发测试。正式上线推荐：

### OSS 静态托管（已配置）

Bucket: `mobility-guardian-2026`, 地域: 上海
上传命令: `node oss-deploy.cjs upload`

**注意：** 需在 OSS 控制台关闭 Bucket 的"强制下载"设置后，才能通过浏览器正常访问。


```
dist/
├── index.html              # 入口页面
├── favicon.svg
├── assets/
│   ├── index-*.css         # 全局样式 (0.7KB)
│   ├── index-*.js          # 应用代码 (22KB)
│   ├── vendor-react-*.js   # React + Router (41KB)
│   ├── vendor-antd-*.js    # Ant Design (1.2MB)
│   └── vendor-charts-*.js  # ECharts (1.1MB)
```

总大小约 2.4MB，首次加载后浏览器缓存静态资源，后续访问仅需下载 index.html (~0.8KB)。

## 二、部署方式

### 方式 1：阿里云 OSS + CDN（推荐）

**Step 1: 开通 OSS**
1. 登录阿里云控制台 → 对象存储 OSS
2. 创建 Bucket（名称如 `mobility-guardian`）
3. 地域选择离用户最近的（华东/华北）
4. 读写权限设为「公共读」

**Step 2: 开启静态网站托管**
1. Bucket → 基础设置 → 静态页面
2. 默认首页：`index.html`
3. 默认 404 页：`index.html`（关键！SPA 路由回退靠这个）

**Step 3: 上传文件**

使用 ossutil 命令行（推荐，Windows 下载 `ossutil64.exe`）：

```bash
# 配置凭证（仅首次）
ossutil64 config

# 上传（--update 跳过同名文件，--delete 删除云端多余文件）
ossutil64 cp -r dist/ oss://mobility-guardian/ --update --delete
```

或在阿里云 OSS 控制台网页端直接拖拽上传 `dist/` 内全部文件到 Bucket 根目录。

**Step 4: 绑定域名 + CDN + SSL**
1. Bucket → 传输加速 / CDN 域名管理 → 添加自定义域名（如 `web.your-domain.com`）
2. DNS 服务商添加 CNAME 记录指向 CDN 分配的加速域名
3. CDN 控制台 → 域名管理 → 免费申请 SSL 证书（阿里云提供 DV 单域名免费证书）
4. 等待 DNS 生效（通常 5-10 分钟）

**Step 5: 验证**
访问 `https://web.your-domain.com` 确认页面正常加载。

---

### 方式 2：腾讯云 COS + CDN

与阿里云步骤几乎一样：
1. 对象存储 COS → 创建存储桶（公共读）
2. 静态网站 → 索引文档 `index.html`，错误文档 `index.html`
3. 上传 `dist/` 文件
4. CDN 加速 + SSL 证书 + 自定义域名

腾讯云上传工具：
```bash
coscli cp dist/ cos://bucket-name/ -r
```

---

### 方式 3：Vercel（国外平台，备选）

```bash
cd web
npx vercel --prod
```

按提示登录并配置即可。自动分配 `xxx.vercel.app` 域名。
缺点：国内访问速度慢，建议套一层国内 CDN。

---

## 三、后续更新流程

每次修改代码后：

```bash
# 1. 构建
cd web
npm run build

# 2. 上传（替换为你的 Bucket 名）
ossutil64 cp -r dist/ oss://mobility-guardian/ --update --delete

# 3. 刷新 CDN 缓存（可选，加速生效）
aliyun cdn RefreshObjectCaches --ObjectPath https://web.your-domain.com/ --ObjectType Directory
```

可配置 GitHub Actions 自动化这一步（见 `.github/workflows/deploy.yml` 模板）。

---

## 四、注意事项

1. **SPA 路由**：项目使用 HashRouter，URL 格式为 `/#/`、`/#/alerts`、`/#/device`。`#` 后的路径完全由浏览器端处理，无需服务器配置。
2. **首次加载**：Ant Design + ECharts 体积较大（~2.4MB），首次访问需几秒。后续因浏览器缓存，秒开。
3. **后端 API**：当前 API 层使用 Mock 数据（`src/api/index.ts`）。对接真实后端时只需修改该文件中的函数体，改为 `fetch()` 调用即可，无需改动页面代码。

---

## 五、文件一览

| 文件 | 用途 |
|------|------|
| `dist/` | 构建产物，上传此目录即可 |
| `deploy.bat` | Windows 一键部署脚本 |
| `vite.config.ts` | 构建配置（代码分割策略） |
| `src/api/index.ts` | API 层（Mock ↔ 真实接口切换点） |

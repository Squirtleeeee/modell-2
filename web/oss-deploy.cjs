// ============================================================
// OSS 部署脚本 — 纯 REST API，零外部依赖
// 用法: node oss-deploy.cjs setup   (首次)
//       node oss-deploy.cjs upload  (更新)
// ============================================================
const https = require('https');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const AK_ID = 'LTAI5t7CM3xXCkRD5Lmv8aAT';
const AK_SECRET = 'jStqttCoykMer4pzv4JcAaKOvyQzDG';
const BUCKET = 'mobility-guardian-2026';
const REGION = 'oss-cn-shanghai';
const HOST = `${BUCKET}.${REGION}.aliyuncs.com`;

const DIST_DIR = path.join(__dirname, 'dist');

// ============ OSS 请求 ============
function ossRequest(method, httpPath, body, extraHeaders) {
  return new Promise((resolve, reject) => {
    const date = new Date().toUTCString();
    const contentType = extraHeaders?.['Content-Type'] || '';
    const contentMd5 = '';

    // 签名字符串中的 resource = /bucket/path?subresource
    const [pathOnly, query] = httpPath.split('?');
    const resource = query
      ? `/${BUCKET}${pathOnly}?${query}`
      : `/${BUCKET}${pathOnly}`;

    // 构建 OSS 签名所需的 headers
    const ossHeaders = {};
    const customHeaders = [];
    if (extraHeaders) {
      for (const [k, v] of Object.entries(extraHeaders)) {
        const lk = k.toLowerCase();
        if (lk.startsWith('x-oss-')) {
          ossHeaders[lk] = v;
          customHeaders.push(`${lk}:${v}`);
        }
      }
    }
    customHeaders.sort();

    const canonicalOSSHeaders = customHeaders.length > 0 ? customHeaders.join('\n') + '\n' : '';
    const stringToSign = `${method}\n${contentMd5}\n${contentType}\n${date}\n${canonicalOSSHeaders}${resource}`;
    const signature = crypto.createHmac('sha1', AK_SECRET).update(stringToSign).digest('base64');

    const headers = {
      'Date': date,
      'Authorization': `OSS ${AK_ID}:${signature}`,
      ...extraHeaders,
    };

    const options = {
      hostname: HOST,
      port: 443,
      path: httpPath,
      method,
      headers,
      timeout: 20000,
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ status: res.statusCode, data });
        } else {
          // 提取错误码
          const codeMatch = data.match(/<Code>([^<]+)<\/Code>/);
          const msgMatch = data.match(/<Message>([^<]+)<\/Message>/);
          const code = codeMatch ? codeMatch[1] : res.statusCode;
          const msg = msgMatch ? msgMatch[1] : data.slice(0, 200);
          reject(new Error(`${code}: ${msg}`));
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });

    if (body) req.write(body);
    req.end();
  });
}

// ============ 设置 ACL + 静态网站托管 ============
async function fixAcl() {
  console.log('设置 Bucket ACL 为公共读...');
  try {
    await ossRequest('PUT', '/?acl', null, { 'x-oss-acl': 'public-read' });
    console.log('ACL 已设为公共读');
  } catch (e) {
    console.log('ACL: ' + e.message);
  }

  console.log('配置静态网站托管...');
  const websiteXml = `<?xml version="1.0" encoding="UTF-8"?>
<WebsiteConfiguration>
  <IndexDocument><Suffix>index.html</Suffix></IndexDocument>
  <ErrorDocument><Key>index.html</Key></ErrorDocument>
</WebsiteConfiguration>`;

  try {
    await ossRequest('PUT', '/?website', websiteXml, { 'Content-Type': 'application/xml' });
    console.log('静态网站托管已配置 (404 → index.html)');
  } catch (e) {
    console.log('网站配置: ' + e.message);
  }

  console.log(`\n访问: https://${HOST}/`);
}

// ============ 上传文件 ============
async function upload() {
  const files = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fp = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(fp);
      else files.push(fp);
    }
  }
  walk(DIST_DIR);

  console.log(`上传 ${files.length} 个文件 → https://${HOST}/ ...\n`);

  const mimeMap = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.ico': 'image/x-icon',
  };

  let uploaded = 0;
  for (const file of files) {
    const rel = '/' + path.relative(DIST_DIR, file).replace(/\\/g, '/');
    const ext = path.extname(file).toLowerCase();
    const contentType = mimeMap[ext] || 'application/octet-stream';
    const cacheControl = rel.includes('/assets/')
      ? 'public, max-age=31536000, immutable'
      : 'no-cache, must-revalidate';

    try {
      const body = fs.readFileSync(file);
      const headers = {
        'Content-Type': contentType,
        'Cache-Control': cacheControl,
      };
      // HTML/CSS/JS/SVG 文本类文件: 禁止强制下载，设为 inline 渲染
      if (['.html', '.css', '.js', '.svg', '.json'].includes(ext)) {
        headers['Content-Disposition'] = 'inline';
        headers['x-oss-force-download'] = 'false';
      }
      await ossRequest('PUT', rel, body, headers);
      uploaded++;
      console.log(`  [${uploaded}/${files.length}] ${rel}`);
    } catch (err) {
      console.log(`  [失败] ${rel}: ${err.message}`);
    }
  }

  console.log(`\n部署完成！${uploaded} 个文件`);
  console.log(`访问: https://${HOST}/`);
}

// ============ 入口 ============
const cmd = process.argv[2];
if (cmd === 'fix-acl') fixAcl();
else if (cmd === 'upload') upload();
else {
  console.log('node oss-deploy.cjs fix-acl  设置公共读 + 静态托管');
  console.log('node oss-deploy.cjs upload   上传 dist/');
}

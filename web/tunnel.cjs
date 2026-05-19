// 临时隧道脚本 — 启动后输出公网地址
const localtunnel = require('localtunnel');

(async () => {
  const tunnel = await localtunnel({ port: 4175 });
  console.log('\n===== 公网访问地址 =====');
  console.log(tunnel.url);
  console.log('========================\n');
  console.log('按 Ctrl+C 停止隧道');
})();

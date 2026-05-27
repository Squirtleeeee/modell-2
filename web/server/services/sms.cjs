// 短信发送服务 — 阿里云短信 + Mock fallback
let lastCodes = {}; // 内存存储 mock 验证码，方便测试

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function sendWithAliCloud(phone, code, templateCode) {
  const Dysmsapi = require('@alicloud/dysmsapi20170525');
  const client = new Dysmsapi.default({
    accessKeyId: process.env.ALICLOUD_ACCESS_KEY_ID,
    accessKeySecret: process.env.ALICLOUD_ACCESS_KEY_SECRET,
    endpoint: 'dysmsapi.aliyuncs.com',
  });

  await client.sendSms({
    phoneNumbers: phone,
    signName: process.env.ALICLOUD_SMS_SIGN_NAME || '行动安全守护',
    templateCode: templateCode || process.env.ALICLOUD_SMS_TEMPLATE_CODE,
    templateParam: JSON.stringify({ code }),
  });

  return { success: true, mock: false };
}

async function sendSms(phone, code, templateCode) {
  const provider = process.env.SMS_PROVIDER || 'mock';

  if (provider === 'alicloud' && process.env.ALICLOUD_ACCESS_KEY_ID) {
    try {
      return await sendWithAliCloud(phone, code, templateCode);
    } catch (e) {
      console.error('[SMS] 阿里云短信发送失败，降级为 Mock:', e.message);
    }
  }

  // Mock fallback
  lastCodes[phone] = { code, time: Date.now() };
  console.log(`\n[SMS Mock] 手机号: ${phone}`);
  console.log(`[SMS Mock] 验证码: ${code}`);
  console.log(`[SMS Mock] 模板: ${templateCode || 'default'}\n`);
  return { success: true, mock: true };
}

async function sendVerificationCodeSms(phone, codeOverride) {
  const code = codeOverride || generateCode();
  lastCodes[phone] = { code, time: Date.now() };
  const result = await sendSms(phone, code, process.env.ALICLOUD_SMS_TEMPLATE_CODE);
  return { ...result, code: result.mock ? code : undefined };
}

async function sendLoginCodeSms(phone, codeOverride) {
  const code = codeOverride || generateCode();
  lastCodes[phone] = { code, time: Date.now() };
  const result = await sendSms(phone, code, process.env.ALICLOUD_SMS_TEMPLATE_CODE);
  return { ...result, code: result.mock ? code : undefined };
}

module.exports = { sendVerificationCodeSms, sendLoginCodeSms };

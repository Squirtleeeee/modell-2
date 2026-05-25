// 邮件发送服务 — QQ邮箱 SMTP
const nodemailer = require('nodemailer');

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.qq.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '465', 10);
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';

let transporter = null;

function getTransporter() {
  if (!SMTP_USER || !SMTP_PASS) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
  }
  return transporter;
}

async function sendEmail(to, subject, html) {
  const transport = getTransporter();
  if (!transport) {
    console.log(`\n[Email Mock] 收件人: ${to}`);
    console.log(`[Email Mock] 主题: ${subject}`);
    console.log(`[Email Mock] 内容: ${html.replace(/<[^>]+>/g, '').trim()}\n`);
    return { success: true, mock: true, messageId: 'mock-' + Date.now() };
  }

  const info = await transport.sendMail({
    from: SMTP_USER,
    to,
    subject,
    html,
  });
  return { success: true, mock: false, messageId: info.messageId };
}

async function sendVerificationCodeEmail(to, code) {
  const html = `
    <div style="max-width: 480px; margin: 0 auto; font-family: sans-serif;">
      <h2 style="color: #E8725A;">行动安全守护系统</h2>
      <p>您的邮箱验证码是：</p>
      <div style="background: #F5F0EC; padding: 16px; text-align: center; border-radius: 8px; margin: 16px 0;">
        <span style="font-size: 28px; font-weight: bold; color: #3D322C; letter-spacing: 4px;">${code}</span>
      </div>
      <p style="color: #8B7E74;">验证码 5 分钟内有效，如非本人操作，请忽略此邮件。</p>
    </div>
  `;
  return sendEmail(to, '行动安全守护系统 - 邮箱验证码', html);
}

async function sendPasswordResetEmail(to, code) {
  const html = `
    <div style="max-width: 480px; margin: 0 auto; font-family: sans-serif;">
      <h2 style="color: #E8725A;">行动安全守护系统</h2>
      <p>您正在重置密码，验证码是：</p>
      <div style="background: #F5F0EC; padding: 16px; text-align: center; border-radius: 8px; margin: 16px 0;">
        <span style="font-size: 28px; font-weight: bold; color: #3D322C; letter-spacing: 4px;">${code}</span>
      </div>
      <p style="color: #8B7E74;">验证码 5 分钟内有效，如非本人操作，请忽略此邮件。</p>
    </div>
  `;
  return sendEmail(to, '行动安全守护系统 - 密码重置验证码', html);
}

module.exports = { sendVerificationCodeEmail, sendPasswordResetEmail };

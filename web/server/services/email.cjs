// 邮件发送服务 — Resend API (优先) / QQ邮箱 SMTP (备用) / Mock (兜底)
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.qq.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '465', 10);
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';

let resendClient = null;
let smtpTransporter = null;

function getResend() {
  if (!RESEND_API_KEY) return null;
  if (!resendClient) {
    const { Resend } = require('resend');
    resendClient = new Resend(RESEND_API_KEY);
  }
  return resendClient;
}

function getSmtp() {
  if (!SMTP_USER || !SMTP_PASS) return null;
  if (!smtpTransporter) {
    const nodemailer = require('nodemailer');
    smtpTransporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
  }
  return smtpTransporter;
}

async function sendEmail(to, subject, html) {
  // 1. 优先用 Resend
  const resend = getResend();
  if (resend) {
    const from = process.env.RESEND_FROM || '行动安全守护系统 <onboarding@resend.dev>';
    const { data, error } = await resend.emails.send({ from, to, subject, html });
    if (error) {
      console.error('[Resend] 发送失败:', error.message);
      throw new Error('邮件发送失败: ' + error.message);
    }
    console.log('[Resend] 已发送至', to, '| ID:', data?.id);
    return { success: true, mock: false, provider: 'resend', messageId: data?.id };
  }

  // 2. 备用 SMTP
  const smtp = getSmtp();
  if (smtp) {
    const info = await smtp.sendMail({ from: SMTP_USER, to, subject, html });
    console.log('[SMTP] 已发送至', to, '| ID:', info.messageId);
    return { success: true, mock: false, provider: 'smtp', messageId: info.messageId };
  }

  // 3. 兜底 Mock
  console.log(`\n[Email Mock] 收件人: ${to}`);
  console.log(`[Email Mock] 主题: ${subject}`);
  console.log(`[Email Mock] 内容: ${html.replace(/<[^>]+>/g, '').trim()}\n`);
  return { success: true, mock: true, provider: 'mock', messageId: 'mock-' + Date.now() };
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

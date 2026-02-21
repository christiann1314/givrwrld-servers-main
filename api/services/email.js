import nodemailer from 'nodemailer';

let cachedTransporter = null;
let cachedFrom = null;

async function buildTransporter() {
  if (cachedTransporter) {
    return { transporter: cachedTransporter, from: cachedFrom };
  }

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || user;

  if (!host || !user || !pass || !from) {
    throw new Error('SMTP is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM.');
  }

  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
  cachedFrom = from;
  return { transporter: cachedTransporter, from: cachedFrom };
}

export async function sendVerificationEmail({ toEmail, verifyUrl }) {
  const { transporter, from } = await buildTransporter();

  const text = [
    'Welcome to GIVRwrld!',
    '',
    'Please verify your email to activate your account:',
    verifyUrl,
    '',
    'If you did not request this, you can ignore this email.',
  ].join('\n');

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #111827;">
      <h2 style="margin-bottom: 8px;">Verify your email</h2>
      <p style="margin-top: 0;">Welcome to GIVRwrld. Confirm your email to activate your account.</p>
      <p style="margin: 24px 0;">
        <a href="${verifyUrl}" style="background:#10b981;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;display:inline-block;">
          Verify Email
        </a>
      </p>
      <p style="font-size: 13px; color: #4b5563;">If the button does not work, copy/paste this URL:</p>
      <p style="font-size: 13px; word-break: break-all; color: #2563eb;">${verifyUrl}</p>
    </div>
  `;

  await transporter.sendMail({
    from,
    to: toEmail,
    subject: 'Verify your GIVRwrld account',
    text,
    html,
  });
}


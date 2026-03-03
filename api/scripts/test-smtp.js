#!/usr/bin/env node
/**
 * Simple SMTP smoke test.
 *
 * Usage (from repo root):
 *   node api/scripts/test-smtp.js [optional-to-email]
 *
 * It will:
 *   - Load api/.env
 *   - Build the Nodemailer transporter using SMTP_* env vars
 *   - Send a short test email
 */
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildTransporter } from '../services/email.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load api/.env so SMTP_* vars are available.
dotenv.config({ path: path.join(__dirname, '../.env') });

async function main() {
  console.log('Env check:', {
    SMTP_HOST: process.env.SMTP_HOST || '<missing>',
    SMTP_PORT: process.env.SMTP_PORT || '<missing>',
    SMTP_USER: process.env.SMTP_USER ? '<set>' : '<missing>',
    SMTP_PASS: process.env.SMTP_PASS ? '<set>' : '<missing>',
    SMTP_FROM: process.env.SMTP_FROM || '<missing>',
  });

  const { transporter, from } = await buildTransporter();

  const to = process.argv[2] || process.env.TEST_SMTP_TO || from;

  if (!to) {
    throw new Error('No recipient email set. Pass one as an argument or set TEST_SMTP_TO.');
  }

  console.log('Using SMTP_FROM:', from);
  console.log('Sending test email to:', to);

  const info = await transporter.sendMail({
    from,
    to,
    subject: 'GIVRwrld SMTP test',
    text: 'This is a test email from your GIVRwrld API SMTP configuration.',
  });

  console.log('SMTP_TEST_OK messageId=', info?.messageId || '<none>');
}

main().catch((err) => {
  console.error('SMTP_TEST_ERR', err?.message || err);
  process.exit(1);
});


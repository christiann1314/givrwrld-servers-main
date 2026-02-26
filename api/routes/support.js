import express from 'express';
import { buildTransporter } from '../services/email.js';

const router = express.Router();

/**
 * POST /api/support/contact
 * Body: { name, email, subject, message }
 * Sends an email to the business support address using SMTP.
 */
router.post('/contact', async (req, res) => {
  const { name, email, subject, message } = req.body || {};

  if (!name || !email || !subject || !message) {
    return res.status(400).json({ error: 'name, email, subject, and message are required' });
  }

  try {
    const { transporter, from } = await buildTransporter();
    const to = process.env.SUPPORT_EMAIL || 'givrwlrdservers.com@outlook.com';

    const plainText = [
      `Name: ${name}`,
      `Email: ${email}`,
      '',
      'Message:',
      message,
    ].join('\n');

    await transporter.sendMail({
      from,
      to,
      replyTo: email,
      subject: `[GIVRwrld Support] ${subject}`,
      text: plainText,
    });

    return res.json({ success: true });
  } catch (err) {
    console.error('Support contact email failed:', err);
    return res.status(500).json({ error: 'Unable to send support email' });
  }
});

export default router;


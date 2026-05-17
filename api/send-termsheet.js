import nodemailer from 'nodemailer';

function env(name, fallback = '') {
  const value = process.env[name];
  return typeof value === 'string' ? value : fallback;
}

function toBool(value, fallback = false) {
  if (value === undefined) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const smtpHost = env('SMTP_HOST');
  const smtpPort = parseInt(env('SMTP_PORT', '587'), 10);
  const smtpUser = env('SMTP_USER');
  const smtpPass = env('SMTP_PASS');
  const smtpSecure = toBool(process.env.SMTP_SECURE, smtpPort === 465);
  const fromEmail = env('TERMSHEET_FROM_EMAIL', smtpUser || 'info@assetliftlending.com');

  if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
    return res.status(500).json({
      error: 'Missing SMTP settings. Add SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS environment variables.',
    });
  }

  const { to, subject, text, attachments } = req.body || {};

  if (!to || !subject || !text || !Array.isArray(attachments) || attachments.length === 0) {
    return res.status(400).json({ error: 'Missing required email fields.' });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    await transporter.verify();

    const result = await transporter.sendMail({
      from: fromEmail,
      to,
      subject,
      text,
      attachments: attachments.map((file) => ({
        filename: file.filename,
        content: file.content,
        encoding: 'base64',
      })),
    });

    return res.status(200).json({ ok: true, id: result.messageId || null });
  } catch (error) {
    return res.status(500).json({
      error: error?.message || 'Unexpected SMTP send failure.',
    });
  }
}

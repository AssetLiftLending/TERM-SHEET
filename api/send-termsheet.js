export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.TERMSHEET_FROM_EMAIL || 'Asset Lift Lending <info@assetliftlending.com>';

  if (!apiKey) {
    return res.status(500).json({ error: 'Missing RESEND_API_KEY environment variable.' });
  }

  const { to, subject, text, attachments } = req.body || {};

  if (!to || !subject || !text || !Array.isArray(attachments) || attachments.length === 0) {
    return res.status(400).json({ error: 'Missing required email fields.' });
  }

  try {
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [to],
        subject,
        text,
        attachments: attachments.map((file) => ({
          filename: file.filename,
          content: file.content
        }))
      })
    });

    const result = await resendResponse.json();

    if (!resendResponse.ok) {
      return res.status(502).json({
        error: result?.message || result?.error || 'Resend request failed.'
      });
    }

    return res.status(200).json({ ok: true, id: result?.id || null });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unexpected send failure.' });
  }
}

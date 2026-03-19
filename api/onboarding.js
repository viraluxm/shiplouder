module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { product_url, selling_point, avoid, ideal_customer, session_id } = req.body;

  if (!product_url || !selling_point || !ideal_customer) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  const emailBody = [
    'New ShipLouder onboarding submission',
    '─'.repeat(40),
    '',
    `Stripe Session: ${session_id || 'N/A'}`,
    '',
    `Product URL: ${product_url}`,
    '',
    `Main Selling Point:\n${selling_point}`,
    '',
    `Anything to Avoid:\n${avoid || '(none)'}`,
    '',
    `Ideal Customer:\n${ideal_customer}`,
  ].join('\n');

  const htmlBody = `
    <h2 style="margin:0 0 16px">New ShipLouder Onboarding</h2>
    <p style="color:#666;font-size:13px">Stripe Session: ${session_id || 'N/A'}</p>
    <hr style="border:none;border-top:1px solid #eee;margin:16px 0">
    <p><strong>Product URL:</strong><br><a href="${product_url}">${product_url}</a></p>
    <p><strong>Main Selling Point:</strong><br>${selling_point.replace(/\n/g, '<br>')}</p>
    <p><strong>Anything to Avoid:</strong><br>${(avoid || '(none)').replace(/\n/g, '<br>')}</p>
    <p><strong>Ideal Customer:</strong><br>${ideal_customer.replace(/\n/g, '<br>')}</p>
  `;

  try {
    const resendKey = process.env.RESEND_API_KEY;

    if (resendKey) {
      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'ShipLouder <onboarding@shiplouder.com>',
          to: ['alvaro@viralux.media'],
          subject: `New Onboarding: ${product_url}`,
          html: htmlBody,
          text: emailBody,
        }),
      });

      if (!emailRes.ok) {
        const errData = await emailRes.json();
        console.error('Resend error:', errData);
        throw new Error('Email send failed');
      }
    } else {
      // No email provider configured — log to Vercel function logs
      console.log('ONBOARDING SUBMISSION (no RESEND_API_KEY set):');
      console.log(emailBody);
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Onboarding error:', err.message);
    return res.status(500).json({ error: 'Failed to process submission.' });
  }
};

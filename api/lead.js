module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, url } = req.body;

  if (!email || !url) {
    return res.status(400).json({ error: 'Email and URL are required.' });
  }

  console.log(`Lead received: email=${email}, url=${url}`);

  // Try Resend first, then Web3Forms, then log-only
  const resendKey = process.env.RESEND_API_KEY;
  const web3formsKey = process.env.WEB3FORMS_KEY;

  try {
    if (resendKey) {
      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'ShipLouder <onboarding@resend.dev>',
          to: ['team@viralux.media'],
          subject: `Free Video Request: ${url}`,
          html: `
            <h2 style="margin:0 0 16px">New Free Video Request</h2>
            <hr style="border:none;border-top:1px solid #eee;margin:16px 0">
            <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
            <p><strong>App URL:</strong> <a href="${url}">${url}</a></p>
          `,
        }),
      });

      if (!emailRes.ok) {
        const errData = await emailRes.json();
        console.error('Resend error:', JSON.stringify(errData));
        throw new Error('Resend failed, trying fallback');
      }

      console.log('Lead sent via Resend');
      return res.status(200).json({ success: true });
    }
  } catch (err) {
    console.error('Resend attempt failed:', err.message);
    // Fall through to Web3Forms
  }

  try {
    if (web3formsKey) {
      const w3Res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_key: web3formsKey,
          subject: `Free Video Request: ${url}`,
          from_name: 'ShipLouder Lead Form',
          email: email,
          app_url: url,
        }),
      });

      if (!w3Res.ok) {
        console.error('Web3Forms error:', await w3Res.text());
        throw new Error('Web3Forms failed');
      }

      console.log('Lead sent via Web3Forms');
      return res.status(200).json({ success: true });
    }
  } catch (err) {
    console.error('Web3Forms attempt failed:', err.message);
  }

  // No email service configured — log and succeed so the user sees confirmation
  console.log('NO EMAIL SERVICE CONFIGURED. Lead logged only.');
  console.log(`  Email: ${email}`);
  console.log(`  URL: ${url}`);
  return res.status(200).json({ success: true });
};

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const PACKAGES = {
  starter: {
    priceId: process.env.STRIPE_STARTER_PRICE_ID,
    name: 'Starter Package',
    amount: 50000,
  },
  scale: {
    priceId: process.env.STRIPE_SCALE_PRICE_ID,
    name: 'Scale Package',
    amount: 150000,
  },
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { package: pkg } = req.body;

  if (!pkg || !PACKAGES[pkg]) {
    return res.status(400).json({ error: 'Invalid package. Use "starter" or "scale".' });
  }

  const selected = PACKAGES[pkg];
  const origin = `https://${req.headers.host}`;

  try {
    const sessionParams = {
      ui_mode: 'embedded',
      payment_method_types: ['card'],
      mode: 'payment',
      return_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    };

    // Use existing Stripe Price if configured, otherwise create ad-hoc price
    if (selected.priceId) {
      sessionParams.line_items = [{ price: selected.priceId, quantity: 1 }];
    } else {
      sessionParams.line_items = [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: selected.name },
            unit_amount: selected.amount,
          },
          quantity: 1,
        },
      ];
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return res.status(200).json({ clientSecret: session.client_secret });
  } catch (err) {
    console.error('Stripe session error:', err.message);
    return res.status(500).json({ error: 'Failed to create checkout session.' });
  }
};

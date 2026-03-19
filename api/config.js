module.exports = (req, res) => {
  res.status(200).json({
    publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  });
};

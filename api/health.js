module.exports = function handler(_req, res) {
  const publicKey = process.env.CULQI_PUBLIC_KEY || '';
  const secretKey = process.env.CULQI_SECRET_KEY || '';
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    culqiConfigured: Boolean(publicKey && secretKey),
    runtime: 'vercel-root',
  });
};

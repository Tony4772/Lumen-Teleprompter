function readEnv(name) {
  return (process.env[name] || '').trim();
}

module.exports = function handler(_req, res) {
  const publicKey = readEnv('CULQI_PUBLIC_KEY');
  const secretKey = readEnv('CULQI_SECRET_KEY');
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    culqiConfigured: Boolean(publicKey && secretKey),
    hasPublicKey: Boolean(publicKey),
    hasSecretKey: Boolean(secretKey),
    runtime: 'vercel-root',
    hint: publicKey
      ? undefined
      : 'CULQI_PUBLIC_KEY no llega a este deploy. El archivo .env local NO se sube a Vercel. Pon la variable en Vercel → Settings → Environment Variables (Production) y Redeploy.',
  });
};

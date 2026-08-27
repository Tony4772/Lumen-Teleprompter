const { getCulqiKeys } = require('../_lib/culqi');

module.exports = function handler(_req, res) {
  const { publicKey, secretKey } = getCulqiKeys();
  if (!publicKey) {
    return res.status(503).json({
      error:
        'Falta CULQI_PUBLIC_KEY en este deploy. El .env de tu PC no se sube a Vercel. En vercel.com → tu proyecto lumen-teleprompter → Settings → Environment Variables → agrega CULQI_PUBLIC_KEY (Production) → Save → Deployments → Redeploy.',
    });
  }
  return res.status(200).json({
    publicKey,
    company: 'EBYZOM E.I.R.L.',
    currency: 'PEN',
    minAmount: 1,
    hasSecret: Boolean(secretKey),
  });
};

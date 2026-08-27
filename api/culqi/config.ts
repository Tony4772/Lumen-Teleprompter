import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getCulqiKeys } from '../../Lumen-main/server/culqiService';

export default function handler(_req: VercelRequest, res: VercelResponse) {
  const { publicKey, secretKey } = getCulqiKeys();
  if (!publicKey) {
    return res.status(503).json({
      error:
        'Falta CULQI_PUBLIC_KEY en Vercel. Settings → Environment Variables → Redeploy.',
    });
  }
  return res.status(200).json({
    publicKey,
    company: 'EBYZOM E.I.R.L.',
    currency: 'PEN',
    minAmount: 1,
    hasSecret: Boolean(secretKey),
  });
}

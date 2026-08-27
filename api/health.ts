import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getCulqiKeys } from '../Lumen-main/server/culqiService';

export default function handler(_req: VercelRequest, res: VercelResponse) {
  const { publicKey, secretKey } = getCulqiKeys();
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    culqiConfigured: Boolean(publicKey && secretKey),
    runtime: 'vercel-root',
  });
}

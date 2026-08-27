import type { VercelRequest, VercelResponse } from '@vercel/node';
import { chargeCulqi } from '../../Lumen-main/server/culqiService';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const result = await chargeCulqi(req.body);
    return res.status(result.status).json(result.json);
  } catch (err: any) {
    console.error('charge error:', err);
    return res.status(500).json({ error: err?.message || 'Error interno' });
  }
}

import { chargeCulqi } from '../_lib/culqi.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const result = await chargeCulqi(req.body);
    return res.status(result.status).json(result.json);
  } catch (err) {
    console.error('charge error:', err);
    return res.status(500).json({ error: err?.message || 'Error interno' });
  }
}

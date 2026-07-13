/**
 * Vercel serverless health check for Grok chat config.
 */

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  if (req.method !== 'GET') {
    return res.status(405).json({ detail: 'Method not allowed' });
  }

  const key = (process.env.XAI_API_KEY || '').trim();
  const configured =
    Boolean(key) && !key.startsWith('your_') && key.length >= 20;
  const model = process.env.XAI_CHAT_MODEL || 'grok-4.5';

  return res.status(200).json({
    ok: configured,
    model,
    xai_api_key_configured: configured,
    hint: configured
      ? null
      : 'Set XAI_API_KEY in Vercel → Project → Settings → Environment Variables (from https://console.x.ai).',
  });
};

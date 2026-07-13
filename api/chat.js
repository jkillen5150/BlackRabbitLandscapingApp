/**
 * Vercel serverless chat proxy → xAI (OpenAI-compatible).
 * Used when the Expo static site is hosted on Vercel without a separate FastAPI host.
 *
 * Env (set in Vercel project settings):
 *   XAI_API_KEY       required
 *   XAI_CHAT_MODEL    optional, default grok-4.5
 */

const DEFAULT_CONTEXT =
  'You are Grok for Black Rabbit Services (Yelm / Rainier / Olympia, WA). ' +
  'Prefer booking the house crew first: Request Black Rabbit or call/text (407) 951-1663 ' +
  'for lawn, landscaping, pressure wash, gutters, windows, light handyman. ' +
  'Use the open pro board for multiple bids or work outside our core. Be warm and honest.';

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function keyOk(key) {
  if (!key || typeof key !== 'string') return false;
  const k = key.trim();
  if (!k || k.startsWith('your_') || k.length < 20) return false;
  return true;
}

function friendlyError(status, body) {
  const lower = String(body || '').toLowerCase();
  if (status === 401 || status === 403 || lower.includes('incorrect api key')) {
    return (
      'Invalid XAI_API_KEY. Create a new key at https://console.x.ai ' +
      'and set it in Vercel → Project → Settings → Environment Variables.'
    );
  }
  if (status === 429) return 'xAI rate limit hit. Wait a moment and try again.';
  const snippet = String(body || '').replace(/\s+/g, ' ').slice(0, 240);
  return snippet || `Chat request failed (${status})`;
}

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ detail: 'Method not allowed' });
  }

  const apiKey = (process.env.XAI_API_KEY || '').trim();
  if (!keyOk(apiKey)) {
    return res.status(503).json({
      detail:
        'XAI_API_KEY is not configured on Vercel. Add it under Project → Settings → Environment Variables.',
    });
  }

  const model = process.env.XAI_CHAT_MODEL || 'grok-4.5';
  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  const incoming = Array.isArray(body.messages) ? body.messages : [];
  const context = body.context || DEFAULT_CONTEXT;

  const messages = [{ role: 'system', content: context }];
  for (const msg of incoming) {
    const role = ['user', 'assistant', 'system'].includes(msg?.role) ? msg.role : 'user';
    const content = String(msg?.content || '').trim();
    if (content) messages.push({ role, content });
  }

  if (messages.length < 2) {
    return res.status(400).json({ detail: 'Send at least one user message.' });
  }

  try {
    const r = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model, messages, temperature: 0.7 }),
    });

    const text = await r.text();
    if (!r.ok) {
      return res.status(502).json({ detail: friendlyError(r.status, text) });
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return res.status(502).json({ detail: 'Unexpected xAI response (not JSON)' });
    }

    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      return res.status(502).json({ detail: 'Empty response from xAI' });
    }

    return res.status(200).json({
      message: { role: 'assistant', content },
      model: data.model || model,
    });
  } catch (e) {
    return res.status(502).json({
      detail: `Could not reach xAI API: ${e instanceof Error ? e.message : String(e)}`,
    });
  }
};

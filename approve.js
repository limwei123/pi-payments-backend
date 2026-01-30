// /api/pi/approve.js (Vercel Serverless Function)
// Approves a payment on Pi Servers.
// Requires env var: PI_API_KEY (Server API Key from Pi Developer Portal).
//
// Pi API: POST https://api.minepi.com/v2/payments/{payment_id}/approve
// Docs: Pi App Platform APIs (Approve a Payment)
module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { paymentId } = req.body || {};
    if (!paymentId) return res.status(400).json({ error: 'Missing paymentId' });

    const key = process.env.PI_API_KEY;
    if (!key) return res.status(500).json({ error: 'Missing PI_API_KEY env var' });

    const url = `https://api.minepi.com/v2/payments/${encodeURIComponent(paymentId)}/approve`;
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Authorization': `Key ${key}`, 'Content-Type': 'application/json' }
    });
    const text = await r.text();
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch {}
    if (!r.ok) return res.status(r.status).json({ error: json?.error || text || 'Approve failed' });

    return res.status(200).json(json || { ok: true });
  } catch (e) {
    return res.status(500).json({ error: e?.message || String(e) });
  }
};

// /api/pi/complete.js (Vercel Serverless Function)
// Completes a payment on Pi Servers by providing txid.
// Requires env var: PI_API_KEY (Server API Key from Pi Developer Portal).
//
// Pi API: POST https://api.minepi.com/v2/payments/{payment_id}/complete
// Body: { txid: "..." }
// Docs: Pi App Platform APIs (Complete a Payment)
module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { paymentId, txid } = req.body || {};
    if (!paymentId) return res.status(400).json({ error: 'Missing paymentId' });
    if (!txid) return res.status(400).json({ error: 'Missing txid' });

    const key = process.env.PI_API_KEY;
    if (!key) return res.status(500).json({ error: 'Missing PI_API_KEY env var' });

    const url = `https://api.minepi.com/v2/payments/${encodeURIComponent(paymentId)}/complete`;
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Authorization': `Key ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ txid })
    });
    const text = await r.text();
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch {}
    if (!r.ok) return res.status(r.status).json({ error: json?.error || text || 'Complete failed' });

    return res.status(200).json(json || { ok: true });
  } catch (e) {
    return res.status(500).json({ error: e?.message || String(e) });
  }
};

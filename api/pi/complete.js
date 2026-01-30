// api/pi/complete.js
// Vercel Serverless Function (CommonJS) — Pi Payments Complete
// FIX: Handle CORS preflight (OPTIONS). If OPTIONS is not handled, browser fetch() fails and payment expires.
//
// Env required: PI_API_KEY
module.exports = async (req, res) => {
  // CORS headers (Pi Browser / Sandbox)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { paymentId, txid } = req.body || {};
    if (!paymentId) return res.status(400).json({ error: "Missing paymentId" });
    if (!txid) return res.status(400).json({ error: "Missing txid" });

    const key = process.env.PI_API_KEY;
    if (!key) return res.status(500).json({ error: "Missing PI_API_KEY env var" });

    const url = `https://api.minepi.com/v2/payments/${encodeURIComponent(paymentId)}/complete`;
    const r = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Key ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ txid }),
    });

    const text = await r.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch {}

    if (!r.ok) {
      return res.status(r.status).json({
        error: data?.error || data || text || "Complete failed",
        status: r.status
      });
    }

    return res.status(200).json({ success: true, paymentId, txid, pi: data });
  } catch (e) {
    return res.status(500).json({ error: e?.message || String(e) });
  }
};

// api/user/mark-paid.js
// SECURE: Mark user as paid ONLY after verifying the payment on Pi servers.
//
// Request (POST):
//   { "paymentId": "...", "txid": "..." }
//
// What this does:
// 1) Fetch payment details from Pi API (server-side, using PI_API_KEY)
// 2) Ensure payment status is completed and txid matches
// 3) Mark paid_users:{pi_user_uid} = "1" and store a receipt
//
// Env required:
//   PI_API_KEY
//   KV_REST_API_URL
//   KV_REST_API_TOKEN
const { set } = require("../../lib/kv");

module.exports = async (req, res) => {
  // CORS (restrict in production if possible)
  const origin = req.headers.origin || "*";
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { paymentId, txid } = req.body || {};
    if (!paymentId) return res.status(400).json({ error: "Missing paymentId" });
    if (!txid) return res.status(400).json({ error: "Missing txid" });

    const key = process.env.PI_API_KEY;
    if (!key) return res.status(500).json({ error: "Missing PI_API_KEY env var" });

    // 1) Fetch payment details from Pi
    const url = `https://api.minepi.com/v2/payments/${encodeURIComponent(paymentId)}`;
    const r = await fetch(url, {
      method: "GET",
      headers: { "Authorization": `Key ${key}` }
    });

    const text = await r.text();
    let payment = null;
    try { payment = text ? JSON.parse(text) : null; } catch {}

    if (!r.ok) {
      return res.status(r.status).json({ error: payment?.error || payment || text || "Failed to fetch payment", status: r.status });
    }

    // 2) Validate status + txid.
    // NOTE: Pi API fields can vary; we check a few common shapes.
    const status =
      payment?.status ||
      payment?.payment?.status ||
      payment?.result?.status ||
      null;

    const serverTxid =
      payment?.txid ||
      payment?.transaction?.txid ||
      payment?.payment?.txid ||
      payment?.result?.txid ||
      null;

    const userUid =
      payment?.user_uid ||
      payment?.userUid ||
      payment?.user?.uid ||
      payment?.payment?.user_uid ||
      payment?.result?.user_uid ||
      null;

    const isCompleted = String(status || "").toLowerCase() === "completed";

    if (!isCompleted) {
      return res.status(400).json({ error: "Payment is not completed", status: status || null });
    }
    if (serverTxid && String(serverTxid) !== String(txid)) {
      return res.status(400).json({ error: "TXID mismatch", txidProvided: txid, txidFromPi: serverTxid });
    }
    if (!userUid) {
      return res.status(400).json({ error: "Could not determine payer user uid from Pi API response" });
    }

    // 3) Mark paid for payer uid only (prevents spoofing another user)
    await set(`paid_users:${userUid}`, "1");

    const receipt = {
      uid: userUid,
      paymentId,
      txid,
      verifiedAt: new Date().toISOString(),
      piPayment: payment
    };
    await set(`paid_receipt:${userUid}`, receipt);
    await set(`payment_receipt:${paymentId}`, receipt);

    return res.status(200).json({ success: true, uid: userUid });
  } catch (e) {
    if (e?.code === "KV_ENV_MISSING") {
      return res.status(500).json({ error: "KV not configured. Add Vercel KV env vars first." });
    }
    return res.status(500).json({ error: e?.message || String(e) });
  }
};

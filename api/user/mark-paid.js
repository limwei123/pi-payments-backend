// api/user/mark-paid.js
// Mark a user as paid after successful Pi payment completion.
// Store: paid_users:{uid or username} = "1"
//
// Request (POST):
//   { "username": "abc", "uid": "...", "paymentId": "...", "txid": "..." }
//
// Response:
//   { "success": true }
const { set } = require("../../lib/kv");

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { username, uid, paymentId, txid } = req.body || {};
    const keyId = uid || username;
    if (!keyId) return res.status(400).json({ error: "Missing username or uid" });

    // Save paid flag
    await set(`paid_users:${keyId}`, "1");

    // Optional: save receipt record for admin/debug
    const receipt = {
      username: username || null,
      uid: uid || null,
      paymentId: paymentId || null,
      txid: txid || null,
      paidAt: new Date().toISOString(),
    };
    await set(`paid_receipt:${keyId}`, receipt);

    return res.status(200).json({ success: true });
  } catch (e) {
    if (e?.code === "KV_ENV_MISSING") {
      return res.status(500).json({ error: "KV not configured. Add Vercel KV env vars first." });
    }
    return res.status(500).json({ error: e?.message || String(e) });
  }
};

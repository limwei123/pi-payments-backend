// api/user/status.js
// Check if a Pi user has already paid (one-time unlock).
//
// NOTE (important):
// - For strongest security, you'd validate the accessToken with an official Pi endpoint.
// - Many Pi apps simply key by username/uid received from Pi SDK after Pi.authenticate.
// - This endpoint is designed to work with your current frontend by receiving { username }.
//   (You can also pass uid if available.)
//
// Request (POST):
//   { "username": "abc" }  OR { "uid": "..." } OR both
//
// Response:
//   { "paid": true/false }
const { get } = require("../../lib/kv");

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { username, uid } = req.body || {};
    const keyId = uid || username;
    if (!keyId) return res.status(400).json({ error: "Missing username or uid" });

    const key = `paid_users:${keyId}`;
    const paid = await get(key);

    return res.status(200).json({ paid: paid === "1" || paid === 1 || paid === true || paid === "true" || !!paid });
  } catch (e) {
    // If KV not set yet, return paid:false (so app still works), but include reason.
    if (e?.code === "KV_ENV_MISSING") {
      return res.status(200).json({ paid: false, reason: "KV not configured" });
    }
    return res.status(500).json({ error: e?.message || String(e) });
  }
};

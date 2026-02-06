// lib/kv.js
// Minimal Upstash/Vercel KV REST helper (no npm deps)
// Env required on Vercel:
//   KV_REST_API_URL
//   KV_REST_API_TOKEN
//
// Docs: Vercel KV exposes Upstash REST compatible endpoints.
async function kvFetch(path, opts = {}) {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) {
    const err = new Error("Missing KV_REST_API_URL or KV_REST_API_TOKEN env vars");
    err.code = "KV_ENV_MISSING";
    throw err;
  }

  const r = await fetch(url.replace(/\/+$/, "") + path, {
    ...opts,
    headers: {
      "Authorization": `Bearer ${token}`,
      ...(opts.headers || {}),
    },
  });

  const data = await r.json().catch(() => null);
  if (!r.ok) {
    const e = new Error(data?.error || data?.message || "KV request failed");
    e.status = r.status;
    e.data = data;
    throw e;
  }
  return data;
}

// Upstash REST format returns: { result: ... }
async function get(key) {
  const data = await kvFetch(`/get/${encodeURIComponent(key)}`);
  return data?.result ?? null;
}

async function set(key, value) {
  const v = typeof value === "string" ? value : JSON.stringify(value);
  const data = await kvFetch(`/set/${encodeURIComponent(key)}/${encodeURIComponent(v)}`);
  return data?.result ?? null;
}

module.exports = { get, set };

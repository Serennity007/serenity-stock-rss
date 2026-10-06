// Mount before API routes. Keys come exclusively from the service environment.
const { randomUUID } = require('node:crypto');
function critical(req) {
  return req.path.startsWith('/api/') && (req.method === 'DELETE' || !['GET', 'HEAD', 'OPTIONS'].includes(req.method) && (/\/admin\//.test(req.path) || /\/sources\/[^/]+\/(toggle|enabled)/.test(req.path)));
}
function middleware({ origin = process.env.RSS_DR_CONTROL_URL, key = process.env.RSS_DR_CONTROL_KEY } = {}) {
  async function control(op, id) {
    const r = await fetch(origin + '/__dr/' + op, { method: 'POST', headers: { 'User-Agent': 'Qiaomu-RSS-DR/1.0', Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' }, body: JSON.stringify({ id }), signal: AbortSignal.timeout(5000) });
    if (!r.ok) throw Error('dr_gate_unavailable');
  }
  return async (req, res, next) => {
    if (!critical(req)) return next();
    if (!origin || !key) return res.status(503).json({ error: 'dr_gate_unconfigured' });
    const id = randomUUID();
    try { await control('start', id); }
    catch { return res.status(503).json({ error: 'dr_gate_unavailable' }); }
    // An aborted request is deliberately left pending: snapshot publication fails closed.
    res.once('finish', () => { if (res.statusCode >= 500) return; void control('finish', id).catch(() => console.error('RSS DR gate finish failed; failover remains disabled')); });
    next();
  };
}
module.exports = { middleware, critical };

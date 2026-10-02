// Install in QMReader lib/. No client-chosen model or provider is accepted.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

function mountLabCollection(app, { directory, processLink, validateUrl, codes = () => process.env.QIAOMU_LAB_INVITE_CODES || '', adminAuth }) {
  const file = path.join(directory, 'lab-collection-jobs.json');
  const clientsFile = path.join(directory, 'lab-collection-clients.json');
  const clients = fs.existsSync(clientsFile) ? JSON.parse(fs.readFileSync(clientsFile, 'utf8')) : {};
  let jobs = [];
  if (fs.existsSync(file)) {
    jobs = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!Array.isArray(jobs)) throw new Error('Invalid lab collection journal');
    for (const job of jobs) if (job.status === 'running') job.status = 'queued';
  }
  const digest = value => crypto.createHash('sha256').update(value).digest('hex');
  const save = () => {
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(file + '.tmp', JSON.stringify(jobs), { mode: 0o600 });
    fs.renameSync(file + '.tmp', file);
  };
  const publicJob = job => ({ id: job.id, url: job.url, createdAt: job.createdAt, ...view(job) });
  const clientAuth = (req, res, next) => {
    const client = clients[req.get('x-qiaomu-client')];
    if (!client || client.owner !== req.labOwner || client.keyHash !== digest(String(req.get('x-qiaomu-client-key') || ''))) return res.status(403).json({ error: 'invalid_client' });
    req.labClient = client.id; return next();
  };
  const view = job => {
    const title = job.entryId && adminAuth?.getTitleTranslations?.([job.entryId])?.[job.entryId];
    return { status: job.status, title: title || job.title || '', ...(job.originalTitle || title ? { originalTitle: job.originalTitle || job.title } : {}), ...(job.entryId ? { entryId: job.entryId } : {}) };
  };
  const auth = (req, res, next) => {
    const token = String(req.get('authorization') || '').replace(/^Bearer /, '');
    const hash = digest(token);
    if (!token || !codes().split(',').map(code => code.trim()).filter(Boolean).some(code => crypto.timingSafeEqual(Buffer.from(digest(code)), Buffer.from(hash)))) return res.status(403).json({ error: 'invalid_invitation' });
    req.labOwner = hash;
    res.setHeader('Cache-Control', 'no-store');
    return next();
  };
  app.post('/api/lab/verify', auth, (req, res) => {
    const id = String(req.body?.clientId || ''), key = String(req.body?.clientKey || '');
    if (!/^[a-f0-9-]{36}$/i.test(id) || key.length < 36 || key.length > 200) return res.status(400).json({ error: 'invalid_client' });
    const existing = clients[id];
    if (existing && (existing.keyHash !== digest(key))) return res.status(403).json({ error: 'invalid_client' });
    const oldClient = clients[id];
    clients[id] = { id, owner: req.labOwner, keyHash: digest(key), label: existing?.label || `用户 ${Object.keys(clients).length + 1}` };
    const claimIds = Array.isArray(req.body?.claimIds) ? req.body.claimIds.slice(0, 2000) : [];
    const claimed = [];
    for (const job of jobs) if (!job.clientId && job.owner === req.labOwner && claimIds.includes(job.id)) { job.clientId = id; claimed.push(job); }
    try {
      fs.mkdirSync(directory, { recursive: true });
      fs.writeFileSync(clientsFile + '.tmp', JSON.stringify(clients), { mode: 0o600 });
      fs.renameSync(clientsFile + '.tmp', clientsFile);
      save();
    } catch {
      if (oldClient) clients[id] = oldClient; else delete clients[id];
      for (const job of claimed) delete job.clientId;
      return res.status(503).json({ error: 'journal_unavailable' });
    }
    return res.json({ verified: true });
  });
  const page = (req, list, admin = false) => {
    list = list.filter(job => !job.entryId || !adminAuth?.isEntryDeleted?.(job.entryId));
    const ordered = [...list].sort((a,b) => b.createdAt - a.createdAt || a.id.localeCompare(b.id));
    const after = String(req.query?.cursor || '');
    const found = after ? ordered.findIndex(job => job.id === after) : -1;
    const start = found + 1, selected = ordered.slice(start, start + 100);
    const hasMore = start + selected.length < ordered.length;
    return { jobs: selected.map(job => ({ ...publicJob(job), ...(admin ? { submitter: clients[job.clientId]?.label || '旧版用户' } : {}) })), hasMore, nextCursor: hasMore ? selected.at(-1).id : '' };
  };
  app.get('/api/lab/collection-jobs', auth, (req, res) => clientAuth(req, res, () => res.json(page(req, jobs.filter(job => job.clientId === req.labClient)))));
  const adminAttempts = new Map();
  const admin = (req, res, next) => {
    const token = String(req.get('authorization') || '').replace(/^Bearer /, '');
    const user = adminAuth?.getUserBySessionToken(token);
    if (!user || user.role !== 'admin') return res.status(403).json({ error: 'admin_required' });
    req.labAdminToken = token; res.setHeader('Cache-Control', 'no-store'); return next();
  };
  app.post('/api/lab/admin/session', (req, res) => {
    const key = req.ip || 'unknown', now = Date.now();
    const attempt = adminAttempts.get(key) || { started: now, count: 0 };
    if (now - attempt.started > 600000) { attempt.started = now; attempt.count = 0; }
    if (adminAttempts.size > 1000) adminAttempts.delete(adminAttempts.keys().next().value);
    adminAttempts.set(key, attempt);
    if (++attempt.count > 10) return res.status(429).json({ error: 'rate_limited' });
    try {
      const user = adminAuth.authenticateUser(String(req.body?.email || ''), String(req.body?.password || ''));
      if (user.role !== 'admin') return res.status(403).json({ error: 'admin_required' });
      const session = adminAuth.createSession(user.id, 365 * 24 * 3600000);
      return res.json({ token: session.token, expiresAt: session.expiresAt, name: user.displayName || user.email });
    } catch { return res.status(403).json({ error: 'admin_required' }); }
  });
  app.get('/api/lab/admin/collection-jobs', admin, (req, res) => res.json(page(req, jobs, true)));
  app.post('/api/lab/admin/logout', admin, (req, res) => { adminAuth.deleteSession(req.labAdminToken); res.json({ verified: false }); });
  let active = false;
  let stopped = false;
  async function drain() {
    if (active || stopped) return;
    active = true;
    try {
      for (;;) {
        const job = jobs.find(job => job.status === 'queued');
        if (!job || stopped) break;
        job.status = 'running'; save();
        try {
          const result = await processLink(job.url);
          if (!result.entryId) throw new Error('No result');
          job.title = String(result.title || '').slice(0, 300);
          job.originalTitle = String(result.originalTitle || result.title || '').slice(0, 300);
          job.entryId = result.entryId;
          job.status = 'complete';
        } catch { job.status = 'failed'; }
        save();
      }
    } finally { active = false; }
  }
  app.post('/api/lab/collection-jobs', auth, (req, res) => clientAuth(req, res, () => {
    const id = String(req.body?.id || '');
    if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id)) return res.status(400).json({ error: 'invalid_request_id' });
    let url;
    try { url = validateUrl(String(req.body?.url || '')); } catch { return res.status(400).json({ error: 'invalid_url' }); }
    const existing = jobs.find(job => job.id === id);
    if (existing) {
      if (existing.clientId !== req.labClient || existing.url !== url) return res.status(409).json({ error: 'request_conflict' });
      return res.status(200).json(view(existing));
    }
    const now = Date.now();
    const recent = jobs.filter(job => job.createdAt > now - 86400000);
    if (recent.length >= 60 || recent.filter(job => job.owner === req.labOwner).length >= 20 || recent.filter(job => job.owner === req.labOwner && job.createdAt > now - 3600000).length >= 6 || jobs.filter(job => ['queued', 'running'].includes(job.status)).length >= 30) return res.status(429).json({ error: 'rate_limited' });
    const job = { id, url, owner: req.labOwner, clientId: req.labClient, status: 'queued', title: '', createdAt: now };
    jobs.push(job);
    try { save(); } catch { jobs.pop(); return res.status(503).json({ error: 'journal_unavailable' }); }
    res.status(202).json(view(job));
    void drain().catch(() => { stopped = true; });
  }));
  app.get('/api/lab/collection-jobs/:id', auth, (req, res) => clientAuth(req, res, () => {
    const job = jobs.find(job => job.id === req.params.id && job.clientId === req.labClient);
    return job ? res.json(view(job)) : res.status(404).json({ error: 'not_found' });
  }));
  // Interrupted jobs are retried after restart, using existing collected entries and cached rewrites.
  void drain().catch(() => { stopped = true; });
  return { stop: () => { stopped = true; } };
}
module.exports = { mountLabCollection };

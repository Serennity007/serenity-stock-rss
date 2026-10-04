'use strict';

function mountLabModeration(app, { store, deleteEntry }) {
  app.get('/api/lab/entries/deleted', (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const ids = [...new Set(String(req.query?.ids || '').split(',').filter(Boolean))];
    if (ids.length > 100 || ids.some(id => id.length > 128)) return res.status(400).json({ error: 'invalid_ids' });
    return res.json({ deletedIds: ids.filter(id => store.isEntryDeleted(id)) });
  });
  app.post('/api/lab/admin/delete-entry', (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const token = String(req.get('authorization') || '').replace(/^Bearer /, '');
    const user = store.getUserBySessionToken(token);
    if (!user || user.role !== 'admin') return res.status(403).json({ error: 'admin_required' });
    const id = req.body?.entryId;
    if (typeof id !== 'string' || !id || id.length > 128) return res.status(400).json({ error: 'invalid_id' });
    try {
      const result = deleteEntry(id, { userId: user.id, reason: 'Obsidian administrator deletion' });
      if (!result) return res.status(404).json({ error: 'entry_not_found' });
      return res.json({ ok: true, entryId: result.id });
    } catch { return res.status(500).json({ error: 'delete_failed' }); }
  });
}
module.exports = { mountLabModeration };

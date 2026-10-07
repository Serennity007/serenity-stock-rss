// @vitest-environment jsdom
import { describe, expect, it, vi, beforeAll } from 'vitest';
import { webcrypto } from 'node:crypto';
import { initialState } from '../src/model';
import { deleteGroup, ensureGroup, migrateLibrary, moveSources, personalSources, renameGroup } from '../src/personal-library';
import { Subscriptions } from '../src/subscriptions';
import { baseDiscovery, catalogItems, catalogSnapshot, dedupeDiscovery, searchDiscovery } from '../src/discovery-library';
import { importUrl, readImportUrl } from '../src/import-source';
import { requestUrl } from 'obsidian';
import { parseFeed } from '../src/feeds';
beforeAll(() => { Object.defineProperty(window.crypto, 'subtle', { value: webcrypto.subtle, configurable: true }); });
describe('personal library migration and grouping', () => {
  const legacy = () => initialState({ settings: { markdownFolders: ['Inbox', 'Notes/one.md'], lastSource: '@group:科技 / AI' }, subscriptions: [{ id: 'local:a', name: 'Example', url: 'https://example.org/rss', group: '科技 / AI' }] });
  it('registers both source types and is idempotent', () => {
    const state = legacy(); expect(personalSources(state)).toHaveLength(3);
    const before = JSON.stringify(state); migrateLibrary(state); expect(JSON.stringify(state)).toBe(before);
    expect(state.settings.lastSource).toBe(`@group:${state.sourceMeta['local:a'].groupId}`);
    expect(initialState(JSON.parse(before))).toEqual(state);
  });
  it('renames by stable ID and preserves legacy OPML group mirrors', () => {
    const state = legacy(), id = state.sourceMeta['local:a'].groupId;
    renameGroup(state, id, '研究'); expect(state.settings.lastSource).toBe(`@group:${id}`); expect(state.subscriptions[0].group).toBe('研究');
    const podcasts = ensureGroup(state, '播客'); expect(renameGroup(state, id, 'Podcasts')).toBe(podcasts); expect(state.subscriptions[0].group).toBe('播客');
  });
  it('moves mixed sources together, deletes only the group, and never reassigns ungrouped items on reload', () => {
    const state = legacy(), id = ensureGroup(state, '一起读'), ids = personalSources(state).map(s => s.id);
    moveSources(state, ids, id); expect(personalSources(state).every(s => s.groupId === id)).toBe(true);
    deleteGroup(state, id); const loaded = initialState(state); expect(personalSources(loaded)).toHaveLength(3); expect(personalSources(loaded).every(s => s.groupId === '')).toBe(true);
    expect(loaded.settings.markdownFolders).toEqual(['Inbox', 'Notes/one.md']);
  });
  it('rejects future schema instead of silently resetting data', () => { expect(() => initialState({ libraryVersion: 2 })).toThrow(); });
  it('imports the bundled finance catalog without network requests or overwriting existing choices', async () => {
    const state = initialState(null), transport = vi.fn(), service = new Subscriptions(() => state, async () => {}, transport);
    const feeds = catalogItems(catalogSnapshot).map(f => ({ url: f.url!, name: f.name, group: f.group }));
    expect(feeds.length).toBeGreaterThan(10);
    expect(await service.import(feeds)).toBe(feeds.length); expect(personalSources(state)).toHaveLength(feeds.length);
    const first = state.subscriptions[0]; await service.edit(first.id, 'My name', '自定义');
    expect(await service.import(feeds)).toBe(0); expect(first.name).toBe('My name'); expect(first.group).toBe('自定义'); expect(transport).not.toHaveBeenCalled();
  });
});
describe('discovery catalog and online import', () => {
  it('searches metadata across the finance catalog and deduplicates URL fragments', () => {
    const items = baseDiscovery(); expect(searchDiscovery(items, 'CNBC').length).toBeGreaterThan(0); expect(searchDiscovery(items, '华尔街见闻').some(f => f.kind === 'cn')).toBe(true);
    const first = items.find(f => f.url)!; expect(dedupeDiscovery([first, { ...first, id: 'duplicate', url: `${first.url}#x` }])).toHaveLength(1);
    expect(catalogItems(catalogSnapshot).every(f => !f.recommended)).toBe(true);
  });
  it('recognizes GitHub file links without leaking credentials', () => {
    expect(importUrl('https://github.com/u/r/blob/main/feeds.opml')).toBe('https://raw.githubusercontent.com/u/r/main/feeds.opml');
    expect(() => importUrl('https://user:secret@example.org/a')).toThrow(); expect(() => importUrl('file:///tmp/a')).toThrow();
  });
  it('redacts transport errors and rejects oversized imports', async () => {
    vi.mocked(requestUrl).mockRejectedValueOnce(new Error('https://example.org/?token=private'));
    await expect(readImportUrl('https://example.org/a')).rejects.toThrow('无法读取链接');
    vi.mocked(requestUrl).mockResolvedValueOnce({ status: 200, text: 'x'.repeat(5 * 1024 * 1024 + 1) } as never);
    await expect(readImportUrl('https://example.org/a')).rejects.toThrow('5 MB');
  });
  it('reads real site and channel image metadata without inventing an image from an empty value', async () => {
    const result = await parseFeed('<rss><channel><title>A</title><link>https://publisher.example</link><image><url>/logo.png</url></image></channel></rss>', 'https://proxy.example/feed', document);
    expect(result.site).toBe('https://publisher.example/'); expect(result.image).toBe('https://publisher.example/logo.png');
    expect((await parseFeed('<rss><channel><title>A</title></channel></rss>', 'https://proxy.example/feed', document)).image).toBeUndefined();
  });
});

describe('failed subscription writes', () => {
  it('restores subscriptions and grouping after an import save failure, allowing a clean retry', async () => {
    const state = initialState(null), persist = vi.fn().mockRejectedValueOnce(new Error('disk full')).mockResolvedValue(undefined);
    const service = new Subscriptions(() => state, persist);
    const feeds = [{ url: 'https://example.org/rss', name: 'A', group: 'Test' }];
    await expect(service.import(feeds)).rejects.toThrow('disk full');
    expect(state.subscriptions).toEqual([]); expect(state.subscriptionGroups).toEqual([]); expect(state.sourceMeta).toEqual({});
    expect(await service.import(feeds)).toBe(1); expect(personalSources(state)).toHaveLength(1);
  });
});

describe('group aliases and catalog dedupe', () => {
  it('folds Podcasts into 播客 and keeps sources', () => {
    const state = initialState();
    state.subscriptionGroups = [{ id: 'a', name: '播客', order: 0 }, { id: 'b', name: 'Podcasts', order: 1 }];
    state.subscriptions = [{ id: 'local:p1', name: 'P1', url: 'https://example.org/p1', group: '播客', entries: [], updatedAt: 0, lastAttemptAt: 0, error: '' }, { id: 'local:p2', name: 'P2', url: 'https://example.org/p2', group: 'Podcasts', entries: [], updatedAt: 0, lastAttemptAt: 0, error: '' }];
    state.sourceMeta = { 'local:p1': { groupId: 'a', name: '', order: 0 }, 'local:p2': { groupId: 'b', name: '', order: 1 } };
    state.collapsedGroups = ['b']; state.settings.lastSource = '@group:b';
    migrateLibrary(state);
    expect(state.subscriptionGroups.map(g => g.name)).toEqual(['播客']);
    expect(personalSources(state).every(s => s.groupId === 'a')).toBe(true);
    expect(state.collapsedGroups).toEqual(['a']); expect(state.settings.lastSource).toBe('@group:a');
    expect(ensureGroup(state, 'podcast')).toBe('a');
  });
  it('renaming onto an existing group merges', () => {
    const state = initialState(); const a = ensureGroup(state, 'AI'), b = ensureGroup(state, '工具');
    state.subscriptions = [{ id: 'local:f1', name: 'F1', url: 'https://example.org/f1', group: '工具', entries: [], updatedAt: 0, lastAttemptAt: 0, error: '' }];
    state.sourceMeta = { 'local:f1': { groupId: b, name: '', order: 0 } };
    expect(renameGroup(state, b, 'ai')).toBe(a);
    expect(state.subscriptionGroups).toHaveLength(1); expect(personalSources(state)[0].groupId).toBe(a);
  });
  it('merges http/https feed variants and same-name same-site blogs', () => {
    const base = { description: '', group: '', language: '', kind: 'blogs' as const };
    const items = dedupeDiscovery([
      { ...base, id: '1', name: 'Blog One', url: 'https://blog.one.example/atom.xml', site: 'https://blog.one.example/', provenance: 'A' },
      { ...base, id: '2', name: 'Blog One', url: 'http://blog.one.example/atom.xml', site: 'https://blog.one.example/', provenance: 'B' },
      { ...base, id: '3', name: 'Blog Two', url: 'https://www.blog-two.example/feed', site: 'https://www.blog-two.example/', provenance: 'A' },
      { ...base, id: '4', name: 'Blog Two', url: 'https://feeds.feedburner.com/blog-two', site: 'https://www.blog-two.example/', provenance: 'B' },
      { ...base, id: 'k1', name: 'Kevin Blog', url: 'https://a.example/feed', site: 'https://a.example/', provenance: 'A' },
      { ...base, id: 'k2', name: 'Kevin Blog', url: 'https://b.example/feed', site: 'https://b.example/', provenance: 'B' },
    ]);
    expect(items.map(i => i.id)).toEqual(['1', '3', 'k1', 'k2']);
    expect(items[0].provenance).toBe('A · B');
  });
  it('the finance catalog has no duplicate feeds', () => {
    const all = baseDiscovery(); const keys = all.map(f => f.url ? new URL(f.url).href.replace(/^http:/, 'https:') : f.id);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

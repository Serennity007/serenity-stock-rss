import { describe, expect, it } from 'vitest';
import { initialState, type Entry } from '../src/model';
import { applyCuratedPicks, curatedChannels, curatedCommunityChannels, filterCuratedEntries, pickedSources } from '../src/curated-sources';
import { qiaomuChannelDivider, qiaomuDividers } from '../src/discovery';
const entry = (sourceId: string, origin?: Entry['origin']): Entry => ({ id: sourceId, sourceId, title: sourceId, ...(origin ? { origin } : {}) });
const sources = [
  { id: 'wechat-hidden', name: 'Hidden account', category: 'article', enabled: true },
  { id: 'disabled', name: 'Disabled blog', category: 'article', enabled: false },
  { id: 'community', name: 'Reader submissions', category: 'community', enabled: true },
];
describe('curated source picks', () => {
  it('distinguishes the default catalog from an explicit empty selection after reload', () => {
    expect(pickedSources(initialState(null))).toBeNull();
    const state = initialState({ settings: { pickedSourceIds: [] }, sources });
    expect([...pickedSources(initialState(JSON.parse(JSON.stringify(state))))!]).toEqual([]);
    expect(curatedChannels(state)).toEqual([]);
    expect(filterCuratedEntries(state, [entry('disabled')])).toEqual([]);
  });
  it('makes selected hidden and disabled channels available without changing server flags', () => {
    const state = initialState({ sources, settings: { pickedSourceIds: ['wechat-hidden', 'disabled', 'community'] } });
    expect(curatedChannels(state).map(source => source.id)).toEqual(['wechat-hidden', 'disabled']);
    expect(curatedCommunityChannels(state).map(source => source.id)).toEqual(['community']);
    expect(state.sources.find(source => source.id === 'disabled')!.enabled).toBe(false);
  });
  it('retains the original editorial channel rules until a selection is saved', () => {
    expect(curatedChannels(initialState({ sources }))).toEqual([]);
    expect(curatedCommunityChannels(initialState({ sources })).map(source => source.id)).toEqual(['community']);
  });
  it('filters every incoming page and survives server catalog replacement', () => {
    const state = initialState({ settings: { pickedSourceIds: ['keep'] } });
    const pages = [[entry('keep'), entry('drop')], [entry('new'), { ...entry('keep'), id: 'keep-2' }]];
    expect(pages.flatMap(page => filterCuratedEntries(state, page)).map(item => item.id)).toEqual(['keep', 'keep-2']);
    state.sources = [{ id: 'new', name: 'New source', enabled: true }];
    expect(state.settings.pickedSourceIds).toEqual(['keep']);
    expect(filterCuratedEntries(state, pages[0]).map(item => item.id)).toEqual(['keep']);
  });
  it('preserves personal feeds, vault notes and followed podcasts even when no curated sources are picked', () => {
    const state = initialState({ settings: { pickedSourceIds: [], followedPodcasts: ['followed'] } });
    const independent = [entry('rss', 'local'), entry('note', 'vault'), entry('followed'), { ...entry('show'), podcastSlug: 'show' }];
    expect(filterCuratedEntries(state, [...independent, entry('curated', 'qiaomu'), entry('legacy')])).toEqual(independent);
  });
  it('prunes cached channel entries and the open bundle while preserving favorites and subscriptions', () => {
    const bundle = { entry: entry('drop'), rewrite: null, translation: null, fetchedAt: 1 };
    const state = initialState({ settings: { pickedSourceIds: ['keep'] }, entries: [entry('keep'), entry('drop')], favorites: { drop: bundle },
      subscriptions: [{ id: 'rss', name: 'RSS', url: 'https://example.com/feed', entries: [entry('rss', 'local')] }],
      channelStates: { channel: { entries: [entry('drop'), entry('rss', 'local')], bundle, mode: 'original', filter: 'all', query: '', unread: [], cursor: '', hasMore: false, listTop: 0, readerTop: 0, articlePending: true } } });
    applyCuratedPicks(state);
    expect(state.entries.map(item => item.id)).toEqual(['keep']);
    expect(state.channelStates.channel.entries.map(item => item.id)).toEqual(['rss']);
    expect(state.channelStates.channel.bundle).toBeNull();
    expect(state.channelStates.channel.articlePending).toBe(false);
    expect(state.favorites.drop).toEqual(bundle);
    expect(state.subscriptions[0].entries).toHaveLength(1);
    state.settings.pickedSourceIds = null;
    expect(filterCuratedEntries(state, [entry('drop')])).toHaveLength(1);
  });
  it('assigns overlapping website and content types to exactly four groups', () => {
    expect(qiaomuDividers).toEqual(['微信公众号', '播客', 'Newsletter', '博客与资讯']);
    const catalog = [
      { id: 'wechat-x', name: 'Newsletter account', category: 'podcast' },
      { id: 'show', name: 'Newsletter show', category: 'podcast', siteUrl: 'https://show.substack.com' },
      { id: 'mail', name: 'Mail', siteUrl: 'https://foo.beehiiv.com' },
      { id: 'news', name: 'News', category: 'news' },
      { id: 'video', name: 'Video', siteUrl: 'https://youtube.com/@video' },
      { id: 'community', name: 'Community', category: 'community' },
    ];
    expect(catalog.map(qiaomuChannelDivider)).toEqual(['微信公众号', '播客', 'Newsletter', '博客与资讯', '博客与资讯', '博客与资讯']);
  });
});

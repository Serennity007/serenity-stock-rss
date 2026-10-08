import { describe, expect, it } from 'vitest';
import bundled from '../src/data/finance-feeds.json';
import { baseDiscovery, catalogItems, catalogNewer, catalogSchema, inCollection, DISCOVER_COLLECTIONS, type CatalogData } from '../src/discovery-library';
import { collectionLabel, kindLabel } from '../src/i18n';

const data = catalogSchema.parse(JSON.parse(JSON.stringify(bundled)) as unknown) as CatalogData;
const items = baseDiscovery(data);

describe('language collections', () => {
  it('routes every bundled feed into a real tab', () => {
    for (const feed of data.feeds) expect(DISCOVER_COLLECTIONS).toContain(feed.kind);
    expect(items.filter(i => i.kind === 'more').length).toBe(0);
  });

  it('gives the Japanese and Spanish tabs room to choose from', () => {
    expect(items.filter(i => inCollection(i, 'jp')).length).toBeGreaterThanOrEqual(4);
    expect(items.filter(i => inCollection(i, 'es')).length).toBeGreaterThanOrEqual(4);
  });

  it('labels a source in its own language instead of forcing 英文', () => {
    const labels = new Set(items.map(i => i.language));
    for (const label of ['中文', 'English', '日本語', 'Español']) expect(labels.has(label)).toBe(true);
  });

  it('keeps catalog categories in the source language', () => {
    const groups = new Set(items.filter(i => i.kind === 'jp' || i.kind === 'es').map(i => i.group));
    expect(groups.has('日本市場')).toBe(true);
    expect(groups.has('Economía')).toBe(true);
  });

  it('translates the new tabs in all shipped locales', () => {
    for (const collection of ['jp', 'es']) expect(collectionLabel(collection)).not.toBe(collection);
    for (const kind of ['jp', 'es']) expect(kindLabel(kind)).not.toBe(kind);
  });
});

describe('catalogNewer', () => {
  const at = (generated_at: string, revision?: number): CatalogData => ({ feeds: [], generated_at, ...(revision ? { revision } : {}) });

  it('prefers a later date', () => {
    expect(catalogNewer(at('2026-10-08'), at('2026-10-07'))).toBe(true);
    expect(catalogNewer(at('2026-10-07'), at('2026-10-08'))).toBe(false);
  });

  it('breaks a same-day tie by revision, so a local override is not silently dropped', () => {
    expect(catalogNewer(at('2026-10-08', 5), at('2026-10-08', 4))).toBe(true);
    expect(catalogNewer(at('2026-10-08', 4), at('2026-10-08', 5))).toBe(false);
    expect(catalogNewer(at('2026-10-08', 4), at('2026-10-08', 4))).toBe(false);
  });

  it('passes every bundled feed through unchanged', () => {
    expect(catalogItems(data).length).toBe(data.feeds.length);
  });
});

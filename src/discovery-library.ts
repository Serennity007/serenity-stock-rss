import { z } from 'zod';
import catalogJson from './data/finance-feeds.json';
import { feedUrl } from './feeds';
import { t } from './i18n';
export type DiscoverKind = 'us' | 'cn' | 'blogs' | 'more';
export interface DiscoverSource { id: string; name: string; url?: string; site?: string; image?: string; kind: DiscoverKind; description: string; group: string; language: string; provenance: string; recommended?: boolean; tags?: string[] }
const feedSchema = z.object({ id: z.string(), title: z.string(), feed_url: z.string(), site_url: z.string().optional(), description: z.string().default(''), category: z.string(), kind: z.string(), language: z.string() });
export const catalogSchema = z.object({ generated_at: z.string().optional(), revision: z.number().optional(), feeds: z.array(feedSchema).max(5000) });
export type CatalogData = z.infer<typeof catalogSchema>;
export const catalogSnapshot: CatalogData = catalogSchema.parse(catalogJson);
export const catalogDate = (data: CatalogData) => data.generated_at || String(data.revision || '');
export const catalogSourceLabel = () => catalogJson.source;
export function catalogItems(data: CatalogData): DiscoverSource[] {
  return data.feeds.flatMap(feed => { try { return [{ id: feed.id, name: feed.title, url: feedUrl(feed.feed_url), site: feed.site_url, description: feed.description, group: feed.category, language: feed.language === 'zh' ? '中文' : '英文', provenance: t('discovery.catalogProvenance'), kind: feed.kind === 'us' || feed.kind === 'cn' ? feed.kind : feed.kind === 'blogs' ? 'blogs' as const : 'more' as const }]; } catch { return []; } });
}
export type DiscoverCollection = 'us' | 'cn' | 'blogs';
export function inCollection(item: DiscoverSource, collection: DiscoverCollection) { return collection === 'blogs' ? item.kind === 'blogs' || item.kind === 'more' : item.kind === collection; }
export function baseDiscovery(data = catalogSnapshot): DiscoverSource[] {
  return dedupeDiscovery(catalogItems(data));
}
const siteKey = (value?: string) => { try { const url = new URL(value!); return `${url.hostname.replace(/^www\./, '')}${url.pathname.replace(/\/+$/, '')}${url.search}`; } catch { return ''; } };
const nameKey = (value: string) => value.trim().toLocaleLowerCase().replace(/\s+/g, ' ');
/** Keys that identify the same source across catalogs: feed URL (scheme-insensitive) and name + site. */
function sourceKeys(item: DiscoverSource) {
  const keys = [], name = nameKey(item.name);
  if (item.url) keys.push(`feed:${siteKey(feedUrl(item.url))}`); else keys.push(`id:${item.id}`);
  const site = siteKey(item.site); if (name && site) keys.push(`site:${name}|${site}`);
  return keys;
}
export function dedupeDiscovery(items: DiscoverSource[]) {
  const result = new Map<string, DiscoverSource>(), index = new Map<string, string>();
  for (const item of items) {
    let keys: string[]; try { keys = sourceKeys(item); } catch { continue; }
    const match = keys.map(key => index.get(key)).find(key => key && result.has(key));
    const previous = match && result.get(match);
    if (previous && match) {
      result.set(match, { ...previous, tags: [...new Set([...(previous.tags || []), ...(item.tags || [])])], provenance: previous.provenance.includes(item.provenance) ? previous.provenance : `${previous.provenance} · ${item.provenance}` });
      for (const key of keys) if (!index.has(key)) index.set(key, match);
      continue;
    }
    result.set(keys[0], item); for (const key of keys) if (!index.has(key)) index.set(key, keys[0]);
  }
  return [...result.values()];
}
export function searchDiscovery(items: DiscoverSource[], query: string) {
  const words = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return items.filter(f => words.every(w => `${f.name} ${f.description} ${f.url || ''} ${f.site || ''} ${f.group} ${(f.tags || []).join(' ')}`.toLocaleLowerCase().includes(w)))
    .sort((a, b) => Number(b.name.toLocaleLowerCase().includes(query.toLocaleLowerCase())) - Number(a.name.toLocaleLowerCase().includes(query.toLocaleLowerCase())));
}

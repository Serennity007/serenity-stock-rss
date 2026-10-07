import catalog from './data/finance-feeds.json';

export const categories = ['全部', '美股市场', 'A股与中文财经', '财经博客'] as const;
export type DiscoveryCollection = 'us' | 'cn' | 'blogs';
export interface DiscoveryFeed {
  id: string;
  name: string;
  description: string;
  category: typeof categories[number];
  language: '中文' | '英文';
  icon: string;
  url: string;
  site?: string;
  tags?: string[];
}

const icons: Record<string, string> = { '美股市场': 'dollar-sign', 'A股与中文财经': 'trending-up', '经济与宏观': 'landmark', '财经博客': 'notebook-pen' };
// Curated metadata only. Opening/searching the catalog never requests these feeds.
export const discoveryFeeds: DiscoveryFeed[] = catalog.feeds.map(feed => ({
  id: feed.id, name: feed.title, description: feed.description,
  category: feed.category as typeof categories[number],
  language: feed.language === 'zh' ? '中文' : '英文',
  icon: icons[feed.category] || 'rss', url: feed.feed_url, site: feed.site_url,
}));
export const financeCatalogSource = catalog.source;
export const financeCatalogDate = catalog.generated_at;

export function filterDiscovery(query: string, category: string): DiscoveryFeed[] {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return discoveryFeeds.filter(feed => (category === '全部' || feed.category === category)
    && terms.every(term => `${feed.name} ${feed.description} ${feed.category} ${feed.language} RSS Atom ${feed.site ?? ''} ${feed.url}`.toLocaleLowerCase().includes(term)));
}

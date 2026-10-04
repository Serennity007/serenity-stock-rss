// Where a submitted link comes from, read from its address. Submitters never pick a category: it would be one more thing to
// get wrong, and the address already says it.
export type LinkPlatform = 'youtube' | 'bilibili' | 'wechat' | 'web';
export const PLATFORMS: LinkPlatform[] = ['youtube', 'bilibili', 'wechat', 'web'];

export function platformOf(link: string | null | undefined): LinkPlatform {
  let host = '';
  try { host = new URL(link || '').hostname.toLowerCase(); } catch { return 'web'; }
  const is = (domain: string) => host === domain || host.endsWith(`.${domain}`);
  if (is('youtube.com') || is('youtu.be')) return 'youtube';
  if (is('bilibili.com') || is('b23.tv')) return 'bilibili';
  if (host === 'mp.weixin.qq.com') return 'wechat';
  return 'web';
}

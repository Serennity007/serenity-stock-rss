// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { requestUrl } from 'obsidian';
import { initialState } from '../src/model';
import { Subscriptions } from '../src/subscriptions';
import { t } from '../src/i18n';

const RSS = '<?xml version="1.0"?><rss version="2.0"><channel><title>QbitAI</title><link>https://www.qbitai.com</link><item><title>Article</title><link>https://www.qbitai.com/1</link></item></channel></rss>';

beforeEach(() => { vi.mocked(requestUrl).mockReset(); });

describe('default feed transport', () => {
  it('retries a 403 once with a browser User-Agent and parses the feed', async () => {
    vi.mocked(requestUrl)
      .mockResolvedValueOnce({ status: 403, text: '' } as never)
      .mockResolvedValueOnce({ status: 200, text: RSS } as never);
    const state = initialState(null);
    const service = new Subscriptions(() => state, async () => {});
    const feed = await service.add('https://www.qbitai.com/feed', '中文财经', document);
    expect(feed.name).toBe('QbitAI');
    expect(feed.entries).toHaveLength(1);
    expect(requestUrl).toHaveBeenCalledTimes(2);
    const retry = vi.mocked(requestUrl).mock.calls[1][0] as { headers?: Record<string, string> };
    expect(retry.headers?.['User-Agent']).toContain('Mozilla/5.0');
  });
  it('does not retry non-403 responses and reports a persistent 403 as unavailable', async () => {
    vi.mocked(requestUrl).mockResolvedValue({ status: 403, text: '' } as never);
    const state = initialState(null);
    const service = new Subscriptions(() => state, async () => {});
    await expect(service.add('https://www.qbitai.com/feed', '', document)).rejects.toThrow(t('error.feedUnavailable', { status: 403 }));
    expect(requestUrl).toHaveBeenCalledTimes(2);

    vi.mocked(requestUrl).mockReset().mockResolvedValueOnce({ status: 404, text: '' } as never);
    await expect(service.add('https://example.org/missing', '', document)).rejects.toThrow(t('error.feedUnavailable', { status: 404 }));
    expect(requestUrl).toHaveBeenCalledTimes(1);
  });
});

// @vitest-environment jsdom
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { initialState } from '../src/model';
import type QiaomuRssPlugin from '../src/main';
vi.mock('obsidian', async () => ({
  ...await vi.importActual<Record<string, unknown>>('obsidian'),
  Modal: class {
    modalEl = document.createElement('div');
    contentEl = document.createElement('div');
    constructor() { this.modalEl.append(this.contentEl); }
    setTitle() {}
    close() {}
  },
  Notice: class {},
}));
import { CuratedSourcePicker } from '../src/curated-source-picker';
beforeAll(() => {
  Object.assign(HTMLElement.prototype, {
    addClass(name: string) { this.classList.add(name); },
    addClasses(names: string[]) { this.classList.add(...names); },
    empty() { this.replaceChildren(); },
    setText(text: string) { this.textContent = text; },
    createEl(tag: string, options: { cls?: string; text?: string; type?: string; attr?: Record<string, string> } = {}) {
      const el = document.createElement(tag);
      if (options.cls) el.className = options.cls;
      if (options.text) el.textContent = options.text;
      if (options.type) el.setAttribute('type', options.type);
      for (const [key, value] of Object.entries(options.attr ?? {})) el.setAttribute(key, String(value));
      this.append(el); return el;
    },
    createDiv(options: string | { cls?: string; text?: string; attr?: Record<string, string> }) {
      return this.createEl('div', typeof options === 'string' ? { cls: options } : options);
    },
  });
});
const sources = [
  { id: 'news', name: 'News', category: 'news' },
  { id: 'wechat-hidden', name: 'Account', category: 'article' },
  { id: 'mail', name: 'Newsletter', siteUrl: 'https://example.substack.com' },
  { id: 'podcast', name: 'Show', category: 'podcast', enabled: false },
  { id: 'blog', name: 'Blog', category: 'article' },
];
function plugin(ids: string[] | null = null, fail = false) {
  return { app: {}, state: initialState({ sources, settings: { pickedSourceIds: ids } }),
    api: () => ({ sources: () => fail ? Promise.reject(new Error('offline')) : Promise.resolve({ sources: [...sources, sources[0]] }) }),
    saveCuratedSources: vi.fn().mockResolvedValue(undefined),
  } as unknown as QiaomuRssPlugin;
}
function button(modal: CuratedSourcePicker, name: string) {
  return [...modal.contentEl.querySelectorAll('button')].find(item => item.textContent === name)!;
}
describe('curated picker interaction', () => {
  it('renders one row per source and exactly four consecutive group headings', async () => {
    const modal = new CuratedSourcePicker(plugin()); await modal.onOpen();
    expect(modal.contentEl.querySelectorAll('input[type=checkbox]')).toHaveLength(5);
    expect([...modal.contentEl.querySelectorAll('.qrs-pick-group')].map(el => el.textContent)).toEqual(['微信公众号', '播客', 'Newsletter', '博客与资讯']);
    expect([...modal.contentEl.querySelectorAll<HTMLInputElement>('input[type=checkbox]')].every(el => el.checked)).toBe(true);
  });
  it('clears only the chosen category, saves the other selections and restores with null', async () => {
    const p = plugin(); const modal = new CuratedSourcePicker(p); await modal.onOpen();
    button(modal, '播客').click(); button(modal, '清空所列').click();
    button(modal, '保存筛选').click(); await vi.waitFor(() => expect(p.saveCuratedSources).toHaveBeenCalled());
    expect(vi.mocked(p.saveCuratedSources).mock.calls[0][0]).toEqual(['news', 'wechat-hidden', 'mail', 'blog']);
    const restore = new CuratedSourcePicker(p); await restore.onOpen(); button(restore, '恢复全部').click();
    await vi.waitFor(() => expect(p.saveCuratedSources).toHaveBeenLastCalledWith(null, sources));
  });
  it('uses the local catalog offline and preserves an intentionally empty selection', async () => {
    const p = plugin([], true); const modal = new CuratedSourcePicker(p); await modal.onOpen();
    expect(modal.contentEl.querySelectorAll('input[type=checkbox]')).toHaveLength(5);
    expect([...modal.contentEl.querySelectorAll<HTMLInputElement>('input[type=checkbox]')].every(el => !el.checked)).toBe(true);
    button(modal, '保存筛选').click(); await vi.waitFor(() => expect(p.saveCuratedSources).toHaveBeenCalledWith([], sources));
  });
  it('keeps unavailable previously selected ids when saving a partial catalog', async () => {
    const p = plugin(['missing', 'mail']); const modal = new CuratedSourcePicker(p); await modal.onOpen();
    button(modal, '保存筛选').click(); await vi.waitFor(() => expect(p.saveCuratedSources).toHaveBeenCalledWith(['missing', 'mail'], sources));
  });
});

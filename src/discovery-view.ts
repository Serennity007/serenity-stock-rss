import { Component, Modal, Notice } from 'obsidian';
import type StocksRssPlugin from './main';
import { addSearchClear } from './search-clear';
import { baseDiscovery, catalogDate, catalogSchema, catalogSnapshot, catalogSourceLabel, dedupeDiscovery, inCollection, searchDiscovery, type DiscoverCollection, type DiscoverSource, type CatalogData } from './discovery-library';
import { collectionLabel, kindLabel, t } from './i18n';
import { SourceIcons } from './source-icons';
import { groupSelect, OpmlImport } from './subscription-ui';
import { readImportUrl } from './import-source';
import { parseFeed } from './feeds';
import { safeUrl, type Entry } from './model';

class SourcePreview extends Modal {
  private generation = 0;
  constructor(private plugin: StocksRssPlugin, private source: DiscoverSource, private done: () => void, private xml?: string) { super(plugin.app); }
  onClose() { this.generation++; this.contentEl.empty(); }
  onOpen() {
    const source = this.source, version = ++this.generation; this.modalEl.addClass('qrs-modal', 'qrs-preview-modal');
    const head = this.contentEl.createDiv('qrs-preview-head'), icons = new SourceIcons(this.plugin); this.plugin.addChild(icons);
    const renderHead = () => { icons.clear(); head.empty(); icons.render(head, source); const copy = head.createDiv('qrs-preview-copy'); copy.createEl('h2', { text: source.name || t('preview.title') }); copy.createDiv({ cls: 'qrs-preview-meta', text: [kindLabel(source.kind), source.recommended ? t('discovery.editorPick') : source.provenance].filter(Boolean).join(' · ') }); };
    renderHead(); this.onClose = () => { this.generation++; this.plugin.removeChild(icons); this.contentEl.empty(); };
    if (source.description) this.contentEl.createEl('p', { cls: 'qrs-preview-description', text: source.description });
    const section = this.contentEl.createDiv('qrs-preview-section'); section.createDiv({ cls: 'qrs-preview-label', text: t('preview.recent') });
    const status = section.createDiv({ cls: 'qrs-preview-status', attr: { role: 'status' } }); status.setText(t('common.loading'));
    const recent = section.createDiv('qrs-source-preview');
    for (let i = 0; i < 3; i++) recent.createDiv('qrs-preview-entry is-loading').createDiv('qrs-skeleton');
    const footer = this.contentEl.createDiv('qrs-preview-footer');
    let groupId = this.plugin.state.subscriptionGroups.find(g => g.name === source.group)?.id || '';
    let groupChanged = false;
    const picker = groupSelect(footer, this.plugin, groupId, id => { groupId = id === '@default' ? '' : id; groupChanged = id !== '@default'; });
    if (!groupId && source.group) { picker.createEl('option', { value: '@default', text: source.group }); picker.value = '@default'; }
    const existing = this.plugin.state.subscriptions.find(f => f.url === source.url)?.id;
    if (existing) picker.parentElement?.addClass('qrs-hidden');
    const actions = footer.createDiv('qrs-preview-actions');
    actions.createEl('button', { text: t('common.cancel') }).onclick = () => this.close();
    const subscribe = actions.createEl('button', { text: existing ? t('common.read') : t('preview.subscribe'), cls: 'mod-cta' }); subscribe.disabled = true;
    const load = async () => {
      try {
        const result = this.xml ? await parseFeed(this.xml, source.url!, this.contentEl.ownerDocument) : await this.plugin.subscriptions.fetch(source.url!, this.contentEl.ownerDocument);
        if (version !== this.generation) return;
        const entries: Entry[] = result.entries; source.name = result.name; source.site = result.site; source.image = result.image;
        renderHead(); status.setText(entries.length ? '' : t('preview.empty')); recent.empty();
        for (const entry of entries.slice(0, 3)) {
          const url = safeUrl(entry.link || ''), item = url ? recent.createEl('a', { cls: 'qrs-preview-entry', href: url, attr: { target: '_blank', rel: 'noopener noreferrer' } }) : recent.createDiv('qrs-preview-entry');
          item.createDiv({ cls: 'qrs-preview-entry-title', text: entry.title });
          const date = entry.publishedTs ? new Date(entry.publishedTs).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' }) : '';
          if (date) item.createDiv({ cls: 'qrs-preview-entry-meta', text: date });
        }
        subscribe.disabled = false;
      } catch (e) { if (version === this.generation) { status.setText(e instanceof Error ? e.message : t('preview.failed')); recent.empty(); recent.createEl('button', { text: t('common.retry') }).onclick = () => { recent.empty(); status.setText(t('common.loading')); void load(); }; subscribe.disabled = !existing; } }
    };
    void load();
    subscribe.onclick = () => { if (existing) { this.close(); void this.plugin.openPersonalSource(existing); return; } subscribe.disabled = true; void (async () => {
      const group = this.plugin.state.subscriptionGroups.find(g => g.id === groupId)?.name || (groupChanged ? '' : source.group);
      await this.plugin.subscriptions.add(source.url!, group, this.contentEl.ownerDocument);
      new Notice(t('notice.subscribed')); this.done(); this.close();
    })().catch(e => { if (version === this.generation) { status.setText(e instanceof Error ? e.message : t('notice.subscribeFailed')); subscribe.disabled = false; } }); };
  }
}

export class DiscoveryPanel extends Component {
  private icons: SourceIcons;
  private search!: HTMLInputElement;
  private cards!: HTMLElement;
  private status!: HTMLElement;
  private count!: HTMLElement;
  private heading!: HTMLElement;
  private more!: HTMLButtonElement;
  private back!: HTMLButtonElement;
  private note!: HTMLElement;
  private collection: DiscoverCollection | 'home' = 'home';
  private limit = 24;
  private query = '';
  private data: CatalogData = catalogSnapshot;
  private local = baseDiscovery();
  private serial = 0;
  private timer?: number;
  private closed = false;
  constructor(private contentEl: HTMLElement, private plugin: StocksRssPlugin, _embedded = false) { super(); this.icons = new SourceIcons(plugin); }
  focusSearch() { this.search?.focus({ preventScroll: true }); }
  private get cachePath() { return `${this.plugin.app.vault.configDir}/plugins/${this.plugin.manifest.id}/finance-catalog.json`; }
  onload() {
    this.closed = false; this.addChild(this.icons); this.contentEl.empty(); this.contentEl.addClass('qrs-discovery');
    const page = this.contentEl.createDiv('qrs-discovery-page');
    const form = page.createEl('form', { cls: 'qrs-discover-form' }), id = crypto.randomUUID();
    form.createEl('label', { cls: 'qrs-visually-hidden', text: t('discovery.searchLabel'), attr: { for: id } });
    this.search = form.createEl('input', { type: 'search', cls: 'qrs-discovery-search', placeholder: t('discovery.searchPlaceholder'), attr: { id } }); addSearchClear(this.search);
    form.createEl('button', { text: t('discovery.search'), type: 'submit' });
    this.search.oninput = () => { this.query = this.search.value; this.limit = 24; this.refresh(); };
    form.onsubmit = event => { event.preventDefault(); this.query = this.search.value.trim(); if (/^https?:\/\//i.test(this.query)) void this.previewLink(this.query); else this.refresh(); };
    const categories = page.createDiv('qrs-discovery-collections');
    categories.setAttribute('role', 'group'); categories.setAttribute('aria-label', t('discovery.categories'));
    for (const [kind, label] of [['home', t('discovery.home')], ...(['us', 'cn', 'blogs'] as DiscoverCollection[]).map(c => [c, collectionLabel(c)] as [DiscoverCollection, string])] as ['home' | DiscoverCollection, string][]) {
      const button = categories.createEl('button', { text: label, attr: { 'data-collection': kind, 'aria-pressed': 'false' } });
      button.onclick = () => { this.collection = kind; this.limit = 24; this.refresh(); };
    }
    this.status = page.createDiv({ cls: 'qrs-discovery-status', attr: { role: 'status' } });
    const section = page.createDiv('qrs-discovery-section'), titles = section.createDiv('qrs-discovery-titles');
    this.heading = titles.createEl('h2'); this.count = titles.createSpan('qrs-discovery-count');
    this.back = section.createEl('button', { text: t('discovery.back') }); this.back.onclick = () => { this.collection = 'home'; this.query = ''; this.search.value = ''; this.limit = 24; this.refresh(); };
    this.cards = page.createDiv('qrs-discovery-grid');
    this.more = page.createEl('button', { cls: 'qrs-discovery-more', text: t('discovery.more') }); this.more.onclick = () => { this.limit += 24; this.refresh(); };
    const footer = page.createDiv('qrs-discovery-actions'); footer.createSpan({ text: t('discovery.haveList') });
    footer.createEl('button', { text: t('library.importOpml'), cls: 'qrs-link-button' }).onclick = () => new OpmlImport(this.plugin).open();
    this.note = page.createDiv('qrs-discovery-note');
    this.refresh();
    // A newer catalog dropped into the plugin folder (finance-catalog.json) replaces the bundled snapshot.
    void this.plugin.app.vault.adapter.read(this.cachePath).then(text => { const parsed = catalogSchema.safeParse(JSON.parse(text) as unknown); if (!this.closed && parsed.success && parsed.data.feeds.length && catalogDate(parsed.data) > catalogDate(this.data)) { this.data = parsed.data; this.local = baseDiscovery(this.data); this.refresh(); } }).catch(() => undefined);
  }
  private async previewLink(url: string) {
    const serial = ++this.serial; this.status.setText(t('discovery.identifying'));
    try { const result = await readImportUrl(url); if (this.closed || serial !== this.serial) return;
      if (/<opml[\s>]/i.test(result.text)) { new OpmlImport(this.plugin, () => this.refresh(), result.text).open(); this.status.setText(t('discovery.opmlRecognized')); return; }
      const parsed = await parseFeed(result.text, result.url, this.contentEl.ownerDocument); if (this.closed || serial !== this.serial) return;
      new SourcePreview(this.plugin, { id: result.url, name: parsed.name, url: result.url, site: parsed.site, image: parsed.image, kind: 'more', description: '', group: '', language: '', provenance: t('discovery.manualAdd') }, () => this.refresh(), result.text).open(); this.status.setText(t('discovery.rssRecognized'));
    } catch (e) { if (!this.closed && serial === this.serial) this.status.setText(e instanceof Error ? e.message : t('discovery.readFailed')); }
  }
  refresh() {
    if (this.closed || !this.cards) return;
    const doc = this.contentEl.ownerDocument, focused = this.cards.contains(doc.activeElement) ? (doc.activeElement as HTMLElement)?.closest<HTMLElement>('[data-feed]')?.dataset.feed : undefined;
    this.icons.clear(); this.cards.empty(); const query = this.query.trim(), home = !query && this.collection === 'home';
    for (const button of this.contentEl.querySelectorAll<HTMLButtonElement>('[data-collection]')) button.setAttribute('aria-pressed', String(button.dataset.collection === this.collection));
    this.back.toggleClass('qrs-hidden', home);
    this.heading.setText(home ? t('discovery.featured') : query ? t('discovery.searchResults') : collectionLabel(this.collection));
    let items = dedupeDiscovery(this.local);
    if (this.collection !== 'home') { const collection = this.collection; items = items.filter(f => inCollection(f, collection)); }
    if (query) items = searchDiscovery(items, query);
    if (home) {
      const us = items.filter(f => f.kind === 'us'), cn = items.filter(f => f.kind === 'cn'), blogs = items.filter(f => f.kind === 'blogs');
      items = [us[0], cn[0], blogs[0], us[1], cn[1], blogs[1], us[2], cn[2]].filter((f): f is DiscoverSource => !!f);
    }
    this.count.setText(home ? '' : query ? t('discovery.matches', { n: items.length }) : t('discovery.sources', { n: items.length }));
    this.note.empty(); this.note.toggleClass('qrs-hidden', this.collection !== 'blogs' || !!query);
    if (this.collection === 'blogs' && !query) {
      this.note.appendText(t('discovery.catalogNote'));
      this.note.createEl('a', { text: catalogSourceLabel(), attr: { target: '_blank', rel: 'noopener noreferrer' } });
      this.note.appendText(` · ${catalogDate(this.data) || t('discovery.dateUnknown')}`);
    }
    for (const source of items.slice(0, this.limit)) this.renderCard(source);
    if (!items.length) this.cards.createDiv({ cls: 'qrs-empty', text: /^https?:/i.test(query) ? t('discovery.pressEnterLink') : t('discovery.noMatch') });
    this.more.toggleClass('qrs-hidden', items.length <= this.limit); this.more.setText(t('discovery.moreCount', { n: Math.max(0, items.length - this.limit) }));
    if (focused) this.cards.querySelector<HTMLElement>(`[data-feed="${CSS.escape(focused)}"] button`)?.focus({ preventScroll: true });
  }
  private subscribed(source: DiscoverSource) {
    return this.plugin.state.subscriptions.find(f => f.url === source.url)?.id || '';
  }
  private renderCard(source: DiscoverSource) {
    const card = this.cards.createEl('article', { cls: 'qrs-discovery-card', attr: { 'data-feed': source.id } });
    const header = card.createDiv('qrs-discovery-card-heading'); this.icons.render(header, source);
    const title = header.createEl('h2'); title.createEl('button', { text: source.name, cls: 'qrs-source-name' }).onclick = () => new SourcePreview(this.plugin, source, () => this.refresh()).open();
    card.createDiv({ cls: 'qrs-discovery-meta', text: `${kindLabel(source.kind)} · ${source.recommended ? t('discovery.editorPick') : source.provenance}` });
    if (source.description) card.createEl('p', { cls: 'qrs-discovery-description', text: source.description });
    const footer = card.createDiv('qrs-discovery-card-footer'); const subscribed = this.subscribed(source);
    if (subscribed) { footer.createSpan({ text: t('discovery.subscribed') }); footer.createEl('button', { text: t('common.read') }).onclick = () => { void this.plugin.openPersonalSource(subscribed); }; }
    else footer.createEl('button', { text: t('common.subscribe') }).onclick = () => new SourcePreview(this.plugin, source, () => this.refresh()).open();
  }
  onunload() { this.closed = true; this.serial++; window.clearTimeout(this.timer); }
}

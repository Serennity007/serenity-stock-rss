import { todayLabel } from './daily-note';
import { groupsInOrder, personalSources } from './personal-library';
import { SourceIcons } from './source-icons';
import { addSearchClear } from './search-clear';
import { ChannelPicker, channelMark, type ChannelChoice } from './channel-picker';
import { Component, MarkdownRenderer, ItemView, Menu, Notice, Platform, setIcon, TFile, type WorkspaceLeaf } from 'obsidian';
import type StocksRssPlugin from './main';
import { vaultSourceId } from './vault-source';
import { enableImageDrag, prepareMarkdownImageDrags } from './image-drag';
import { SelectionCapture } from './selection';
import { readingFonts, selectableFonts, fontFamily } from './fonts';
import { articleFragment } from './content';
import { saveArticlePdf } from './desktop-export';
import { saveArticleToVault } from './vault-export';
import { exportBaseName } from './article-export';
import { NoteLocationModal } from './note-location';
import { cleanExcerpt } from './excerpt';
import { AudioDock, pauseVideos, renderMedia, stopMedia, videoEmbedUrl } from './media';
import { articleNoteKey, readingFontSchema, readingThemeSchema, safeUrl, titleOf, type ChannelState, type Bundle, type Entry, type Mode } from './model';
import { relativeTime, t } from './i18n';
import { fontName } from './fonts';
export const VIEW_TYPE = 'qiaomu-ai-rss-reader';
type Filter = 'all' | 'unread' | 'favorites';
export class ReaderView extends ItemView {
  private channelPicker?: ChannelPicker;
  private restoreObserver?: ResizeObserver;
  private pendingScroll?: { listTop: number; readerTop: number };
  private checkpointTimer?: number;
  private lastListTop = 0;
  private lastReaderTop = 0;
  private channelKey() { return JSON.stringify([this.source]); }
  private saveChannel() {
    if (!this.list || !this.reader) return;
    this.plugin.state.channelStates[this.channelKey()] = {
      entries: this.entries, bundle: this.bundle, mode: this.mode, filter: this.filter, query: this.query,
      unread: [...this.unreadSession], cursor: '', hasMore: false,
      listTop: this.pendingScroll?.listTop ?? (this.list.clientHeight ? this.list.scrollTop : this.lastListTop),
      readerTop: this.pendingScroll?.readerTop ?? (this.reader.clientHeight ? this.reader.scrollTop : this.lastReaderTop), articlePending: this.articleLoading,
    };
  }
  private stopRestoring() { this.pendingScroll = undefined; this.restoreObserver?.disconnect(); }
  private restoreOffsets() {
    this.restoreObserver?.disconnect();
    if (!this.pendingScroll) return;
    const apply = () => { if (this.pendingScroll) {
      this.list.scrollTop = this.pendingScroll.listTop; this.reader.scrollTop = this.pendingScroll.readerTop;
    } };
    apply(); this.restoreObserver = new ResizeObserver(apply);
    const article = this.reader.querySelector('.qrs-article'); if (article) this.restoreObserver.observe(article);
    this.restoreObserver.observe(this.list); this.restoreObserver.observe(this.reader);
  }
  private restoreChannel(saved: ChannelState) {
    this.entries = saved.entries;
    this.bundle = saved.bundle;
    this.filter = saved.filter; this.query = saved.query; this.unreadSession = new Set(saved.unread);
    this.lastListTop = saved.listTop; this.lastReaderTop = saved.readerTop;
    this.pendingScroll = { listTop: saved.listTop, readerTop: saved.readerTop };
    this.searchInput.value = this.query; this.searchBox.toggleClass('is-hidden', !this.query);
    this.contentEl.toggleClass('qrs-has-article', !!this.bundle);
    this.renderFilters(); this.renderList(); this.renderReader(); this.restoreOffsets();
    if (saved.articlePending && this.bundle) void this.openArticle(this.bundle.entry, saved);
  }
  private markdownComponent?: Component;
  private selectionCapture?: SelectionCapture;
  private list!: HTMLElement;
  private reader!: HTMLElement;
  private audioDock?: AudioDock;
  private status!: HTMLElement;
  private channelButton!: HTMLButtonElement;
  private searchBox!: HTMLElement;
  private searchInput!: HTMLInputElement;
  private welcomeSource?: string;
  private welcomeTip = -1;
  private refreshButton!: HTMLButtonElement;
  private filters!: HTMLElement;
  private entries: Entry[] = [];
  private personalLimit = 100;
  private source = '';
  private filter: Filter = 'all';
  private unreadSession = new Set<string>();
  private query = '';
  private loading = false;
  private articleLoading = false;
  private focused = false;
  private appearanceOpen = false;
  private appearanceId = `qrs-reading-settings-${crypto.randomUUID()}`;
  private listVersion = 0;
  private articleVersion = 0;
  private renderVersion = 0;
  private bundle: Bundle | null = null;
  private mode: Mode = 'original';
  private closed = false;
  private message = '';
  private blobUrls: string[] = [];
  private thumbnailUrls = new Map<string, string>();
  private thumbnailPending = new Map<string, Promise<string | null>>();
  private thumbnailVersion = 0;
  private imageObserver?: IntersectionObserver;
  constructor(leaf: WorkspaceLeaf, private plugin: StocksRssPlugin) {
    super(leaf);
  }
  getViewType() { return VIEW_TYPE; }
  getDisplayText() { return 'Stocks AI RSS'; }
  getIcon() { return 'rss'; }
  onOpen(): Promise<void> {
    this.reset();
    this.registerDomEvent(this.contentEl.ownerDocument, 'pointerdown', event => {
      const target = event.target as HTMLElement;
      if (!this.appearanceOpen || target.closest?.('.qrs-reading-settings')) return;
      this.appearanceOpen = false; this.reader.querySelector('.qrs-reading-settings')?.remove();
      this.reader.querySelector('[aria-controls="' + this.appearanceId + '"]')?.setAttribute('aria-expanded', 'false');
      this.run(() => this.plugin.persist());
    });
    this.registerDomEvent(this.contentEl, 'contextmenu', event => {
      // Let mobile WebViews open their native text-selection handles.
      if (Platform.isMobileApp || ('pointerType' in event && event.pointerType === 'touch')) return;
      const target = event.target;
      if (!(target instanceof this.contentEl.ownerDocument.defaultView!.HTMLElement) || !target.closest('.qrs-article') || !this.bundle) return;
      event.preventDefault();
      const bundle = this.bundle, note = this.plugin.currentNote();
      const selection = this.contentEl.ownerDocument.getSelection();
      const prose = target.closest('.qrs-article')?.querySelector('.qrs-prose');
      const excerpt = selection && prose?.contains(selection.anchorNode) && prose.contains(selection.focusNode) ? selection.toString().trim() : '';
      const append = async (current: boolean) => {
        try {
          this.plugin.remember(bundle);
          const result = await this.plugin.appendToDailyNote(bundle.entry, excerpt, current && note ? note : undefined);
          new Notice(result.added ? t('notice.appendedToNote', { name: result.file.basename }) : t('notice.alreadyInNote'));
        } catch (error) { new Notice(error instanceof Error ? error.message : t('notice.cannotAppend')); }
      };
      const menu = new Menu().setUseNativeMenu(false)
        .addItem(item => item.setTitle(note ? t('capture.appendCurrent', { name: note.basename }) : t('capture.appendCurrentEmpty')).setIcon('file-pen-line').setDisabled(!note).onClick(() => append(true)))
        .addItem(item => item.setTitle(t('capture.appendDailyDated', { date: todayLabel() })).setIcon('calendar-days').onClick(() => append(false)));
      const href = target.closest<HTMLAnchorElement>('a[href]')?.getAttribute('href');
      const link = href ? safeUrl(href, bundle.entry.link || undefined) : null;
      if (link) {
        menu.addSeparator().addItem(item => item.setTitle(t('capture.copyLink')).setIcon('copy').onClick(async () => { try { await this.contentEl.ownerDocument.defaultView!.navigator.clipboard.writeText(link); } catch { new Notice(t('capture.copyFailed')); } }));
      }
      menu.showAtMouseEvent(event);
    });
    this.selectionCapture = new SelectionCapture(this.contentEl.ownerDocument, () => this.reader, () => {
      const bundle = this.bundle;
      if (!bundle || !this.plugin.state.settings.selectionPopup) return null;
      const note = this.plugin.currentNote();
      const capture = async (text: string, current: boolean) => {
        try {
          this.plugin.remember(bundle);
          const result = current && note
            ? await this.plugin.appendToDailyNote(bundle.entry, text, note)
            : await this.plugin.noteArticle(bundle.entry, text);
          new Notice(result.added ? t('notice.excerptAddedTo', { name: result.file.basename }) : t('notice.excerptAlready'));
        } catch (error) { new Notice(error instanceof Error ? error.message : t('notice.excerptFailed')); }
      };
      return [
        { label: t('capture.appendDaily'), icon: 'calendar-plus', save: (text: string) => capture(text, false) },
        { label: note ? t('capture.appendCurrent', { name: note.basename }) : t('capture.appendCurrentEmpty'), icon: 'file-pen-line', disabled: !note, save: (text: string) => capture(text, true) },
      ];
    });
    return Promise.resolve();
  }
  onClose(): Promise<void> {
    stopMedia(this.reader); this.audioDock?.stop();
    this.saveChannel(); this.channelPicker?.close(false); this.stopRestoring();
    if (this.checkpointTimer) window.clearTimeout(this.checkpointTimer);
    this.selectionCapture?.dispose();
    this.closed = true; this.listVersion++; this.articleVersion++; this.clearImages(); this.clearThumbnails(); this.contentEl.onkeydown = null;
    return this.plugin.persist().catch(() => undefined);
  }
  reset() {
    if (this.reader) stopMedia(this.reader);
    this.audioDock?.stop();
    this.channelPicker?.close(false); this.stopRestoring();
    if (this.checkpointTimer) window.clearTimeout(this.checkpointTimer);
    this.unreadSession.clear();
    this.closed = false; this.listVersion++; this.articleVersion++; this.clearThumbnails();
    const remembered = this.plugin.state.settings.lastSource;
    const localExists = this.plugin.state.subscriptions.some(feed => feed.id === remembered);
    const groupExists = remembered.startsWith('@group:') && this.plugin.state.subscriptionGroups.some(group => group.id === remembered.slice(7));
    this.focused = false;
    this.source = (remembered === '@local' || this.plugin.state.settings.markdownFolders.some(folder => vaultSourceId(folder) === remembered) || groupExists || localExists) ? remembered : '@local';
    this.bundle = null; this.loading = false;
    this.entries = this.localEntries();
    this.build();
    const saved = this.plugin.state.channelStates[this.channelKey()];
    if (saved) { this.restoreChannel(saved); if (!this.entries.length) void this.loadEntries(); }
    else { this.renderList(); this.renderReader(); void this.loadEntries(); }
  }
  private run(action: () => Promise<void>) {
    void action().catch(error => { if (!this.closed) new Notice(error instanceof Error ? error.message : t('notice.actionFailed')); });
  }
  private savedNote(bundle: Bundle, mode: Mode): TFile | null {
    const path = this.plugin.state.articleNotes[articleNoteKey(bundle.entry.id, mode)];
    const file = path ? this.app.vault.getAbstractFileByPath(path) : null;
    return file instanceof TFile ? file : null;
  }
  private saveNote(bundle: Bundle, mode: Mode) {
    this.run(() => this.saveNoteAt(bundle, mode, this.plugin.state.settings.articleFolder));
  }
  private async saveNoteAt(bundle: Bundle, mode: Mode, folder: string, remember = false): Promise<void> {
    const state = this.plugin.state, progress = new Notice(t('notice.savingArticle'), 0);
    const { file, missingImages } = await saveArticleToVault(this.app, bundle, mode, this.contentEl.ownerDocument, this.plugin.images, state.settings.remoteImages, folder).finally(() => progress.hide());
    state.articleNotes[articleNoteKey(bundle.entry.id, mode)] = file.path;
    if (remember) state.settings.articleFolder = folder;
    // The note already exists. A settings failure must not send the save
    // dialog back through file creation (and create a duplicate on retry).
    let settingsSaved = true;
    try { await this.plugin.persist(); } catch { settingsSaved = false; }
    if (!this.closed && this.bundle?.entry.id === bundle.entry.id) this.renderReader(true);
    new Notice(createFragment(f => {
      f.appendText(missingImages ? t('notice.savedNoteWithMissing', { n: missingImages }) : t('notice.savedNote'));
      if (!settingsSaved) {
        f.appendText(t('note.settingsSaveFailed'));
        const retry = f.createEl('a', { text: t('common.retry'), href: '#' });
        retry.onclick = e => { e.preventDefault(); this.run(() => this.plugin.persist()); };
      }
      const open = f.createEl('a', { text: t('notice.open'), href: '#' });
      open.onclick = e => { e.preventDefault(); void this.app.workspace.getLeaf('tab').openFile(file); };
    }), 8000);
  }
  private addIconButton(parent: HTMLElement, icon: string, label: string, action: () => void): HTMLButtonElement {
    const button = parent.createEl('button', { cls: 'qrs-icon', attr: { 'data-qrs-label': label } });
    setIcon(button, icon); button.createSpan({ cls: 'qrs-visually-hidden', text: label }); button.addEventListener('click', action); return button;
  }
  refreshPreferences() { this.selectionCapture?.clear(); this.applyAppearance(); if (this.appearanceOpen) this.renderReader(true); }
  refreshReadingTheme() {
    this.contentEl.dataset.qrsTheme = this.plugin.state.settings.readingTheme;
    for (const select of this.contentEl.querySelectorAll<HTMLSelectElement>('select[data-qrs-reading-theme]')) select.value = this.plugin.state.settings.readingTheme;
    this.channelPicker?.close();
    this.selectionCapture?.clear();
  }
  private applyAppearance() {
    this.refreshReadingTheme();
    const settings = this.plugin.state.settings;
    this.contentEl.dataset.readingFont = settings.fontFamily;
    const font = readingFonts.find(font => font.id === settings.fontFamily)!;
    this.contentEl.setCssProps({ '--qrs-font-family': fontFamily(settings.fontFamily, settings.customFont) });
    void this.plugin.fonts.load(this.contentEl.ownerDocument, settings.fontFamily).catch(() => {
      if (!this.closed && this.plugin.state.settings.fontFamily === font.id) new Notice(t('notice.fontLoadFailed'));
    });
    this.contentEl.setCssProps({
      '--qrs-font-size': `${settings.fontSize}px`, '--qrs-line-height': String(settings.lineHeight),
      '--qrs-article-width': `${settings.fontSize * settings.lineWidth + 120}px`,
    });
  }
  private build() {
    const root = this.contentEl; root.empty(); root.addClass('qrs-root'); root.removeClass('qrs-has-article');
    root.toggleClass('qrs-focus', this.focused); root.tabIndex = 0;
    root.setCssProps({ '--qrs-list-width': `${this.plugin.state.settings.listWidth}px` }); this.applyAppearance();
    const body = root.createDiv('qrs-layout');
    const sidebar = body.createEl('aside', { cls: 'qrs-sidebar' });
    const bar = sidebar.createDiv('qrs-sidebar-toolbar');
    this.channelButton = bar.createEl('button', { cls: 'qrs-channel', attr: { 'aria-haspopup': 'dialog' } });
    this.renderChannel(); this.channelButton.addEventListener('click', () => this.pickChannel());
    this.addIconButton(bar, 'plus', t('reader.discover'), () => { void this.plugin.openDiscovery(); });
    this.addIconButton(bar, 'search', t('reader.searchTooltip'), () => this.toggleSearch());
    this.refreshButton = this.addIconButton(bar, 'refresh-cw', t('reader.refresh'), () => { void this.loadEntries(true); });
    this.addIconButton(bar, 'settings', t('reader.pluginSettings'), () => this.plugin.openSettings());
    this.filters = sidebar.createDiv({ cls: 'qrs-filters', attr: { role: 'group' } });
    this.renderFilters();
    this.searchBox = sidebar.createDiv('qrs-search-box'); this.searchBox.toggleClass('is-hidden', !this.query);
    const searchId = `${this.appearanceId}-search`; this.searchBox.createEl('label', { cls: 'qrs-visually-hidden', text: t('reader.searchLabel'), attr: { for: searchId } });
    this.searchInput = this.searchBox.createEl('input', { type: 'search', placeholder: t('reader.searchPlaceholder'), attr: { id: searchId } });
    addSearchClear(this.searchInput);
    this.searchInput.value = this.query;
    this.searchInput.addEventListener('input', () => { this.query = this.searchInput.value; this.unreadSession.clear(); this.renderList(); });
    this.searchInput.addEventListener('keydown', event => { if (event.key === 'Escape') { event.stopPropagation(); this.toggleSearch(false); } });
    this.status = sidebar.createDiv({ cls: 'qrs-status', attr: { role: 'status', 'aria-live': 'polite' } });
    this.list = sidebar.createDiv({ cls: 'qrs-list' });
    this.createResizeHandle(body);
    this.reader = body.createEl('section', { cls: 'qrs-reader', attr: { tabindex: '0' } });
    this.audioDock = new AudioDock(root, entry => this.openEpisode(entry));
    root.onkeydown = event => this.onReaderKey(event);
    for (const element of [this.list, this.reader]) {
      for (const event of ['wheel', 'touchstart', 'pointerdown', 'keydown'] as const) element.addEventListener(event, () => this.stopRestoring(), { passive: true });
      element.addEventListener('scroll', () => {
        if (this.list.clientHeight) this.lastListTop = this.list.scrollTop;
        if (this.reader.clientHeight) this.lastReaderTop = this.reader.scrollTop;
        if (this.checkpointTimer) window.clearTimeout(this.checkpointTimer);
        this.checkpointTimer = window.setTimeout(() => { this.saveChannel(); this.run(() => this.plugin.persist()); }, 700);
      });
    }
  }
  private renderChannel() {
    this.channelButton.empty();
    const choices = this.channelChoices();
    const choice = choices.find(item => item.id === this.source) || choices[0];
    channelMark(this.channelButton, choice); this.channelButton.createSpan({ cls: 'qrs-channel-label', text: choice.name });
    setIcon(this.channelButton.createSpan(), 'chevron-down');
  }
  private renderFilters() {
    this.filters.empty();
    for (const [value, label] of [['all', t('common.all')], ['unread', t('reader.filter.unread')], ['favorites', t('reader.filter.favorites')]] as const) {
      const button = this.filters.createEl('button', { text: label, attr: { 'aria-pressed': String(value === this.filter), 'data-filter': value } });
      button.addEventListener('click', () => { this.filter = value; this.unreadSession.clear(); this.renderFilters(); this.renderList(); });
    }
    this.addIconButton(this.filters, 'settings', t('reader.pluginSettings'), () => this.plugin.openSettings()).addClass('qrs-settings-button');
  }
  private channelChoices(): ChannelChoice[] {
    const sources = personalSources(this.plugin.state), groups = groupsInOrder(this.plugin.state);
    return [
      { id: '@local', name: t('reader.mySubscriptions'), short: t('reader.allSubscriptions'), section: '聚合', subtitle: t('reader.sourceCount', { n: sources.length }), icon: 'rss' },
      ...groups.map(group => ({ id: `@group:${group.id}`, name: group.name, section: '订阅分组' as const, subtitle: t('reader.sourceCount', { n: sources.filter(s => s.groupId === group.id).length }), icon: 'folder' })),
      ...sources.map(source => ({ id: source.id, name: source.name, section: '我的订阅源' as const, subtitle: source.detail, group: source.groupId, site: source.site, url: source.url, image: source.image, kind: source.kind })),
    ];
  }
  refreshPersonalSources() {
    if (this.closed || !this.channelButton) return;
    if (this.source.startsWith('@group:') && !this.plugin.state.subscriptionGroups.some(g => g.id === this.source.slice(7)) || (this.source.startsWith('local:') || this.vaultScope()) && !personalSources(this.plugin.state).some(s => s.id === this.source)) { this.selectSource('@local', false); return; }
    this.renderChannel(); this.renderFilters();
    if (this.personalScope()) { this.entries = this.localEntries(); this.renderList(); }
  }
  showPersonalSource(id: string) { this.selectSource(id); }
  private vaultScope() { return this.source.startsWith('@vault:'); }
  private personalScope() { return this.source === '@local' || this.source.startsWith('@group:') || this.source.startsWith('local:'); }
  private selectedFeeds() {
    return this.plugin.state.subscriptions.filter(feed => this.source === '@local' || feed.id === this.source ||
      (this.source.startsWith('@group:') && this.plugin.state.sourceMeta[feed.id]?.groupId === this.source.slice(7)));
  }
  private localEntries() { return this.selectedFeeds().flatMap(feed => feed.entries).sort((a, b) => (b.publishedTs || 0) - (a.publishedTs || 0)); }
  showSubscriptions() { this.selectSource('@local', false); }
  showSubscription(id: string) {
    if (this.plugin.state.subscriptions.some(feed => feed.id === id)) this.selectSource(id, false);
  }
  private pickChannel() {
    if (this.channelPicker) { this.channelPicker.close(); return; }
    this.channelPicker = new ChannelPicker(this.channelButton, this.channelChoices(), this.source, source => this.selectSource(source.id), () => { this.channelPicker = undefined; }, new SourceIcons(this.plugin), { collapsed: this.plugin.state.collapsedGroups, save: (id, collapsed) => { void this.plugin.editLibrary(() => { const state = this.plugin.state; state.collapsedGroups = collapsed ? [...new Set([...state.collapsedGroups, id])] : state.collapsedGroups.filter(g => g !== id); }).catch(() => new Notice(t('notice.groupStateSaveFailed'))); } }, () => this.plugin.manageSubscriptions());
    this.channelPicker.load();
  }
  private selectSource(source: string, refresh = true) {
    if (source === this.source) { if (!refresh) void this.loadEntries(); return; }
    this.saveChannel(); this.stopRestoring();
    this.unreadSession.clear();
    this.listVersion++; this.loading = false; this.refreshButton.removeClass('is-loading');
    this.articleLoading = false; this.reader.setAttribute('aria-busy', 'false');
    this.personalLimit = 100; this.source = source;
    this.plugin.state.settings.lastSource = source; this.run(() => this.plugin.persist());
    this.bundle = null; this.articleVersion++; this.focused = false; this.contentEl.removeClass('qrs-focus');
    this.contentEl.removeClass('qrs-has-article');
    this.entries = this.localEntries();
    this.status.setText(''); this.renderChannel();
    const saved = this.plugin.state.channelStates[this.channelKey()];
    if (saved) { this.restoreChannel(saved); if (!this.entries.length && refresh) void this.loadEntries(); return; }
    this.filter = 'all'; this.query = ''; this.searchInput.value = ''; this.searchBox.addClass('is-hidden'); this.lastListTop = 0; this.lastReaderTop = 0;
    this.renderFilters(); this.renderReader(); this.renderList(); this.list.scrollTop = 0; this.reader.scrollTop = 0;
    if (refresh) void this.loadEntries();
  }
  private toggleSearch(show = this.searchBox.hasClass('is-hidden')) {
    this.focused = false; this.contentEl.removeClass('qrs-focus'); this.showList();
    this.searchBox.toggleClass('is-hidden', !show);
    if (show) this.searchInput.focus();
    else { this.query = ''; this.searchInput.value = ''; this.unreadSession.clear(); this.renderList(); this.contentEl.focus(); }
  }
  private createResizeHandle(parent: HTMLElement) {
    const labelId = `${this.appearanceId}-resize`; const handle = parent.createDiv({ cls: 'qrs-resize', attr: { role: 'separator', tabindex: '0', 'aria-labelledby': labelId, 'aria-orientation': 'vertical', 'aria-valuemin': '220', 'aria-valuemax': '520', 'aria-valuenow': String(this.plugin.state.settings.listWidth) } });
    handle.createSpan({ cls: 'qrs-visually-hidden', text: t('reader.resizeList'), attr: { id: labelId } });
    const resize = (width: number) => {
      const next = Math.round(Math.max(220, Math.min(520, width)));
      this.plugin.state.settings.listWidth = next;
      this.contentEl.setCssProps({ '--qrs-list-width': `${next}px` });
      handle.setAttribute('aria-valuenow', String(next));
    };
    handle.onpointerdown = event => {
      if (event.button !== 0) return;
      event.preventDefault(); handle.setPointerCapture(event.pointerId); handle.addClass('is-dragging');
      const x = event.clientX; const width = this.plugin.state.settings.listWidth;
      handle.onpointermove = move => resize(width + move.clientX - x);
    };
    const finish = () => { handle.onpointermove = null; handle.removeClass('is-dragging'); this.run(() => this.plugin.persist()); };
    handle.onpointerup = finish; handle.onlostpointercapture = finish; handle.onpointercancel = finish;
    handle.ondblclick = () => { resize(300); this.run(() => this.plugin.persist()); };
    handle.onkeydown = event => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault(); resize(this.plugin.state.settings.listWidth + (event.key === 'ArrowLeft' ? -20 : 20)); this.run(() => this.plugin.persist());
    };
  }
  /** On narrow layouts this hides the reader, so a playing video has no visible controls. */
  private showList() { this.contentEl.removeClass('qrs-has-article'); pauseVideos(this.reader); }
  private openEpisode(entry: Entry) {
    if (this.bundle?.entry.id !== entry.id) { void this.openArticle(entry); return; }
    this.contentEl.addClass('qrs-has-article'); this.reader.focus({ preventScroll: true });
  }
  private toggleFocus() {
    if (!this.bundle) return;
    if (this.contentEl.clientWidth <= 650) { this.showList(); return; }
    this.focused = !this.focused; this.contentEl.toggleClass('qrs-focus', this.focused); this.renderReader(true);
  }
  private onReaderKey(event: KeyboardEvent) {
    const target = event.target as HTMLElement | null;
    if (event.key === 'Escape' && this.appearanceOpen) {
      event.preventDefault(); event.stopPropagation(); this.appearanceOpen = false; this.renderReader(true); return;
    }
    if (event.ctrlKey || event.metaKey || event.altKey || event.isComposing ||
      (target?.closest?.('input,textarea,select,[contenteditable=true]'))) return;
    const key = event.key.toLowerCase();
    if (key === 'j' || key === 'k') { event.preventDefault(); event.stopPropagation(); this.navigate(key === 'j' ? 1 : -1); }
    if (event.key === '[' || event.key === 'f') { event.preventDefault(); this.toggleFocus(); }
    if (event.key === '/') { event.preventDefault(); this.toggleSearch(true); }
    if (event.key === 'Escape') { this.focused = false; this.contentEl.removeClass('qrs-focus'); this.showList(); }
  }
  private navigate(direction: number) {
    const entries = this.visibleEntries();
    const index = entries.findIndex(entry => entry.id === this.bundle?.entry.id);
    const next = entries[index + direction]; if (next) void this.openArticle(next);
  }
  private async loadEntries(force = false) {
    if (this.loading) return;
    const version = ++this.listVersion; this.loading = true; this.status.setText(''); this.refreshButton.addClass('is-loading');
    try {
      if (this.vaultScope()) { this.entries = this.plugin.vaultSources.entries(this.source.slice(7)); this.renderList(); return; }
      const feeds = [...this.selectedFeeds()].sort((a, b) => (a.lastAttemptAt || a.updatedAt) - (b.lastAttemptAt || b.updatedAt)).slice(0, 20);
      await this.plugin.subscriptions.refresh(feeds.map(feed => feed.id), this.reader.ownerDocument, force, () => {
        if (!this.closed && version === this.listVersion) { this.entries = this.localEntries(); this.renderList(); }
      });
      if (this.closed || version !== this.listVersion) return;
      this.entries = this.localEntries();
      const failed = feeds.filter(feed => feed.error).length;
      this.status.setText(failed ? t('reader.refreshFailed', { n: failed }) : this.selectedFeeds().length > 20 ? t('reader.refreshBatch') : '');
    } catch (error) {
      if (this.closed || version !== this.listVersion) return;
      this.status.setText(`${error instanceof Error ? error.message : t('error.networkUnavailable')}${this.entries.length ? t('reader.showingCached') : t('reader.refreshRetry')}`);
    } finally {
      if (!this.closed && version === this.listVersion) { this.loading = false; this.refreshButton.removeClass('is-loading'); this.renderList(); }
    }
  }
  private visibleEntries(): Entry[] {
    const state = this.plugin.state;
    const entries = this.filter === 'favorites' ? Object.values(state.favorites).map(b => b.entry) : this.entries;
    const query = this.query.trim().toLocaleLowerCase();
    return entries.filter(entry => (this.vaultScope() ? entry.origin === 'vault' && entry.sourceId === this.source : entry.origin !== 'vault' && (this.source === '@local' || this.selectedFeeds().some(feed => feed.id === entry.sourceId))) &&
      (this.filter !== 'unread' || state.readIds.includes(entry.id) === false || this.unreadSession.has(entry.id) || entry.id === this.bundle?.entry.id) &&
      (!query || `${titleOf(entry)} ${entry.title} ${entry.summary || ''} ${this.sourceName(entry)}`.toLocaleLowerCase().includes(query)));
  }
  private sourceName(entry: Entry) { return this.plugin.state.subscriptions.find(feed => feed.id === entry.sourceId)?.name || entry.sourceName || entry.sourceId; }
  private excerpt(entry: Entry): string {
    return cleanExcerpt(entry.summary || '');
  }
  private clearThumbnails() {
    this.thumbnailVersion++;
    for (const url of this.thumbnailUrls.values()) URL.revokeObjectURL(url);
    this.thumbnailUrls.clear(); this.thumbnailPending.clear();
  }
  private thumbnailUrl(url: string): Promise<string | null> {
    const cached = this.thumbnailUrls.get(url); if (cached) return Promise.resolve(cached);
    const pending = this.thumbnailPending.get(url); if (pending) return pending;
    const version = this.thumbnailVersion;
    const promise = this.plugin.images.load(url).then(blob => {
      if (this.closed || version !== this.thumbnailVersion) return null;
      const local = URL.createObjectURL(blob); this.thumbnailUrls.set(url, local); return local;
    }).catch(() => null);
    this.thumbnailPending.set(url, promise);
    void promise.finally(() => { if (this.thumbnailPending.get(url) === promise) this.thumbnailPending.delete(url); });
    return promise;
  }
  private renderThumbnail(row: HTMLElement, entry: Entry) {
    if (!this.plugin.state.settings.remoteImages) return;
    const url = entry.image ? safeUrl(entry.image, entry.link || undefined) : null; if (!url) return;
    const holder = row.createSpan('qrs-entry-thumb is-loading');
    const img = holder.createEl('img', { attr: { alt: '', loading: 'lazy', referrerpolicy: 'no-referrer' } });
    void this.thumbnailUrl(url).then(local => {
      if (!local || !holder.isConnected) { holder.remove(); return; }
      img.onload = () => holder.removeClass('is-loading'); img.onerror = () => holder.remove(); img.src = local;
    });
  }
  private renderList() {
    const restoreFocus = this.list.contains(this.contentEl.ownerDocument.activeElement);
    const scroll = this.list.scrollTop; this.list.empty(); const entries = this.visibleEntries();
    if (this.source === '@local' || this.source.startsWith('@group:')) {
      const items = personalSources(this.plugin.state).filter(item => item.kind !== 'rss' && (this.source === '@local' || item.groupId === this.source.slice(7)) && (!this.query || item.name.toLocaleLowerCase().includes(this.query.toLocaleLowerCase())));
      if (items.length) {
        const sources = this.list.createEl('details', { cls: 'qrs-personal-sources' }); sources.open = true;
        sources.createEl('summary', { text: t('reader.podcastLocalSection', { n: items.length }) });
        for (const item of items) sources.createEl('button', { text: item.name }).onclick = () => this.selectSource(item.id);
      }
    }
    if (!entries.length) this.list.createDiv({ cls: 'qrs-empty', text: this.loading ? t('reader.loadingEntries') : this.filter === 'favorites' ? t('reader.emptyFavorites') : this.personalScope() && !this.entries.length ? t('reader.emptyPersonal') : t('reader.emptyFilter') });
    // Inside one channel every row would repeat the same source name, so it only appears when sources mix.
    const mixed = new Set(entries.map(entry => entry.sourceId)).size > 1;
    for (const entry of entries.slice(0, this.personalLimit)) {
      const read = this.plugin.state.readIds.includes(entry.id);
      const row = this.list.createEl('button', { cls: 'qrs-entry', attr: { 'data-entry-id': entry.id } });
      row.toggleClass('qrs-selected', this.bundle?.entry.id === entry.id);
      row.setAttribute('aria-pressed', String(this.bundle?.entry.id === entry.id)); row.toggleClass('qrs-read', read);
      const copy = row.createSpan('qrs-entry-copy');
      const meta = copy.createSpan('qrs-entry-meta');
      if (mixed) meta.createSpan({ text: this.sourceName(entry), cls: 'qrs-source-name' });
      const date = entry.publishedTs ? new Date(entry.publishedTs) : entry.published ? new Date(entry.published) : null;
      meta.createSpan({ cls: 'qrs-date', text: date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' }) : relativeTime(entry.publishedRelative || '') });
      const title = copy.createDiv('qrs-entry-title');
      title.createSpan({ cls: read ? 'qrs-read-dot' : 'qrs-unread-dot', attr: { 'aria-hidden': 'true' } });
      title.createSpan({ cls: 'qrs-visually-hidden', text: read ? t('reader.read') : t('reader.unread') });
      title.createEl('h3', { text: titleOf(entry) });
      if (this.plugin.state.favorites[entry.id]) setIcon(title.createSpan('qrs-bookmarked'), 'bookmark');
      const summary = this.excerpt(entry); if (summary) copy.createEl('p', { text: summary, cls: 'qrs-summary' }); else row.addClass('qrs-no-summary');
      this.renderThumbnail(row, entry);
      row.addEventListener('click', () => { void this.openArticle(entry); });
    }
    if (entries.length > this.personalLimit) this.list.createEl('button', { text: t('reader.showMoreArticles'), cls: 'qrs-more' }).onclick = () => { this.personalLimit += 100; this.renderList(); };
    this.list.scrollTop = scroll;
    if (restoreFocus) this.reader.focus({ preventScroll: true });
  }
  private async openArticle(entry: Entry, resume?: ChannelState) {
    this.stopRestoring();
    // Keep this unread reading session navigable after opening marks entries read.
    if (this.filter === 'unread') this.unreadSession.add(entry.id);
    const version = ++this.articleVersion;
    this.audioDock?.open(entry);
    this.bundle = this.plugin.state.cache[entry.id] || this.plugin.state.favorites[entry.id] || { entry, rewrite: null, translation: null, fetchedAt: 0 };
    this.plugin.state.readIds = [...new Set([...this.plugin.state.readIds, entry.id])].slice(-5000); this.run(() => this.plugin.persist());
    this.message = ''; this.articleLoading = true; this.reader.setAttribute('aria-busy', 'true');
    this.contentEl.addClass('qrs-has-article'); this.renderReader(); this.reader.scrollTop = 0; this.lastReaderTop = 0; this.reader.focus({ preventScroll: true }); this.renderList();
    if (resume) { this.pendingScroll = { listTop: resume.listTop, readerTop: resume.readerTop }; this.renderReader(); this.restoreOffsets(); }
    try {
      if (entry.origin === 'vault') {
        const bundle = await this.plugin.vaultSources.article(entry);
        if (this.closed || version !== this.articleVersion) return;
        this.bundle = bundle;
      } else {
        this.bundle = { entry, rewrite: null, translation: null, fetchedAt: Date.now() };
      }
      this.plugin.remember(this.bundle); this.run(() => this.plugin.persist());
    } catch (error) {
      if (this.closed || version !== this.articleVersion) return;
      const cached = this.bundle.fetchedAt ? t('reader.cachedAt', { date: new Date(this.bundle.fetchedAt).toLocaleString() }) : t('reader.reopenRetry');
      this.message = `${error instanceof Error ? error.message : t('reader.contentFailed')}${cached}`;
    }
    if (!this.closed && version === this.articleVersion) {
      this.articleLoading = false; this.reader.setAttribute('aria-busy', 'false'); this.renderReader(); this.renderList();
    }
  }
  /** Opens one article from outside the list. */
  openEntry(entry: Entry) { void this.openArticle(entry); }
  showSavedArticle(bundle: Bundle) {
    this.stopRestoring();
    this.articleVersion++; this.articleLoading = false;
    this.bundle = bundle; this.message = ''; this.audioDock?.open(bundle.entry);
    this.reader.setAttribute('aria-busy', 'false'); this.contentEl.addClass('qrs-has-article');
    this.renderReader(); this.reader.scrollTop = 0; this.lastReaderTop = 0; this.reader.focus({ preventScroll: true }); this.renderList();
  }
  private noteCurrent() {
    const bundle = this.bundle; if (!bundle) return;
    this.run(async () => {
      this.plugin.remember(bundle);
      const result = await this.plugin.noteArticle(bundle.entry, '');
      new Notice(result.added ? t('notice.addedToDailyNote') : t('notice.alreadyInDailyNote'));
    });
  }
  private clearImages() {
    this.markdownComponent?.unload(); this.markdownComponent = undefined;
    this.renderVersion++; this.imageObserver?.disconnect(); this.imageObserver = undefined;
    for (const url of this.blobUrls) URL.revokeObjectURL(url);
    this.blobUrls = [];
  }
  private prepareImages(fragment: DocumentFragment) {
    const version = this.renderVersion;
    const load = async (img: HTMLImageElement, url: string, holder: HTMLElement, refresh = false) => {
      holder.querySelector('button')?.remove();
      holder.addClass('is-loading');
      const failed = () => {
        if (this.closed || version !== this.renderVersion) return;
        holder.removeClass('is-loading');
        holder.querySelector('button')?.remove();
        const button = holder.createEl('button', { text: t('notice.imageRetry'), cls: 'qrs-image-retry' });
        button.onclick = () => { void load(img, url, holder, true); };
      };
      try {
        const blob = await this.plugin.images.load(url, refresh);
        if (this.closed || version !== this.renderVersion) return;
        enableImageDrag(img, blob);
        const local = URL.createObjectURL(blob); this.blobUrls.push(local);
        img.onload = () => holder.removeClass('is-loading');
        img.onerror = failed; img.src = local;
      } catch { failed(); }
    };
    this.imageObserver = new IntersectionObserver(items => {
      for (const item of items) {
        if (!item.isIntersecting) continue;
        const img = item.target as HTMLImageElement; this.imageObserver?.unobserve(img);
        const url = img.dataset.qrsImage;
        if (url && img.parentElement) void load(img, url, img.parentElement);
      }
    }, { root: this.reader, rootMargin: '500px' });
    for (const img of fragment.querySelectorAll('img')) {
      const url = img.getAttribute('src'); img.removeAttribute('src'); if (!url) { img.remove(); continue; }
      img.dataset.qrsImage = url;
      const holder = createSpan({ cls: 'qrs-image is-loading' });
      img.replaceWith(holder); holder.append(img); this.imageObserver.observe(img);
    }
  }
  private renderReader(keepContent = false) {
    this.selectionCapture?.clear();
    const active = this.contentEl.ownerDocument.activeElement;
    const restoreFocus = active !== this.reader && this.reader.contains(active);
    const scroll = this.reader.scrollTop;
    const previous = keepContent ? this.reader.querySelector('.qrs-article') : null;
    if (!previous) { stopMedia(this.reader); this.clearImages(); }
    // An episode the listener has started keeps playing while they browse; otherwise follow the shown article.
    const dock = this.audioDock;
    if (dock && dock.entry?.id !== this.bundle?.entry.id && !dock.started()) { if (this.bundle) dock.open(this.bundle.entry); else dock.stop(); }
    this.reader.empty();
    // A removed toolbar button must not leave keyboard focus on document.body.
    if (restoreFocus) this.reader.focus({ preventScroll: true });
    const bundle = this.bundle;
    if (!bundle) {
      const empty = this.reader.createDiv('qrs-welcome');
      empty.createDiv({ cls: 'qrs-welcome-brand', text: 'STOCKS RSS' });
      empty.createEl('h2', { text: t('welcome.title') });
      empty.createEl('p', { cls: 'qrs-welcome-intro', text: t('welcome.intro') });
      const tips = [
        [t('welcome.tip1.title'), t('welcome.tip1.body')],
        [t('welcome.tip2.title'), t('welcome.tip2.body')],
        [t('welcome.tip3.title'), t('welcome.tip3.body')],
        [t('welcome.tip4.title'), t('welcome.tip4.body')],
        [t('welcome.tip5.title'), t('welcome.tip5.body')],
      ];
      if (this.welcomeSource !== this.source || this.welcomeTip < 0) { this.welcomeTip = (this.welcomeTip + 1) % tips.length; this.welcomeSource = this.source; }
      const tip = empty.createDiv('qrs-welcome-tip');
      const showTip = () => { tip.empty(); const [title, copy] = tips[this.welcomeTip]; tip.createDiv({ cls: 'qrs-welcome-index', text: `${String(this.welcomeTip + 1).padStart(2, '0')} / ${String(tips.length).padStart(2, '0')}   ${t('welcome.note')}` }); tip.createEl('h3', { text: title }); tip.createEl('p', { text: copy }); };
      showTip();
      empty.createEl('button', { cls: 'qrs-welcome-next', text: t('welcome.next') }).onclick = () => { this.welcomeTip = (this.welcomeTip + 1) % tips.length; showTip(); };
      if (!Platform.isMobileApp) {
        const keys = empty.createDiv('qrs-welcome-keys');
        for (const [key, label] of [['J / K', t('welcome.key.nextPrev')], ['[', t('welcome.key.collapse')], ['/', t('welcome.key.search')]]) { const item = keys.createSpan(); item.createEl('kbd', { text: key }); item.createSpan({ text: label }); }
      }
      return;
    }
    const toolbar = this.reader.createDiv('qrs-reader-toolbar');
    this.addIconButton(toolbar, this.focused ? 'panel-left-open' : 'panel-left-close', t('reader.toggleList'), () => this.toggleFocus());
    const nav = toolbar.createDiv('qrs-reader-nav');
    this.addIconButton(nav, 'chevron-up', t('reader.prevArticle'), () => this.navigate(-1));
    this.addIconButton(nav, 'chevron-down', t('reader.nextArticle'), () => this.navigate(1));
    const actions = toolbar.createDiv('qrs-actions');
    const favorite = !!this.plugin.state.favorites[bundle.entry.id];
    const bookmark = this.addIconButton(actions, 'bookmark', favorite ? t('reader.unfavorite') : t('reader.favorite'), () => this.run(async () => {
      if (favorite) delete this.plugin.state.favorites[bundle.entry.id];
      else this.plugin.state.favorites[bundle.entry.id] = bundle;
      await this.plugin.persist(); this.renderReader(true); this.renderList();
    }));
    bookmark.setAttribute('aria-pressed', String(favorite)); bookmark.toggleClass('is-bookmarked', favorite);
    const read = this.plugin.state.readIds.includes(bundle.entry.id);
    const readButton = this.addIconButton(actions, read ? 'circle-check' : 'circle', read ? t('reader.markUnread') : t('reader.markRead'), () => this.run(async () => {
      const ids = this.plugin.state.readIds.filter(id => id !== bundle.entry.id);
      this.plugin.state.readIds = read ? ids : [...ids, bundle.entry.id].slice(-5000);
      await this.plugin.persist(); this.renderReader(true); this.renderList();
    }));
    readButton.setAttribute('aria-pressed', String(read));
    // Saving the article as a note is the frequent write action, so it gets a toolbar slot; once saved, the same slot opens that note.
    const mode: Mode = 'original', savedNote = this.savedNote(bundle, mode);
    const noteButton = this.addIconButton(actions, savedNote ? 'file-check' : 'file-plus', savedNote ? t('reader.openSavedNote') : t('reader.saveNote'), () => {
      if (savedNote) void this.app.workspace.getLeaf('tab').openFile(savedNote); else this.saveNote(bundle, mode);
    });
    noteButton.setAttribute('aria-pressed', String(!!savedNote));
    this.addIconButton(actions, 'notebook-pen', t('reader.noteToDaily'), () => this.noteCurrent());
    const more = this.addIconButton(actions, 'ellipsis', t('reader.moreActions'), () => {
      const menu = new Menu().setUseNativeMenu(false); const link = safeUrl(bundle.entry.link || '');
      menu.addItem(item => item.setTitle(t('reader.readingSettingsMenu')).setIcon('type').onClick(() => { this.appearanceOpen = true; this.renderReader(true); }));
      menu.addSeparator();
      if (bundle.entry.origin === 'vault' && bundle.entry.markdownPath) menu.addItem(item => item.setTitle(t('reader.openSourceFile')).setIcon('file-text').onClick(() => {
        void this.app.workspace.openLinkText(bundle.entry.markdownPath!, '', true);
      }));
      if (link) menu.addItem(item => item.setTitle(t('reader.openOriginal')).setIcon('external-link').onClick(() => { this.contentEl.win.open(link, '_blank', 'noopener,noreferrer'); }));
      const video = safeUrl(bundle.entry.videoUrl || '');
      if (video && videoEmbedUrl(video)) menu.addItem(item => item.setTitle(t('reader.openVideo')).setIcon('video').onClick(() => { this.contentEl.win.open(video, '_blank', 'noopener,noreferrer'); }));
      menu.addItem(item => item.setTitle(t('reader.reloadArticle')).setIcon('refresh-cw').onClick(() => this.run(() => this.openArticle(bundle.entry))));
      menu.addSeparator();
      if (savedNote) menu.addItem(item => item.setTitle(t('reader.saveAnotherNote')).setIcon('file-plus').onClick(() => this.saveNote(bundle, mode)));
      menu.addItem(item => item.setTitle(t('reader.saveNoteTo')).setIcon('folder').onClick(() => {
        new NoteLocationModal(this.app, this.plugin.state.settings.articleFolder, exportBaseName(bundle, mode),
          (folder, remember) => this.saveNoteAt(bundle, mode, folder, remember)).open();
      }));
      if (Platform.isDesktopApp) {
        menu.addItem(item => item.setTitle(t('reader.exportPdf')).setIcon('file-down').onClick(() => this.run(async () => {
          const article = this.reader.querySelector<HTMLElement>('.qrs-article');
          if (!article || this.bundle?.entry.id !== bundle.entry.id) throw new Error(t('error.articleSwitched'));
          const result = await saveArticlePdf(bundle, mode, article, this.plugin.images, this.plugin.state.settings);
          if (!result) return;
          await this.plugin.persist();
          new Notice(result.missingImages ? t('notice.pdfSavedWithMissing', { n: result.missingImages }) : t('notice.pdfSaved'));
        })));
      }
      menu.addItem(item => item.setTitle(t('reader.pickChannel')).setIcon('rss').onClick(() => this.pickChannel()));
      const rect = more.getBoundingClientRect(); menu.showAtPosition({ x: rect.left, y: rect.bottom });
    });
    if (this.appearanceOpen) this.renderAppearanceSettings(toolbar);
    if (previous) { this.reader.append(previous); this.reader.scrollTop = scroll; this.restoreOffsets(); return; }
    const article = this.reader.createEl('article', { cls: 'qrs-article' });
    const title = article.createEl('h1');
    const originalUrl = safeUrl(bundle.entry.link || '');
    if (bundle.entry.origin === 'vault' && bundle.entry.markdownPath) {
      const link = title.createEl('a', { text: titleOf(bundle.entry), href: '#', cls: 'qrs-title-link' });
      link.onclick = event => { event.preventDefault(); void this.app.workspace.openLinkText(bundle.entry.markdownPath!, '', true); };
    } else if (originalUrl) title.createEl('a', { text: titleOf(bundle.entry), href: originalUrl, cls: 'qrs-title-link', attr: { target: '_blank', rel: 'noopener noreferrer' } });
    else title.setText(titleOf(bundle.entry));
    if (this.message) article.createDiv({ cls: 'qrs-feedback', text: this.message, attr: { role: 'status' } });
    if (!this.articleLoading) renderMedia(article, bundle.entry);
    try {
      if (bundle.entry.origin === 'vault' && bundle.entry.markdown != null) {
        const prose = article.createDiv('qrs-prose');
        this.markdownComponent = new Component(); this.markdownComponent.load();
        void MarkdownRenderer.render(this.app, bundle.entry.markdown, prose, bundle.entry.markdownPath || '', this.markdownComponent)
          .then(() => prepareMarkdownImageDrags(this.app, this.plugin.images, prose, bundle.entry.markdownPath || ''))
          .catch(() => { prose.setText(t('reader.markdownFailed')); });
      } else {
      const fragment = articleFragment(bundle, 'original', article.ownerDocument, this.plugin.state.settings.remoteImages);
      if (fragment) { this.prepareImages(fragment); article.createDiv('qrs-prose').append(fragment); }
      else if (!this.message || this.articleLoading) article.createDiv({ cls: 'qrs-empty', text: this.articleLoading ? t('reader.loadingContent') : t('reader.noContent', { mode: t('mode.original') }) });
      }
    } catch { article.createDiv({ cls: 'qrs-empty', text: t('reader.renderFailed') }); }
    this.reader.scrollTop = scroll; this.restoreOffsets();
  }
  private renderAppearanceSettings(anchor: HTMLElement) {
    const settings = this.plugin.state.settings;
    const headingId = `${this.appearanceId}-heading`;
    const panel = anchor.createEl('section', { cls: 'qrs-reading-settings', attr: { id: this.appearanceId, 'aria-labelledby': headingId } });
    const header = panel.createDiv('qrs-reading-settings-head'); header.createEl('strong', { text: t('reader.readingSettings'), attr: { id: headingId } });
    const fields = panel.createDiv('qrs-reading-settings-fields');
    const row = (label: string) => { const el = fields.createEl('label', { cls: 'qrs-reading-setting' }); el.createSpan({ text: label }); return el; };
    const themeRow = row(t('appearance.theme'));
    const theme = themeRow.createEl('select', { attr: { 'data-qrs-reading-theme': '' } });
    for (const value of readingThemeSchema.options) theme.createEl('option', { value, text: t(`appearance.theme.${value}`) });
    theme.value = settings.readingTheme;
    theme.onchange = () => { settings.readingTheme = readingThemeSchema.parse(theme.value); this.plugin.refreshReadingTheme(); this.run(() => this.plugin.persist()); };
    const fontRow = row(t('appearance.font'));
    const font = fontRow.createEl('select', { attr: { 'data-qrs-field': t('appearance.font') } });
    for (const choice of selectableFonts.concat(readingFonts.filter(f => f.id === settings.fontFamily && !selectableFonts.includes(f)))) font.createEl('option', { value: choice.id, text: fontName(choice.id) });
    font.value = settings.fontFamily;
    const customRow = row(t('appearance.customFont'));
    const custom = customRow.createEl('input', { type: 'text', value: settings.customFont, placeholder: t('appearance.customPlaceholder') });
    customRow.hidden = settings.fontFamily !== 'custom';
    custom.oninput = () => { settings.customFont = custom.value.slice(0, 200); this.applyAppearance(); this.run(() => this.plugin.persist()); };
    const sizeRow = row(t('appearance.size')); const sizeValue = sizeRow.createEl('output', { text: `${settings.fontSize} px` });
    const size = sizeRow.createEl('input', { type: 'range', value: String(settings.fontSize), attr: { min: '14', max: '32', step: '1', 'data-qrs-field': t('appearance.size') } });
    const heightRow = row(t('appearance.lineHeight')); const heightValue = heightRow.createEl('output', { text: t('settings.times', { n: settings.lineHeight.toFixed(1) }) });
    const height = heightRow.createEl('input', { type: 'range', value: String(settings.lineHeight), attr: { min: '1.5', max: '2.4', step: '0.1', 'data-qrs-field': t('appearance.lineHeight') } });
    const widthRow = row(t('appearance.width'));
    const width = widthRow.createEl('select', { attr: { 'data-qrs-field': t('appearance.width') } });
    for (const [value, label] of [['28', t('appearance.width.compact')], ['36', t('appearance.width.normal')], ['44', t('appearance.width.relaxed')]] as const) width.createEl('option', { value, text: label });
    width.value = String(settings.lineWidth);
    const update = () => { sizeValue.setText(`${settings.fontSize} px`); heightValue.setText(t('settings.times', { n: settings.lineHeight.toFixed(1) })); this.applyAppearance(); };
    font.onchange = () => { settings.fontFamily = readingFontSchema.parse(font.value); customRow.hidden = settings.fontFamily !== 'custom'; update(); this.run(() => this.plugin.persist()); };
    size.oninput = () => { settings.fontSize = Number(size.value); update(); this.run(() => this.plugin.persist()); }; size.onchange = () => this.run(() => this.plugin.persist());
    height.oninput = () => { settings.lineHeight = Number(height.value); update(); this.run(() => this.plugin.persist()); }; height.onchange = () => this.run(() => this.plugin.persist());
    width.onchange = () => { settings.lineWidth = Number(width.value) as 28 | 36 | 44; update(); this.run(() => this.plugin.persist()); };
    panel.onkeydown = event => { if (event.key === 'Escape' && !event.isComposing) { event.preventDefault(); event.stopPropagation(); this.appearanceOpen = false; this.renderReader(true); } };
  }
}

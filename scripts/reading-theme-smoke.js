// Async function body for qiaomu-obsidian-dev/scripts/host_eval.py; QA vault only.
const p = app.plugins.plugins['stocks-ai-rss'];
const results = [];
const check = (name, ok) => { if (!ok) throw Error(name); results.push(name); };
const luminance = color => {
  const rgb = color.match(/[\d.]+/g).slice(0, 3).map(Number).map(v => v / 255).map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
};
const contrast = (a, b) => (Math.max(luminance(a), luminance(b)) + 0.05) / (Math.min(luminance(a), luminance(b)) + 0.05);
const pause = () => new Promise(resolve => setTimeout(resolve, 80));
const leaves = app.workspace.getLeavesOfType('stocks-ai-rss-reader');
const first = leaves[0] || app.workspace.getLeaf('tab');
if (!leaves.length) await first.setViewState({ type: 'stocks-ai-rss-reader', active: true });
await app.workspace.revealLeaf(first);
const second = app.workspace.getLeaf('split');
await second.setViewState({ type: 'stocks-ai-rss-reader', active: true });
const view = first.view;
const oldTheme = p.state.settings.readingTheme;
const wasDark = document.body.classList.contains('theme-dark');
const dataBefore = JSON.stringify({ readIds: p.state.readIds, favorites: p.state.favorites, subscriptions: p.state.subscriptions, articleNotes: p.state.articleNotes });
try {
  view.bundle = { entry: { id: 'reading-color-qa', sourceId: 'qa', title: '夜间阅读 · 配色验收', content: '<p>阅读应当安静、清晰。字号、行距和背景都可以按自己的习惯调整。</p>'.repeat(100) }, fetchedAt: 1 };
  view.mode = 'original'; view.articleLoading = false; view.contentEl.addClass('qrs-has-article'); view.renderReader();
  const more = [...view.contentEl.querySelectorAll('button')].find(b => /^(更多|More actions)/.test(b.textContent.trim()));
  check('Existing more menu is available', !!more); more.click(); await pause();
  const readingItem = [...document.querySelectorAll('.menu-item')].find(el => /阅读设置|Reading settings/.test(el.textContent));
  check('Existing reading settings menu entry', !!readingItem); readingItem.click(); await pause();
  const select = view.contentEl.querySelector('select[data-qrs-reading-theme]');
  check('Seven color options in existing settings', select && select.options.length === 7);
  const article = view.contentEl.querySelector('.qrs-article');
  const reader = view.contentEl.querySelector('.qrs-reader');
  const bodyStyle = document.body.getAttribute('style');
  const expected = { light: 'rgb(255, 255, 255)', paper: 'rgb(248, 245, 238)', sage: 'rgb(237, 242, 236)', mist: 'rgb(243, 245, 248)', dark: 'rgb(23, 28, 36)', black: 'rgb(0, 0, 0)' };
  for (const host of ['theme-light', 'theme-dark']) {
    document.body.classList.remove('theme-light', 'theme-dark'); document.body.classList.add(host);
    for (const mode of ['light', 'paper', 'sage', 'mist', 'dark', 'black', 'auto']) {
      reader.scrollTop = 280;
      const beforeTop = reader.scrollTop;
      select.value = mode; select.dispatchEvent(new Event('change', { bubbles: true })); await p.persist(); await pause();
      check(`${host}/${mode}: state and persistence`, p.state.settings.readingTheme === mode && (await p.loadData()).settings.readingTheme === mode);
      check(`${host}/${mode}: both readers updated`, [first, second].every(l => l.view.contentEl.dataset.qrsTheme === mode));
      check(`${host}/${mode}: article node and position preserved`, view.contentEl.querySelector('.qrs-article') === article && reader.scrollTop === beforeTop);
      check(`${host}/${mode}: host untouched`, document.body.classList.contains(host) && document.body.getAttribute('style') === bodyStyle);
      const root = getComputedStyle(view.contentEl);
      if (mode !== 'auto') {
        const control = getComputedStyle(select);
        check(`${host}/${mode}: dropdown contrast`, contrast(control.color, control.backgroundColor) >= 4.5);
        check(`${host}/${mode}: body contrast`, contrast(root.color, root.backgroundColor) >= 4.5);
        check(`${host}/${mode}: expected canvas`, root.backgroundColor === expected[mode]);
        check(`${host}/${mode}: settings match canvas`, getComputedStyle(view.contentEl.querySelector('.qrs-reading-settings')).backgroundColor === expected[mode]);
        check(`${host}/${mode}: selected row remains readable`, root.getPropertyValue('--qrs-row-text').trim() === root.getPropertyValue('--qrs-fg').trim());
      } else {
        check(`${host}/auto: host canvas restored`, root.backgroundColor === getComputedStyle(document.body).getPropertyValue('--background-primary').trim() || root.getPropertyValue('--background-primary').trim() === getComputedStyle(document.body).getPropertyValue('--background-primary').trim());
      }
    }
  }
  p.openSettings(); await pause();
  const tab = app.setting.activeTab;
  const dropdown = [...tab.containerEl.querySelectorAll('select')].find(s => [...s.options].some(o => o.value === 'paper'));
  check('Plugin settings also expose colors', !!dropdown);
  dropdown.value = 'dark'; dropdown.dispatchEvent(new Event('change', { bubbles: true })); await p.persist(); await pause();
  check('Plugin settings synchronizes open front panel', select.value === 'dark' && view.contentEl.dataset.qrsTheme === 'dark');
  app.setting.close();
  check('Library data preserved', dataBefore === JSON.stringify({ readIds: p.state.readIds, favorites: p.state.favorites, subscriptions: p.state.subscriptions, articleNotes: p.state.articleNotes }));
  return { version: p.manifest.version, assertions: results.length, results };
} finally {
  p.state.settings.readingTheme = oldTheme; p.refreshReadingTheme(); await p.persist();
  document.body.classList.remove('theme-light', 'theme-dark'); document.body.classList.add(wasDark ? 'theme-dark' : 'theme-light');
  app.setting.close(); second.detach();
}

// Async host_eval.py body; run only in a QA vault after installing the candidate.
const p=app.plugins.plugins['stocks-ai-rss'];
const v=app.workspace.getLeavesOfType('stocks-ai-rss-reader')[0].view;
for(let attempt=0;v.loading&&attempt<100;attempt++)await new Promise(r=>setTimeout(r,100));
if(v.loading)throw Error('Wait for the feed to finish loading');
const previous={entries:v.entries,filter:v.filter,query:v.query,source:v.source,theme:p.state.settings.readingTheme,readIds:[...p.state.readIds]};
const results=[];const check=(name,ok)=>{if(!ok)throw Error(name);results.push(name);};
const image=v.entries.find(e=>e.image)?.image;
try {
  v.source='';v.filter='all';v.query='';
  v.entries=[
    {id:'list-qa-image',sourceId:'qa-a',sourceName:'Kākāpō 中文来源',title:'带图文章：快速扫视与清晰的文字层次',summaryZh:'这是一段足够长的中文摘要，用来验证图片旁边仍然能显示两行文字，同时不会挤压右侧日期和缩略图。'.repeat(3),publishedTs:1790467200000,image},
    {id:'list-qa-plain',sourceId:'qa-b',sourceName:'OpenRouter',title:'不带图片的已读文章保持清晰',summaryZh:'没有图片时，标题和摘要应当利用整行宽度，和带图文章使用相同的日期对齐位置。'.repeat(3),publishedTs:1790467200000},
    {id:'list-qa-podcast',sourceId:'podscribe-qa',sourceName:'Podcast 播客',title:'带播放数据的播客日期也在最右侧',summaryZh:'这是播客简介，也应当支持两行显示。'.repeat(6),podcastViews:1234,podcastDurationSeconds:3600,publishedTs:1790467200000,image}
  ];
  p.state.readIds.push('list-qa-plain');v.renderList();await new Promise(r=>setTimeout(r,300));
  for(const mode of ['light','paper','sage','mist','dark','black','auto']) {
    p.state.settings.readingTheme=mode;p.refreshReadingTheme();
    const rows=[...v.contentEl.querySelectorAll('.qrs-entry')];
    const dates=rows.map(r=>r.querySelector('.qrs-date').getBoundingClientRect().right);
    check(`${mode}: dates align including podcast facts`,Math.max(...dates)-Math.min(...dates)<1);
    for(const row of rows) {
      const title=row.querySelector('h3'),summary=row.querySelector('.qrs-summary'),thumb=row.querySelector('.qrs-entry-thumb');
      check(`${mode}/${row.dataset.entryId}: system list font`,getComputedStyle(title).fontFamily.includes('PingFang SC'));
      check(`${mode}/${row.dataset.entryId}: two summary lines`,getComputedStyle(summary).webkitLineClamp==='2'&&summary.getBoundingClientRect().height<=40.5);
      check(`${mode}/${row.dataset.entryId}: no horizontal overflow`,row.scrollWidth<=row.clientWidth+1);
      if(thumb)check(`${mode}/${row.dataset.entryId}: thumbnail 64px aligned with title`,Math.abs(thumb.getBoundingClientRect().width-64)<1&&Math.abs(thumb.getBoundingClientRect().top-title.getBoundingClientRect().top)<4);
      else check(`${mode}/${row.dataset.entryId}: full text width`,Math.abs(summary.getBoundingClientRect().right-row.querySelector('.qrs-entry-meta').getBoundingClientRect().right)<1);
    }
    check(`${mode}: read title remains regular`,getComputedStyle(rows[1].querySelector('h3')).fontWeight==='400');
    check(`${mode}: unread title remains semibold`,getComputedStyle(rows[0].querySelector('h3')).fontWeight==='600');
  }
  return {version:p.manifest.version,assertions:results.length,results};
} finally {
  v.entries=previous.entries;v.filter=previous.filter;v.query=previous.query;v.source=previous.source;
  p.state.readIds=previous.readIds;p.state.settings.readingTheme=previous.theme;p.refreshReadingTheme();v.renderList();
}

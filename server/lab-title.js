// Install beside lab-collection.js in QMReader lib/. Preserve the original title.
async function collectionTitle(entry, { deepseek, fetcher }) {
  const current = fetcher.getEntryById(entry.id) || entry;
  if (!deepseek.needsTitleTranslation(current.title)) return { title: current.title, originalTitle: current.title };
  let title = current.titleZh;
  if (!title || !/[\u3400-\u9fff]/.test(title)) {
    const result = await deepseek.translateTitleBatch([current], { author: '乔木 RSS 实验室' });
    title = result.translations.find(item => item.entryId === entry.id)?.titleZh;
  }
  if (!title || !/[\u3400-\u9fff]/.test(title)) throw new Error('Chinese title not ready');
  return { title, originalTitle: current.title };
}
module.exports = { collectionTitle };

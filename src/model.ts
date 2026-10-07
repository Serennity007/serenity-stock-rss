import { migrateLibrary } from './personal-library';
import { z } from 'zod';
import { t } from './i18n';

export const modeSchema = z.enum(['rewrite', 'translation', 'original']);
export type Mode = z.infer<typeof modeSchema>;
export function modeLabel(mode: Mode): string {
  return t(mode === 'rewrite' ? 'mode.rewrite' : mode === 'translation' ? 'mode.translation' : 'mode.original');
}
export const readingThemeSchema = z.enum(['auto', 'light', 'paper', 'sage', 'mist', 'dark', 'black']);
export type ReadingTheme = z.infer<typeof readingThemeSchema>;
export const readingFontSchema = z.enum(['serif', 'sans', 'sourceHanSerif', 'sourceHanSans', 'wenkai', 'zhenkai', 'fangsong', 'custom']);
export type ReadingFont = z.infer<typeof readingFontSchema>;
const optionalText = z.string().nullish();
export const rewriteSchema = z.object({ title: optionalText, body: z.string() });
export const translationSchema = z.object({
  titleZh: optionalText, summaryZh: optionalText,
  content: z.array(z.object({ source: optionalText, target: optionalText, sourceHtml: optionalText, targetHtml: optionalText })).nullish(),
});
export const entrySchema = z.object({
  id: z.string().min(1), sourceId: z.string(), origin: z.enum(['local', 'qiaomu', 'vault']).optional(), sourceName: optionalText, title: z.string(), titleZh: optionalText,
  markdownPath: optionalText, markdown: optionalText, podcastSlug: optionalText, episodeSlug: optionalText,
  link: optionalText, videoUrl: optionalText, author: optionalText, published: optionalText, publishedTs: z.number().nullish(),
  publishedRelative: optionalText, podcastViews: z.number().int().nonnegative().nullish(),
  podcastWordCount: z.number().int().nonnegative().nullish(), podcastDurationSeconds: z.number().int().nonnegative().nullish(),
  summary: optionalText, summaryZh: optionalText, content: optionalText, image: optionalText,
  audio: z.object({ url: z.string(), type: optionalText }).nullish(),
  rewrite: rewriteSchema.nullish(),
});
export type Entry = z.infer<typeof entrySchema>;
export const sourceSchema = z.object({ id: z.string(), name: z.string(), category: optionalText, siteUrl: optionalText, enabled: z.boolean().optional() });
export type Source = z.infer<typeof sourceSchema>;
export const bundleSchema = z.object({ entry: entrySchema, rewrite: rewriteSchema.nullable(), translation: translationSchema.nullable(), fetchedAt: z.number() });
export type Bundle = z.infer<typeof bundleSchema>;
export const pageSchema = z.object({ entries: z.array(entrySchema), hasMore: z.boolean().optional(), nextCursor: z.string().nullish() });
export const subscriptionSchema = z.object({
  id: z.string(), url: z.string(), name: z.string(), group: z.string().default(''), site: z.string().optional(), image: z.string().optional(),
  entries: z.array(entrySchema).default([]), updatedAt: z.number().default(0), lastAttemptAt: z.number().default(0), error: z.string().default(''),
});
export type Subscription = z.infer<typeof subscriptionSchema>;
export const channelStateSchema = z.object({
  entries: z.array(entrySchema), bundle: bundleSchema.nullable(), mode: modeSchema,
  filter: z.enum(['all', 'unread', 'favorites']), query: z.string(), unread: z.array(z.string()),
  cursor: z.string(), hasMore: z.boolean(), listTop: z.number().nonnegative(), readerTop: z.number().nonnegative(),
  articlePending: z.boolean(),
});
export type ChannelState = z.infer<typeof channelStateSchema>;
export const stateSchema = z.object({
  libraryVersion: z.number().int().min(0).max(1).default(0),
  subscriptionGroups: z.array(z.object({ id: z.string(), name: z.string(), order: z.number() })).default([]),
  sourceMeta: z.record(z.string(), z.object({ groupId: z.string(), name: z.string().default(''), order: z.number().default(0) })).default({}),
  collapsedGroups: z.array(z.string()).default([]),
  settings: z.object({
    folder: z.string().default('Stocks RSS'),
    defaultMode: modeSchema.default('original'), remoteImages: z.boolean().default(true), listWidth: z.number().min(220).max(520).default(300),
    readingTheme: readingThemeSchema.catch('auto').default('auto'),
    fontSize: z.number().int().min(14).max(32).default(19), customFont: z.string().max(200).catch('').default(''), fontFamily: readingFontSchema.default('fangsong'),
    lineHeight: z.number().min(1.5).max(2.4).default(1.9), lineWidth: z.union([z.literal(28), z.literal(36), z.literal(44)]).default(36),
    selectionPopup: z.boolean().default(true), markdownFolders: z.array(z.string()).default([]),
    lastSource: z.string().max(300).default(''), articleFolder: z.string().default('Stocks RSS/文章'), pdfDirectory: z.string().default(''),
  }).default({ folder: 'Stocks RSS', articleFolder: 'Stocks RSS/文章', pdfDirectory: '', defaultMode: 'original', remoteImages: true, listWidth: 300,
    readingTheme: 'auto', fontSize: 19, fontFamily: 'fangsong', customFont: '', lineHeight: 1.9, lineWidth: 36, lastSource: '', selectionPopup: true, markdownFolders: [] }),
  readIds: z.array(z.string()).default([]), favorites: z.record(z.string(), bundleSchema).default({}),
  subscriptions: z.array(subscriptionSchema).default([]),
  channelStates: z.record(z.string(), channelStateSchema).catch({}).default({}),
  savedArticles: z.record(z.string(), bundleSchema).default({}),
  // "<entry id>|<mode>" → vault path of the note that article was saved as.
  articleNotes: z.record(z.string(), z.string()).catch({}).default({}),
  cache: z.record(z.string(), bundleSchema).default({}), updatedAt: z.number().default(0),
});
export type State = z.infer<typeof stateSchema>;
export function initialState(data: unknown): State {
  const state = stateSchema.parse(data ?? {});
  migrateLibrary(state);
  return state;
}
export function titleOf(entry: Entry): string { return entry.titleZh?.trim() || entry.title; }
export function safeUrl(value: string, base?: string): string | null {
  try {
    const url = new URL(value, base);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}
export function folderPath(value: string): string {
  const segments = value.trim().replace(/\\/g, '/').split('/');
  if (!segments.length || segments.some(s => !s || s.startsWith('.') || /[:*?"<>|]/.test(s) || [...s].some(c => c.charCodeAt(0) < 32))) {
    throw new Error(t('error.folderNameInvalid'));
  }
  return segments.join('/');
}
export const articleNoteKey = (entryId: string, mode: Mode) => `${entryId}|${mode}`;
/** Follows a renamed or moved note (or a folder containing notes) so saved-article links keep pointing at it. */
export function renameArticleNotes(notes: Record<string, string>, oldPath: string, newPath: string): boolean {
  let changed = false;
  for (const [key, path] of Object.entries(notes)) {
    if (path === oldPath) { notes[key] = newPath; changed = true; }
    else if (path.startsWith(oldPath + '/')) { notes[key] = newPath + path.slice(oldPath.length); changed = true; }
  }
  return changed;
}


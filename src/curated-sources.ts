import type { Entry, Source, State } from './model';
import { communityChannelSources, readerChannelSources } from './discovery';

export function pickedSources(state: State): Set<string> | null {
  return state.settings.pickedSourceIds === null ? null : new Set(state.settings.pickedSourceIds);
}
export function curatedChannels(state: State): Source[] {
  const picked = pickedSources(state);
  return picked === null ? readerChannelSources(state.sources) : state.sources.filter(source => picked.has(source.id) && source.category !== 'community');
}
export function curatedCommunityChannels(state: State): Source[] {
  const picked = pickedSources(state);
  return picked === null ? communityChannelSources(state.sources) : state.sources.filter(source => picked.has(source.id) && source.category === 'community');
}
/** Personal RSS, vault notes and explicitly followed shows are independent of curated picks. */
export function keepCuratedEntry(state: State, entry: Entry): boolean {
  const picked = state.settings.pickedSourceIds;
  return picked === null || entry.origin === 'local' || entry.origin === 'vault' || !!entry.podcastSlug || state.settings.followedPodcasts.includes(entry.sourceId) || picked.includes(entry.sourceId);
}
export function filterCuratedEntries(state: State, entries: Entry[]): Entry[] {
  return entries.filter(entry => keepCuratedEntry(state, entry));
}
export function applyCuratedPicks(state: State): void {
  if (state.settings.pickedSourceIds === null) return;
  state.entries = filterCuratedEntries(state, state.entries);
  for (const channel of Object.values(state.channelStates)) {
    channel.entries = filterCuratedEntries(state, channel.entries);
    if (channel.bundle && !keepCuratedEntry(state, channel.bundle.entry)) { channel.bundle = null; channel.articlePending = false; }
  }
}

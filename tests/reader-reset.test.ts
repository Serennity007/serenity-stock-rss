// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';

vi.mock('obsidian', async original => ({
  ...await original<object>(),
  Component: class {},
  ItemView: class {},
  Modal: class {},
  FuzzySuggestModal: class {},
  TFile: class {},
  Notice: vi.fn(class { hide = vi.fn(); }),
  Platform: { isDesktopApp: false, isMobileApp: false },
}));

import { ReaderView } from '../src/view';
import { initialState } from '../src/model';

function makeView(lastSource: string, groupIds: string[]) {
  const state = initialState({});
  state.settings.lastSource = lastSource;
  state.subscriptionGroups = groupIds.map((id, order) => ({ id, name: `Group ${id}`, order }));
  const view = Object.assign(Object.create(ReaderView.prototype), {
    plugin: { state },
    reader: undefined, audioDock: undefined, channelPicker: undefined, checkpointTimer: undefined,
    unreadSession: new Set<string>(), closed: false,
    listVersion: 0, articleVersion: 0,
    thumbnailVersion: 0, thumbnailUrls: new Map(), thumbnailPending: new Set(),
    clearImages: vi.fn(),
    localEntries: vi.fn(() => []),
    build: vi.fn(), renderList: vi.fn(), renderReader: vi.fn(),
    restoreChannel: vi.fn(), loadEntries: vi.fn(() => Promise.resolve()),
  }) as { reset(): void; source: string };
  return view;
}

describe('reader reopen keeps a valid group selection', () => {
  it('restores a stable group ID even when the group has no RSS feeds', () => {
    const view = makeView('@group:empty-group', ['empty-group']);
    view.reset();
    expect(view.source).toBe('@group:empty-group');
  });
  it('falls back to all subscriptions only for a group that no longer exists', () => {
    const view = makeView('@group:deleted-group', ['other-group']);
    view.reset();
    expect(view.source).toBe('@local');
  });
  it('still restores @local and vault sources as before', () => {
    const view = makeView('@local', []);
    view.reset();
    expect(view.source).toBe('@local');
  });
});

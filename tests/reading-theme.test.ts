import { describe, expect, it } from 'vitest';
import { initialState } from '../src/model';

describe('reading color upgrade', () => {
  it('defaults old settings to the host theme without losing reading data', () => {
    const previous = { settings: { fontSize: 23, lineHeight: 2.1 }, readIds: ['kept'], articleNotes: { 'kept|original': 'Reading/kept.md' } };
    const next = initialState(previous);
    expect(next.settings.readingTheme).toBe('auto');
    expect(next.settings.fontSize).toBe(23);
    expect(next.settings.lineHeight).toBe(2.1);
    expect(next.readIds).toEqual(previous.readIds);
    expect(next.articleNotes).toEqual(previous.articleNotes);
  });
  it.each(['auto', 'light', 'paper', 'dark'])('preserves %s through save and reload', readingTheme => {
    const state = initialState({ settings: { readingTheme } });
    expect(initialState(JSON.parse(JSON.stringify(state))).settings.readingTheme).toBe(readingTheme);
  });
  it('tolerates an unknown theme without preventing the library from loading', () => {
    const state = initialState({ settings: { readingTheme: 'future-theme' }, readIds: ['kept'] });
    expect(state.settings.readingTheme).toBe('auto');
    expect(state.readIds).toEqual(['kept']);
  });
});

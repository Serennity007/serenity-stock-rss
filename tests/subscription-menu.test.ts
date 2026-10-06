// @vitest-environment jsdom
import type { Menu } from 'obsidian';
import { describe, expect, it, vi } from 'vitest';
import { showSubscriptionMenu } from '../src/subscription-menu';

describe('subscription menu placement', () => {
  it('uses the anchor document and requests inward alignment at the right edge', () => {
    const other = document.implementation.createHTMLDocument('detached window fixture');
    const anchor = other.createElement('button');
    anchor.getBoundingClientRect = () => ({ left: 970, right: 1002, top: 700, bottom: 732, width: 32, height: 32, x: 970, y: 700, toJSON: () => ({}) });
    const showAtPosition = vi.fn();
    const menu = { showAtPosition, setUseNativeMenu: vi.fn() };
    menu.setUseNativeMenu.mockReturnValue(menu);
    showSubscriptionMenu(menu as unknown as Menu, anchor);
    expect(menu.setUseNativeMenu).toHaveBeenCalledExactlyOnceWith(true);
    expect(showAtPosition).toHaveBeenCalledExactlyOnceWith({ x: 970, y: 732, width: 32, overlap: true, left: true }, other);
  });
});

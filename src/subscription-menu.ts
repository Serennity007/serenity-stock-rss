import type { Menu } from 'obsidian';

/** Let the host handle viewport fitting (and native desktop stacking). */
export function showSubscriptionMenu(menu: Menu, anchor: HTMLElement) {
  const rect = anchor.getBoundingClientRect();
  menu.setUseNativeMenu(true).showAtPosition({ x: rect.left, y: rect.bottom, width: rect.width, overlap: true, left: true }, anchor.ownerDocument);
}

/**
 * Higher-level async user interaction helpers for test environments.
 */

import { fire } from '@vielzeug/assay';

import { flush } from './flush';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Type characters into a focused field, firing the full per-char event sequence. */
const typeChars = async (el: HTMLInputElement | HTMLTextAreaElement, text: string): Promise<void> => {
  for (const char of text) {
    el.value += char;
    fire.input(el);
    fire.keyDown(el, { key: char });
    fire.keyUp(el, { key: char });
    await flush();
  }
  fire.change(el);
};

// ─── API ─────────────────────────────────────────────────────────────────────

/**
 * Higher-level async user interactions that mirror real browser behavior.
 *
 * @example
 * await user.type(input, 'hello');
 * await user.fill(input, 'replacement'); // clear then type
 * await user.click(button);
 * await user.press(input, 'Enter');
 */
export const user = {
  async clear(el: HTMLInputElement | HTMLTextAreaElement): Promise<void> {
    el.focus();
    el.value = '';
    fire.input(el);
    fire.change(el);
    await flush();
  },

  async click(el: Element, opts?: PointerEventInit): Promise<void> {
    fire.pointerEnter(el, opts);
    fire.pointerDown(el, opts);
    fire.pointerUp(el, opts);
    fire.click(el, opts);
    await flush();
  },

  async dblClick(el: Element): Promise<void> {
    for (let i = 0; i < 2; i++) {
      fire.pointerDown(el);
      fire.pointerUp(el);
      fire.click(el);
    }
    el.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true }));
    await flush();
  },

  /** Clear existing value and type new text (select-all-and-replace semantics) */
  async fill(el: HTMLInputElement | HTMLTextAreaElement, text: string): Promise<void> {
    el.focus();
    el.value = '';
    await typeChars(el, text);
  },

  async hover(el: Element): Promise<void> {
    fire.pointerEnter(el);
    await flush();
  },

  /** Dispatch keydown + keyup for a single key */
  async press(el: Element, key: string, opts?: KeyboardEventInit): Promise<void> {
    fire.keyDown(el, { key, ...opts });
    fire.keyUp(el, { key, ...opts });
    await flush();
  },

  async select(el: HTMLSelectElement, value: string | string[]): Promise<void> {
    const values = Array.isArray(value) ? value : [value];

    for (const opt of el.options) opt.selected = values.includes(opt.value);
    fire.change(el);
    await flush();
  },

  /** Type text character-by-character, appending to any existing value */
  async type(el: HTMLInputElement | HTMLTextAreaElement, text: string): Promise<void> {
    el.focus();
    await typeChars(el, text);
  },

  async unhover(el: Element): Promise<void> {
    fire.pointerLeave(el);
    await flush();
  },
} as const;

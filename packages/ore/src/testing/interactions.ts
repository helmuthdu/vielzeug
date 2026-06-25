/**
 * Higher-level async user interaction helpers for test environments.
 */

import { fire } from './events';
import { flush } from './flush';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const tick = (): Promise<void> => flush();

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
    await tick();
  },

  async click(el: Element, opts?: PointerEventInit): Promise<void> {
    fire.pointerEnter(el, opts);
    fire.click(el, opts);
    await tick();
  },

  async dblClick(el: Element): Promise<void> {
    for (let i = 0; i < 2; i++) {
      fire.pointerDown(el);
      fire.pointerUp(el);
      fire.click(el);
    }
    el.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true }));
    await tick();
  },

  /** Clear existing value and type new text (select-all-and-replace semantics) */
  async fill(el: HTMLInputElement | HTMLTextAreaElement, text: string): Promise<void> {
    el.focus();
    el.value = '';
    for (const char of text) {
      el.value += char;
      fire.input(el);
      fire.keyDown(el, { key: char });
      fire.keyUp(el, { key: char });
      await tick();
    }
    fire.change(el);
  },

  async hover(el: Element): Promise<void> {
    fire.pointerEnter(el);
    await tick();
  },

  /** Dispatch keydown + keyup for a single key */
  async press(el: Element, key: string, opts?: KeyboardEventInit): Promise<void> {
    fire.keyDown(el, { key, ...opts });
    fire.keyUp(el, { key, ...opts });
    await tick();
  },

  async select(el: HTMLSelectElement, value: string | string[]): Promise<void> {
    const values = Array.isArray(value) ? value : [value];

    for (const opt of el.options) opt.selected = values.includes(opt.value);
    fire.change(el);
    await tick();
  },

  /** Type text character-by-character, appending to any existing value */
  async type(el: HTMLInputElement | HTMLTextAreaElement, text: string): Promise<void> {
    el.focus();
    for (const char of text) {
      el.value += char;
      fire.input(el);
      fire.keyDown(el, { key: char });
      fire.keyUp(el, { key: char });
      await tick();
    }
    fire.change(el);
  },

  async unhover(el: Element): Promise<void> {
    fire.pointerLeave(el);
    await tick();
  },
} as const;

/**
 * Synchronous DOM event dispatchers for test environments.
 */

// ─── Helpers ─────────────────────────────────────────────────────────────────

export const createPointerEvent = (type: string, init: PointerEventInit = {}): Event => {
  if (typeof PointerEvent !== 'undefined') {
    return new PointerEvent(type, init);
  }

  return new MouseEvent(type, init);
};

// ─── API ─────────────────────────────────────────────────────────────────────

/**
 * Fire low-level DOM events synchronously.
 *
 * @example
 * fire.click(button);
 * fire.keyDown(input, { key: 'Enter' });
 * fire.custom(el, 'value-change', { detail: 42 });
 */
export const fire = {
  blur: (el: Element, opts?: FocusEventInit) => el.dispatchEvent(new FocusEvent('blur', { bubbles: true, ...opts })),
  change: (el: Element, opts?: EventInit) => el.dispatchEvent(new Event('change', { bubbles: true, ...opts })),
  click: (el: Element, opts?: PointerEventInit) =>
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, ...opts })),
  /** Fire a CustomEvent. Pass `{ detail: ... }` for event detail. */
  custom(el: Element, name: string, opts?: CustomEventInit): void {
    el.dispatchEvent(new CustomEvent(name, { bubbles: true, cancelable: true, composed: false, ...opts }));
  },
  /** Dispatch any pre-built Event instance directly. */
  event(el: Element, event: Event): void {
    el.dispatchEvent(event);
  },
  focus: (el: Element, _name?: string, opts?: FocusEventInit) =>
    el.dispatchEvent(new FocusEvent('focus', { bubbles: true, ...opts })),
  input: (el: Element, opts?: EventInit) => el.dispatchEvent(new Event('input', { bubbles: true, ...opts })),
  keyDown: (el: Element, opts?: KeyboardEventInit) =>
    el.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...opts })),
  /** Fire a KeyboardEvent with a given type (keydown, keyup, keypress). */
  keyboard: (el: Element, type: string, opts?: KeyboardEventInit) =>
    el.dispatchEvent(new KeyboardEvent(type, { bubbles: true, cancelable: true, ...opts })),
  keyUp: (el: Element, opts?: KeyboardEventInit) =>
    el.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, cancelable: true, ...opts })),
  /** Fire a MouseEvent with a given type (click, mousedown, etc.). */
  mouse: (el: Element, type: string, opts?: MouseEventInit) =>
    el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, ...opts })),
  pointerDown: (el: Element, opts?: PointerEventInit) =>
    el.dispatchEvent(createPointerEvent('pointerdown', { bubbles: true, cancelable: true, ...opts })),
  pointerEnter: (el: Element, opts?: PointerEventInit) =>
    el.dispatchEvent(createPointerEvent('pointerenter', { bubbles: false, ...opts })),
  pointerLeave: (el: Element, opts?: PointerEventInit) =>
    el.dispatchEvent(createPointerEvent('pointerleave', { bubbles: false, ...opts })),
  pointerUp: (el: Element, opts?: PointerEventInit) =>
    el.dispatchEvent(createPointerEvent('pointerup', { bubbles: true, cancelable: true, ...opts })),
  submit: (el: Element, opts?: EventInit) =>
    el.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true, ...opts })),
  /** Fire a touch event; falls back to CustomEvent in environments without TouchEvent. */
  touch(el: Element, type: string, opts?: EventInit): void {
    if (typeof TouchEvent !== 'undefined') {
      el.dispatchEvent(new TouchEvent(type, { bubbles: true, cancelable: true, ...opts }));
    } else {
      el.dispatchEvent(new CustomEvent(type, { bubbles: true, cancelable: true, ...opts }));
    }
  },
} as const;

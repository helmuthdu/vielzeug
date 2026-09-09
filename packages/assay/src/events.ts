/**
 * # Confidence boundary — read first
 *
 * `dispatch` is a **low-level synthetic-event dispatch API**. It fires a caller-
 * supplied DOM `Event` synchronously and returns the `dispatchEvent`
 * result. It does **not** model real user interaction: there is no focus/blur
 * sequencing, no input-event coordination, no keyboard layout, no pointer
 * hit-testing, and no trust flag (`event.isTrusted` is always `false`).
 *
 * Use it to drive event handlers in unit/integration tests where you control
 * the exact event shape. For **behavioral confidence** — that a real click
 * actually activates a control, that focus management works end-to-end, that
 * keyboard shortcuts fire under a real input device — write Playwright tests.
 * Assay deliberately stops at the dispatch boundary; anything that depends on
 * the browser's interaction semantics belongs in a browser-driven suite.
 */

/** Dispatch a pre-built `Event` instance unchanged. Returns the `dispatchEvent` result. */
export const dispatch = (target: EventTarget, event: Event): boolean => target.dispatchEvent(event);

/** Synthetic convenience dispatchers. They share the same confidence boundary as `dispatch()`. */
export const fireBlur = (target: EventTarget, init: FocusEventInit = {}): boolean =>
  dispatch(target, new FocusEvent('blur', init));

export const fireChange = (target: EventTarget, init: EventInit = {}): boolean =>
  dispatch(target, new Event('change', { bubbles: true, ...init }));

export const fireClick = (target: EventTarget, init: MouseEventInit = {}): boolean =>
  dispatch(target, new MouseEvent('click', { bubbles: true, cancelable: true, ...init }));

export const fireCustom = <T>(target: EventTarget, type: string, init: CustomEventInit<T> = {}): boolean =>
  dispatch(target, new CustomEvent(type, { bubbles: true, cancelable: true, composed: false, ...init }));

export const fireFocus = (target: EventTarget, init: FocusEventInit = {}): boolean =>
  dispatch(target, new FocusEvent('focus', init));

export const fireInput = (target: EventTarget, init: InputEventInit = {}): boolean =>
  dispatch(target, new InputEvent('input', { bubbles: true, ...init }));

export const fireKeyDown = (target: EventTarget, init: KeyboardEventInit = {}): boolean =>
  dispatch(target, new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init }));

export const fireKeyUp = (target: EventTarget, init: KeyboardEventInit = {}): boolean =>
  dispatch(target, new KeyboardEvent('keyup', { bubbles: true, cancelable: true, ...init }));

export const fireSubmit = (target: EventTarget, init: SubmitEventInit = {}): boolean =>
  dispatch(target, new SubmitEvent('submit', { bubbles: true, cancelable: true, ...init }));

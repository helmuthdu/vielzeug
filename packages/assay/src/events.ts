/** Synchronous, exact DOM event dispatchers for test environments. */

/** Dispatch an event instance without modifying it. */
export const dispatch = (target: EventTarget, event: Event): boolean => target.dispatchEvent(event);

export const fireBlur = (target: EventTarget, init: FocusEventInit = {}): boolean =>
  dispatch(target, new FocusEvent('blur', init));

export const fireChange = (target: EventTarget, init: EventInit = {}): boolean =>
  dispatch(target, new Event('change', { bubbles: true, ...init }));

export const fireClick = (target: EventTarget, init: MouseEventInit = {}): boolean =>
  dispatch(target, new MouseEvent('click', { bubbles: true, cancelable: true, ...init }));

export interface CustomEventOptions<T> extends CustomEventInit<T> {
  type: string;
}

export const fireCustom = <T>(target: EventTarget, { type, ...init }: CustomEventOptions<T>): boolean =>
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

export {
  createCleanupSignal,
  effect,
  handle,
  onCleanup,
  onElement,
  onError,
  onMount,
  watch,
} from './runtime-lifecycle';
export type { HostEventListeners, HostEventMap } from './runtime-lifecycle';

type FireDefaults = Pick<EventInit, 'bubbles' | 'cancelable' | 'composed'>;

export type FireApi = {
  custom<Detail = unknown>(target: EventTarget, type: string, options?: CustomEventInit<Detail>): boolean;
  event(target: EventTarget, event: Event): boolean;
  focus(target: EventTarget, type: string, options?: FocusEventInit): boolean;
  keyboard(target: EventTarget, type: string, options?: KeyboardEventInit): boolean;
  mouse(target: EventTarget, type: string, options?: MouseEventInit): boolean;
  touch(target: EventTarget, type: string, options?: TouchEventInit): boolean;
};

const DEFAULT_FIRE_OPTIONS: FireDefaults = { bubbles: true, cancelable: true, composed: true };

/**
 * Dispatch DOM events explicitly without guessing constructors from the event name.
 *
 * @example
 * fire.mouse(el, 'click');
 * fire.keyboard(el, 'keydown', { key: 'Enter' });
 * fire.custom(el, 'change', { detail: { value: 42 } });
 * fire.event(el, new PointerEvent('pointerdown'));
 */
export const fire: FireApi = {
  custom<Detail = unknown>(target: EventTarget, type: string, options: CustomEventInit<Detail> = {}) {
    return target.dispatchEvent(new CustomEvent<Detail>(type, { ...DEFAULT_FIRE_OPTIONS, ...options }));
  },
  event(target, event) {
    return target.dispatchEvent(event);
  },
  focus(target, type, options = {}) {
    return target.dispatchEvent(new FocusEvent(type, { ...DEFAULT_FIRE_OPTIONS, ...options }));
  },
  keyboard(target, type, options = {}) {
    return target.dispatchEvent(new KeyboardEvent(type, { ...DEFAULT_FIRE_OPTIONS, ...options }));
  },
  mouse(target, type, options = {}) {
    return target.dispatchEvent(new MouseEvent(type, { ...DEFAULT_FIRE_OPTIONS, ...options }));
  },
  touch(target, type, options = {}) {
    if (typeof TouchEvent !== 'undefined') {
      return target.dispatchEvent(new TouchEvent(type, { ...DEFAULT_FIRE_OPTIONS, ...options }));
    }

    return target.dispatchEvent(new CustomEvent(type, { ...DEFAULT_FIRE_OPTIONS, ...options }));
  },
};

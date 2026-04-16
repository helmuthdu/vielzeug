import {
  computed,
  effect as _effect,
  isSignal,
  onCleanup as _onCleanup,
  signal,
  watch as _watch,
  type CleanupFn,
  type EffectCallback,
  type EffectOptions,
  type ReadonlySignal,
  type Signal,
  type Subscription,
  type WatchOptions,
} from '@vielzeug/stateit';

import { listen, type CSSResult } from './internal';

export type ComponentRuntime = {
  cleanups: CleanupFn[];
  el: HTMLElement;
  errorHandlers: ((err: unknown) => void)[];
  onMount: (() => CleanupFn | undefined | void)[];
  styles?: (string | CSSStyleSheet | CSSResult)[];
};

export const runtimeStack: ComponentRuntime[] = [];

export const currentRuntime = (): ComponentRuntime => {
  const rt = runtimeStack[runtimeStack.length - 1];

  if (!rt) throw new Error('[craftit:E1] lifecycle outside setup');

  return rt;
};

type NoDetail = void | undefined | never;
type HostCustomEventMap<CustomEvents extends Record<string, unknown>> = {
  [K in keyof CustomEvents & string]: [CustomEvents[K]] extends [Event]
    ? CustomEvents[K]
    : [CustomEvents[K]] extends [NoDetail]
      ? CustomEvent<undefined>
      : CustomEvent<CustomEvents[K]>;
};

export type HostEventMap<CustomEvents extends Record<string, unknown> = Record<string, never>> = HTMLElementEventMap &
  HostCustomEventMap<CustomEvents>;

export type HostEventListeners<CustomEvents extends Record<string, unknown> = Record<string, never>> = {
  [K in keyof HostEventMap<CustomEvents>]?: (e: HostEventMap<CustomEvents>[K]) => void;
};

export const onMount = (fn: () => CleanupFn | undefined | void): void => {
  currentRuntime().onMount.push(fn);
};

export const onCleanup = (fn: CleanupFn): void => {
  if (runtimeStack.length > 0) {
    currentRuntime().cleanups.push(fn);
  } else {
    _onCleanup(fn);
  }
};

const autoCleanup = (dispose: Subscription | CleanupFn): void => {
  if (runtimeStack.length > 0) onCleanup(dispose);
};

export const onError = (fn: (err: unknown) => void): void => {
  currentRuntime().errorHandlers.push(fn);
};

export const effect = (fn: EffectCallback, options?: EffectOptions): Subscription => {
  const dispose = _effect(fn, options);

  autoCleanup(dispose);

  return dispose;
};

export function watch<T>(
  source: ReadonlySignal<T>,
  cb: (value: T, prev: T) => void,
  options?: WatchOptions<T>,
): Subscription;
export function watch(
  source: ReadonlySignal<unknown>,
  cb: (value: unknown, prev: unknown) => void,
  options?: WatchOptions<unknown>,
): Subscription {
  const stop = _watch(source, cb, options);

  autoCleanup(stop);

  return stop;
}

export function handle<K extends keyof HTMLElementEventMap>(
  target: EventTarget | null | undefined,
  event: K,
  listener: (e: HTMLElementEventMap[K]) => void,
  options?: AddEventListenerOptions,
): void;
export function handle(
  target: EventTarget | null | undefined,
  event: string,
  listener: EventListener,
  options?: AddEventListenerOptions,
): void;
export function handle(
  target: EventTarget | null | undefined,
  event: string,
  listener: EventListener,
  options?: AddEventListenerOptions,
): void {
  if (!target) return;

  target.addEventListener(event, listener, options);
  onCleanup(() => target.removeEventListener(event, listener, options));
}

export const createCleanupSignal = () => {
  const cleanup = signal<CleanupFn | null>(null);

  const clear = () => {
    cleanup.value?.();
    cleanup.value = null;
  };

  const set = (next: CleanupFn | null | undefined) => {
    if (cleanup.value === next) return;

    clear();
    cleanup.value = next ?? null;
  };

  onCleanup(clear);

  return { clear, set, value: cleanup as ReadonlySignal<CleanupFn | null> };
};

export const onElement = <T extends HTMLElement>(
  ref: ReadonlySignal<T | null>,
  callback: (el: T) => CleanupFn | undefined | void,
  options?: EffectOptions,
): Subscription => {
  return effect(() => {
    const el = ref.value;

    if (el) return callback(el);
  }, options);
};

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

export type RegisterPropertyCleanup = (fn: () => void) => void;

const functionBindingSourceCache = new WeakMap<() => unknown, ReadonlySignal<unknown>>();

export const toReactiveBindingSource = (value: unknown): ReadonlySignal<unknown> | undefined => {
  if (isSignal(value)) return value as ReadonlySignal<unknown>;

  if (typeof value === 'function') {
    // If it's a plain function (not a signal), we treat it as a computed getter
    // unless it was intended to be an event handler (handled in template-compiler).
    const getter = value as () => unknown;
    const cached = functionBindingSourceCache.get(getter);

    if (cached) return cached;

    const source = computed(getter);

    functionBindingSourceCache.set(getter, source);

    return source;
  }

  return undefined;
};

export const hasWritableValueSetter = (value: unknown): value is Signal<unknown> => {
  if (!isSignal(value)) return false;

  let proto: object | null = Object.getPrototypeOf(value);

  while (proto) {
    const descriptor = Object.getOwnPropertyDescriptor(proto, 'value');

    if (descriptor) return typeof descriptor.set === 'function';

    proto = Object.getPrototypeOf(proto);
  }

  return false;
};

const updateModelValue = (model: Signal<unknown>, next: unknown): void => {
  if (Object.is(model.value, next)) return;

  try {
    model.value = next;
  } catch {
    // Readonly signal/computed source: keep one-way behavior.
  }
};

export const bindPropertyModel = (
  el: HTMLElement,
  name: string,
  model: Signal<unknown> | undefined,
  registerCleanup: RegisterPropertyCleanup,
): void => {
  if (!model) return;

  if (name === 'value') {
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
      const eventName = el instanceof HTMLSelectElement ? 'change' : 'input';

      registerCleanup(
        listen(el, eventName, () => {
          updateModelValue(model, el.value);
        }),
      );
    }

    return;
  }

  if (name === 'checked' && el instanceof HTMLInputElement) {
    registerCleanup(
      listen(el, 'change', () => {
        updateModelValue(model, el.checked);
      }),
    );
  }
};

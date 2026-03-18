import { effect, isSignal, type ReadonlySignal, type Signal } from '@vielzeug/stateit';

import type { DirectiveDescriptor } from '../internal';

import { listen, setAttr } from '../utils';

export type SpreadValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | ReadonlySignal<string | number | boolean | null | undefined>
  | (() => string | number | boolean | null | undefined)
  | ((event: Event) => void);

const isReactiveSource = (value: unknown): value is ReadonlySignal<unknown> | (() => unknown) =>
  isSignal(value) || typeof value === 'function';

const resolveReactiveSource = (value: ReadonlySignal<unknown> | (() => unknown)): (() => unknown) =>
  isSignal(value) ? () => value.value : (value as () => unknown);

const hasWritableValueSetter = (value: unknown): value is Signal<unknown> => {
  if (!isSignal(value)) return false;

  let proto: object | null = Object.getPrototypeOf(value);

  while (proto) {
    const descriptor = Object.getOwnPropertyDescriptor(proto, 'value');

    if (descriptor) return typeof descriptor.set === 'function';

    proto = Object.getPrototypeOf(proto);
  }

  return false;
};

const applyEntry = (
  el: HTMLElement,
  rawKey: string,
  rawValue: SpreadValue,
  registerCleanup: (fn: () => void) => void,
): void => {
  if (rawValue === undefined) return;

  if (rawKey.startsWith('@')) {
    if (typeof rawValue === 'function') {
      registerCleanup(listen(el, rawKey.slice(1), rawValue as (event: Event) => void));
    }

    return;
  }

  if (rawKey.startsWith('.')) {
    const key = rawKey.slice(1);
    const writableModel = hasWritableValueSetter(rawValue) ? (rawValue as Signal<unknown>) : undefined;

    if (isReactiveSource(rawValue)) {
      const get = resolveReactiveSource(rawValue);

      registerCleanup(
        effect(() => {
          (el as any)[key] = get();
        }),
      );
    } else {
      (el as any)[key] = rawValue;
    }

    if (writableModel && key === 'value') {
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
        const eventName = el instanceof HTMLSelectElement ? 'change' : 'input';

        registerCleanup(
          listen(el, eventName, () => {
            const next = el.value;

            if (!Object.is(writableModel.value, next)) {
              try {
                writableModel.value = next;
              } catch {
                // Readonly signal/computed source: keep one-way behavior.
              }
            }
          }),
        );
      }
    } else if (writableModel && key === 'checked' && el instanceof HTMLInputElement) {
      registerCleanup(
        listen(el, 'change', () => {
          const next = el.checked;

          if (!Object.is(writableModel.value, next)) {
            try {
              writableModel.value = next;
            } catch {
              // Readonly signal/computed source: keep one-way behavior.
            }
          }
        }),
      );
    }

    return;
  }

  if (rawKey.startsWith('?')) {
    const key = rawKey.slice(1);

    if (isReactiveSource(rawValue)) {
      const get = resolveReactiveSource(rawValue);

      registerCleanup(
        effect(() => {
          el.toggleAttribute(key, Boolean(get()));
        }),
      );
    } else {
      el.toggleAttribute(key, Boolean(rawValue));
    }

    return;
  }

  if (isReactiveSource(rawValue)) {
    const get = resolveReactiveSource(rawValue);

    registerCleanup(effect(() => setAttr(el, rawKey, get())));
  } else {
    setAttr(el, rawKey, rawValue);
  }
};

/**
 * Unified spread directive for attributes, properties, and events.
 *
 * Key prefixes:
 * - `name`  -> attribute
 * - `?name` -> boolean attribute
 * - `.name` -> DOM property
 * - `@name` -> event listener
 */
export function spread(map: Record<string, SpreadValue>): DirectiveDescriptor {
  return {
    mount(el, { registerCleanup }) {
      for (const [key, value] of Object.entries(map)) {
        applyEntry(el, key, value, registerCleanup);
      }
    },
  };
}

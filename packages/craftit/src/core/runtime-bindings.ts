import { computed, isSignal, type ReadonlySignal, type Signal } from '@vielzeug/stateit';

import { listen } from './utilities';

export type RegisterPropertyCleanup = (fn: () => void) => void;

export const toReactiveBindingSource = (value: unknown): ReadonlySignal<unknown> | undefined => {
  if (isSignal(value)) return value as ReadonlySignal<unknown>;

  if (typeof value === 'function') return computed(value as () => unknown);

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

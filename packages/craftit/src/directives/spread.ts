import { effect, type ReadonlySignal } from '@vielzeug/stateit';

import { type Directive } from '../core/internal';
import { bindPropertyModel, hasWritableValueSetter, toReactiveBindingSource } from '../core/runtime-bindings';
import { listen, setAttr } from '../core/utilities';

export type SpreadValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | ReadonlySignal<string | number | boolean | null | undefined>
  | (() => string | number | boolean | null | undefined)
  | ((event: Event) => void);

type RegisterCleanup = (fn: () => void) => void;

const applyReactiveValue = (
  source: ReadonlySignal<unknown> | undefined,
  apply: (value: unknown) => void,
  registerCleanup: RegisterCleanup,
): boolean => {
  if (!source) return false;

  registerCleanup(
    effect(() => {
      apply(source.value);
    }),
  );

  return true;
};

const applyEventEntry = (
  el: HTMLElement,
  rawKey: string,
  rawValue: SpreadValue,
  registerCleanup: RegisterCleanup,
): boolean => {
  if (!rawKey.startsWith('@')) return false;

  if (typeof rawValue === 'function') {
    registerCleanup(listen(el, rawKey.slice(1), rawValue as (event: Event) => void));
  }

  return true;
};

const applyPropertyEntry = (
  el: HTMLElement,
  rawKey: string,
  rawValue: SpreadValue,
  registerCleanup: RegisterCleanup,
): boolean => {
  if (!rawKey.startsWith('.')) return false;

  const key = rawKey.slice(1);
  const writableModel = hasWritableValueSetter(rawValue) ? rawValue : undefined;
  const source = toReactiveBindingSource(rawValue);

  if (!applyReactiveValue(source, (value) => ((el as any)[key] = value), registerCleanup)) {
    (el as any)[key] = rawValue;
  }

  bindPropertyModel(el, key, writableModel, registerCleanup);

  return true;
};

const applyBooleanAttributeEntry = (
  el: HTMLElement,
  rawKey: string,
  rawValue: SpreadValue,
  registerCleanup: RegisterCleanup,
): boolean => {
  if (!rawKey.startsWith('?')) return false;

  const key = rawKey.slice(1);
  const source = toReactiveBindingSource(rawValue);

  if (!applyReactiveValue(source, (value) => el.toggleAttribute(key, Boolean(value)), registerCleanup)) {
    el.toggleAttribute(key, Boolean(rawValue));
  }

  return true;
};

const applyAttributeEntry = (
  el: HTMLElement,
  rawKey: string,
  rawValue: SpreadValue,
  registerCleanup: RegisterCleanup,
): void => {
  const source = toReactiveBindingSource(rawValue);

  if (!applyReactiveValue(source, (value) => setAttr(el, rawKey, value), registerCleanup)) {
    setAttr(el, rawKey, rawValue);
  }
};

const applyEntry = (el: HTMLElement, rawKey: string, rawValue: SpreadValue, registerCleanup: RegisterCleanup): void => {
  if (rawValue === undefined) return;

  if (applyEventEntry(el, rawKey, rawValue, registerCleanup)) return;

  if (applyPropertyEntry(el, rawKey, rawValue, registerCleanup)) return;

  if (applyBooleanAttributeEntry(el, rawKey, rawValue, registerCleanup)) return;

  applyAttributeEntry(el, rawKey, rawValue, registerCleanup);
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
export function spread(map: Record<string, SpreadValue>): Directive {
  return {
    mount(el, { registerCleanup }) {
      for (const [key, value] of Object.entries(map)) {
        applyEntry(el, key, value, registerCleanup);
      }
    },
  };
}

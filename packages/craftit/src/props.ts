import { type Signal, signal } from '@vielzeug/stateit';

import { setAttr, toKebab } from './internal';
import { currentRuntime, effect } from './runtime';

export type PropOptions<T> = {
  /** When `true`, removes the host attribute instead of setting it to `""` when value is an empty string. */
  omit?: boolean;
  parse?: (value: string | null) => T;
  reflect?: boolean;
  type?: PropType<T>;
};

export type OptionalKeys<T extends Record<string, unknown>> = {
  [K in keyof T]-?: Pick<T, K> extends Required<Pick<T, K>> ? never : K;
}[keyof T];

export type RequiredKeys<T extends Record<string, unknown>> = Exclude<keyof T, OptionalKeys<T>>;

export type PropsInput<T extends Record<string, unknown>> = {
  [K in RequiredKeys<T>]-?: T[K] | PropDef<T[K]>;
} & {
  [K in OptionalKeys<T>]-?: T[K] | PropDef<T[K] | undefined> | undefined;
};

export type PropDef<T> = PropOptions<T> & { default: T };
export type PropInputDefs = Record<string, unknown | PropDef<unknown>>;

type PropType<T> = T extends string
  ? StringConstructor
  : T extends number
    ? NumberConstructor
    : T extends boolean
      ? BooleanConstructor
      : T extends unknown[]
        ? ArrayConstructor
        : ObjectConstructor;

const PROP_DEF_KEYS = new Set(['default', 'omit', 'parse', 'reflect', 'type']);

export const hasStructuredDefault = (value: unknown): boolean =>
  Array.isArray(value) || (typeof value === 'object' && value !== null);

const isPropDef = (value: unknown): value is PropDef<unknown> => {
  if (typeof value !== 'object' || value === null || !('default' in value)) return false;

  return Object.keys(value).every((key) => PROP_DEF_KEYS.has(key));
};

export const normalizePropDefinition = <T>(value: T | PropDef<T>): PropDef<T> => {
  if (isPropDef(value)) {
    const descriptor = value as PropDef<T>;

    return {
      ...descriptor,
      reflect: descriptor.reflect ?? !hasStructuredDefault(descriptor.default),
    };
  }

  return {
    default: value as T,
    reflect: !hasStructuredDefault(value),
  };
};

export const propRegistry = new WeakMap<HTMLElement, Map<string, PropMeta<unknown>>>();

const reflectingAttr = new WeakMap<HTMLElement, string>();

export const isReflecting = (el: HTMLElement, name: string): boolean => reflectingAttr.get(el) === name;

type PropMeta<T = unknown> = {
  parse: (value: string | null) => T;
  reflect: boolean;
  signal: Signal<T>;
};

const createDefaultParser = <T>(defaultValue: T, type: PropOptions<T>['type']): ((value: string | null) => T) => {
  return (value: string | null): T => {
    if (value == null) return defaultValue;

    if (type === Boolean || typeof defaultValue === 'boolean') {
      return (value === '' || value === 'true') as T;
    }

    if (type === Number || typeof defaultValue === 'number') {
      return Number(value) as T;
    }

    return value as unknown as T;
  };
};

export const prop = <T>(name: string, defaultValue: T, options?: PropOptions<T>): Signal<T> => {
  const el = currentRuntime().el;

  if (!propRegistry.has(el)) propRegistry.set(el, new Map());

  const parse = options?.parse ?? createDefaultParser(defaultValue, options?.type);

  const s = signal<T>(defaultValue);
  const hasPreUpgradeProperty = Object.prototype.hasOwnProperty.call(el, name);
  const preUpgradeValue = hasPreUpgradeProperty ? (el as unknown as Record<string, unknown>)[name] : undefined;

  const meta = {
    parse,
    reflect: options?.reflect ?? true,
    signal: s as Signal<unknown>,
  };

  if (hasPreUpgradeProperty) {
    delete (el as unknown as Record<string, unknown>)[name];
    s.value = preUpgradeValue as T;
  } else if (el.hasAttribute(name)) {
    s.value = parse(el.getAttribute(name)) as T;
  }

  propRegistry.get(el)!.set(name, meta);

  Object.defineProperty(el, name, {
    configurable: true,
    enumerable: true,
    get: () => s.value,
    set: (value: T) => {
      s.value = value;
    },
  });

  if (options?.reflect ?? true) {
    const omit = options?.omit ?? false;

    effect(() => {
      const v = s.value;

      reflectingAttr.set(el, name);

      try {
        if (v == null || v === false || (omit && v === '')) {
          el.removeAttribute(name);
        } else {
          setAttr(el, name, v);
        }
      } finally {
        reflectingAttr.delete(el);
      }
    });
  }

  return s;
};

type InferPropValue<T> = T extends object
  ? Exclude<keyof T, keyof PropDef<unknown>> extends never
    ? T extends PropDef<infer U>
      ? U
      : T
    : T
  : T;

export type InferPropsFromDefs<T extends PropInputDefs> = {
  [K in keyof T]: InferPropValue<T[K]>;
};

export type InferPropsSignals<T extends Record<string, unknown>> = {
  readonly [K in keyof T]-?: Signal<T[K]>;
};

export function createProps<D extends PropInputDefs>(defs: D): InferPropsSignals<InferPropsFromDefs<D>> {
  const props = {} as Record<string, Signal<unknown>>;

  for (const [name, def] of Object.entries(defs)) {
    const descriptor = normalizePropDefinition(def);
    const signalRef = prop(toKebab(name), descriptor.default, descriptor);

    props[name] = signalRef;
  }

  return props as InferPropsSignals<InferPropsFromDefs<D>>;
}
export type ResolveComponentProps<
  _Props extends Record<string, unknown>,
  PropDefs extends PropInputDefs,
> = InferPropsFromDefs<PropDefs>;

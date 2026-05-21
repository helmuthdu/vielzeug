import { type ReadonlySignal, type Signal, signal } from '@vielzeug/stateit';

import { setAttr, toKebab } from './internal';
import { currentElementOrThrow, effect } from './runtime';

export type PropOptions<T> = {
  parse?: (value: string | null) => T;
  /** Whether to reflect prop changes to HTML attributes. Default: true.
   * Set to false only when host.bind() manages the same attribute with derived/computed state. */
  reflect?: boolean;
};

export type PropsDef<T extends Record<string, unknown>> = {
  // Keep default authoring ergonomic: plain `undefined` is a valid default for any prop.
  [K in keyof Required<T>]: T[K] | undefined | PropDef<T[K] | undefined>;
};

export type PropDef<T> = PropOptions<T> & { readonly default: T };
export type PropInputDefs = Record<string, unknown | PropDef<unknown>>;

export const prop = {
  bool(defaultValue = false): PropDef<boolean> {
    return {
      default: defaultValue,
      parse: (value) => value === '' || value === 'true',
      reflect: true,
    };
  },
  json<T>(defaultValue: T): PropDef<T> {
    return {
      default: defaultValue,
      parse: (value) => {
        if (value == null || value === '') return defaultValue;

        try {
          return JSON.parse(value) as T;
        } catch {
          return defaultValue;
        }
      },
      reflect: false,
    };
  },
  number(defaultValue = 0): PropDef<number> {
    return {
      default: defaultValue,
      parse: (value) => (value == null ? defaultValue : Number(value)),
      reflect: true,
    };
  },
  oneOf<T extends string>(allowed: readonly T[], defaultValue: T): PropDef<T> {
    return {
      default: defaultValue,
      parse: (value) => (value != null && allowed.includes(value as T) ? (value as T) : defaultValue),
      reflect: true,
    };
  },
  string<T extends string>(defaultValue: T): PropDef<T> {
    return {
      default: defaultValue,
      parse: (value) => (value == null ? defaultValue : (value as T)),
      reflect: true,
    };
  },
};

/**
 * Explicit prop definition factory. Plain objects with `{ default: ... }` are duck-typed as PropDef.
 *
 * Use to explicitly configure prop behavior with options like `reflect`, or when you need a parse function.
 * Simple string/number/boolean defaults don't require this—just pass the value directly.
 *
 * @example
 * ```ts
 * props: {
 *   label: 'Default Label',
 *   disabled: { default: false, reflect: true },
 *   count: { default: 0, reflect: true },
 * }
 * ```
 */

const isPropDef = (value: unknown): value is PropDef<unknown> =>
  typeof value === 'object' && value !== null && 'default' in value;

const isStructuredValue = (value: unknown): boolean =>
  Array.isArray(value) || (typeof value === 'object' && value !== null);

export function normalizePropDefinition<T>(value: T | PropDef<T>): PropDef<T> {
  if (isPropDef(value)) {
    const descriptor = value as PropDef<T>;
    const reflect = descriptor.reflect ?? true;

    if (reflect && isStructuredValue(descriptor.default)) {
      throw new Error('Structured prop defaults cannot use reflect:true. Set reflect:false and sync explicitly.');
    }

    return {
      ...descriptor,
      reflect,
    };
  }

  if (isStructuredValue(value)) {
    return {
      default: value as T,
      reflect: false,
    };
  }

  return {
    default: value as T,
    reflect: true,
  };
}

export const propRegistry = new WeakMap<HTMLElement, Map<string, PropMeta<unknown>>>();

const reflectingAttrs = new WeakMap<HTMLElement, Set<string>>();

const markReflecting = (el: HTMLElement, name: string): void => {
  let names = reflectingAttrs.get(el);

  if (!names) {
    names = new Set<string>();
    reflectingAttrs.set(el, names);
  }

  names.add(name);
};

const unmarkReflecting = (el: HTMLElement, name: string): void => {
  const names = reflectingAttrs.get(el);

  if (!names) return;

  names.delete(name);

  if (names.size === 0) reflectingAttrs.delete(el);
};

export const isReflecting = (el: HTMLElement, name: string): boolean => reflectingAttrs.get(el)?.has(name) ?? false;

type PropMeta<T = unknown> = {
  parse: (value: string | null) => T;
  reflect: boolean;
  signal: Signal<T>;
};

const parseBoolean = <T>(value: string | null): T => (value === '' || value === 'true') as T;
const parseNumber = <T>(value: string | null): T => Number(value) as T;
const parseString = <T>(value: string | null): T => value as unknown as T;

const PARSER_BY_TYPE: Record<string, <T>(value: string | null) => T> = {
  boolean: parseBoolean,
  number: parseNumber,
  string: parseString,
};

/** Infer attribute parser from default value type. */
const inferParserFromValue = <T>(defaultValue: T): ((value: string | null) => T) => {
  return (value: string | null): T => {
    if (value == null) return defaultValue;

    const parser = PARSER_BY_TYPE[typeof defaultValue];

    return parser ? (parser(value) as T) : (value as unknown as T);
  };
};

/** @internal Runtime prop registration (called by createProps) */
const registerProp = <T>(propName: string, attrName: string, defaultValue: T, options?: PropOptions<T>): Signal<T> => {
  const el = currentElementOrThrow();

  if (!propRegistry.has(el)) propRegistry.set(el, new Map());

  // Infer parser from default value type if not explicitly provided
  const parse = options?.parse ?? inferParserFromValue<T>(defaultValue);

  const s = signal<T>(defaultValue);
  const hasPreUpgradeProperty = Object.prototype.hasOwnProperty.call(el, propName);
  const preUpgradeValue = hasPreUpgradeProperty ? (el as unknown as Record<string, unknown>)[propName] : undefined;

  const meta = {
    parse,
    reflect: options?.reflect ?? true,
    signal: s as Signal<unknown>,
  };

  if (hasPreUpgradeProperty) {
    delete (el as unknown as Record<string, unknown>)[propName];
    s.value = preUpgradeValue as T;
  } else if (el.hasAttribute(attrName)) {
    s.value = parse(el.getAttribute(attrName)) as T;
  }

  propRegistry.get(el)!.set(attrName, meta);

  Object.defineProperty(el, propName, {
    configurable: true,
    enumerable: true,
    get: () => s.value,
    set: (value: T) => {
      s.value = value;
    },
  });

  if (options?.reflect ?? true) {
    effect(() => {
      const v = s.value;

      markReflecting(el, attrName);

      try {
        if (v == null) {
          el.removeAttribute(attrName);
        } else if (typeof v === 'boolean') {
          el.toggleAttribute(attrName, v);
        } else {
          setAttr(el, attrName, v);
        }
      } finally {
        unmarkReflecting(el, attrName);
      }
    });
  }

  return s;
};

export type InferPropValue<T> = T extends PropDef<infer U> ? U : T;

export type InferPropsFromDefs<T extends PropInputDefs> = {
  [K in keyof T]: InferPropValue<T[K]>;
};

export type InferPropsSignals<T extends Record<string, unknown>> = {
  readonly [K in keyof T]-?: ReadonlySignal<T[K]>;
};

export function createProps<D extends PropInputDefs>(defs: D): InferPropsSignals<InferPropsFromDefs<D>> {
  const props = {} as Record<string, Signal<unknown>>;

  for (const [name, def] of Object.entries(defs)) {
    // Ensure definition is normalized (should have been done at define-time, but this is a safety measure)
    const descriptor =
      typeof def === 'object' && def !== null && 'default' in def
        ? (def as PropDef<unknown>)
        : normalizePropDefinition(def);
    const attrName = toKebab(name);

    props[name] = registerProp(name, attrName, descriptor.default, descriptor);
  }

  return props as unknown as InferPropsSignals<InferPropsFromDefs<D>>;
}

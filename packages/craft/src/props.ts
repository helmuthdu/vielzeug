import { type ReadonlySignal, type Signal, signal } from '@vielzeug/ripple';

import { CRAFTIT_ERRORS } from './errors';
import { getCurrentElement, effect } from './runtime';
import { isStructuredValue, setAttr, toKebab } from './utils/dom';

export type PropsDef<T extends Record<string, unknown>> = {
  // All props must be explicitly defined via prop.* helpers or PropDef objects
  [K in keyof Required<T>]: PropDef<T[K & keyof T]>;
};

export type PropDef<T> = { readonly default: T; readonly parse: (value: string | null) => T; reflect?: boolean };
export type PropInputDefs = Record<string, PropDef<unknown>>;

/**
 * Prop definition factory — use these helpers for all prop definitions.
 * No implicit type inference; all parser behavior is explicit and intentional.
 */
type PropFactory = {
  bool(defaultValue?: boolean): PropDef<boolean>;
  json<T>(defaultValue: T): PropDef<T>;
  number<T extends number = number>(): PropDef<T | undefined>;
  number<T extends number = number>(defaultValue: number): PropDef<T>;
  oneOf<T extends string | undefined, D extends T = T>(allowed: readonly NonNullable<T>[], defaultValue: D): PropDef<T>;
  string<T extends string = string>(): PropDef<T | undefined>;
  string<T extends string = string>(defaultValue: string): PropDef<T>;
};

export const prop: PropFactory = {
  bool(defaultValue?: boolean): PropDef<boolean> {
    const def = defaultValue ?? false;

    return {
      default: def,
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
  number<T extends number = number>(defaultValue?: number): PropDef<T> | PropDef<T | undefined> {
    const def = defaultValue !== undefined ? (defaultValue as T) : undefined;

    return {
      default: def,
      parse: (value) => (value == null ? def : (Number(value) as T)),
      reflect: true,
    } as PropDef<T> | PropDef<T | undefined>;
  },
  oneOf<T extends string | undefined, D extends T = T>(
    allowed: readonly NonNullable<T>[],
    defaultValue: D,
  ): PropDef<T> {
    return {
      default: defaultValue,
      parse: (value) => (value != null && allowed.includes(value as NonNullable<T>) ? (value as T) : defaultValue),
      reflect: true,
    };
  },
  string<T extends string = string>(defaultValue?: string): PropDef<T> | PropDef<T | undefined> {
    // When no default provided, undefined sentinel → attribute removed when value is absent
    const def = defaultValue !== undefined ? (defaultValue as T) : undefined;

    return {
      default: def,
      parse: (value: string | null) => (value == null ? def : (value as T)),
      reflect: true,
    } as PropDef<T> | PropDef<T | undefined>;
  },
};

/**
 * Define a custom prop with explicit parser and reflection behavior.
 * Use when prop.* helpers don't cover your type.
 *
 * @example
 * ```ts
 * const customProp = (): PropDef<MyCustomType> => ({
 *   default: new MyCustomType(),
 *   parse: (value) => JSON.parse(value || '{}') as MyCustomType,
 *   reflect: false,
 * });
 * ```
 */

const isPropDef = (value: unknown): value is PropDef<unknown> =>
  typeof value === 'object' && value !== null && 'default' in value && 'parse' in value;

/**
 * Validate and normalize a prop definition.
 * Throws if definition is invalid or incomplete.
 */
export function normalizePropDefinition<T>(value: unknown, propName: string): PropDef<T> {
  if (!isPropDef(value)) {
    throw new Error(
      `Prop "${propName}" must be defined with prop.* helper or PropDef object. ` +
        `Received plain value: ${typeof value}. Use prop.string(), prop.number(), prop.bool(), prop.json(), or prop.oneOf() ` +
        `instead of plain defaults.`,
    );
  }

  const descriptor = value as PropDef<T>;

  if (!descriptor.parse) {
    throw new Error(`Prop "${propName}" must have a parse function. Use prop.* helpers.`);
  }

  const reflect = descriptor.reflect ?? false;

  // Validate: structured defaults with reflect:true are not allowed
  if (reflect && isStructuredValue(descriptor.default)) {
    throw new Error(
      `Prop "${propName}": ${CRAFTIT_ERRORS.propInvalidReflect} Use prop.json() with reflect:false instead.`,
    );
  }

  return {
    ...descriptor,
    reflect,
  };
}

/**
 * Validate all prop definitions at define-time.
 * Returns validation error messages or empty array if valid.
 */
export function validatePropDefs(defs: Record<string, unknown>): string[] {
  const errors: string[] = [];

  for (const [key, value] of Object.entries(defs)) {
    try {
      normalizePropDefinition(value, key);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  return errors;
}

type PropMeta<T = unknown> = {
  parse: (value: string | null) => T;
  reflect: boolean;
  signal: Signal<T>;
};

export const propRegistry = new WeakMap<HTMLElement, Map<string, PropMeta<unknown>>>();

/** @internal Runtime prop registration (called by createProps) */
const registerProp = <T>(propName: string, attrName: string, propDef: PropDef<T>): Signal<T> => {
  const el = getCurrentElement();

  if (!propRegistry.has(el)) propRegistry.set(el, new Map());

  const { default: defaultValue, parse, reflect = false } = propDef;
  const s = signal<T>(defaultValue);
  const hasPreUpgradeProperty = Object.prototype.hasOwnProperty.call(el, propName);
  const preUpgradeValue = hasPreUpgradeProperty ? (el as unknown as Record<string, unknown>)[propName] : undefined;

  const meta: PropMeta<unknown> = {
    parse,
    reflect,
    signal: s,
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

  if (reflect) {
    effect(() => {
      const v = s.value;

      if (v == null) {
        el.removeAttribute(attrName);
      } else if (typeof v === 'boolean') {
        el.toggleAttribute(attrName, v);
      } else {
        setAttr(el, attrName, v);
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
    const normalized = normalizePropDefinition(def, name);
    const attrName = toKebab(name);

    props[name] = registerProp(name, attrName, normalized);
  }

  return props as unknown as InferPropsSignals<InferPropsFromDefs<D>>;
}

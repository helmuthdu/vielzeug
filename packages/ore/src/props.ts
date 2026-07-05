import { type Readable, type Signal, signal } from '@vielzeug/ripple';

import { warn } from './_dev';
import { OreApiError, ORE_ERRORS } from './errors';
import { effect } from './runtime';
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
  /**
   * JS-only property — never reads from or writes to an HTML attribute.
   * Use for complex objects, arrays, callbacks, or any non-serialisable value.
   *
   * @example
   * ```ts
   * columns:   prop.data<DataGridColumn[]>([]),
   * config:    prop.data<Options>(),
   * getRowKey: prop.data<(row: T) => string>(),
   * onSelect:  prop.data<(item: T) => void>(),
   * ```
   */
  data<T>(): PropDef<T | undefined>;
  data<T>(defaultValue: T): PropDef<T>;
  json<T>(defaultValue: T): PropDef<T>;
  number<T extends number = number>(): PropDef<T | undefined>;
  number<T extends number = number>(defaultValue: number): PropDef<T>;
  oneOf<T extends string | undefined, D extends T = T>(allowed: readonly NonNullable<T>[], defaultValue: D): PropDef<T>;
  string<T extends string = string>(): PropDef<T | undefined>;
  string<T extends string = string>(defaultValue: string): PropDef<T>;
};

/** @internal JS-only prop implementation — never reads/writes attributes. */
function _jsOnlyProp<T>(defaultValue?: T): PropDef<T | undefined> | PropDef<T> {
  return { default: defaultValue, parse: () => defaultValue, reflect: false } as PropDef<T | undefined>;
}

export const prop: PropFactory = {
  /**
   * Boolean prop — reflects its value as a presence-only attribute (toggleAttribute).
   * Reflection is always enabled. To suppress attribute reflection for a boolean,
   * use `prop.data<boolean>(false)` instead.
   */
  bool(defaultValue?: boolean): PropDef<boolean> {
    const def = defaultValue ?? false;

    return {
      default: def,
      parse: (value) => value !== null && value !== 'false',
      reflect: true,
    };
  },
  data<T>(defaultValue?: T): PropDef<T | undefined> | PropDef<T> {
    return _jsOnlyProp(defaultValue);
  },
  /**
   * JSON-serialisable prop — the value is stored as a JS object and parsed
   * from the attribute via `JSON.parse`. Reflection is always disabled
   * because serialising complex objects back to attributes on every change
   * would be expensive and produce unreadable HTML.
   *
   * @example
   * ```ts
   * columns: prop.json<Column[]>([]),
   * // attribute: <my-grid columns='[{"id":"name"}]'>
   * // change not reflected back → attribute stays static after upgrade
   * ```
   */
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
      parse: (value) => {
        if (value == null) return def;

        const n = Number(value);

        if (Number.isNaN(n)) {
          warn(`prop.number(): attribute value "${value}" is not a valid number, using default (${String(def)})`);

          return def;
        }

        return n as T;
      },
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
    throw new OreApiError(
      `Prop "${propName}" must use a prop.* helper (string/number/bool/json/oneOf). Received: ${typeof value}`,
    );
  }

  const descriptor = value as PropDef<T>;

  if (!descriptor.parse) {
    throw new OreApiError(`Prop "${propName}" must have a parse function. Use prop.* helpers.`);
  }

  const reflect = descriptor.reflect ?? false;

  // Validate: structured defaults with reflect:true are not allowed
  if (reflect && isStructuredValue(descriptor.default)) {
    throw new OreApiError(`Prop "${propName}": ${ORE_ERRORS.propInvalidReflect}`);
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

const propRegistry = new WeakMap<HTMLElement, Map<string, PropMeta<unknown>>>();

/**
 * Look up the registered prop metadata for a given attribute name on an element.
 * Used by the template compiler to resolve prop bindings without exposing the registry.
 */
export const getPropMeta = (el: HTMLElement, attrName: string): PropMeta<unknown> | undefined =>
  propRegistry.get(el)?.get(attrName);

/** @internal Runtime prop registration (called by createProps) */
const registerProp = <T>(el: HTMLElement, propName: string, attrName: string, propDef: PropDef<T>): Signal<T> => {
  if (!propRegistry.has(el)) propRegistry.set(el, new Map());

  const { default: defaultValue, parse, reflect = false } = propDef;
  const s = signal<T>(defaultValue);
  const hasPreUpgradeProperty = Object.hasOwn(el as unknown as Record<string, unknown>, propName);
  const preUpgradeValue = hasPreUpgradeProperty ? (el as unknown as Record<string, unknown>)[propName] : undefined;

  const meta: PropMeta<unknown> = {
    parse,
    reflect,
    signal: s,
  };

  if (hasPreUpgradeProperty) {
    delete (el as unknown as Record<string, unknown>)[propName];
    // Frameworks (e.g. Vue, when hydrating or patching an already-upgraded custom
    // element) may assign the pre-upgrade value as a plain string rather than calling
    // setAttribute — the same way it would for a real HTML attribute. Route strings
    // through the same parser an attribute value would use so e.g. size="16" doesn't
    // end up stored as the string "16" instead of the number 16. Already-typed values
    // (objects, functions, booleans, numbers set deliberately as JS properties) pass
    // through untouched.
    s.value = (typeof preUpgradeValue === 'string' ? parse(preUpgradeValue) : preUpgradeValue) as T;
  } else if (el.hasAttribute(attrName)) {
    s.value = parse(el.getAttribute(attrName)) as T;
  }

  propRegistry.get(el)!.set(attrName, meta);

  Object.defineProperty(el, propName, {
    configurable: true,
    enumerable: true,
    get: () => s.value,
    set: (value: T) => {
      // A framework can still reach this setter with a raw attribute-style string after
      // the element has already upgraded — e.g. Vue reconciling server-rendered markup
      // against a custom element that auto-upgraded (from its SSR attribute) before
      // hydration ran: it finds the property already defined and assigns the vnode's
      // plain string prop value directly instead of calling setAttribute. Route strings
      // through the same parser an attribute value would use so it isn't stored raw.
      s.value = (typeof value === 'string' ? parse(value) : value) as T;
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

/**
 * Infer the reactive props object type from a `PropInputDefs` map.
 * Each entry becomes a `Reactive<T>` keyed by the prop name.
 *
 * @example
 * ```ts
 * const propDefs = { count: prop.number(0), label: prop.string('hi') };
 * type Props = InferProps<typeof propDefs>;
 * // => { readonly count: Readable<number>; readonly label: Readable<string> }
 * ```
 */
export type InferProps<D extends PropInputDefs> = {
  readonly [K in keyof D]-?: Readable<InferPropValue<D[K]>>;
};

export function createProps<D extends PropInputDefs>(el: HTMLElement, defs: D): InferProps<D> {
  const props = {} as Record<string, Signal<unknown>>;

  for (const [name, def] of Object.entries(defs)) {
    // defs passed here are already normalized by define(); skip re-normalization.
    const attrName = toKebab(name);

    props[name] = registerProp(el, name, attrName, def as PropDef<unknown>);
  }

  return props as unknown as InferProps<D>;
}

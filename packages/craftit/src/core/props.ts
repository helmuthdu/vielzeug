import { signal, effect, type Signal } from '@vielzeug/stateit';

import { currentRuntime } from './runtime';
import { setAttr, toKebab } from './utils';

// ─── Registry ─────────────────────────────────────────────────────────────────
type PropType<T> = T extends string
  ? StringConstructor
  : T extends number
    ? NumberConstructor
    : T extends boolean
      ? BooleanConstructor
      : T extends unknown[]
        ? ArrayConstructor
        : ObjectConstructor;

export type PropOptions<T> = {
  /** When `true`, removes the host attribute instead of setting it to `""` when the value is an empty string. */
  omit?: boolean;
  parse?: (value: string | null) => T;
  reflect?: boolean;
  type?: PropType<T>;
};

export type PropMeta<T = unknown> = {
  parse: (value: string | null) => T;
  reflect: boolean;
  signal: Signal<T>;
};

export const propRegistry = new WeakMap<object, Map<string, PropMeta<unknown>>>();

// ─── prop() ───────────────────────────────────────────────────────────────────
export const prop = <T>(name: string, defaultValue: T, options?: PropOptions<T>): Signal<T> => {
  const rt = currentRuntime();
  const el = rt.el;

  if (!propRegistry.has(el)) propRegistry.set(el, new Map());

  const parse =
    options?.parse ??
    ((v: string | null): T => {
      // Explicit Boolean type: string values 'true' / '' → boolean
      if (options?.type === Boolean) return (v === '' || v === 'true') as T;

      // Boolean default: treat absent or explicit "false" as false, anything else as true.
      // This handles frameworks (e.g. Vue) that set the attribute to the string "false"
      // when a reactive binding evaluates to false, rather than removing the attribute.
      if (typeof defaultValue === 'boolean') return (v !== null && v !== 'false') as T;

      if (v == null) return defaultValue;

      // Numeric — inferred from an explicit type option or default value type
      if (options?.type === Number || typeof defaultValue === 'number') return Number(v) as T;

      return v as unknown as T;
    });
  const s = signal<T>(defaultValue);

  const meta = {
    parse,
    reflect: options?.reflect ?? true,
    signal: s as Signal<unknown>,
  };

  // Initialize from an attribute if present
  if (el.hasAttribute(name)) {
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

    rt.onMount.push(() => {
      rt.cleanups.push(
        effect(() => {
          const v = s.value;

          if (v == null || v === false || (omit && v === '')) {
            el.removeAttribute(name);
          } else {
            setAttr(el, name, v);
          }
        }),
      );
    });
  }

  return s;
};

// ─── Prop schemas ──────────────────────────────────────────────────────────────
/**
 * Shape accepted by Craftit prop schemas — the prop's default value plus any PropOptions.
 * Use inline object literals directly: `{ default: 0, type: Number }`.
 */
export type PropDef<T> = PropOptions<T> & { default: T };
export type PropInputDefs = Record<string, unknown | PropDef<unknown>>;

type InferSignalValueFromDef<PValue, DefValue> =
  undefined extends InferPropValue<DefValue> ? PValue : Exclude<PValue, undefined>;

const PROP_DEF_KEYS = new Set(['default', 'omit', 'parse', 'reflect', 'type']);
const isPropDef = (value: unknown): value is PropDef<unknown> => {
  if (typeof value !== 'object' || value === null || !('default' in value)) return false;

  return Object.keys(value).every((key) => PROP_DEF_KEYS.has(key));
};

/**
 * Forces TypeScript to infer the prop signal type from `T` rather than the default
 * value's literal type. Use in `defineComponent({ props: ... })` when the default
 * is `undefined` or when you want an explicit union type.
 *
 * @example
 * defineComponent<ButtonProps>({
 *   props: {
 *     color: typed<ThemeColor | undefined>(undefined),
 *     disabled: { default: false },
 *   },
 *   setup({ props }) {
 *     return html`<button>${props.color}</button>`;
 *   },
 *   tag: 'x-button',
 * });
 */
export const typed = <T>(defaultValue: T, options?: PropOptions<T>): PropDef<T> => ({
  ...options,
  default: defaultValue,
});

type InferPropValue<T> = T extends object
  ? Exclude<keyof T, keyof PropDef<unknown>> extends never
    ? T extends PropDef<infer U>
      ? U
      : T
    : T
  : T;
export type InferPropsSignals<T extends PropInputDefs> = {
  [K in keyof T]: Signal<InferPropValue<T[K]>>;
};

export type PropTypeHint<T> = T | PropOptions<T> | PropDef<T>;

export function createProps<
  P extends Record<string, unknown>,
  D extends { [K in keyof P]-?: PropTypeHint<P[K]> } = { [K in keyof P]-?: PropTypeHint<P[K]> },
>(
  defs: D,
): {
  [K in keyof P]-?: Signal<InferSignalValueFromDef<P[K], D[K]>>;
};
export function createProps<D extends PropInputDefs>(defs: D): InferPropsSignals<D>;
export function createProps(defs: any): any {
  const result = {} as Record<string, Signal<unknown>>;

  for (const [name, def] of Object.entries(defs)) {
    const descriptor = isPropDef(def) ? (def as PropDef<unknown>) : { default: def };
    const hasStructuredDefault =
      (typeof descriptor.default === 'object' && descriptor.default !== null) || Array.isArray(descriptor.default);
    const propDef: PropOptions<unknown> = { reflect: !hasStructuredDefault, ...descriptor };

    result[name] = prop(toKebab(name), descriptor.default, propDef);
  }

  return result;
}

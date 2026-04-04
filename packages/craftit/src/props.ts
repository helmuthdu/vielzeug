import { type Signal, signal } from '@vielzeug/stateit';

import { setAttr, toKebab } from './internal';
import { currentRuntime } from './runtime-core';
import { effect } from './runtime-lifecycle';

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
const warnedStructuredReflectProps = new Set<string>();

const isPropDef = (value: unknown): value is PropDef<unknown> => {
  if (typeof value !== 'object' || value === null || !('default' in value)) return false;

  return Object.keys(value).every((key) => PROP_DEF_KEYS.has(key));
};

export const propRegistry = new WeakMap<object, Map<string, PropMeta<unknown>>>();

type PropMeta<T = unknown> = {
  parse: (value: string | null) => T;
  reflect: boolean;
  signal: Signal<T>;
};

export const prop = <T>(name: string, defaultValue: T, options?: PropOptions<T>): Signal<T> => {
  const rt = currentRuntime();
  const el = rt.el;

  if (!propRegistry.has(el)) propRegistry.set(el, new Map());

  const parse =
    options?.parse ??
    ((v: string | null): T => {
      if (options?.type === Boolean) return (v === '' || v === 'true') as T;

      if (typeof defaultValue === 'boolean') return (v !== null && v !== 'false') as T;

      if (v == null) return defaultValue;

      if (options?.type === Number || typeof defaultValue === 'number') return Number(v) as T;

      return v as unknown as T;
    });

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

      if (v == null || v === false || (omit && v === '')) {
        el.removeAttribute(name);
      } else {
        setAttr(el, name, v);
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

type RefineOptionalPropFromDefault<Value, Def> = undefined extends Value
  ? undefined extends InferDefaultFromDef<Def>
    ? Value
    : Exclude<Value, undefined>
  : Value;

type InferPropSignalValue<Props extends Record<string, unknown>, Key extends PropertyKey, Def> = Key extends keyof Props
  ? RefineOptionalPropFromDefault<Props[Key], Def>
  : InferDefaultFromDef<Def>;

type ResolvePropValue<
  Props extends Record<string, unknown>,
  PropDefs extends Record<string, unknown>,
  Key extends PropertyKey,
> = Key extends keyof PropDefs
  ? InferPropSignalValue<Props, Key, PropDefs[Key]>
  : Key extends keyof Props
    ? Props[Key]
    : never;

export type InferPropsSignals<T extends Record<string, unknown>> = {
  [K in keyof T]: Signal<T[K]>;
};

export type ComponentProps<T extends Record<string, unknown>> = InferPropsSignals<T>;

export function createProps<D extends PropInputDefs>(defs: D): ComponentProps<InferPropsFromDefs<D>> {
  const props = {} as Record<string, Signal<unknown>>;
  const tag = currentRuntime().el.localName;

  for (const [name, def] of Object.entries(defs)) {
    const descriptor = isPropDef(def) ? (def as PropDef<unknown>) : { default: def };
    const hasStructuredDefault =
      (typeof descriptor.default === 'object' && descriptor.default !== null) || Array.isArray(descriptor.default);

    if (descriptor.reflect === true && hasStructuredDefault) {
      const warningKey = `${tag}:${String(name)}`;

      if (!warnedStructuredReflectProps.has(warningKey)) {
        warnedStructuredReflectProps.add(warningKey);
        console.warn(
          `[craftit] props.${warningKey} requested reflect: true for a structured default; reflection is disabled.`,
        );
      }
    }

    const propDef: PropOptions<unknown> = { reflect: !hasStructuredDefault, ...descriptor };

    const signalRef = prop(toKebab(name), descriptor.default, propDef);

    props[name] = signalRef;
  }

  return props as ComponentProps<InferPropsFromDefs<D>>;
}

type InferDefaultFromDef<Def> = Def extends PropDef<infer U> ? U : InferPropValue<Def>;

export type InferSignalsFromPropInputs<Props extends Record<string, unknown>, Defs extends Record<string, unknown>> = {
  [K in keyof Defs]-?: Signal<InferPropSignalValue<Props, K, Defs[K]>>;
};

export type ResolveComponentProps<Props extends Record<string, unknown>, PropDefs extends PropInputDefs> = [
  keyof Props,
] extends [never]
  ? InferPropsFromDefs<PropDefs>
  : {
      [K in keyof Props | keyof PropDefs]: ResolvePropValue<Props, PropDefs, K>;
    };

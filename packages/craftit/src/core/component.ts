/**
 * Component authoring API — define, props, lifecycle, and form field functionality.
 *
 * - defineComponent: Main API for building typed custom elements
 * - prop/typed/createProps: Reactive property definitions
 * - defineField: Form field integration
 */

import {
  type CleanupFn,
  type ComputedSignal,
  type ReadonlySignal,
  type Signal,
  signal,
  effect,
} from '@vielzeug/stateit';

import { createSlots, type Slots, type ReflectConfig } from './host';
import { reflect } from './host';
import { type HTMLResult, htmlResult } from './internal';
import { currentRuntime, runtimeStack } from './runtime-lifecycle';
import { applyBindingsInContainer, applyHtmlBinding } from './template';
import { type RegisterCleanup } from './template-bindings';
import { parseHTML } from './template-dom';
import { type KeyedNode } from './template-html';
import { createEmitFn, type EmitFn, setAttr, toKebab, runAll, loadStylesheet, type CSSResult } from './utilities';

// ─────────────────────────────────────────────────────────────────────────────
// FORM FIELD API
// ─────────────────────────────────────────────────────────────────────────────

/** @internal */
export const formCallbackRegistry = new WeakMap<HTMLElement, FormFieldCallbacks>();
/** @internal */
export const internalsRegistry = new WeakMap<HTMLElement, ElementInternals>();

/**
 * Callbacks that hook into form lifecycle events. Can be passed directly to {@link defineField}
 * as a second argument to keep all form logic co-located.
 */
export type FormFieldCallbacks = {
  onAssociated?: (form: HTMLFormElement | null) => void;
  onDisabled?: (disabled: boolean) => void;
  onReset?: () => void;
  onStateRestore?: (state: unknown, mode: 'autocomplete' | 'restore') => void;
};

export type FormFieldOptions<T = unknown> = {
  disabled?: Signal<boolean> | ReadonlySignal<boolean> | ComputedSignal<boolean>;
  toFormValue?: (value: T) => File | FormData | string | null;
  value: Signal<T> | ReadonlySignal<T>;
};

export type FormFieldHandle = {
  checkValidity: () => boolean;
  readonly internals: ElementInternals;
  reportValidity: () => boolean;
  setCustomValidity: (message: string) => void;
  setValidity: ElementInternals['setValidity'];
};

export const defineField = <T = unknown>(
  options: FormFieldOptions<T>,
  callbacks?: FormFieldCallbacks,
): FormFieldHandle => {
  const rt = currentRuntime();
  const host = rt.el;
  const ctor = host.constructor as typeof HTMLElement & { formAssociated?: boolean };

  if (!ctor.formAssociated) {
    throw new Error('[craftit:E8] defineField() requires defineComponent({ formAssociated: true })');
  }

  const internals = internalsRegistry.get(host) ?? host.attachInternals();

  internalsRegistry.set(host, internals);

  const toFormValue = options.toFormValue ?? ((v: T) => (v == null ? '' : String(v)));

  effect(() => {
    internals.setFormValue(toFormValue(options.value.value));
  });

  if (options.disabled) {
    effect(() => {
      if (options.disabled!.value) {
        internals.states.add('disabled');
      } else {
        internals.states.delete('disabled');
      }
    });
  }

  if (callbacks) {
    formCallbackRegistry.set(host, { ...formCallbackRegistry.get(host), ...callbacks });
  }

  const checkValidity = () => internals.checkValidity();
  const reportValidity = () => internals.reportValidity();
  const setCustomValidity = (message: string) =>
    message ? internals.setValidity({ customError: true }, message) : internals.setValidity({});

  return {
    checkValidity,
    internals,
    reportValidity,
    setCustomValidity,
    setValidity: internals.setValidity.bind(internals),
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// PROP SYSTEM
// ─────────────────────────────────────────────────────────────────────────────

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

export type PropDef<T> = PropOptions<T> & { default: T };
export type PropInputDefs = Record<string, unknown | PropDef<unknown>>;

type PropMeta<T = unknown> = {
  parse: (value: string | null) => T;
  reflect: boolean;
  signal: Signal<T>;
};

const PROP_DEF_KEYS = new Set(['default', 'omit', 'parse', 'reflect', 'type']);
const isPropDef = (value: unknown): value is PropDef<unknown> => {
  if (typeof value !== 'object' || value === null || !('default' in value)) return false;

  return Object.keys(value).every((key) => PROP_DEF_KEYS.has(key));
};

export const propRegistry = new WeakMap<object, Map<string, PropMeta<unknown>>>();

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
  const hasPreUpgradeProperty = Object.prototype.hasOwnProperty.call(el, name);
  const preUpgradeValue = hasPreUpgradeProperty ? (el as unknown as Record<string, unknown>)[name] : undefined;

  const meta = {
    parse,
    reflect: options?.reflect ?? true,
    signal: s as Signal<unknown>,
  };

  // Prefer pre-upgrade property values set before defineProperty() (common for
  // framework/host property bindings), then fall back to attributes.
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

export function createProps<D extends PropInputDefs>(defs: D): InferPropsSignals<D> {
  const result = {} as Record<string, Signal<unknown>>;

  for (const [name, def] of Object.entries(defs)) {
    const descriptor = isPropDef(def) ? (def as PropDef<unknown>) : { default: def };
    const hasStructuredDefault =
      (typeof descriptor.default === 'object' && descriptor.default !== null) || Array.isArray(descriptor.default);
    const propDef: PropOptions<unknown> = { reflect: !hasStructuredDefault, ...descriptor };

    result[name] = prop(toKebab(name), descriptor.default, propDef);
  }

  return result as InferPropsSignals<D>;
}

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

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT SETUP & REGISTRATION
// ─────────────────────────────────────────────────────────────────────────────

export type ComponentSetupContext = {
  /** The host `HTMLElement` instance for this component. */
  host: HTMLElement;
  /** Shorthand for `host.shadowRoot` — the component's open shadow root. */
  shadow: ShadowRoot;
};

export type ComponentRegistrationOptions = {
  /** Indicates if this should be a form-associated element */
  formAssociated?: boolean;
  /** Custom options for host element (e.g. for aria-*) */
  host?: Record<string, string | boolean | number>;
  /** @internal — list of attribute names to observe via attributeChangedCallback */
  observedAttrs?: string[];
  /** Shadow root init options (mode is always 'open') — use e.g. `{ delegatesFocus: true }` for form controls */
  shadow?: Omit<ShadowRootInit, 'mode'>;
  /** Component styles applied to the shadow root. Static — set at definition time, not per-render. */
  styles?: (string | CSSStyleSheet | CSSResult)[];
};

/**
 * Helper type to build a prop schema from a props interface type.
 * Each property maps to a PropOptions shape with a `default` value.
 */
export type BuildPropSchema<T> = {
  [K in keyof T]-?: PropDef<T[K]>;
};

/**
 * Unified setup context passed to `defineComponent` setup function.
 * Both Props and Events generics flow through to give full type safety.
 */
export type DefineComponentSetupContext<
  P extends Record<string, PropOptions<any>> = Record<string, never>,
  E extends Record<string, unknown> = Record<string, never>,
> = {
  /** Typed emit function — fully inferred from the Events generic */
  emit: EmitFn<E>;
  /** Host element */
  host: HTMLElement;
  /** Reactive props as signals — fully inferred from the Props generic */
  props: InferPropsSignals<P>;
  /** Reflect reactive attributes, events and classes to the host */
  reflect: (config: ReflectConfig) => void;
  /** Shadow root */
  shadow: ShadowRoot;
  /** Slots helper */
  slots: Slots<any>;
};

/**
 * Configuration object for `defineComponent()`.
 * Note: no `emits` field — declare events via the Events generic instead.
 */
export type DefineComponentOptions<
  PropsSchema extends Record<string, PropDef<any>> = Record<string, never>,
  Emits extends Record<string, unknown> = Record<string, never>,
> = {
  /** Whether this element is form-associated */
  formAssociated?: boolean;
  /** Host element attributes */
  host?: Record<string, string | boolean | number>;
  /** Property definitions */
  props?: PropsSchema;
  /** Setup function — returns a template */
  setup: (ctx: DefineComponentSetupContext<PropsSchema, Emits>) => string | HTMLResult;
  /** Shadow root init options */
  shadow?: Omit<ShadowRootInit, 'mode'>;
  /** Component styles */
  styles?: (string | CSSStyleSheet | CSSResult)[];
  /** Custom element tag name (must include a hyphen) */
  tag: string;
};

// ─── Base custom element ──────────────────────────────────────────────────────

type ComponentRuntime = {
  cleanups: CleanupFn[];
  el: HTMLElement;
  errorHandlers: Array<(err: unknown) => void>;
  onMount: Array<() => CleanupFn | undefined | void>;
  styles?: (string | CSSStyleSheet | CSSResult)[];
};

// Lifecycle methods (connectedCallback, attributeChangedCallback, …) are invoked
// by the browser runtime, not TypeScript code — suppress false-positive lint warnings.

class BaseElement extends HTMLElement {
  static _setup: (ctx: ComponentSetupContext) => string | HTMLResult;
  static _options?: ComponentRegistrationOptions;
  static formAssociated = false;
  static observedAttributes: string[] = [];

  shadow: ShadowRoot;
  private _keyedStates = new Map<string, Map<string | number, KeyedNode>>();
  private _mountFns: (() => CleanupFn | undefined | void)[] = [];
  private _template: string | HTMLResult | null = null;
  private _appliedHtmlBindings = new Set<string>();
  private _setupDone = false;
  private _runtime: ComponentRuntime;

  constructor() {
    super();

    const options = (this.constructor as typeof BaseElement)._options;

    this.shadow = this.attachShadow({ mode: 'open', ...options?.shadow });
    this._runtime = {
      cleanups: [],
      el: this,
      errorHandlers: [],
      onMount: [],
      styles: options?.styles,
    };
  }

  connectedCallback(): void {
    if (!this._setupDone) this._runSetup();

    this._init();
  }

  // Fires synchronously on observed attribute change — no MutationObserver needed.
  // observedAttributes is set at class-definition time from the prop schema.
  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    if (oldValue === newValue) return;

    const meta = propRegistry.get(this)?.get(name);

    if (!meta) return;

    const parsed = meta.parse(newValue);

    if (!Object.is(meta.signal.peek(), parsed)) meta.signal.value = parsed as never;
  }

  disconnectedCallback(): void {
    runAll(this._runtime.cleanups);
    this._runtime.cleanups = [];
    this._runtime.onMount = this._mountFns.slice(); // restore for reconnect
    this._appliedHtmlBindings.clear();
    this._keyedStates.clear();
  }

  formAssociatedCallback(form: HTMLFormElement | null): void {
    formCallbackRegistry.get(this)?.onAssociated?.(form);
  }

  formDisabledCallback(disabled: boolean): void {
    formCallbackRegistry.get(this)?.onDisabled?.(disabled);
  }

  formResetCallback(): void {
    formCallbackRegistry.get(this)?.onReset?.();
  }

  formStateRestoreCallback(state: unknown, mode: 'autocomplete' | 'restore'): void {
    formCallbackRegistry.get(this)?.onStateRestore?.(state, mode);
  }

  private _handleError(err: unknown): void {
    if (this._runtime.errorHandlers.length > 0) {
      for (const fn of this._runtime.errorHandlers) fn(err);
    } else {
      console.error(`[craftit:E3] <${this.localName}>`, err);
    }
  }

  private _runSetup(): void {
    this._setupDone = true;
    runtimeStack.push(this._runtime as any);

    try {
      const { host: hostOptions } = (this.constructor as typeof BaseElement)._options ?? {};

      if (hostOptions) {
        for (const [name, value] of Object.entries(hostOptions)) {
          if (typeof value === 'boolean') {
            if (value) {
              this.setAttribute(name, '');
            } else {
              this.removeAttribute(name);
            }
          } else {
            this.setAttribute(name, String(value));
          }
        }
      }

      const res = (this.constructor as typeof BaseElement)._setup({ host: this, shadow: this.shadow });

      if (typeof res === 'string' || (typeof res === 'object' && res !== null && '__html' in res)) {
        this._template = res as string | HTMLResult;
      }
    } catch (err) {
      this._handleError(err);
    } finally {
      runtimeStack.pop();
    }
  }

  private _init(): void {
    const { styles } = this._runtime;

    // Apply styles synchronously before rendering to prevent FOUC.
    if (styles?.length) this.shadow.adoptedStyleSheets = styles.map(loadStylesheet);

    if (this._template) {
      const result: HTMLResult = typeof this._template === 'string' ? htmlResult(this._template) : this._template;

      this.shadow.replaceChildren(parseHTML(result.__html));

      if (result.__bindings.length) {
        const registerCleanup: RegisterCleanup = (fn) => this._runtime.cleanups.push(fn);

        applyBindingsInContainer(this.shadow, result.__bindings, registerCleanup, {
          onHtml: (b) => {
            if (!this._appliedHtmlBindings.has(b.uid)) {
              this._appliedHtmlBindings.add(b.uid);
              applyHtmlBinding(this.shadow, b, registerCleanup, this._keyedStates);
            }
          },
        });
      }
    }

    // Defer onMount callbacks to a microtask for deterministic timing.
    // Components that depend on layout/paint should schedule rAF inside onMount.
    queueMicrotask(() => {
      runtimeStack.push(this._runtime as any);

      try {
        const fns = this._runtime.onMount;

        this._mountFns = fns.slice(); // snapshot for reconnect

        for (const fn of fns) {
          const cleanup = fn();

          if (typeof cleanup === 'function') this._runtime.cleanups.push(cleanup);
        }
      } catch (err) {
        this._handleError(err);
      } finally {
        runtimeStack.pop();
        this._runtime.onMount = [];
      }
    });
  }
}

// ─── Component registration ───────────────────────────────────────────────────

/** @internal — use `defineComponent` instead. */
export function registerComponent(
  tag: string,
  setup: (ctx: ComponentSetupContext) => string | HTMLResult,
  options: ComponentRegistrationOptions = {},
): string {
  if (!tag) throw new Error('[craftit:E4] registerComponent(tag, ...) requires a tag name');

  if (customElements.get(tag)) {
    throw new Error(`[craftit:E9] custom element already defined: ${tag}`);
  }

  class Element extends BaseElement {
    static override _setup = setup;
    static override _options = options;
    static override formAssociated = options.formAssociated ?? false;
    static override observedAttributes = options.observedAttrs ?? [];
  }

  customElements.define(tag, Element);

  return tag;
}

/**
 * Defines a custom element with a cohesive, type-safe API.
 *
 * Pass your Props and Events interfaces as generics — everything in `setup`
 * is fully typed with zero boilerplate.
 *
 * @example
 * ```ts
 * type MyProps = { checked?: boolean; disabled?: boolean };
 * type MyEvents = { change: { checked: boolean } };
 *
 * defineComponent<MyProps, MyEvents>({
 *   tag: 'my-checkbox',
 *   props: {
 *     checked: { default: false },
 *     disabled: { default: false },
 *   },
 *   setup({ props, emit }) {
 *     // props.checked → Signal<boolean>  ✅
 *     // emit('change', { checked: true }) ✅
 *   },
 * });
 * ```
 */
export function defineComponent<
  PropsType = Record<string, never>,
  EventsType extends Record<string, unknown> = Record<string, never>,
>(options: DefineComponentOptions<BuildPropSchema<PropsType>, EventsType>): string {
  const { formAssociated, host: hostOptions, props: propDefs, setup, shadow: shadowOptions, styles, tag } = options;

  // Derive observed attribute names from prop schema at definition time so
  // attributeChangedCallback fires correctly — no MutationObserver needed.
  const observedAttrs = propDefs ? Object.keys(propDefs).map(toKebab) : [];

  return registerComponent(
    tag,
    (ctx) => {
      const props = propDefs
        ? createProps(propDefs as BuildPropSchema<PropsType>)
        : ({} as InferPropsSignals<BuildPropSchema<PropsType>>);
      const emit = createEmitFn<EventsType>();
      const slots = createSlots<any>();

      return setup({
        emit: emit as EmitFn<EventsType>,
        host: ctx.host,
        props,
        reflect: (config: ReflectConfig) => reflect(ctx.host, config),
        shadow: ctx.shadow,
        slots,
      } as DefineComponentSetupContext<BuildPropSchema<PropsType>, EventsType>);
    },
    { formAssociated, host: hostOptions, observedAttrs, shadow: shadowOptions, styles },
  );
}

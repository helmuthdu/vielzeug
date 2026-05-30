import { onCleanup as _onCleanup, scope as _scope, type Scope, untrack } from '@vielzeug/ripple';

import { inject, injectStrict, provide } from './context';
import { CraftitError, CRAFTIT_ERRORS, reportRuntimeError } from './errors';
import { createBind, type HostBindFn } from './host-bind';
import {
  createProps,
  normalizePropDefinition,
  prop,
  propRegistry,
  validatePropDefs,
  type InferPropsFromDefs,
  type InferPropsSignals,
  type PropDef,
  type PropInputDefs,
  type PropsDef,
} from './props';
import {
  effect,
  onCleanup,
  onMounted,
  withRuntimeContext,
  type OnMountedCallback,
  type RuntimeContext,
} from './runtime';
import { createSlots, type ComponentSlots } from './slots';
import { ComponentPhase, LIFECYCLE_EVENTS } from './types';
import { type HTMLResult } from './types/bindings';
import { type CSSResult, loadStylesheet } from './utils/css';
import { toKebab } from './utils/dom';
import { createEmitFn, type EmitFn } from './utils/emit';

// ─── Re-export from types.ts (R12) ─────────────────────────────────────────────

export { ComponentPhase, LIFECYCLE_EVENTS } from './types';
export type { LifecycleEventName } from './types';

// ─── Public component API types ───────────────────────────────────────────────

export type SetupContextBag<
  Emits extends Record<string, unknown> = Record<string, unknown>,
  SlotNames extends string = string,
> = {
  bind: HostBindFn;
  /** Scoped reactive effect — auto-disposed on component disconnect. */
  effect: typeof effect;
  /** The host element. */
  el: HTMLElement;
  emit: EmitFn<Emits>;
  /** Inject a context value from a parent component. */
  inject: typeof inject;
  /** Inject a context value, throwing if not found. */
  injectStrict: typeof injectStrict;
  /** Register a cleanup function to run on component disconnect. */
  onCleanup: typeof onCleanup;
  /** Register a callback to run after the component template mounts to DOM. */
  onMounted: typeof onMounted;
  /** Provide a context value to descendant components. */
  provide: typeof provide;
  slots: ComponentSlots<SlotNames>;
};

export type ComponentDefinition<
  Props extends Record<string, unknown> = Record<never, never>,
  Emits extends Record<string, unknown> = Record<string, never>,
  SlotNames extends string = string,
> = {
  formAssociated?: boolean;
  /**
   * Rendered while async `setup()` is still pending.
   * Only used when `setup` returns a `Promise`.
   */
  loading?: () => HTMLResult;
  /**
   * Error handler called when setup throws.
   * If a recovery HTMLResult is returned, it replaces the failed template.
   */
  onError?: (error: CraftitError, element: HTMLElement) => HTMLResult | void;
  props?: PropsDef<Props>;
  setup: (props: InferPropsSignals<Props>, ctx: SetupContextBag<Emits, SlotNames>) => HTMLResult | Promise<HTMLResult>;
  /**
   * Shadow DOM configuration. `mode` defaults to `'open'`.
   * Set to `false` to opt out of shadow DOM entirely (light DOM rendering).
   */
  shadow?: Partial<ShadowRootInit> | false;
  slots?: readonly SlotNames[];
  styles?: (string | CSSStyleSheet | CSSResult)[];
};

// ─── Internal component state ─────────────────────────────────────────────────

type ComponentState = {
  mountCallbacks: OnMountedCallback[];
  mountToken: number;
  phase: ComponentPhase;
  scope: Scope;
  templateResult: HTMLResult | null;
};

const createComponentState = (): ComponentState => ({
  mountCallbacks: [],
  mountToken: 0,
  phase: ComponentPhase.UNINITIALIZED,
  scope: _scope(),
  templateResult: null,
});

// ─── BaseElement ──────────────────────────────────────────────────────────────

class BaseElement extends HTMLElement {
  static _definition: ComponentDefinition<Record<never, never>, Record<string, never>, string>;
  static _normalizedPropDefs: PropsDef<Record<never, never>> | undefined;
  static formAssociated = false;
  static observedAttributes: string[] = [];

  shadow: ShadowRoot | null;
  private _component: ComponentState;

  constructor() {
    super();

    const def = (this.constructor as typeof BaseElement)._definition;

    this.shadow =
      def?.shadow !== false
        ? this.attachShadow({ mode: 'open', ...(def?.shadow as Partial<ShadowRootInit> | undefined) })
        : null;
    this._component = createComponentState();
  }

  connectedCallback(): void {
    untrack(() => {
      if (this._component.phase === ComponentPhase.UNINITIALIZED) this._runSetup();

      this._init();
    });
    this.dispatchEvent(new CustomEvent(LIFECYCLE_EVENTS.CONNECT, { bubbles: false, composed: false }));
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    if (oldValue === newValue) return;

    const propMeta = propRegistry.get(this)?.get(name);

    if (!propMeta) return;

    const parsed = propMeta.parse(newValue);

    if (
      !Object.is(
        untrack(() => propMeta.signal.value),
        parsed,
      )
    )
      propMeta.signal.value = parsed as never;
  }

  disconnectedCallback(): void {
    this._component.mountToken++;
    this._component.phase = ComponentPhase.UNMOUNTED;
    this._component.scope.dispose();
    this.dispatchEvent(new CustomEvent(LIFECYCLE_EVENTS.DISCONNECT, { bubbles: false, composed: false }));
    // Reset state (scope, callbacks, template) for next connect
    this._component = createComponentState();
  }

  private _handleSetupError(error: unknown, operation = 'connectedCallback'): HTMLResult | void {
    const err = error instanceof Error ? error : new Error(String(error));
    const craftError = new CraftitError(
      `[craft] <${this.localName}> failed during ${this._component.phase} (${operation})`,
      { cause: err, component: this.localName, phase: this._component.phase },
    );
    const def = (this.constructor as typeof BaseElement)._definition;

    if (def?.onError) {
      try {
        return def.onError(craftError, this);
      } catch {
        /* fall through */
      }
    }

    reportRuntimeError(craftError, this);
  }

  private _runSetup(): void {
    this._component.phase = ComponentPhase.SETUP_RUNNING;

    const def = (this.constructor as typeof BaseElement)._definition;
    const normalizedPropDefs = (this.constructor as typeof BaseElement)._normalizedPropDefs;
    const ctx: RuntimeContext = { element: this, mountCallbacks: [] };

    try {
      let setupResult: HTMLResult | Promise<HTMLResult> | undefined;

      this._component.scope.run(() => {
        setupResult = withRuntimeContext(ctx, () => {
          // createProps must run inside withRuntimeContext since registerProp calls getCurrentElement()
          const setupProps = normalizedPropDefs
            ? createProps(normalizedPropDefs)
            : ({} as InferPropsSignals<Record<never, never>>);
          const bind = createBind(this);
          const emit = createEmitFn(this);
          const slots = createSlots() as ComponentSlots<string>;

          const contextBag: SetupContextBag<Record<string, never>, string> = {
            bind,
            effect,
            el: this,
            emit,
            inject,
            injectStrict,
            onCleanup,
            onMounted,
            provide,
            slots,
          };

          return def.setup(setupProps as InferPropsSignals<Record<never, never>>, contextBag);
        });
      });
      this._component.mountCallbacks.push(...ctx.mountCallbacks);

      if (setupResult instanceof Promise) {
        // Async setup (F3): show loading template immediately, swap when resolved.
        // Store captured mount callbacks; they will be scheduled after the real template mounts.
        const pendingCallbacks = this._component.mountCallbacks.splice(0);

        this._component.phase = ComponentPhase.LOADING;

        if (def.loading) {
          this._component.templateResult = def.loading();
        }

        void this._runSetupAsync(setupResult, pendingCallbacks);
      } else {
        this._component.templateResult = setupResult as HTMLResult;
        this._component.phase = ComponentPhase.SETUP_DONE;
      }
    } catch (error) {
      const recoveryTemplate = this._handleSetupError(error);

      if (recoveryTemplate) {
        this._component.templateResult = recoveryTemplate;
        this._component.phase = ComponentPhase.SETUP_DONE;
      } else {
        this._component.phase = ComponentPhase.UNINITIALIZED;
        throw error;
      }
    }
  }

  private async _runSetupAsync(promise: Promise<HTMLResult>, pendingCallbacks: OnMountedCallback[]): Promise<void> {
    try {
      const result = await promise;

      if (!this.isConnected || this._component.phase === ComponentPhase.UNMOUNTED) return;

      // Replace loading template with resolved template
      this._component.templateResult = result;
      this._component.phase = ComponentPhase.SETUP_DONE;
      this._component.mountCallbacks.push(...pendingCallbacks);

      const host: Element | ShadowRoot = this.shadow ?? this;

      host.replaceChildren(result.fragment);
      this._component.scope.run(() => {
        result.apply(_onCleanup);
      });
      this._scheduleMountCallbacks();
    } catch (error) {
      if (!this.isConnected || this._component.phase === ComponentPhase.UNMOUNTED) return;

      const recovery = this._handleSetupError(error, 'asyncSetup');

      if (recovery) {
        this._component.templateResult = recovery;
        this._component.phase = ComponentPhase.SETUP_DONE;

        const host: Element | ShadowRoot = this.shadow ?? this;

        host.replaceChildren(recovery.fragment);
        this._component.scope.run(() => {
          recovery.apply(_onCleanup);
        });
      }
    }
  }

  private _init(): void {
    this._applyStyles();
    this._mountTemplate();

    // Only schedule mount callbacks once setup is fully complete (not in LOADING state)
    if (this._component.phase === ComponentPhase.SETUP_DONE) this._scheduleMountCallbacks();
  }

  private _applyStyles(): void {
    const def = (this.constructor as typeof BaseElement)._definition;

    if (this.shadow && def?.styles?.length) {
      this.shadow.adoptedStyleSheets = def.styles.map(loadStylesheet);
    }
  }

  private _mountTemplate(): void {
    const result = this._component.templateResult;

    if (!result) return;

    const host: Element | ShadowRoot = this.shadow ?? this;

    host.replaceChildren(result.fragment);
    this._component.scope.run(() => {
      result.apply(_onCleanup);
    });
  }

  private _scheduleMountCallbacks(): void {
    if (this._component.mountCallbacks.length === 0) return;

    const token = ++this._component.mountToken;

    queueMicrotask(() => {
      if (!this.isConnected || token !== this._component.mountToken) return;

      for (const callback of this._component.mountCallbacks) {
        try {
          this._component.scope.run(() => {
            withRuntimeContext({ element: this, mountCallbacks: [] }, () => {
              const cleanup = callback();

              if (typeof cleanup === 'function') _onCleanup(cleanup);
            });
          });
        } catch (error) {
          this._handleSetupError(error, 'mountedCallback');
        }
      }
    });
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const defineComponent = <
  Props extends Record<string, unknown>,
  Emits extends Record<string, unknown>,
  SlotNames extends string,
>(
  tag: string,
  definition: ComponentDefinition<Props, Emits, SlotNames>,
  normalizedPropDefs: PropsDef<Props> | undefined,
  observedAttrs: string[],
): string => {
  if (!tag) throw new Error(CRAFTIT_ERRORS.defineRequiresTag);

  if (customElements.get(tag)) throw new Error(CRAFTIT_ERRORS.defineDuplicate(tag));

  // Named class for DevTools and error messages (R8)
  const ComponentClass = class extends BaseElement {
    static override _definition = definition as unknown as ComponentDefinition<
      Record<never, never>,
      Record<string, never>,
      string
    >;
    static override _normalizedPropDefs = normalizedPropDefs as PropsDef<Record<never, never>> | undefined;
    static override formAssociated = definition.formAssociated ?? false;
    static override observedAttributes = observedAttrs;
  };

  Object.defineProperty(ComponentClass, 'name', { value: tag });
  customElements.define(tag, ComponentClass);

  return tag;
};

// ─── Public API ───────────────────────────────────────────────────────────────

export { prop };
export type { HostBindFn } from './host-bind';
export type { InferPropsFromDefs, InferPropsSignals, PropDef, PropInputDefs, PropsDef };

/**
 * Define and register a web component.
 *
 * The `setup` function runs once per instance on first connect and returns an
 * `HTMLResult`. All reactive behaviour is expressed through reactive directives
 * inside the template — not by re-evaluating setup itself.
 *
 * @example
 * ```ts
 * define('my-counter', {
 *   props: { count: prop.number(0) },
 *   setup(props) {
 *     return html`<button @click=${() => props.count.value++}>${props.count}</button>`;
 *   },
 * });
 * ```
 */
export function define<
  Props extends Record<string, unknown> = Record<never, never>,
  Emits extends Record<string, unknown> = Record<string, never>,
  SlotNames extends string = string,
>(tag: string, definition: ComponentDefinition<Props, Emits, SlotNames>): string {
  const { props: propDefs } = definition;

  const normalizedPropDefs: PropsDef<Props> | undefined = (() => {
    if (!propDefs) return undefined;

    const errors = validatePropDefs(propDefs as Record<string, unknown>);

    if (errors.length > 0) throw new Error(CRAFTIT_ERRORS.validationFailed(tag, errors));

    const normalized: PropInputDefs = {};

    for (const [key, def] of Object.entries(propDefs)) {
      normalized[key] = normalizePropDefinition(def, key);
    }

    return normalized as PropsDef<Props>;
  })();

  const observedAttrs = normalizedPropDefs ? Object.keys(normalizedPropDefs).map(toKebab) : [];

  return defineComponent(tag, definition, normalizedPropDefs, observedAttrs);
}

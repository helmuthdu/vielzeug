import { onCleanup as _onCleanup, scope as _scope, type Scope, untrack } from '@vielzeug/stateit';

import { CRAFTIT_ERRORS, createRuntimeError, reportRuntimeError, type CraftitRuntimeError } from './errors';
import { ComponentPhase } from './lifecycle';
import { createHost, type ComponentHost } from './host-bind';
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
import { getCurrentElement, type OnMountedCallback, type RuntimeContext, withRuntimeContext } from './runtime';
import { createSlots, type ComponentSlots } from './slots';
import { applyBindingsInContainer, applyHtmlBinding, parseHTML } from './template-bindings';
import { extractResult, type HTMLResult } from './types/bindings';
import { type CSSResult, loadStylesheet } from './utils/css';
import { toKebab } from './utils/dom';
import { createEmitFn, type EmitFn } from './utils/emit';

// ─── Lifecycle event constants ────────────────────────────────────────────────────────────

/**
 * Lifecycle event names dispatched on the component's host element.
 *
 * - `craftit:connect` — fires after every `connectedCallback` (after setup and initial render)
 * - `craftit:disconnect` — fires after every `disconnectedCallback` (after scope cleanup)
 *
 * Both events are non-bubbling by default. Listen from outside the component:
 *
 * @example
 * ```ts
 * element.addEventListener(LIFECYCLE_EVENTS.CONNECT, () => {
 *   console.log('component mounted');
 * });
 * ```
 */
export const LIFECYCLE_EVENTS = {
  CONNECT: 'craftit:connect',
  DISCONNECT: 'craftit:disconnect',
} as const;

export type LifecycleEventName = (typeof LIFECYCLE_EVENTS)[keyof typeof LIFECYCLE_EVENTS];

export type ComponentRegistrationOptions = {
  /** Indicates if this should be a form-associated element */
  formAssociated?: boolean;
  /** @internal — list of attribute names to observe via attributeChangedCallback */
  observedAttrs?: string[];
  /**
   * Optional error handler called when setup throws.
   * Receives a structured error envelope with full context.
   * If a recovery template is returned, it will be rendered instead of failing.
   * Otherwise, an error event is dispatched on the element.
   */
  onError?: (error: CraftitRuntimeError, element: HTMLElement) => HTMLResult | void;
  /** Shadow root init options. `mode` defaults to `'open'`; set to `'closed'` for
   * security-sensitive components where shadow DOM internals must not be reachable
   * via `element.shadowRoot`. */
  shadow?: Partial<ShadowRootInit>;
  /** Component styles applied to the shadow root. Static — set at definition time, not per-render. */
  styles?: (string | CSSStyleSheet | CSSResult)[];
};

type ComponentState = {
  mountCallbacks: OnMountedCallback[];
  mountToken: number;
  phase: ComponentPhase;
  scope: Scope;
  styles?: (string | CSSStyleSheet | CSSResult)[];
  templateResult: HTMLResult | null;
};

const createComponentState = (styles?: (string | CSSStyleSheet | CSSResult)[]): ComponentState => ({
  mountCallbacks: [],
  mountToken: 0,
  phase: ComponentPhase.UNINITIALIZED,
  scope: _scope(),
  styles,
  templateResult: null,
});

class BaseElement extends HTMLElement {
  /**
   * Lifecycle:
   *
   * 1. UNINITIALIZED → SETUP_RUNNING → SETUP_DONE (first connect)
   *    - setup() runs once, returns HTMLResult
   *    - signals created in setup closure survive reconnect
   *    - computeds are re-created on each reconnect (scope-managed)
   *
   * 2. SETUP_DONE (every connect after first)
   *    - Template mounted if not already mounted
   *    - onMounted callbacks queued and executed
   *
   * 3. SETUP_DONE → UNMOUNTED (disconnect)
   *    - scope.dispose() runs all effect cleanups
   *    - Phase resets to allow setup re-run on reconnect
   */
  static _options?: ComponentRegistrationOptions;
  static _setup: () => HTMLResult;
  static formAssociated = false;
  static observedAttributes: string[] = [];

  shadow: ShadowRoot;
  private _component: ComponentState;

  constructor() {
    super();

    const options = (this.constructor as typeof BaseElement)._options;

    this.shadow = this.attachShadow({ mode: 'open', ...options?.shadow });
    this._component = createComponentState(options?.styles);
  }

  connectedCallback(): void {
    untrack(() => {
      if (this._component.phase === ComponentPhase.UNINITIALIZED) {
        this._runSetup();
      }

      this._init();
    });

    this.dispatchEvent(new CustomEvent(LIFECYCLE_EVENTS.CONNECT, { bubbles: false, composed: false }));
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    if (oldValue === newValue) return;

    const attrName = name;
    const propMeta = propRegistry.get(this)?.get(attrName);

    if (!propMeta) return;

    // Parse the new attribute value
    const parsed = propMeta.parse(newValue);

    // Only update signal if value actually changed
    if (
      !Object.is(
        untrack(() => propMeta.signal.value),
        parsed,
      )
    ) {
      propMeta.signal.value = parsed as never;
    }
  }

  disconnectedCallback(): void {
    this._component.mountToken++;
    this._component.phase = ComponentPhase.UNMOUNTED;
    this._component.scope.dispose();

    // Reset component state while preserving shadow and styles
    const state = createComponentState(this._component.styles);

    this._component.scope = state.scope;
    this._component.mountCallbacks = state.mountCallbacks;
    this._component.templateResult = state.templateResult;
    this._component.phase = ComponentPhase.UNINITIALIZED;

    this.dispatchEvent(new CustomEvent(LIFECYCLE_EVENTS.DISCONNECT, { bubbles: false, composed: false }));
  }

  private _handleSetupError(error: unknown, operation: string = 'connectedCallback'): HTMLResult | void {
    const err = error instanceof Error ? error : new Error(String(error));
    const runtimeError = createRuntimeError({
      code: 'SETUP_FAILED',
      kind: 'setup',
      phase: this._component.phase,
      component: this.localName,
      operation,
      cause: err,
      hint: 'Check component setup function and prop definitions',
    });

    const options = (this.constructor as typeof BaseElement)._options;
    const handler = options?.onError;

    if (handler) {
      try {
        return handler(runtimeError, this);
      } catch {
        // If error handler itself throws, fall through to default
      }
    }

    // Default: report structured error and dispatch event
    reportRuntimeError(runtimeError, this);

    return undefined;
  }

  private _runSetup(): void {
    this._component.phase = ComponentPhase.SETUP_RUNNING;

    const ctx: RuntimeContext = {
      element: this,
      mountCallbacks: [],
    };

    try {
      this._component.scope.run(() => {
        this._component.templateResult = withRuntimeContext(ctx, () =>
          (this.constructor as typeof BaseElement)._setup(),
        );
      });

      this._component.mountCallbacks.push(...ctx.mountCallbacks);
      this._component.phase = ComponentPhase.SETUP_DONE;
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

  private _init(): void {
    const { styles } = this._component;

    if (styles?.length) this.shadow.adoptedStyleSheets = styles.map(loadStylesheet);

    if (this._component.templateResult != null) {
      const { bindings, html: htmlString } = extractResult(this._component.templateResult);

      this.shadow.replaceChildren(parseHTML(htmlString));

      if (bindings.length) {
        this._component.scope.run(() => {
          applyBindingsInContainer(this.shadow, bindings, _onCleanup, {
            onHtml: (binding) => applyHtmlBinding(this.shadow, binding, _onCleanup),
          });
        });
      }
    }

    if (this._component.mountCallbacks.length > 0) {
      const token = ++this._component.mountToken;

      queueMicrotask(() => {
        if (!this.isConnected || token !== this._component.mountToken) return;

        try {
          for (const callback of this._component.mountCallbacks) {
            this._component.scope.run(() => {
              withRuntimeContext({ element: this, mountCallbacks: [] }, () => {
                const cleanup = callback();

                if (typeof cleanup === 'function') _onCleanup(cleanup);
              });
            });
          }
        } catch (error) {
          this._handleSetupError(error, 'mountedCallback');
        }
      });
    }
  }
}

const defineComponent = (tag: string, setup: () => HTMLResult, options: ComponentRegistrationOptions = {}): string => {
  if (!tag) throw new Error(CRAFTIT_ERRORS.defineRequiresTag);

  if (customElements.get(tag)) {
    throw new Error(CRAFTIT_ERRORS.defineDuplicate(tag));
  }

  class Element extends BaseElement {
    static override _options = options;
    static override _setup = setup;
    static override formAssociated = options.formAssociated ?? false;
    static override observedAttributes = options.observedAttrs ?? [];
  }

  customElements.define(tag, Element);

  return tag;
};

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC COMPONENT AUTHORING API
// ─────────────────────────────────────────────────────────────────────────────

export { prop };
export type { InferPropsFromDefs, InferPropsSignals, PropDef, PropInputDefs, PropsDef };

/**
 * Setup context passed as the second argument to the component setup function.
 *
 * The `SlotNames` generic is inferred from the `slots` array in `ComponentDefinition` when
 * a const array is provided, giving TypeScript knowledge of all valid slot names.
 */
export type SetupContextBag<
  Emits extends Record<string, unknown> = Record<string, unknown>,
  SlotNames extends string = string,
> = {
  emit: EmitFn<Emits>;
  host: ComponentHost;
  slots: ComponentSlots<SlotNames>;
};

export type ComponentDefinition<
  Props extends Record<string, unknown> = Record<never, never>,
  Emits extends Record<string, unknown> = Record<string, never>,
  SlotNames extends string = string,
> = {
  /** Enable form association for the custom element */
  formAssociated?: boolean;
  /** Component properties and their metadata */
  props?: PropsDef<Props>;
  /** Main setup function. Returns an `HTMLResult` template. All reactive behaviour is
   * expressed through reactive directives inside the template (`when`, `each`, etc.). */
  setup: (props: InferPropsSignals<Props>, ctx: SetupContextBag<Emits, SlotNames>) => HTMLResult;
  /** Shadow DOM configuration. `mode` defaults to `'open'`; use `mode: 'closed'`
   * for security-sensitive components where shadow DOM internals must not be
   * reachable via `element.shadowRoot`. */
  shadow?: Partial<ShadowRootInit>;
  /**
   * Declare the slot names this component exposes.
   * When provided as a `const` array, TypeScript narrows `slots.has()` / `slots.elements()`
   * to only accept the declared names, catching slot name typos at compile time.
   *
   * @example
   * ```ts
   * define('my-card', {
   *   slots: ['header', 'footer'] as const,
   *   setup(props, { slots }) {
   *     const hasFooter = slots.has('footer'); // ✓ typed
   *     const typo = slots.has('foooter');     // ✗ TypeScript error
   *   },
   * });
   * ```
   */
  slots?: readonly SlotNames[];
  /** Component-specific styles */
  styles?: (string | CSSStyleSheet | CSSResult)[];
  /**
   * Optional validation hook that runs at define-time.
   * Use to assert that required contexts or other global state is available before
   * any component instance is created.
   *
   * Throws if validation fails, preventing component registration.
   */
  validate?: (options: { injectionKeys: unknown[] }) => void;
};

const createSetupProps = <Props extends Record<string, unknown>>(
  defs: PropsDef<Props> | undefined,
): InferPropsSignals<Props> => {
  if (!defs) return {} as InferPropsSignals<Props>;

  return createProps(defs) as InferPropsSignals<Props>;
};

/**
 * Define and register a web component.
 *
 * The `setup` function runs once per component instance on first connect and returns an
 * `HTMLResult` directly. All reactive behaviour is expressed through reactive directives
 * inside the template — not by re-evaluating the setup function itself.
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
  const { formAssociated, props: propDefs, setup, shadow: shadowOptions, styles, validate } = definition;

  // Run validation hook at define-time if provided
  if (validate) {
    try {
      validate({ injectionKeys: [] });
    } catch (error) {
      throw new Error(
        `Component definition validation failed for '${tag}': ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // Normalize and validate all props at define-time for early, complete error feedback
  const normalizedPropDefs: PropsDef<Props> | undefined = (() => {
    if (!propDefs) return undefined;

    const errors = validatePropDefs(propDefs as Record<string, unknown>);

    if (errors.length > 0) {
      throw new Error(CRAFTIT_ERRORS.validationFailed(tag, errors));
    }

    const normalized: PropInputDefs = {};

    for (const [key, def] of Object.entries(propDefs)) {
      normalized[key] = normalizePropDefinition(def, key);
    }

    return normalized as PropsDef<Props>;
  })();

  const observedAttrs = normalizedPropDefs ? Object.keys(normalizedPropDefs).map(toKebab) : [];

  return defineComponent(
    tag,
    () => {
      const props = createSetupProps(normalizedPropDefs);
      const host = createHost();
      const el = getCurrentElement();
      const emit = createEmitFn<Emits>(el);
      const slots = createSlots() as ComponentSlots<SlotNames>;

      return setup(props, { emit, host, slots });
    },
    { formAssociated, observedAttrs, shadow: shadowOptions, styles },
  );
}

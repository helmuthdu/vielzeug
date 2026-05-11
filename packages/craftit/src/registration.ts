import { onCleanup as _onCleanup, scope as _scope, type Scope, untrack } from '@vielzeug/stateit';

import { CRAFTIT_ERRORS } from './errors';
import { createHost, createSlots, type ComponentHost, type ComponentSlots } from './host';
import {
  createEmitFn,
  type CSSResult,
  type EmitFn,
  extractResult,
  type HTMLResult,
  loadStylesheet,
  toKebab,
} from './internal';
import {
  createProps,
  isReflecting,
  prop,
  propRegistry,
  type InferPropsFromDefs,
  type InferPropsSignals,
  type PropDef,
  type PropInputDefs,
  type PropOptions,
  type PropsDef,
} from './props';
import {
  type OnMountedCallback,
  type RuntimeScope,
  type UpdatedCallbackBox,
  withCurrentElement,
  withRuntimeScope,
} from './runtime';
import { applyBindingsInContainer, parseHTML } from './template-bindings';
import { applyHtmlBinding } from './template-html';

export type ComponentRegistrationOptions = {
  /** Indicates if this should be a form-associated element */
  formAssociated?: boolean;
  /** @internal — list of attribute names to observe via attributeChangedCallback */
  observedAttrs?: string[];
  /** Shadow root init options (mode is always 'open') — use e.g. `{ delegatesFocus: true }` for form controls */
  shadow?: Omit<ShadowRootInit, 'mode'>;
  /** Component styles applied to the shadow root. Static — set at definition time, not per-render. */
  styles?: (string | CSSStyleSheet | CSSResult)[];
};

export type ComponentTemplate = () => HTMLResult;

type ComponentState = {
  mountCallbacks: OnMountedCallback[];
  mountedCallbacksRan: boolean;
  mountToken: number;
  scope: Scope;
  setupDone: boolean;
  styles?: (string | CSSStyleSheet | CSSResult)[];
  templateMounted: boolean;
  templateResult: HTMLResult | null;
  updated: UpdatedCallbackBox;
};

class BaseElement extends HTMLElement {
  // Lifecycle: setup() runs once on first connect. _init() runs on every connect.
  // On disconnect: cleanups run; on reconnect, styles and bindings are re-applied.
  static _options?: ComponentRegistrationOptions;
  static _setup: () => ComponentTemplate;
  static formAssociated = false;
  static observedAttributes: string[] = [];

  shadow: ShadowRoot;
  private _component: ComponentState;

  constructor() {
    super();

    const options = (this.constructor as typeof BaseElement)._options;

    this.shadow = this.attachShadow({ mode: 'open', ...options?.shadow });
    this._component = {
      mountCallbacks: [],
      mountedCallbacksRan: false,
      mountToken: 0,
      scope: _scope(),
      setupDone: false,
      styles: options?.styles,
      templateMounted: false,
      templateResult: null,
      updated: { callbacks: [], queued: false },
    };
  }

  connectedCallback(): void {
    untrack(() => {
      if (!this._component.setupDone) this._runSetup();

      this._init();
    });
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    if (oldValue === newValue) return;

    if (isReflecting(this, name)) return;

    const propMeta = propRegistry.get(this)?.get(name);

    if (!propMeta) return;

    const parsed = propMeta.parse(newValue);

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
    this._component.scope.dispose();
    this._component.scope = _scope();
    this._component.templateMounted = false;
  }

  private _handleError(err: unknown): void {
    console.error(CRAFTIT_ERRORS.unhandledComponentError(this.localName), err);

    throw err instanceof Error ? err : new Error(String(err));
  }

  private _runSetup(): void {
    // Temporary box collects updated-callbacks registered during setup; merged
    // into this._component.updated after setup succeeds.
    const setupUpdated: UpdatedCallbackBox = { callbacks: [], queued: false };
    const setupScope: RuntimeScope = {
      element: this,
      mountCallbacks: [],
      updated: setupUpdated,
    };

    try {
      this._component.scope.run(() => {
        const template = withRuntimeScope(setupScope, () =>
          withCurrentElement(this, () => (this.constructor as typeof BaseElement)._setup()),
        );

        this._component.templateResult = withRuntimeScope(setupScope, () => withCurrentElement(this, () => template()));
      });

      this._component.mountCallbacks.push(...setupScope.mountCallbacks);
      this._component.updated.callbacks.push(...setupUpdated.callbacks);
      this._component.setupDone = true;
    } catch (err) {
      this._handleError(err);
    }
  }

  private _init(): void {
    const { styles } = this._component;

    if (styles?.length) this.shadow.adoptedStyleSheets = styles.map(loadStylesheet);

    if (!this._component.templateMounted && this._component.templateResult != null) {
      const { bindings, html: htmlString } = extractResult(this._component.templateResult);

      this.shadow.replaceChildren(parseHTML(htmlString));
      this._component.templateMounted = true;

      if (bindings.length) {
        this._component.scope.run(() => {
          applyBindingsInContainer(this.shadow, bindings, _onCleanup, {
            onHtml: (binding) => applyHtmlBinding(this.shadow, binding, _onCleanup),
          });
        });
      }
    }

    if (!this._component.mountedCallbacksRan && this._component.mountCallbacks.length > 0) {
      this._component.mountedCallbacksRan = true;

      const token = ++this._component.mountToken;

      queueMicrotask(() => {
        if (!this.isConnected || token !== this._component.mountToken) return;

        try {
          for (const callback of this._component.mountCallbacks) {
            this._component.scope.run(() => {
              withRuntimeScope(
                {
                  element: this,
                  mountCallbacks: [],
                  // Share the same updated box so effects inside mount callbacks
                  // schedule on the same queued flag as the component itself.
                  updated: this._component.updated,
                },
                () =>
                  withCurrentElement(this, () => {
                    const cleanup = callback();

                    if (typeof cleanup === 'function') _onCleanup(cleanup);
                  }),
              );
            });
          }
        } catch (err) {
          this._handleError(err);
        }
      });
    }
  }
}

const defineComponent = (
  tag: string,
  setup: () => ComponentTemplate,
  options: ComponentRegistrationOptions = {},
): string => {
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
// PUBLIC COMPONENT AUTHORING API (absorbed from component.ts)
// ─────────────────────────────────────────────────────────────────────────────

export { prop };
export type { InferPropsFromDefs, InferPropsSignals, PropDef, PropInputDefs, PropOptions, PropsDef };

/**
 * Setup context passed as the second argument to the component setup function.
 */
export type SetupContextBag<Emits extends Record<string, unknown> = Record<string, unknown>> = {
  emit: EmitFn<Emits>;
  host: ComponentHost;
  slots: ComponentSlots;
};

export type ComponentDefinition<
  Props extends Record<string, unknown> = Record<never, never>,
  Emits extends Record<string, unknown> = Record<string, never>,
> = {
  /** Enable form association for the custom element */
  formAssociated?: boolean;
  /** Component properties and their metadata */
  props?: PropsDef<Props>;
  /** Main setup function. Props are the first positional parameter, context bag is second. Returns a template function. */
  setup: (props: InferPropsSignals<Props>, ctx: SetupContextBag<Emits>) => ComponentTemplate;
  /** Shadow DOM configuration (mode is always 'open') */
  shadow?: Omit<ShadowRootInit, 'mode'>;
  /** Component-specific styles */
  styles?: (string | CSSStyleSheet | CSSResult)[];
};

const createSetupProps = <Props extends Record<string, unknown>>(
  defs: PropsDef<Props> | undefined,
): InferPropsSignals<Props> => {
  if (!defs) return {} as InferPropsSignals<Props>;

  return createProps(defs) as InferPropsSignals<Props>;
};

export function define<
  Props extends Record<string, unknown> = Record<never, never>,
  Emits extends Record<string, unknown> = Record<string, never>,
>(tag: string, definition: ComponentDefinition<Props, Emits>): string {
  const { formAssociated, props: propDefs, setup, shadow: shadowOptions, styles } = definition;

  const observedAttrs = propDefs ? Object.keys(propDefs).map(toKebab) : [];

  return defineComponent(
    tag,
    () => {
      const props = createSetupProps(propDefs);
      const host = createHost();
      const emit = createEmitFn<Emits>();
      const slots = createSlots();

      return setup(props, { emit, host, slots });
    },
    { formAssociated, observedAttrs, shadow: shadowOptions, styles },
  );
}

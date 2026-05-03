import { type CleanupFn, untrack } from '@vielzeug/stateit';

import { CRAFTIT_ERRORS } from './errors';
import { type CSSResult, extractResult, type HTMLResult, loadStylesheet, runAll } from './internal';
import { isReflecting, propRegistry } from './props';
import { type OnMountedCallback, type RuntimeScope, withCurrentElement, withRuntimeScope } from './runtime';
import { applyBindingsInContainer, parseHTML, type RegisterCleanup } from './template-bindings';
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

type ComponentCleanupState = {
  cleanups: CleanupFn[];
  el: HTMLElement;
  mountCallbacks: OnMountedCallback[];
  mountToken: number;
  styles?: (string | CSSStyleSheet | CSSResult)[];
};

type ComponentLifecycleState = {
  mountedCallbacksRan: boolean;
  setupDone: boolean;
  templateMounted: boolean;
  templateResult: HTMLResult | null;
};

class BaseElement extends HTMLElement {
  // Lifecycle: setup() runs once on first connect. _init() runs on every connect.
  // On disconnect: cleanups run; on reconnect, styles and bindings are re-applied.
  static _options?: ComponentRegistrationOptions;
  static _setup: () => ComponentTemplate;
  static formAssociated = false;
  static observedAttributes: string[] = [];

  shadow: ShadowRoot;
  private _lifecycle: ComponentLifecycleState;
  private _state: ComponentCleanupState;

  constructor() {
    super();

    const options = (this.constructor as typeof BaseElement)._options;

    this.shadow = this.attachShadow({ mode: 'open', ...options?.shadow });
    this._lifecycle = {
      mountedCallbacksRan: false,
      setupDone: false,
      templateMounted: false,
      templateResult: null,
    };
    this._state = {
      cleanups: [],
      el: this,
      mountCallbacks: [],
      mountToken: 0,
      styles: options?.styles,
    };
  }

  connectedCallback(): void {
    untrack(() => {
      if (!this._lifecycle.setupDone) this._runSetup();

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
    this._state.mountToken++;
    runAll(this._state.cleanups);
    this._state.cleanups = [];
    this._lifecycle.templateMounted = false;
  }

  private _handleError(err: unknown): void {
    console.error(CRAFTIT_ERRORS.unhandledComponentError(this.localName), err);

    throw err instanceof Error ? err : new Error(String(err));
  }

  private _runSetup(): void {
    const setupScope: RuntimeScope = {
      cleanups: [],
      mountCallbacks: [],
    };

    try {
      const template = withRuntimeScope(setupScope, () =>
        withCurrentElement(this, () => (this.constructor as typeof BaseElement)._setup()),
      );

      this._lifecycle.templateResult = withRuntimeScope(setupScope, () => withCurrentElement(this, () => template()));

      this._state.cleanups.push(...setupScope.cleanups);
      this._state.mountCallbacks.push(...setupScope.mountCallbacks);
      this._lifecycle.setupDone = true;
    } catch (err) {
      this._handleError(err);
    }
  }

  private _init(): void {
    const { styles } = this._state;

    if (styles?.length) this.shadow.adoptedStyleSheets = styles.map(loadStylesheet);

    if (!this._lifecycle.templateMounted && this._lifecycle.templateResult != null) {
      const { bindings, html: htmlString } = extractResult(this._lifecycle.templateResult);
      const registerCleanup: RegisterCleanup = (fn) => this._state.cleanups.push(fn);

      this.shadow.replaceChildren(parseHTML(htmlString));
      this._lifecycle.templateMounted = true;

      if (bindings.length) {
        applyBindingsInContainer(this.shadow, bindings, registerCleanup, {
          onHtml: (binding) => applyHtmlBinding(this.shadow, binding, registerCleanup),
        });
      }
    }

    if (!this._lifecycle.mountedCallbacksRan && this._state.mountCallbacks.length > 0) {
      this._lifecycle.mountedCallbacksRan = true;

      const token = ++this._state.mountToken;

      queueMicrotask(() => {
        if (!this.isConnected || token !== this._state.mountToken) return;

        try {
          for (const callback of this._state.mountCallbacks) {
            const mountScope: RuntimeScope = {
              cleanups: this._state.cleanups,
              mountCallbacks: [],
            };

            const cleanup = withRuntimeScope(mountScope, () => withCurrentElement(this, () => callback()));

            if (typeof cleanup === 'function') this._state.cleanups.push(cleanup);
          }
        } catch (err) {
          this._handleError(err);
        }
      });
    }
  }
}

/** @internal — use define() instead. */
export function registerComponent(
  tag: string,
  setup: () => ComponentTemplate,
  options: ComponentRegistrationOptions = {},
): string {
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
}

import { type CleanupFn, untrack } from '@vielzeug/stateit';

import { type CSSResult, extractResult, type HTMLResult, loadStylesheet, runAll } from './internal';
import { isReflecting, propRegistry } from './props';
import { type RuntimeScope, withCurrentElement, withRuntimeScope } from './runtime';
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

export type ComponentInstance = {
  mount?: () => CleanupFn | void;
  render: () => HTMLResult;
};

type ComponentCleanupState = {
  cleanups: CleanupFn[];
  el: HTMLElement;
  mountToken: number;
  styles?: (string | CSSStyleSheet | CSSResult)[];
};

type ComponentLifecycleState = {
  instance: ComponentInstance | null;
  mounted: boolean;
  rendered: boolean;
  setupDone: boolean;
  template: HTMLResult | null;
};

class BaseElement extends HTMLElement {
  // Lifecycle: setup() runs once on first connect. _init() runs on every connect.
  // On disconnect: cleanups run; on reconnect, styles and bindings are re-applied.
  static _options?: ComponentRegistrationOptions;
  static _setup: () => ComponentInstance;
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
      instance: null,
      mounted: false,
      rendered: false,
      setupDone: false,
      template: null,
    };
    this._state = {
      cleanups: [],
      el: this,
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
    this._lifecycle.rendered = false;
  }

  formAssociatedCallback(): void {}

  formDisabledCallback(): void {}

  formResetCallback(): void {}

  formStateRestoreCallback(): void {}

  private _handleError(err: unknown): void {
    console.error(`[craftit:E3] <${this.localName}>`, err);

    throw err instanceof Error ? err : new Error(String(err));
  }

  private _runSetup(): void {
    this._lifecycle.setupDone = true;

    const setupScope: RuntimeScope = {
      cleanups: [],
    };

    try {
      this._lifecycle.instance = withRuntimeScope(setupScope, () =>
        withCurrentElement(this, () => (this.constructor as typeof BaseElement)._setup()),
      );

      this._lifecycle.template = withRuntimeScope(setupScope, () =>
        withCurrentElement(this, () => this._lifecycle.instance!.render()),
      );

      this._state.cleanups.push(...setupScope.cleanups);
    } catch (err) {
      this._handleError(err);
    }
  }

  private _init(): void {
    const { styles } = this._state;

    if (styles?.length) this.shadow.adoptedStyleSheets = styles.map(loadStylesheet);

    if (!this._lifecycle.rendered && this._lifecycle.template != null) {
      const { bindings, html: htmlString } = extractResult(this._lifecycle.template);
      const registerCleanup: RegisterCleanup = (fn) => this._state.cleanups.push(fn);

      this.shadow.replaceChildren(parseHTML(htmlString));
      this._lifecycle.rendered = true;

      if (bindings.length) {
        applyBindingsInContainer(this.shadow, bindings, registerCleanup, {
          onHtml: (binding) => applyHtmlBinding(this.shadow, binding, registerCleanup),
        });
      }
    }

    if (!this._lifecycle.mounted && this._lifecycle.instance?.mount) {
      this._lifecycle.mounted = true;
      const token = ++this._state.mountToken;

      queueMicrotask(() => {
        if (!this.isConnected || token !== this._state.mountToken) return;

        try {
          const mountScope: RuntimeScope = {
            cleanups: this._state.cleanups,
          };

          const cleanup = withRuntimeScope(mountScope, () =>
            withCurrentElement(this, () => this._lifecycle.instance!.mount!()),
          );

          if (typeof cleanup === 'function') this._state.cleanups.push(cleanup);
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
  setup: () => ComponentInstance,
  options: ComponentRegistrationOptions = {},
): string {
  if (!tag) throw new Error('[craftit:E4] registerComponent(tag, ...) requires a tag name');

  if (customElements.get(tag)) {
    throw new Error(`[craftit:E10] define('${tag}', ...) called more than once`);
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

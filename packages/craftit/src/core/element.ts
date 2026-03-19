import { type CleanupFn } from '@vielzeug/stateit';

import { type CSSResult } from './css';
import { formCallbackRegistry } from './form';
import { type Binding, type HTMLResult } from './internal';
import { propRegistry } from './props';
import { type ComponentRuntime, runtimeStack } from './runtime';
import {
  applyBindingsInContainer,
  applyHtmlBinding,
  type KeyedNode,
  makeHtmlResult,
  parseHTML,
  type RegisterCleanup,
} from './template';
import { runAll } from './utils';

// ─── Stylesheet cache ─────────────────────────────────────────────────────────
const stylesheetStringCache = new Map<string, CSSStyleSheet>();

const loadStylesheet = (style: string | CSSStyleSheet | CSSResult): CSSStyleSheet => {
  if (style instanceof CSSStyleSheet) return style;

  const cssText = typeof style === 'string' ? style : style.content;
  const cached = stylesheetStringCache.get(cssText);

  if (cached) return cached;

  const sheet = new CSSStyleSheet();

  try {
    sheet.replaceSync(cssText);
    stylesheetStringCache.set(cssText, sheet);
  } catch (err) {
    console.error(`[craftit:E2] style replace failed`, err);
  }

  return sheet;
};

// ─── Component setup ──────────────────────────────────────────────────────────
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
  /** Shadow root init options (mode is always 'open') — use e.g. `{ delegatesFocus: true }` for form controls */
  shadow?: Omit<ShadowRootInit, 'mode'>;
  /** Component styles applied to the shadow root. Static — set at definition time, not per-render. */
  styles?: (string | CSSStyleSheet | CSSResult)[];
};

// ─── Base custom element ──────────────────────────────────────────────────────
class BaseElement extends HTMLElement {
  static _setup: (ctx: ComponentSetupContext) => string | HTMLResult;
  static _options?: ComponentRegistrationOptions;
  static formAssociated = false;
  static get observedAttributes(): string[] {
    return [];
  }

  shadow: ShadowRoot;
  private _keyedStates = new Map<string, Map<string | number, KeyedNode>>();
  private _onMountFns: (() => CleanupFn | undefined | void)[] = [];
  private _template: string | HTMLResult | null = null;
  private appliedHtmlBindings = new Set<string>();
  private runtime: ComponentRuntime;
  private _setupDone = false;
  private _attrObserver?: MutationObserver;

  constructor() {
    super();

    const options = (this.constructor as typeof BaseElement)._options;

    this.shadow = this.attachShadow({ mode: 'open', ...options?.shadow });
    this.runtime = {
      cleanups: [],
      el: this,
      errorHandlers: [],
      onMount: [],
      styles: options?.styles,
    };
  }

  connectedCallback(): void {
    if (!this._setupDone) this._runSetup();

    this.init();
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    this._handleAttributeChange(name, oldValue, newValue);
  }

  private _handleError(err: unknown): void {
    if (this.runtime.errorHandlers.length > 0) {
      for (const fn of this.runtime.errorHandlers) fn(err);
    } else {
      console.error(`[craftit:E3] <${this.localName}>`, err);
    }
  }

  private _runSetup(): void {
    this._setupDone = true;
    runtimeStack.push(this.runtime);

    const options = (this.constructor as typeof BaseElement)._options || {};

    try {
      const hostOptions = options.host;

      if (hostOptions) {
        for (const [name, value] of Object.entries(hostOptions)) {
          if (typeof value === 'boolean') {
            if (value) this.setAttribute(name, '');
            else this.removeAttribute(name);
          } else {
            this.setAttribute(name, String(value));
          }
        }
      }

      // MutationObserver to keep registered prop signals in sync with attribute changes.
      this._attrObserver = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          if (mutation.type === 'attributes') {
            const name = mutation.attributeName!;
            const newValue = this.getAttribute(name);

            this._handleAttributeChange(name, mutation.oldValue, newValue);
          }
        }
      });
      this._attrObserver.observe(this, { attributeOldValue: true, attributes: true });

      const res = (this.constructor as typeof BaseElement)._setup({
        host: this,
        shadow: this.shadow,
      });

      if (typeof res === 'string' || (typeof res === 'object' && res !== null && '__html' in res)) {
        this._template = res as string | HTMLResult;
      }
    } catch (err) {
      this._handleError(err);
    } finally {
      runtimeStack.pop();
    }
  }

  private _handleAttributeChange(name: string, oldValue: string | null, newValue: string | null) {
    if (oldValue === newValue) return;

    const meta = propRegistry.get(this)?.get(name);

    if (!meta) return;

    const parsedValue = meta.parse(newValue);

    if (!Object.is(meta.signal.peek(), parsedValue)) {
      meta.signal.value = parsedValue as never;
    }
  }

  disconnectedCallback(): void {
    if (this._attrObserver) {
      this._attrObserver.disconnect();
      this._attrObserver = undefined;
    }

    runAll(this.runtime.cleanups);
    this.runtime.cleanups = [];
    this.runtime.onMount = this._onMountFns.slice();
    this.appliedHtmlBindings.clear();
    this._keyedStates.clear();
  }

  formAssociatedCallback(form: HTMLFormElement | null): void {
    formCallbackRegistry.get(this)?.formAssociated?.(form);
  }

  formDisabledCallback(disabled: boolean): void {
    formCallbackRegistry.get(this)?.formDisabled?.(disabled);
  }

  formResetCallback(): void {
    formCallbackRegistry.get(this)?.formReset?.();
  }

  formStateRestoreCallback(state: unknown, mode: 'autocomplete' | 'restore'): void {
    formCallbackRegistry.get(this)?.formStateRestore?.(state, mode);
  }

  private applyBindings(bindings: Binding[]) {
    if (!bindings.length) return;

    const root = this.shadow;
    const registerCleanup: RegisterCleanup = (fn) => this.runtime.cleanups.push(fn);

    applyBindingsInContainer(root, bindings, registerCleanup, {
      onHtml: (b) => {
        if (!this.appliedHtmlBindings.has(b.uid)) {
          this.appliedHtmlBindings.add(b.uid);
          applyHtmlBinding(root, b, registerCleanup, this._keyedStates);
        }
      },
    });
  }

  private init(): void {
    // Apply styles synchronously before rendering to prevent FOUC.
    const styles = this.runtime.styles;

    if (styles?.length) {
      this.shadow.adoptedStyleSheets = styles.map(loadStylesheet);
    }

    if (this._template) this.render(this._template);

    // Defer onMount callbacks to allow slot assignment to complete.
    // This ensures parent-controlled child state (e.g., selected tabs) can be queried correctly.
    queueMicrotask(() => {
      runtimeStack.push(this.runtime);

      try {
        const fns = this.runtime.onMount;

        this._onMountFns = fns.slice();
        for (const fn of fns) {
          const cleanup = fn();

          if (typeof cleanup === 'function') this.runtime.cleanups.push(cleanup);
        }
      } catch (err) {
        this._handleError(err);
      } finally {
        runtimeStack.pop();
      }

      this.runtime.onMount = [];
    });
  }

  private render(tpl: string | HTMLResult) {
    const result: HTMLResult = typeof tpl === 'string' ? makeHtmlResult(tpl) : tpl;

    this.shadow.replaceChildren(parseHTML(result.__html));
    this.applyBindings(result.__bindings);
  }
}

// ─── Component registration ───────────────────────────────────────────────────
export function registerComponent(
  tag: string,
  setup: (ctx: ComponentSetupContext) => string | HTMLResult,
  options: ComponentRegistrationOptions = {},
): string {
  if (!tag) throw new Error('[craftit:E4] registerComponent(tag, ...) requires a tag name');

  if (!customElements.get(tag)) {
    class Element extends BaseElement {
      static override _setup = setup;
      static override _options = options;
      static override formAssociated = !!options?.formAssociated;
    }

    customElements.define(tag, Element);
  }

  return tag;
}

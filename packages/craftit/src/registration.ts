import { type CleanupFn, untrack } from '@vielzeug/stateit';

import { formCallbackRegistry } from './form';
import { type CSSResult, type HTMLResult, htmlResult, loadStylesheet, runAll } from './internal';
import { propRegistry } from './props';
import { runtimeStack, type ComponentRuntime } from './runtime-core';
import { applyBindingsInContainer, applyHtmlBinding } from './template';
import { type RegisterCleanup } from './template-bindings';
import { parseHTML } from './template-dom';
import { type KeyedNode } from './template-html';

export type ComponentRegistrationOptions = {
  /** Indicates if this should be a form-associated element */
  formAssociated?: boolean;
  /** Custom options for a host element (e.g. for aria-*) */
  host?: Record<string, string | boolean | number>;
  /** @internal — list of attribute names to observe via attributeChangedCallback */
  observedAttrs?: string[];
  /** Shadow root init options (mode is always 'open') — use e.g. `{ delegatesFocus: true }` for form controls */
  shadow?: Omit<ShadowRootInit, 'mode'>;
  /** Component styles applied to the shadow root. Static — set at definition time, not per-render. */
  styles?: (string | CSSStyleSheet | CSSResult)[];
};

type ComponentSetupResult = string | HTMLResult;

class BaseElement extends HTMLElement {
  static _options?: ComponentRegistrationOptions;
  static _setup: () => ComponentSetupResult;
  static formAssociated = false;
  static observedAttributes: string[] = [];

  shadow: ShadowRoot;
  private _appliedHtmlBindings = new Set<string>();
  private _keyedStates = new Map<string, Map<string | number, KeyedNode>>();
  private _mountFns: (() => CleanupFn | undefined | void)[] = [];
  private _runtime: ComponentRuntime;
  private _rendered = false;
  private _setupDone = false;
  private _template: ComponentSetupResult | null = null;

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
    untrack(() => {
      if (!this._setupDone) this._runSetup();

      this._init();
    });
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
    ) {
      propMeta.signal.value = parsed as never;
    }
  }

  disconnectedCallback(): void {
    runAll(this._runtime.cleanups);
    this._runtime.cleanups = [];
    this._runtime.onMount = this._mountFns.slice();
    this._appliedHtmlBindings.clear();
    this._keyedStates.clear();
    this._rendered = false;
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

      throw err instanceof Error ? err : new Error(String(err));
    }
  }

  private _runSetup(): void {
    this._setupDone = true;
    runtimeStack.push(this._runtime as any);

    try {
      const options = (this.constructor as typeof BaseElement)._options;
      const { host: hostOptions } = options ?? {};

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

      const result = (this.constructor as typeof BaseElement)._setup();

      if (typeof result === 'string' || (typeof result === 'object' && result !== null && '__html' in result)) {
        this._template = result as ComponentSetupResult;
      }
    } catch (err) {
      this._handleError(err);
    } finally {
      runtimeStack.pop();
    }
  }

  private _init(): void {
    const { styles } = this._runtime;

    if (styles?.length) this.shadow.adoptedStyleSheets = styles.map(loadStylesheet);

    if (this._template) {
      const result: HTMLResult = typeof this._template === 'string' ? htmlResult(this._template) : this._template;

      if (!this._rendered) {
        this.shadow.replaceChildren(parseHTML(result.__html));
        this._rendered = true;
      }

      if (result.__bindings.length) {
        const registerCleanup: RegisterCleanup = (fn) => this._runtime.cleanups.push(fn);

        applyBindingsInContainer(this.shadow, result.__bindings, registerCleanup, {
          onHtml: (binding) => {
            if (!this._appliedHtmlBindings.has(binding.uid)) {
              this._appliedHtmlBindings.add(binding.uid);
              applyHtmlBinding(this.shadow, binding, registerCleanup, this._keyedStates);
            }
          },
        });
      }
    }

    queueMicrotask(() => {
      runtimeStack.push(this._runtime as any);

      try {
        const mountFns = this._runtime.onMount;

        this._mountFns = mountFns.slice();

        for (const mountFn of mountFns) {
          const cleanup = mountFn();

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

/** @internal — use define() instead. */
export function registerComponent(
  tag: string,
  setup: () => ComponentSetupResult,
  options: ComponentRegistrationOptions = {},
): string {
  if (!tag) throw new Error('[craftit:E4] registerComponent(tag, ...) requires a tag name');

  if (customElements.get(tag)) {
    return tag;
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

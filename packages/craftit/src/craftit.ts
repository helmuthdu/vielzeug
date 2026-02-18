/** biome-ignore-all lint/suspicious/noExplicitAny: Template values can be any type */

// craftit - Lightweight, type-safe web component creation library

/* ==================== Types ==================== */

/**
 * Lifecycle hook function called with component instance
 * @template T - Root element type
 * @template S - State object type
 */
export type LifecycleHook<T = HTMLElement, S extends object = object> = (el: WebComponent<T, S>) => void;

/**
 * Callback invoked when an observed attribute changes
 * @template T - Root element type
 * @template S - State object type
 */
export type AttributeChangeHook<T = HTMLElement, S extends object = object> = (
  name: string,
  oldValue: string | null,
  newValue: string | null,
  el: WebComponent<T, S>,
) => void;

/**
 * Component template - can be a string, DOM node, or function returning either
 * @template T - Root element type
 * @template S - State object type
 */
export type Template<T = HTMLElement, S extends object = object> =
  | string
  | Node
  | ((el: WebComponent<T, S>) => string | Node | DocumentFragment);

/**
 * Callbacks for form-associated custom elements
 * @template T - Root element type
 * @template S - State object type
 */
export type FormCallbacks<T = HTMLElement, S extends object = object> = {
  /** Invoked when parent form's disabled state changes */
  onFormDisabled?: (disabled: boolean, el: WebComponent<T, S>) => void;
  /** Invoked when a parent form is reset */
  onFormReset?: (el: WebComponent<T, S>) => void;
  /** Invoked when the browser restores form state (navigation/autocomplete) */
  onFormStateRestore?: (
    state: string | File | FormData | null,
    mode: 'restore' | 'autocomplete',
    el: WebComponent<T, S>,
  ) => void;
};

/**
 * Configuration options for creating a web component
 * @template T - Root element type
 * @template S - State object type
 */
export type ComponentOptions<T = HTMLElement, S extends object = object> = {
  /** Template for rendering the component */
  template: Template<T, S>;
  /** Initial reactive state */
  state?: S;
  /** CSS styles (strings or CSSStyleSheet objects) */
  styles?: (string | CSSStyleSheet)[];
  /** Attributes to observe for changes */
  observedAttributes?: readonly string[];
  /** Enable form association (allows component to participate in forms) */
  formAssociated?: boolean;
  /** Called when component is added to DOM */
  onConnected?: LifecycleHook<T, S>;
  /** Called when component is removed from DOM */
  onDisconnected?: LifecycleHook<T, S>;
  /** Called when an observed attribute changes */
  onAttributeChanged?: AttributeChangeHook<T, S>;
  /** Called after each render completes */
  onUpdated?: LifecycleHook<T, S>;
} & FormCallbacks<T, S>;

/**
 * Web component instance interface
 * @template T - Root element type (first child in shadow DOM)
 * @template S - State object type
 */
export type WebComponent<T = HTMLElement, S extends object = object> = HTMLElement & {
  /** Reactive state object (changes trigger re-renders) */
  readonly state: S;
  /** Shadow DOM root */
  readonly shadow: ShadowRoot;
  /** First element in shadow DOM */
  readonly root: T;
  /** ElementInternals (only when formAssociated: true) */
  readonly internals?: ElementInternals;
  /** Form value (only when formAssociated: true) */
  value?: string;

  /** Schedule a render in the next animation frame */
  render(): void;
  /** Wait for the pending render to complete */
  flush(): Promise<void>;
  /** Update state (merge, replace, or via function) */
  set(
    patch: Partial<S> | ((state: S) => S | Promise<S>),
    options?: { replace?: boolean; silent?: boolean },
  ): Promise<void>;
  /** Watch a state slice and react to changes */
  watch<U>(selector: (state: S) => U, callback: (value: U, prev: U) => void): () => void;
  /** Find a single element in shadow DOM */
  find<E extends Element = Element>(selector: string): E | null;
  /** Find all matching elements in shadow DOM */
  findAll<E extends Element = Element>(selector: string): E[];
  /** Add event listener with automatic cleanup and delegation support */
  on(target: string | EventTarget, event: string, handler: EventListener, options?: AddEventListenerOptions): void;
  /** Dispatch custom event */
  emit(name: string, detail?: unknown, options?: CustomEventInit): void;
  /** Set timeout with automatic cleanup */
  delay(callback: () => void, ms: number): number;
  /** Clear scheduled timeout */
  clear(id: number): void;
  /** Form utilities (only when formAssociated: true) */
  form?: {
    /** Set form value */
    value(value: string | File | FormData | null, state?: File | FormData | null): void;
    /** Set a validation state */
    valid(flags?: ValidityStateFlags, message?: string, anchor?: HTMLElement): void;
  };
};

/* ==================== Utilities ==================== */

const camelCache = new Map<string, string>();

/**
 * Convert kebab-case to camelCase (memoized for performance)
 * @param str - String in kebab-case
 * @returns String in camelCase
 * @example toCamel('my-component') // 'myComponent'
 */
const toCamel = (str: string): string => {
  if (camelCache.has(str)) return camelCache.get(str)!;
  const result = str.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
  camelCache.set(str, result);
  return result;
};

const kebabCache = new Map<string, string>();

/**
 * Convert camelCase to a kebab-case (memoized for performance)
 * @param str - String in camelCase
 * @returns String in kebab-case
 * @example toKebab('myComponent') // 'my-component'
 */
const toKebab = (str: string): string => {
  if (kebabCache.has(str)) return kebabCache.get(str)!;
  const result = str.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
  kebabCache.set(str, result);
  return result;
};

/**
 * Parse HTML string into DocumentFragment
 * @param html - HTML string to parse
 * @returns DocumentFragment containing parsed nodes
 */
const parseHTML = (html: string): DocumentFragment => {
  const template = document.createElement('template');
  template.innerHTML = html.trim();
  return template.content;
};

/**
 * Load CSS stylesheet (handles both strings and CSSStyleSheet objects)
 * @param style - CSS string or CSSStyleSheet object
 * @returns Promise resolving to CSSStyleSheet
 */
const loadStylesheet = async (style: string | CSSStyleSheet): Promise<CSSStyleSheet> => {
  if (style instanceof CSSStyleSheet) return style;

  const sheet = new CSSStyleSheet();
  await sheet.replace(style);
  return sheet;
};

/**
 * Create reactive state proxy with automatic re-rendering
 * @template S - State object type
 * @param initial - Initial state object (will be shallow-copied)
 * @param onChange - Callback invoked when state changes
 * @returns Reactive state proxy
 * @example
 * const state = createReactiveState({ count: 0 }, () => render());
 * state.count++; // Triggers onChange
 */
const createReactiveState = <S extends object>(initial: S, onChange: () => void): S => {
  const internalState = { ...initial } as S;

  const proxyCache = new WeakMap<object, object>();

  const createNestedProxy = <T>(obj: T): T => {
    if (obj == null || typeof obj !== 'object' || obj instanceof Node) {
      return obj;
    }

    const cached = proxyCache.get(obj as object);
    if (cached) {
      return cached as T;
    }

    const proxy = new Proxy(obj as object, {
      get(target, prop) {
        const value = Reflect.get(target, prop);
        return createNestedProxy(value);
      },
      set(target, prop, value) {
        const oldValue = Reflect.get(target, prop);

        if (oldValue === value) return true;

        const result = Reflect.set(target, prop, value);

        if (typeof prop === 'string' && !prop.startsWith('_')) {
          onChange();
        }

        return result;
      },
    }) as T;

    proxyCache.set(obj as object, proxy as object);
    return proxy;
  };

  return new Proxy(internalState, {
    get(target, prop) {
      const value = Reflect.get(target, prop);
      return createNestedProxy(value);
    },
    set(target, prop, value) {
      const oldValue = Reflect.get(target, prop);

      if (oldValue === value) return true;

      const result = Reflect.set(target, prop, value);

      if (typeof prop === 'string' && !prop.startsWith('_')) {
        onChange();
      }

      return result;
    },
  }) as S;
};

/* ==================== Component Base Class ==================== */

class BaseComponent<T = HTMLElement, S extends object = object> extends HTMLElement implements WebComponent<T, S> {
  public readonly shadow: ShadowRoot;
  public readonly state: S;
  public value?: string;

  #abortController = new AbortController();
  #timeouts = new Set<number>();
  #renderScheduled = false;
  #renderSuppressed = false;
  #options: ComponentOptions<T, S>;
  #internals?: ElementInternals;
  #renderPromiseResolve?: () => void;
  #renderPromise?: Promise<void>;
  #watchers = new Map<
    number,
    { selector: (state: S) => unknown; callback: (value: unknown, prev: unknown) => void; lastValue: unknown }
  >();
  #watcherId = 0;

  constructor(options: ComponentOptions<T, S>) {
    super();

    this.#options = options;
    this.shadow = this.attachShadow({ mode: 'open' });
    this.state = createReactiveState((options.state || {}) as S, () => {
      this.render();
      this.notifyWatchers();
    });

    if (options.formAssociated && 'attachInternals' in this) {
      this.#internals = this.attachInternals();
    }

    this.initStyles();

    this.initAttributes();
  }

  get root(): T {
    return this.shadow.firstElementChild as T;
  }

  get internals(): ElementInternals | undefined {
    return this.#internals;
  }

  get form() {
    if (!this.#internals) return undefined;

    return {
      /**
       * Set validity state
       * @example component.form.valid({ valueMissing: true }, 'Required')
       */
      valid: (flags?: ValidityStateFlags, message?: string, anchor?: HTMLElement) => {
        if (!flags || Object.keys(flags).length === 0) {
          this.#internals!.setValidity({});
        } else {
          this.#internals!.setValidity(flags, message, anchor);
        }
      },
      /**
       * Set form value and sync with ElementInternals
       * @example component.form.value('new value')
       */
      value: (value: string | File | FormData | null, state?: File | FormData | null) => {
        if (typeof value === 'string') {
          this.value = value;
        }
        this.#internals!.setFormValue(value, state);
      },
    };
  }

  private async initStyles(): Promise<void> {
    if (!this.#options.styles?.length) return;

    const sheets = await Promise.all(this.#options.styles.map(loadStylesheet));
    this.shadow.adoptedStyleSheets = sheets;
  }

  private initAttributes(): void {
    const attrs = this.#options.observedAttributes;
    if (!attrs?.length) return;

    for (const attr of attrs) {
      const prop = toCamel(attr);

      if (prop in this) continue;

      Object.defineProperty(this, prop, {
        configurable: true,
        enumerable: true,
        get: () => {
          const value = this.getAttribute(attr);
          return value === '' ? true : value;
        },
        set: (value: any) => {
          if (value == null || value === false) {
            this.removeAttribute(attr);
          } else {
            this.setAttribute(attr, value === true ? '' : String(value));
          }
        },
      });
    }
  }

  private notifyWatchers(): void {
    for (const [, watcher] of this.#watchers) {
      try {
        const currentValue = watcher.selector(this.state);
        if (currentValue !== watcher.lastValue) {
          watcher.callback(currentValue, watcher.lastValue);
          watcher.lastValue = currentValue;
        }
      } catch {
        // Swallow watcher errors
      }
    }
  }

  /* ==================== Lifecycle Callbacks ==================== */

  connectedCallback(): void {
    if (this.#abortController.signal.aborted) {
      this.#abortController = new AbortController();
    }

    if (!this.shadow.hasChildNodes()) {
      this.performRender();
    }

    this.#options.onConnected?.(this as WebComponent<T, S>);
  }

  disconnectedCallback(): void {
    this.#options.onDisconnected?.(this as WebComponent<T, S>);

    this.#abortController.abort();
    for (const id of this.#timeouts) {
      clearTimeout(id);
    }
    this.#timeouts.clear();
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    if (oldValue === newValue) return;

    this.#options.onAttributeChanged?.(name, oldValue, newValue, this as WebComponent<T, S>);
    this.render();
  }

  /* ==================== Form Callbacks ==================== */

  formDisabledCallback(disabled: boolean): void {
    this.#options.onFormDisabled?.(disabled, this as WebComponent<T, S>);
  }

  formResetCallback(): void {
    this.#options.onFormReset?.(this as WebComponent<T, S>);
  }

  formStateRestoreCallback(state: string | File | FormData | null, mode: 'restore' | 'autocomplete'): void {
    this.#options.onFormStateRestore?.(state, mode, this as WebComponent<T, S>);
  }

  /* ==================== Public API ==================== */

  /**
   * Schedule a render in the next animation frame
   */
  render(): void {
    if (this.#renderScheduled || this.#renderSuppressed) return;

    this.#renderScheduled = true;

    if (!this.#renderPromise) {
      this.#renderPromise = new Promise((resolve) => {
        this.#renderPromiseResolve = resolve;
      });
    }

    requestAnimationFrame(() => {
      this.#renderScheduled = false;
      this.performRender();

      this.#renderPromiseResolve?.();
      this.#renderPromise = undefined;
      this.#renderPromiseResolve = undefined;
    });
  }

  /**
   * Wait for pending render to complete
   * @returns Promise that resolves after render finishes
   * @example
   * component.set({ count: 10 });
   * await component.flush();
   * expect(component.find('.count')?.textContent).toBe('10');
   */
  async flush(): Promise<void> {
    if (this.#renderPromise) {
      await this.#renderPromise;
    }
  }

  /**
   * Update component state
   * @param patchOrUpdater - State patch object or updater function
   * @param options - Update options
   * @param options.replace - Replace entire state instead of merging
   * @param options.silent - Update without triggering render
   * @returns Promise that resolves after update completes
   * @example
   * // Merge state
   * component.set({ count: 1 });
   *
   * // Replace state
   * component.set({ count: 1 }, { replace: true });
   *
   * // Updater function (sync)
   * component.set(state => ({ ...state, count: state.count + 1 }));
   *
   * // Updater function (async)
   * await component.set(async state => {
   *   const data = await fetch('/api').then(r => r.json());
   *   return { ...state, data };
   * });
   */
  async set(
    patchOrUpdater: Partial<S> | ((state: S) => S | Promise<S>),
    options?: { replace?: boolean; silent?: boolean },
  ): Promise<void> {
    if (typeof patchOrUpdater === 'function') {
      const newState = await Promise.resolve(patchOrUpdater(this.state));

      this.#renderSuppressed = true;

      for (const key of Object.keys(this.state)) {
        delete (this.state as any)[key];
      }

      Object.assign(this.state, newState);
      this.#renderSuppressed = false;

      if (!options?.silent) {
        this.render();
        await this.flush();
      }
      return;
    }

    const patch = patchOrUpdater;

    if (options?.replace) {
      this.#renderSuppressed = true;

      for (const key of Object.keys(this.state)) {
        delete (this.state as any)[key];
      }
      Object.assign(this.state, patch);

      this.#renderSuppressed = false;

      if (!options.silent) {
        this.render();
      }
    } else {
      if (options?.silent) {
        this.#renderSuppressed = true;
        Object.assign(this.state, patch);
        this.#renderSuppressed = false;
      } else {
        Object.assign(this.state, patch);
      }
    }
  }

  /**
   * Watch a state slice and react to changes
   * @param selector - Function to select a slice of state
   * @param callback - Function called when selected value changes
   * @returns Unsubscribe function
   * @example
   * const unwatch = component.watch(
   *   state => state.count,
   *   (count, prevCount) => console.log('Count changed:', count, prevCount)
   * );
   * unwatch(); // Stop watching
   */
  watch<U>(selector: (state: S) => U, callback: (value: U, prev: U) => void): () => void {
    const id = ++this.#watcherId;
    const lastValue = selector(this.state);

    this.#watchers.set(id, {
      callback: callback as (value: unknown, prev: unknown) => void,
      lastValue,
      selector: selector as (state: S) => unknown,
    });

    try {
      callback(lastValue, lastValue);
    } catch {
      // Swallow callback errors
    }

    return () => this.#watchers.delete(id);
  }

  /**
   * Find single element in shadow DOM
   * @param selector - CSS selector
   * @returns First matching element or null
   * @example component.find<HTMLInputElement>('input[name="email"]')
   */
  find<E extends Element = Element>(selector: string): E | null {
    return this.shadow.querySelector<E>(selector);
  }

  /**
   * Find all matching elements in shadow DOM
   * @param selector - CSS selector
   * @returns Array of matching elements
   * @example component.findAll<HTMLButtonElement>('button')
   */
  findAll<E extends Element = Element>(selector: string): E[] {
    return Array.from(this.shadow.querySelectorAll<E>(selector));
  }

  /**
   * Add event listener with automatic cleanup and delegation support
   * @param target - CSS selector (for delegation) or EventTarget
   * @param event - Event name
   * @param handler - Event handler function
   * @param options - Event listener options
   * @example
   * // Direct binding
   * component.on(component.find('button')!, 'click', () => console.log('clicked'));
   *
   * // Delegated (works for dynamic elements)
   * component.on('.todo-item', 'click', (e) => {
   *   console.log('Clicked:', (e.target as HTMLElement).dataset.id);
   * });
   */
  on(target: string | EventTarget, event: string, handler: EventListener, options?: AddEventListenerOptions): void {
    if (typeof target === 'string') {
      const selector = target;

      const delegatedHandler = (e: Event) => {
        const targetElement = e.target as Element;

        if (!targetElement?.matches) return;

        const matchedElement = targetElement.matches(selector) ? targetElement : targetElement.closest(selector);

        if (matchedElement && this.shadow.contains(matchedElement)) {
          Object.defineProperty(e, 'currentTarget', {
            configurable: true,
            value: matchedElement,
          });

          handler.call(matchedElement, e);
        }
      };

      this.shadow.addEventListener(event, delegatedHandler, {
        ...options,
        signal: this.#abortController.signal,
      });
    } else {
      target.addEventListener(event, handler, {
        ...options,
        signal: this.#abortController.signal,
      });
    }
  }

  /**
   * Dispatch custom event
   * @param name - Event name
   * @param detail - Event detail data
   * @param options - CustomEvent options
   */
  emit(name: string, detail?: unknown, options?: CustomEventInit): void {
    this.dispatchEvent(
      new CustomEvent(name, {
        bubbles: true,
        composed: true,
        detail,
        ...options,
      }),
    );
  }

  /**
   * Set timeout with automatic cleanup
   * @param callback - Function to call after delay
   * @param ms - Delay in milliseconds
   * @returns Timeout ID
   */
  delay(callback: () => void, ms: number): number {
    const id = setTimeout(() => {
      this.#timeouts.delete(id);
      callback();
    }, ms);

    this.#timeouts.add(id);
    return id;
  }

  /**
   * Clear a scheduled timeout
   * @param id - Timeout ID returned from delay()
   */
  clear(id: number): void {
    clearTimeout(id);
    this.#timeouts.delete(id);
  }

  /* ==================== Rendering ==================== */

  /**
   * Perform rendering with error handling and node cloning
   */
  private performRender(): void {
    const { template } = this.#options;

    try {
      let result: string | Node | DocumentFragment;
      if (typeof template === 'function') {
        result = template(this as WebComponent<T, S>);
      } else {
        result = template;
      }

      let nodes: Node[];
      if (typeof result === 'string') {
        nodes = Array.from(parseHTML(result).childNodes);
      } else if (result instanceof DocumentFragment) {
        const fragClone = result.cloneNode(true) as DocumentFragment;
        nodes = Array.from(fragClone.childNodes);
      } else {
        nodes = [result.cloneNode(true)];
      }

      this.reconcile(this.shadow, nodes);

      this.#options.onUpdated?.(this as WebComponent<T, S>);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : '';

      console.error('[craftit] Render error:', error);

      this.shadow.innerHTML = `
        <div style="color: red; padding: 1rem; border: 1px solid red; border-radius: 4px; font-family: monospace;" data-debug="render-error">
          <strong>Render Error</strong>
          <p style="margin: 0.5rem 0;">${errorMessage}</p>
          ${errorStack ? `<details style="margin: 0.5rem 0;"><summary>Stack Trace</summary><pre style="overflow: auto; font-size: 0.8em;">${errorStack}</pre></details>` : ''}
          <button onclick="this.getRootNode().host.render()" style="margin-top: 0.5rem; padding: 0.25rem 0.5rem; cursor: pointer;">
            Retry Render
          </button>
        </div>
      `;
    }
  }

  /**
   * Reconcile DOM nodes using index-based diffing
   * @remarks Works well for static/append-only lists. For frequently reordered lists,
   * consider keyed diffing libraries (lit-html, uhtml).
   */
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: DOM reconciliation requires conditional logic
  private reconcile(parent: Node, newNodes: Node[]): void {
    const oldNodes = Array.from(parent.childNodes);
    const maxLength = Math.max(oldNodes.length, newNodes.length);

    for (let i = 0; i < maxLength; i++) {
      const oldNode = oldNodes[i];
      const newNode = newNodes[i];

      if (!oldNode && newNode) {
        parent.appendChild(newNode);
        continue;
      }

      if (oldNode && !newNode) {
        parent.removeChild(oldNode);
        continue;
      }

      if (oldNode && newNode) {
        if (oldNode.nodeType !== newNode.nodeType) {
          parent.replaceChild(newNode, oldNode);
          continue;
        }

        if (oldNode.nodeType === Node.TEXT_NODE) {
          if (oldNode.textContent !== newNode.textContent) {
            oldNode.textContent = newNode.textContent;
          }
          continue;
        }

        if (oldNode instanceof Element && newNode instanceof Element) {
          if (oldNode.tagName !== newNode.tagName) {
            parent.replaceChild(newNode, oldNode);
            continue;
          }

          this.updateElement(oldNode, newNode);
        }
      }
    }
  }

  /**
   * Update element attributes and children
   */
  private updateElement(oldEl: Element, newEl: Element): void {
    const oldAttrs = Array.from(oldEl.attributes);
    const newAttrs = Array.from(newEl.attributes);

    for (const { name } of oldAttrs) {
      if (!newEl.hasAttribute(name)) {
        oldEl.removeAttribute(name);
      }
    }

    for (const { name, value } of newAttrs) {
      if (oldEl.getAttribute(name) !== value) {
        oldEl.setAttribute(name, value);
      }
    }

    if (oldEl instanceof HTMLInputElement) {
      this.updateInputElement(oldEl, newEl as HTMLInputElement);
    } else if (oldEl instanceof HTMLTextAreaElement) {
      this.updateTextAreaElement(oldEl, newEl as HTMLTextAreaElement);
    } else if (oldEl instanceof HTMLSelectElement) {
      this.updateSelectElement(oldEl, newEl as HTMLSelectElement);
    }

    this.reconcile(oldEl, Array.from(newEl.childNodes));
  }

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Form element syncing requires handling multiple input types
  private updateInputElement(oldEl: HTMLInputElement, newEl: Element): void {
    if (oldEl.type === 'checkbox' || oldEl.type === 'radio') {
      const checked = newEl.hasAttribute('checked');
      if (oldEl.checked !== checked) {
        oldEl.checked = checked;
      }
    } else if (oldEl.type === 'file') {
      // File inputs are read-only, skip value sync
      return;
    } else {
      // For text, email, password, number, etc.
      // Sync from attribute if present, otherwise clear
      if (newEl.hasAttribute('value')) {
        const newValue = newEl.getAttribute('value') || '';
        if (oldEl.value !== newValue) {
          oldEl.value = newValue;
        }
      } else if (oldEl.value !== '') {
        // Clear value if no value attribute in the new template
        oldEl.value = '';
      }
    }

    // Sync disabled state
    const disabled = newEl.hasAttribute('disabled');
    if (oldEl.disabled !== disabled) {
      oldEl.disabled = disabled;
    }

    // Sync readonly state
    const readonly = newEl.hasAttribute('readonly');
    if (oldEl.readOnly !== readonly) {
      oldEl.readOnly = readonly;
    }
  }

  private updateTextAreaElement(oldEl: HTMLTextAreaElement, newEl: Element): void {
    // For textarea, value comes from textContent, not attribute
    const newValue = newEl.textContent || '';
    if (oldEl.value !== newValue) {
      oldEl.value = newValue;
    }

    // Sync disabled state
    const disabled = newEl.hasAttribute('disabled');
    if (oldEl.disabled !== disabled) {
      oldEl.disabled = disabled;
    }

    // Sync readonly state
    const readonly = newEl.hasAttribute('readonly');
    if (oldEl.readOnly !== readonly) {
      oldEl.readOnly = readonly;
    }
  }

  private updateSelectElement(oldEl: HTMLSelectElement, newEl: Element): void {
    // Sync disabled state
    const disabled = newEl.hasAttribute('disabled');
    if (oldEl.disabled !== disabled) {
      oldEl.disabled = disabled;
    }

    // Select value is synced via reconciling child options
    // After options are reconciled, sync the selected value
    if (newEl.hasAttribute('value')) {
      const newValue = newEl.getAttribute('value') || '';
      if (oldEl.value !== newValue) {
        oldEl.value = newValue;
      }
    }
  }
}

/* ==================== Public API ==================== */

/**
 * Create a web component class
 * @template T - Root element type
 * @template S - State object type
 * @param options - Component configuration
 * @returns Custom element constructor
 */
export const createComponent = <T = HTMLElement, S extends object = object>(
  options: ComponentOptions<T, S>,
): CustomElementConstructor => {
  class Component extends BaseComponent<T, S> {
    static formAssociated = options.formAssociated;

    static get observedAttributes() {
      return options.observedAttributes || [];
    }

    constructor() {
      super(options);
    }
  }

  return Component as unknown as CustomElementConstructor;
};

/**
 * Define a custom element
 * @template T - Root element type
 * @template S - State object type
 * @param name - Element tag name (must contain hyphen)
 * @param options - Component configuration
 */
export const defineElement = <T = HTMLElement, S extends object = object>(
  name: string,
  options: ComponentOptions<T, S>,
): void => {
  if (customElements.get(name)) {
    console.warn(`[craftit] Element "${name}" already defined`);
    return;
  }

  customElements.define(name, createComponent<T, S>(options));
};

/**
 * Create and define an element in one call
 * @template T - Root element type
 * @template S - State object type
 * @param name - Element tag name (must contain hyphen)
 * @param options - Component configuration
 * @returns Custom element constructor
 */
export const element = <T = HTMLElement, S extends object = object>(
  name: string,
  options: ComponentOptions<T, S>,
): CustomElementConstructor => {
  defineElement(name, options);
  return customElements.get(name)!;
};

/* ==================== Utilities Export ==================== */

/**
 * HTML template tag with boolean attribute support
 * @param strings - Template string array
 * @param values - Template values
 * @returns Interpolated HTML string
 * @example
 * html`<div>Hello, ${name}!</div>`
 * // Boolean attributes (Lit-style)
 * html`<button ?disabled="${isDisabled}">Click</button>`
 */
export const html = (strings: TemplateStringsArray, ...values: unknown[]): string => {
  let result = '';
  let skipQuote = false;

  for (let i = 0; i < strings.length; i++) {
    let str = strings[i];

    // Remove the leading quote if previous was a boolean attribute
    if (skipQuote) {
      str = str.replace(/^["']/, '');
      skipQuote = false;
    }

    const boolAttrMatch = str.match(/\s+\?([a-z][-a-z0-9]*)\s*=\s*["']$/i);

    if (boolAttrMatch && i < values.length) {
      const shouldInclude = values[i] === true || values[i] === '';

      // Add everything before ?attrName="
      result += str.slice(0, -boolAttrMatch[0].length);

      // Add attribute if truthy
      if (shouldInclude) {
        result += ` ${boolAttrMatch[1]}`;
      }

      // Mark to skip the quote in the next string
      skipQuote = true;
    } else {
      // Normal interpolation
      result += str;

      // Add value for the current position
      if (i < values.length) {
        result += values[i] ?? '';
      }
    }
  }

  return result;
};

/** Type helper for theme variable proxy */
type ThemeVars<T extends Record<string, string | number>> = {
  [K in keyof T]: string;
};

export const css = Object.assign(
  (strings: TemplateStringsArray, ...values: unknown[]): string => {
    return strings.reduce((result, str, i) => {
      const value = values[i] ?? '';
      return result + str + value;
    }, '');
  },
  {
    /**
     * Create typed theme with CSS variables and autocomplete
     * @param light - Theme variables (or single theme if dark omitted)
     * @param dark - Optional dark theme
     * @param options - Configuration options
     * @returns Typed proxy with autocomplete
     * @example
     * const theme = css.theme({ primaryColor: '#3b82f6' });
     * css`${theme} .button { color: ${theme.primaryColor}; }`
     *
     * @example
     * const theme = css.theme({ bg: '#fff' }, { bg: '#000' });
     * css`${theme} .card { background: ${theme.bg}; }`
     */
    theme: <T extends Record<string, string | number>>(
      light: T,
      dark?: T,
      options?: { selector?: string; attribute?: string },
    ): ThemeVars<T> => {
      const selector = options?.selector ?? ':host';
      const toVars = (obj: T) =>
        Object.entries(obj)
          .map(([key, val]) => {
            const cssVar = key.startsWith('--') ? key : `--${toKebab(key)}`;
            return `${cssVar}: ${val};`;
          })
          .join(' ');

      const cssRule = dark
        ? // Light/dark mode with media queries
          [
            `${selector} { ${toVars(light)} }`,
            '@media (prefers-color-scheme: dark) {',
            `  ${selector}:not([${options?.attribute ?? 'data-theme'}="light"]) { ${toVars(dark)} }`,
            '}',
            `${selector}[${options?.attribute ?? 'data-theme'}="dark"] { ${toVars(dark)} }`,
            `${selector}[${options?.attribute ?? 'data-theme'}="light"] { ${toVars(light)} }`,
          ].join('\n')
        : // Single theme
          `${selector} { ${toVars(light)} }`;

      return new Proxy({} as ThemeVars<T>, {
        get(_, prop) {
          if (prop === 'toString' || prop === Symbol.toPrimitive) return () => cssRule;
          if (typeof prop === 'string' && prop in light) {
            const cssVar = prop.startsWith('--') ? prop : `--${toKebab(prop)}`;
            return `var(${cssVar})`;
          }
          return undefined;
        },
      });
    },
  },
);

/**
 * Conditional class helper
 * @param classes - Object mapping class names to boolean conditions
 * @returns Space-separated class string
 * @example classMap({ active: true, disabled: false }) // 'active'
 */
export const classMap = (classes: Record<string, boolean | undefined>): string => {
  return Object.entries(classes)
    .filter(([, value]) => value)
    .map(([key]) => key)
    .join(' ');
};

/**
 * Conditional style helper
 * @param styles - Object mapping CSS properties to values
 * @returns Semicolon-separated style string
 * @example styleMap({ color: 'red', display: undefined }) // 'color: red'
 */
export const styleMap = (
  styles: Partial<CSSStyleDeclaration> | Record<string, string | number | undefined>,
): string => {
  return Object.entries(styles)
    .filter(([, value]) => value != null)
    .map(([key, value]) => `${toKebab(key)}: ${value}`)
    .join('; ');
};

/* ==================== Testing Utilities ==================== */

/**
 * Attach/mount a component to the DOM and wait for first render
 * @param element - The element to attach
 * @param container - Optional container (defaults to document.body)
 * @returns Promise that resolves when component is mounted and rendered
 * @example
 * const el = document.createElement('my-component');
 * await attach(el);
 * // Component is now in DOM and rendered
 */
export async function attach<T extends HTMLElement>(element: T, container: HTMLElement = document.body): Promise<T> {
  container.appendChild(element);

  if ('flush' in element && typeof element.flush === 'function') {
    await element.flush();
  } else {
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }

  return element;
}

/**
 * Remove a component from the DOM with cleanup
 * @param element - The element to destroy
 * @example
 * const el = await attach(document.createElement('my-component'));
 * // ... test code ...
 * destroy(el); // Clean removal
 */
export function destroy(element: HTMLElement): void {
  element.remove();
}

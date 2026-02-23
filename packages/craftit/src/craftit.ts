/** biome-ignore-all lint/suspicious/noExplicitAny: Template values can be any type */

// craftit - Lightweight, type-safe web component creation library

/* ==================== Types ==================== */

/**
 * Lifecycle hook function called with component instance
 * @template T - Root element type
 * @template P - Props object type (component attributes)
 * @template S - State object type
 */
export type LifecycleHook<T = HTMLElement, P extends object = object, S extends object = object> = (
  el: WebComponent<T, P, S>,
) => void;

/**
 * Callback invoked when an observed attribute changes
 * @template T - Root element type
 * @template P - Props object type (component attributes)
 * @template S - State object type
 */
export type AttributeChangeHook<T = HTMLElement, P extends object = object, S extends object = object> = (
  name: string,
  oldValue: string | null,
  newValue: string | null,
  el: WebComponent<T, P, S>,
) => void;

/**
 * HTML result object with property bindings support
 */
export type HTMLResult = {
  toString(): string;
  __html: string;
  __propertyBindings?: Array<{ selector: string; property: string; value: unknown }>;
};

/**
 * Component template - can be a string, DOM node, HTMLResult, or function returning either
 * @template T - Root element type
 * @template P - Props object type (component attributes)
 * @template S - State object type
 */
export type Template<T = HTMLElement, P extends object = object, S extends object = object> =
  | string
  | Node
  | HTMLResult
  | ((el: WebComponent<T, P, S>) => string | Node | DocumentFragment | HTMLResult);

/**
 * Callbacks for form-associated custom elements
 * @template T - Root element type
 * @template P - Props object type (component attributes)
 * @template S - State object type
 */
export type FormCallbacks<T = HTMLElement, P extends object = object, S extends object = object> = {
  /** Invoked when parent form's disabled state changes */
  onFormDisabled?: (disabled: boolean, el: WebComponent<T, P, S>) => void;
  /** Invoked when a parent form is reset */
  onFormReset?: (el: WebComponent<T, P, S>) => void;
  /** Invoked when the browser restores form state (navigation/autocomplete) */
  onFormStateRestore?: (
    state: string | File | FormData | null,
    mode: 'restore' | 'autocomplete',
    el: WebComponent<T, P, S>,
  ) => void;
};

/**
 * Configuration options for creating a web component
 * @template T - Root element type
 * @template P - Props object type (component attributes)
 * @template S - State object type
 * @template C - Computed properties type
 * @template A - Actions type
 * @template R - Refs type
 */
export type ComponentOptions<
  T = HTMLElement,
  P extends object = object,
  S extends object = object,
  C extends Record<string, (state: S) => unknown> = Record<string, (state: S) => unknown>,
  A extends Record<string, (el: WebComponent<T, P, S>, ...args: any[]) => unknown> = Record<
    string,
    (el: WebComponent<T, P, S>, ...args: any[]) => unknown
  >,
  R extends readonly string[] = readonly string[],
> = {
  /** Template for rendering the component */
  template: Template<T, P, S>;
  /** Initial reactive state (triggers full re-render) */
  state?: S;
  /** Fine-grained reactive signals (updates only specific DOM nodes) */
  signals?: Record<string, unknown>;
  /** Computed properties (cached, reactive) */
  computed?: C;
  /** Action methods (bound to component instance) */
  actions?: A;
  /** Element refs (declared elements to track) */
  refs?: R;
  /** Context to provide to child components */
  provide?: Record<string, unknown>;
  /** Context keys to inject from parent components */
  inject?: readonly string[];
  /** CSS styles (strings or CSSStyleSheet objects) */
  styles?: (string | CSSStyleSheet)[];
  /** Attributes to observe for changes */
  observedAttributes?: readonly (keyof P)[];
  /** Enable form association (allows component to participate in forms) */
  formAssociated?: boolean;
  /** Called when component is added to DOM */
  onConnected?: LifecycleHook<T, P, S>;
  /** Called when component is removed from DOM */
  onDisconnected?: LifecycleHook<T, P, S>;
  /** Called when an observed attribute changes */
  onAttributeChanged?: AttributeChangeHook<T, P, S>;
  /** Called after each render completes */
  onUpdated?: LifecycleHook<T, P, S>;
} & FormCallbacks<T, P, S>;

/**
 * Web component instance interface
 * @template T - Root element type (first child in shadow DOM)
 * @template P - Props object type (component attributes)
 * @template S - State object type
 */
export type WebComponent<T = HTMLElement, P extends object = object, S extends object = object> = HTMLElement &
  P & {
    /** Reactive state object (changes trigger re-renders) */
    readonly state: S;
    /** Fine-grained reactive signals (direct DOM updates) */
    readonly signals: Record<string, unknown>;
    /** Computed properties (cached, reactive) */
    readonly computed: Record<string, unknown>;
    /** Action methods */
    readonly actions: Record<string, (...args: any[]) => unknown>;
    /** Element references */
    readonly refs: Record<string, HTMLElement>;
    /** Injected context from parent components */
    readonly context: Record<string, unknown>;
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
    /** Batch multiple state updates into a single render */
    batch(updater: (state: S) => void): void;
    /** Query single element in shadow DOM (returns undefined instead of null) */
    query<E extends Element = Element>(selector: string): E | undefined;
    /** Query all elements in shadow DOM */
    queryAll<E extends Element = Element>(selector: string): E[];
    /** Query element in shadow DOM, throws if not found */
    queryRequired<E extends Element = Element>(selector: string): E;
    /** Add event listener with automatic cleanup and type safety (supports host, delegation, and direct binding) */
    on<K extends keyof HTMLElementEventMap>(
      event: K,
      handler: (e: HTMLElementEventMap[K]) => void,
      options?: AddEventListenerOptions,
    ): () => void;
    on(event: string, handler: (e: Event) => void, options?: AddEventListenerOptions): () => void;
    on<K extends keyof HTMLElementEventMap>(
      selector: string,
      event: K,
      handler: (e: HTMLElementEventMap[K], target: HTMLElement) => void,
      options?: AddEventListenerOptions,
    ): () => void;
    on(
      selector: string,
      event: string,
      handler: (e: Event, target: HTMLElement) => void,
      options?: AddEventListenerOptions,
    ): () => void;
    on<K extends keyof HTMLElementEventMap>(
      element: EventTarget,
      event: K,
      handler: (e: HTMLElementEventMap[K]) => void,
      options?: AddEventListenerOptions,
    ): () => void;
    on(element: EventTarget, event: string, handler: (e: Event) => void, options?: AddEventListenerOptions): () => void;
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
 * Signal class for fine-grained reactivity
 * Updates only specific DOM nodes instead of re-rendering entire component
 */
class Signal<T = unknown> {
  #value: T;
  #subscribers = new Set<{ node: Text | Element; type: 'text' | 'attr'; attr?: string }>();

  constructor(initialValue: T) {
    this.#value = initialValue;
  }

  get(subscriber?: { node: Text | Element; type: 'text' | 'attr'; attr?: string }): T {
    if (subscriber) {
      this.#subscribers.add(subscriber);
    }
    return this.#value;
  }

  set(newValue: T): void {
    if (this.#value === newValue) return;

    this.#value = newValue;

    for (const subscriber of this.#subscribers) {
      if (subscriber.type === 'text' && subscriber.node instanceof Text) {
        subscriber.node.textContent = String(newValue);
      } else if (subscriber.type === 'attr' && subscriber.node instanceof Element && subscriber.attr) {
        subscriber.node.setAttribute(subscriber.attr, String(newValue));
      }
    }
  }

  clearSubscribers(): void {
    this.#subscribers.clear();
  }

  peek(): T {
    return this.#value;
  }

  update(fn: (current: T) => T): void {
    this.set(fn(this.#value));
  }
}

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

  // Shared proxy handler for both root and nested objects
  const createProxyHandler = () => ({
    get(target: any, prop: string | symbol) {
      const value = Reflect.get(target, prop);
      return createNestedProxy(value);
    },
    set(target: any, prop: string | symbol, value: unknown) {
      const oldValue = Reflect.get(target, prop);
      if (oldValue === value) return true;

      const result = Reflect.set(target, prop, value);

      // Trigger onChange for non-private properties
      if (typeof prop === 'string' && !prop.startsWith('_')) {
        onChange();
      }

      return result;
    },
  });

  const createNestedProxy = <T>(obj: T): T => {
    if (obj == null || typeof obj !== 'object' || obj instanceof Node) {
      return obj;
    }

    const cached = proxyCache.get(obj as object);
    if (cached) return cached as T;

    const proxy = new Proxy(obj as object, createProxyHandler()) as T;
    proxyCache.set(obj as object, proxy as object);
    return proxy;
  };

  return new Proxy(internalState, createProxyHandler()) as S;
};

/* ==================== Component Base Class ==================== */

class BaseComponent<T = HTMLElement, P extends object = object, S extends object = object> extends HTMLElement {
  public readonly shadow: ShadowRoot;
  public readonly state: S;
  public readonly signals: Record<string, unknown>;
  public readonly computed: Record<string, unknown>;
  public readonly actions: Record<string, (...args: any[]) => unknown>;
  public readonly refs: Record<string, HTMLElement>;
  public readonly context: Record<string, unknown>;
  public value?: string;

  #abortController = new AbortController();
  #timeouts = new Set<number>();
  #renderScheduled = false;
  #renderSuppressed = false;
  #options: ComponentOptions<T, P, S>;
  #internals?: ElementInternals;
  #renderPromiseResolve?: () => void;
  #renderPromise?: Promise<void>;
  #watchers = new Map<
    number,
    { selector: (state: S) => unknown; callback: (value: unknown, prev: unknown) => void; lastValue: unknown }
  >();
  #watcherId = 0;
  #computedCache = new Map<string, { value: unknown; dependencies: unknown[] }>();
  #refsCache = new Map<string, HTMLElement>();
  #providedContext = new Map<string, unknown>();
  #signalsMap = new Map<string, Signal>();

  constructor(options: ComponentOptions<T, P, S>) {
    super();

    this.#options = options;
    this.shadow = this.attachShadow({ mode: 'open' });
    this.state = createReactiveState((options.state || {}) as S, () => {
      this.#computedCache.clear(); // Clear computed cache on state change
      this.render();
      this.notifyWatchers();
    });

    // Initialize signals
    this.signals = this.createSignalsProxy();

    // Initialize computed properties
    this.computed = this.createComputedProxy();

    // Initialize actions
    this.actions = this.createActionsProxy();

    // Initialize refs
    this.refs = this.createRefsProxy();

    // Initialize context (inject from parents)
    this.context = this.createContextProxy();

    // Store provided context
    if (options.provide) {
      for (const [key, value] of Object.entries(options.provide)) {
        this.#providedContext.set(key, value);
      }
    }

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
        const isValid = !flags || Object.keys(flags).length === 0;
        this.#internals!.setValidity(isValid ? {} : flags!, message, anchor);
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
      const attrStr = String(attr);
      const prop = toCamel(attrStr);

      if (prop in this) continue;

      Object.defineProperty(this, prop, {
        configurable: true,
        enumerable: true,
        get: () => {
          const value = this.getAttribute(attrStr);
          return value === '' ? true : value;
        },
        set: (value: any) => {
          (value == null || value === false)
            ? this.removeAttribute(attrStr)
            : this.setAttribute(attrStr, value === true ? '' : String(value));
        },
      });
    }
  }

  private createSignalsProxy(): Record<string, unknown> {
    const signals = this.#options.signals || {};

    // Create Signal instances for each initial signal value
    for (const [key, value] of Object.entries(signals)) {
      this.#signalsMap.set(key, new Signal(value));
    }

    return new Proxy(
      {},
      {
        get: (_target, prop: string) => {
          const signal = this.#signalsMap.get(prop);
          return signal?.peek();
        },
        set: (_target, prop: string, value: unknown) => {
          // Get existing or create new signal
          let signal = this.#signalsMap.get(prop);
          if (!signal) {
            signal = new Signal(value);
            this.#signalsMap.set(prop, signal);
          } else {
            signal.set(value);
          }
          return true;
        },
      },
    );
  }

  private createComputedProxy(): Record<string, unknown> {
    const computed = this.#options.computed || {};

    return new Proxy(
      {},
      {
        get: (_target, prop: string) => {
          if (!(prop in computed)) return undefined;

          // Check cache
          if (this.#computedCache.has(prop)) {
            return this.#computedCache.get(prop)!.value;
          }

          // Compute value
          const computeFn = computed[prop];
          const value = computeFn(this.state);

          // Cache it
          this.#computedCache.set(prop, { dependencies: [], value });

          return value;
        },
      },
    );
  }

  private createActionsProxy(): Record<string, (...args: any[]) => unknown> {
    const actions = this.#options.actions || {};

    return new Proxy(
      {},
      {
        get: (_target, prop: string) => {
          if (!(prop in actions)) return undefined;

          // Bind action to component instance
          return (...args: any[]) => {
            return actions[prop](this as unknown as WebComponent<T, P, S>, ...args);
          };
        },
      },
    );
  }

  private createRefsProxy(): Record<string, HTMLElement> {
    return new Proxy(
      {},
      {
        get: (_target, prop: string) => {
          // Check if a cached element is still in DOM
          const cached = this.#refsCache.get(prop);
          if (cached && this.shadow.contains(cached)) {
            return cached;
          }

          // Clear stale cache and query for an element
          this.#refsCache.delete(prop);
          const element = this.shadow.querySelector(`[ref="${prop}"]`) as HTMLElement;

          if (element) {
            this.#refsCache.set(prop, element);
            return element;
          }

          return undefined;
        },
      },
    );
  }

  private createContextProxy(): Record<string, unknown> {
    const inject = this.#options.inject || [];

    // Helper to traverse up the component tree
    const findProviderValue = (key: string): unknown => {
      let current: HTMLElement | null = this.parentElement;

      while (current) {
        if (current instanceof BaseComponent) {
          const value = current.#providedContext.get(key);
          if (value !== undefined) return value;
        }

        // Move to parent, traversing shadow DOM boundaries
        current = current.parentElement || ((current.getRootNode() as ShadowRoot).host as HTMLElement) || null;
      }

      return undefined;
    };

    return new Proxy(
      {},
      {
        get: (_target, prop: string) => {
          // Only allow access to injected keys
          return inject.includes(prop) ? findProviderValue(prop) : undefined;
        },
      },
    );
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

    this.#options.onConnected?.(this as unknown as WebComponent<T, P, S>);
  }

  disconnectedCallback(): void {
    this.#options.onDisconnected?.(this as unknown as WebComponent<T, P, S>);

    this.#abortController.abort();
    for (const id of this.#timeouts) {
      clearTimeout(id);
    }
    this.#timeouts.clear();
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    if (oldValue === newValue) return;

    this.#options.onAttributeChanged?.(name, oldValue, newValue, this as unknown as WebComponent<T, P, S>);
    this.render();
  }

  /* ==================== Form Callbacks ==================== */

  formDisabledCallback(disabled: boolean): void {
    this.#options.onFormDisabled?.(disabled, this as unknown as WebComponent<T, P, S>);
  }

  formResetCallback(): void {
    this.#options.onFormReset?.(this as unknown as WebComponent<T, P, S>);
  }

  formStateRestoreCallback(state: string | File | FormData | null, mode: 'restore' | 'autocomplete'): void {
    this.#options.onFormStateRestore?.(state, mode, this as unknown as WebComponent<T, P, S>);
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
    const shouldRender = !options?.silent;

    // Handle updater function
    if (typeof patchOrUpdater === 'function') {
      const newState = await Promise.resolve(patchOrUpdater(this.state));
      this.replaceState(newState);

      if (shouldRender) {
        this.render();
        await this.flush();
      }
      return;
    }

    // Handle state patch or replacement
    this.#renderSuppressed = !shouldRender;

    if (options?.replace) {
      this.replaceState(patchOrUpdater);
    } else {
      Object.assign(this.state, patchOrUpdater);
    }

    this.#renderSuppressed = false;
  }

  /**
   * Replace entire state object
   */
  private replaceState(newState: Partial<S>): void {
    for (const key of Object.keys(this.state)) {
      delete (this.state as any)[key];
    }
    Object.assign(this.state, newState);
  }

  /**
   * Batch multiple state updates into a single render
   * @param updater - Function that performs multiple state updates
   * @example
   * el.batch((state) => {
   *   state.count = 10;
   *   state.name = 'Alice';
   *   state.items.push(newItem);
   * }); // Only renders once at the end
   */
  batch(updater: (state: S) => void): void {
    this.#renderSuppressed = true;
    try {
      updater(this.state);
    } finally {
      this.#renderSuppressed = false;
      this.render();
    }
  }

  /**
   * Watch a state slice for changes
   * @param selector - Function to select state slice
   * @param callback - Callback when value changes
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
   * Query single element in shadow DOM
   * @param selector - CSS selector
   * @returns Found element or undefined
   * @example const button = el.query<HTMLButtonElement>('button')
   */
  query<E extends Element = Element>(selector: string): E | undefined {
    return this.shadow.querySelector<E>(selector) ?? undefined;
  }

  /**
   * Query all elements in shadow DOM
   * @param selector - CSS selector
   * @returns Array of matching elements
   * @example const buttons = el.queryAll<HTMLButtonElement>('button')
   */
  queryAll<E extends Element = Element>(selector: string): E[] {
    return Array.from(this.shadow.querySelectorAll<E>(selector));
  }

  /**
   * Query element in shadow DOM, throws if not found
   * @param selector - CSS selector
   * @returns Found element
   * @throws Error if element not found
   * @example const input = el.queryRequired<HTMLInputElement>('input')
   */
  queryRequired<E extends Element = Element>(selector: string): E {
    const element = this.shadow.querySelector<E>(selector);
    if (!element) {
      throw new Error(`Required element not found: ${selector}`);
    }
    return element;
  }

  /**
   * Add event listener with automatic cleanup and type safety
   *
   * Supports three usage patterns:
   * - 2 params: Host element event
   * - 3 params (string): Shadow DOM delegation
   * - 3 params (EventTarget): Direct element binding
   *
   * @example
   * // Host element event
   * el.on('click', (e) => console.log(e.clientX));
   *
   * // Shadow DOM delegation
   * el.on('button', 'click', (e, target) => console.log(target.textContent));
   *
   * // Direct element binding
   * const input = el.query('input');
   * el.on(input, 'input', (e) => console.log('changed'));
   */
  on<K extends keyof HTMLElementEventMap>(
    event: K,
    handler: (e: HTMLElementEventMap[K]) => void,
    options?: AddEventListenerOptions,
  ): () => void;
  on(event: string, handler: (e: Event) => void, options?: AddEventListenerOptions): () => void;
  on<K extends keyof HTMLElementEventMap>(
    selector: string,
    event: K,
    handler: (e: HTMLElementEventMap[K], target: HTMLElement) => void,
    options?: AddEventListenerOptions,
  ): () => void;
  on(
    selector: string,
    event: string,
    handler: (e: Event, target: HTMLElement) => void,
    options?: AddEventListenerOptions,
  ): () => void;
  on<K extends keyof HTMLElementEventMap>(
    element: EventTarget,
    event: K,
    handler: (e: HTMLElementEventMap[K]) => void,
    options?: AddEventListenerOptions,
  ): () => void;
  on(element: EventTarget, event: string, handler: (e: Event) => void, options?: AddEventListenerOptions): () => void;
  on<K extends keyof HTMLElementEventMap>(
    selectorOrEventOrElement: string | EventTarget,
    eventOrHandler: K | ((e: HTMLElementEventMap[K]) => void),
    handlerOrOptions?: ((e: HTMLElementEventMap[K], target: HTMLElement) => void) | AddEventListenerOptions,
    options?: AddEventListenerOptions,
  ): () => void {
    const signal = this.#abortController.signal;

    // Case 1: Host element event (2 params: event, handler)
    if (typeof eventOrHandler === 'function') {
      const event = selectorOrEventOrElement as string;
      const handler = eventOrHandler as EventListener;
      const opts = handlerOrOptions as AddEventListenerOptions | undefined;

      this.addEventListener(event, handler, { ...opts, signal });
      return () => this.removeEventListener(event, handler);
    }

    const event = eventOrHandler as string;

    // Case 2: Direct element binding (3 params: element, event, handler)
    if (typeof selectorOrEventOrElement !== 'string') {
      const element = selectorOrEventOrElement;
      const handler = handlerOrOptions as EventListener;

      element.addEventListener(event, handler, { ...options, signal });
      return () => element.removeEventListener(event, handler);
    }

    // Case 3: Shadow DOM delegation (3 params: selector, event, handler)
    const selector = selectorOrEventOrElement;
    const handler = handlerOrOptions as (e: Event, target: HTMLElement) => void;

    const delegatedHandler = (e: Event) => {
      const target = e.target as Element;
      if (!target?.matches) return;

      const matched = target.matches(selector) ? target : target.closest(selector);
      if (matched && this.shadow.contains(matched)) {
        handler(e, matched as HTMLElement);
      }
    };

    this.shadow.addEventListener(event, delegatedHandler, { ...options, signal });
    return () => this.shadow.removeEventListener(event, delegatedHandler);
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

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: -
  private performRender(): void {
    const { template } = this.#options;

    try {
      let result: string | Node | DocumentFragment | HTMLResult;
      if (typeof template === 'function') {
        result = template(this as unknown as WebComponent<T, P, S>);
      } else {
        result = template;
      }

      let nodes: Node[];
      let propertyBindings: Array<{ selector: string; property: string; value: unknown }> = [];

      if (typeof result === 'string') {
        nodes = Array.from(parseHTML(result).childNodes);
      } else if (result && typeof result === 'object' && '__html' in result) {
        // HTMLResult object with property bindings
        const htmlResult = result as HTMLResult;
        if (htmlResult.__propertyBindings) {
          propertyBindings = htmlResult.__propertyBindings;
        }
        nodes = Array.from(parseHTML(htmlResult.__html).childNodes);
      } else if (result instanceof DocumentFragment) {
        const fragClone = result.cloneNode(true) as DocumentFragment;
        nodes = Array.from(fragClone.childNodes);
      } else {
        nodes = [result.cloneNode(true)];
      }

      this.reconcile(this.shadow, nodes);

      // Clear refs cache after DOM update
      this.#refsCache.clear();

      // Apply property bindings after DOM is updated
      if (propertyBindings.length > 0) {
        this.applyPropertyBindings(propertyBindings);
      }

      this.#options.onUpdated?.(this as unknown as WebComponent<T, P, S>);
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
   * Apply property bindings to elements in shadow DOM
   */
  private applyPropertyBindings(bindings: Array<{ selector: string; property: string; value: unknown }>): void {
    for (const { selector, property, value } of bindings) {
      const element = this.shadow.querySelector(selector);
      if (element) {
        // Set the property on the element
        (element as any)[property] = value;
        // Remove the data attribute marker
        element.removeAttribute(selector.slice(1, -1)); // Remove [ and ]
      }
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

      // Add new node
      if (!oldNode) {
        parent.appendChild(newNode);
        continue;
      }

      // Remove old node
      if (!newNode) {
        parent.removeChild(oldNode);
        continue;
      }

      // Replace if node types differ
      if (oldNode.nodeType !== newNode.nodeType) {
        parent.replaceChild(newNode, oldNode);
        continue;
      }

      // Update text nodes
      if (oldNode.nodeType === Node.TEXT_NODE && oldNode.textContent !== newNode.textContent) {
        oldNode.textContent = newNode.textContent;
        continue;
      }

      // Update elements
      if (oldNode instanceof Element && newNode instanceof Element) {
        if (oldNode.tagName !== newNode.tagName) {
          parent.replaceChild(newNode, oldNode);
        } else {
          this.updateElement(oldNode, newNode);
        }
      }
    }
  }

  /**
   * Update element attributes and children
   */
  private updateElement(oldEl: Element, newEl: Element): void {
    // Update attributes
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

    // Update form elements specifically
    if (oldEl instanceof HTMLInputElement) {
      this.updateInputElement(oldEl, newEl as HTMLInputElement);
    } else if (oldEl instanceof HTMLTextAreaElement) {
      this.updateTextAreaElement(oldEl, newEl as HTMLTextAreaElement);
    } else if (oldEl instanceof HTMLSelectElement) {
      this.updateSelectElement(oldEl, newEl as HTMLSelectElement);
    }

    // Recursively update children
    this.reconcile(oldEl, Array.from(newEl.childNodes));
  }

  /**
   * Helper to sync common form element states (disabled, readonly)
   */
  private syncFormElementState(oldEl: HTMLInputElement | HTMLTextAreaElement, newEl: Element): void {
    const disabled = newEl.hasAttribute('disabled');
    const readonly = newEl.hasAttribute('readonly');

    if (oldEl.disabled !== disabled) oldEl.disabled = disabled;
    if ('readOnly' in oldEl && oldEl.readOnly !== readonly) oldEl.readOnly = readonly;
  }

  private updateInputElement(oldEl: HTMLInputElement, newEl: Element): void {
    if (oldEl.type === 'checkbox' || oldEl.type === 'radio') {
      const checked = newEl.hasAttribute('checked');
      if (oldEl.checked !== checked) oldEl.checked = checked;
    } else if (oldEl.type !== 'file') {
      // For text-based inputs (skip file inputs which are read-only)
      if (newEl.hasAttribute('value')) {
        const newValue = newEl.getAttribute('value') || '';
        if (oldEl.value !== newValue) oldEl.value = newValue;
      } else if (oldEl.value) {
        oldEl.value = '';
      }
    }

    this.syncFormElementState(oldEl, newEl);
  }

  private updateTextAreaElement(oldEl: HTMLTextAreaElement, newEl: Element): void {
    const newValue = newEl.textContent || '';
    if (oldEl.value !== newValue) oldEl.value = newValue;

    this.syncFormElementState(oldEl, newEl);
  }

  private updateSelectElement(oldEl: HTMLSelectElement, newEl: Element): void {
    const disabled = newEl.hasAttribute('disabled');
    if (oldEl.disabled !== disabled) oldEl.disabled = disabled;

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
 * @template P - Props object type (component attributes)
 * @template S - State object type
 * @param options - Component configuration
 * @returns Custom element constructor
 */
export const createComponent = <T = HTMLElement, P extends object = object, S extends object = object>(
  options: ComponentOptions<T, P, S>,
): CustomElementConstructor => {
  class Component extends BaseComponent<T, P, S> {
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
 * @template P - Props object type (component attributes)
 * @template S - State object type
 * @param name - Element tag name (must contain hyphen)
 * @param options - Component configuration
 * @example
 * defineElement<HTMLDivElement, { variant: string; size: string }, { count: number }>(
 *   'my-component',
 *   {
 *     observedAttributes: ['variant', 'size'],
 *     state: { count: 0 },
 *     template: (el) => html`<div>${el.variant} ${el.size}: ${el.state.count}</div>`
 *   }
 * );
 */
export const defineElement = <T = HTMLElement, P extends object = object, S extends object = object>(
  name: string,
  options: ComponentOptions<T, P, S>,
): void => {
  if (customElements.get(name)) {
    console.warn(`[craftit] Element "${name}" already defined`);
    return;
  }

  customElements.define(name, createComponent<T, P, S>(options));
};

/**
 * Create and define an element in one call
 * @template T - Root element type
 * @template P - Props object type (component attributes)
 * @template S - State object type
 * @param name - Element tag name (must contain hyphen)
 * @param options - Component configuration
 * @returns Custom element constructor
 */
export const element = <T = HTMLElement, P extends object = object, S extends object = object>(
  name: string,
  options: ComponentOptions<T, P, S>,
): CustomElementConstructor => {
  defineElement(name, options);
  return customElements.get(name)!;
};

/* ==================== Utilities Export ==================== */

/**
 * Process boolean attribute syntax (?attr="${value}")
 */
const processBooleanAttribute = (
  str: string,
  value: unknown,
  match: RegExpMatchArray,
): { result: string; skipQuote: boolean } => {
  const shouldInclude = value === true || value === '';
  const result = str.slice(0, -match[0].length) + (shouldInclude ? ` ${match[1]}` : '');
  return { result, skipQuote: true };
};

/**
 * Process property binding syntax (.prop="${value}")
 */
const processPropertyBinding = (
  str: string,
  value: unknown,
  match: RegExpMatchArray,
  bindingIndex: number,
): { result: string; binding: { selector: string; property: string; value: unknown }; skipQuote: boolean } => {
  const propertyName = match[1];
  const bindingId = `__prop_${bindingIndex}`;
  const result = `${str.slice(0, -match[0].length)} data-${bindingId}="${propertyName}"`;

  return {
    binding: { property: propertyName, selector: `[data-${bindingId}]`, value },
    result,
    skipQuote: true,
  };
};

/**
 * HTML template tag with boolean attribute and property binding support
 * @param strings - Template string array
 * @param values - Template values
 * @returns HTML result object (with toString for compatibility)
 * @example
 * html`<div>Hello, ${name}!</div>`
 * // Boolean attributes
 * html`<button ?disabled="${isDisabled}">Click</button>`
 * // Property binding
 * html`<input .value="${inputValue}">`
 */
export const html = Object.assign(
  (strings: TemplateStringsArray, ...values: unknown[]): string | HTMLResult => {
    let result = '';
    let skipQuote = false;
    const propertyBindings: Array<{ selector: string; property: string; value: unknown }> = [];

    for (let i = 0; i < strings.length; i++) {
      const str = skipQuote ? strings[i].replace(/^["']/, '') : strings[i];
      skipQuote = false;

      // Skip processing if this is the last string
      if (i >= values.length) {
        result += str;
        continue;
      }

      // Check for special syntax patterns
      const boolAttrMatch = str.match(/\s+\?([a-z][-a-z0-9]*)\s*=\s*["']$/i);
      const propMatch = str.match(/\s+\.([a-z][-a-z0-9]*)\s*=\s*["']$/i);

      if (boolAttrMatch) {
        const processed = processBooleanAttribute(str, values[i], boolAttrMatch);
        result += processed.result;
        skipQuote = processed.skipQuote;
      } else if (propMatch) {
        const processed = processPropertyBinding(str, values[i], propMatch, propertyBindings.length);
        result += processed.result;
        propertyBindings.push(processed.binding);
        skipQuote = processed.skipQuote;
      } else {
        // Normal interpolation
        result += str + (values[i] ?? '');
      }
    }

    // Return with property bindings if any exist
    return propertyBindings.length > 0
      ? ({
          __html: result.trim(),
          __propertyBindings: propertyBindings,
          toString() {
            return (this as HTMLResult).__html;
          },
        } as HTMLResult)
      : result.trim();
  },
  {
    /**
     * Conditional class helper - supports object or array
     * @param classes - Object or array of classes
     * @returns Space-separated class string
     * @example
     * html.classes({ active: true, disabled: false }) // 'active'
     * html.classes(['btn', isActive && 'active', 'primary']) // 'btn active primary'
     * html.classes(['btn', { active: isActive, disabled: isDisabled }])
     */
    classes: (
      classes:
        | Record<string, boolean | undefined>
        | (string | false | undefined | null | Record<string, boolean | undefined>)[],
    ): string => {
      // Array support
      if (Array.isArray(classes)) {
        return classes
          .map((item) => {
            if (!item) return '';
            if (typeof item === 'string') return item;
            if (typeof item === 'object') {
              // Nested object support
              return Object.entries(item)
                .filter(([, value]) => value)
                .map(([key]) => key)
                .join(' ');
            }
            return '';
          })
          .filter(Boolean)
          .join(' ');
      }

      // Object support
      return Object.entries(classes)
        .filter(([, value]) => value)
        .map(([key]) => key)
        .join(' ');
    },

    /**
     * Portal - render content in a different part of the DOM
     * @param content - Content to render
     * @param target - Target element or selector to render into
     * @returns Empty string (content is rendered elsewhere)
     * @example
     * // Render modal in document.body
     * html.portal(
     *   html`<div class="modal">Modal content</div>`,
     *   document.body
     * )
     *
     * // Render in selector
     * html.portal(
     *   html`<div class="tooltip">Tooltip</div>`,
     *   '#tooltip-container'
     * )
     */
    portal: (content: string | HTMLResult, target: HTMLElement | string): string => {
      const contentStr = typeof content === 'string' ? content : content.toString();
      const id = `portal-${Math.random().toString(36).substr(2, 9)}`;

      // Create portal content
      const createPortal = () => {
        const targetEl = typeof target === 'string' ? document.querySelector(target) : target;

        if (!targetEl) {
          console.warn('html.portal() target not found:', target);
          return;
        }

        const container = document.createElement('div');
        container.setAttribute('data-portal-id', id);
        container.innerHTML = contentStr;
        targetEl.appendChild(container);

        return () => container.remove();
      };

      // Schedule portal creation
      const schedule = document.readyState === 'loading'
        ? () => document.addEventListener('DOMContentLoaded', createPortal, { once: true })
        : () => queueMicrotask(createPortal);

      schedule();

      return `<span data-portal-placeholder="${id}" style="display:none;"></span>`;
    },
    /**
     * Repeat items with optional key function for efficient updates
     * @param items - Array of items to repeat
     * @param keyFnOrTemplate - Key function or template (if no key needed)
     * @param template - Template function (only if key function provided)
     * @returns HTML string
     * @example
     * html.repeat(users, (user, i) => html`<li>${i}. ${user.name}</li>`)
     * html.repeat(users, user => user.id, (user, i) => html`<li>${user.name}</li>`)
     */
    repeat: <T>(
      items: T[],
      keyFnOrTemplate: ((item: T) => string | number) | ((item: T, index: number) => string | HTMLResult),
      template?: (item: T, index: number) => string | HTMLResult,
    ): string => {
      const hasKey = typeof template === 'function';
      const templateFn = hasKey ? template : (keyFnOrTemplate as (item: T, index: number) => string | HTMLResult);

      return items
        .map((item, index) => {
          const result = templateFn(item, index);
          return typeof result === 'string' ? result : result.toString();
        })
        .join('');
    },

    /**
     * Conditional style helper - converts an object to inline styles
     * @param styles - Object mapping CSS properties to values
     * @returns Semicolon-separated style string
     * @example
     * html.styles({ color: 'red', display: isVisible ? 'block' : undefined })
     * html.styles({ backgroundColor: 'blue', fontSize: '16px' })
     */
    styles: (styles: Partial<CSSStyleDeclaration> | Record<string, string | number | undefined | null>): string => {
      return Object.entries(styles)
        .filter(([, value]) => value != null)
        .map(([key, value]) => `${toKebab(key)}: ${value}`)
        .join('; ');
    },

    /**
     * Async content with loading fallback
     * @param promise - Promise that resolves to HTML content
     * @param fallback - Fallback content to show while loading
     * @returns HTML with placeholder that will be replaced when promise resolves
     * @example
     * html.until(
     *   fetchUser().then(user => html`<div>${user.name}</div>`),
     *   html`<div>Loading...</div>`
     * )
     */
    until: (promise: Promise<string | HTMLResult>, fallback: string | HTMLResult): string => {
      const fallbackStr = typeof fallback === 'string' ? fallback : fallback.toString();
      const id = `until-${Math.random().toString(36).substr(2, 9)}`;

      // Wrap fallback in a container with unique data attribute
      const placeholder = `<span data-until-id="${id}">${fallbackStr}</span>`;

      // Resolve promise and update the placeholder
      promise
        .then((result) => {
          const resultStr = typeof result === 'string' ? result : result.toString();

          // Find all elements with this ID (could be in multiple shadow roots)
          const updateElements = () => {
            document.querySelectorAll(`[data-until-id="${id}"]`).forEach((element) => {
              // Replace with the resolved content
              const temp = document.createElement('template');
              temp.innerHTML = resultStr;
              element.replaceWith(...Array.from(temp.content.childNodes));
            });
          };

          // Update immediately if DOM is ready, otherwise wait
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', updateElements, { once: true });
          } else {
            // Use microtask to ensure DOM is updated
            queueMicrotask(updateElements);
          }
        })
        .catch((error) => {
          console.error('html.until() promise rejected:', error);
          // Optionally update with error state
          document.querySelectorAll(`[data-until-id="${id}"]`).forEach((element) => {
            element.textContent = 'Error loading content';
          });
        });

      return placeholder;
    },

    /**
     * Conditional rendering helper - supports both functions and direct values
     * @param condition - Condition to evaluate
     * @param truthyValue - Value/function to render when truthy
     * @param falsyValue - Optional value/function to render when falsy
     * @returns HTML string
     * @example
     * html.when(isAdmin, html`<button>Delete</button>`, html`<span>View</span>`)
     * html.when(isAdmin, () => html`<button>Delete</button>`)
     */
    when: (
      condition: unknown,
      truthyValue: string | HTMLResult | (() => string | HTMLResult),
      falsyValue?: string | HTMLResult | (() => string | HTMLResult),
    ): string => {
      const resolveValue = (value: string | HTMLResult | (() => string | HTMLResult)): string => {
        const result = typeof value === 'function' ? value() : value;
        return typeof result === 'string' ? result : result.toString();
      };

      return condition
        ? resolveValue(truthyValue)
        : falsyValue !== undefined
          ? resolveValue(falsyValue)
          : '';
    },
  },
);

/** Type helper for theme variable proxy */
type ThemeVars<T extends Record<string, string | number>> = {
  [K in keyof T]: string;
};

export const css = Object.assign(
  (strings: TemplateStringsArray, ...values: unknown[]): string => {
    return strings
      .reduce((result, str, i) => {
        const value = values[i] ?? '';
        return result + str + value;
      }, '')
      .trim();
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

/**
 * Component mounting utilities for test environments.
 */

import type { ReadonlySignal } from '@vielzeug/ripple';

import { type ComponentDefinition, type SetupContextBag } from '../component-types';
import { define } from '../define';
import { _resetLiveSignals } from '../directives/live';
import { _resetRawSanitizer } from '../directives/raw';
import { type HTMLResult } from '../types/bindings';
import { _clearStylesheetCache } from '../utils/css';
import { _resetIdCounter } from '../utils/id';
import { flush, type FlushOptions } from './flush';
import { queryAllByText, queryByText, type QueryScope } from './query';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Fixture<T extends HTMLElement = HTMLElement> {
  /** The component element */
  element: T;
  /** The component's shadow root (null for light-DOM components) */
  readonly shadow: ShadowRoot | null;
  /** Query a single element within shadow root */
  query<E extends Element = Element>(selector: string): E | null;
  /** Query all elements within shadow root */
  queryAll<E extends Element = Element>(selector: string): E[];
  /** Query the first element whose trimmed text content matches */
  queryByText<E extends Element = Element>(text: string, selector?: string): E | null;
  /** Query all elements whose trimmed text content matches */
  queryAllByText<E extends Element = Element>(text: string, selector?: string): E[];
  /** Query a single element by its `data-testid` attribute */
  queryByTestId<E extends Element = Element>(testId: string): E | null;
  /** Query all elements by their `data-testid` attribute */
  queryAllByTestId<E extends Element = Element>(testId: string): E[];
  /** Set an attribute (boolean `false` removes it) then flush */
  attr(name: string, value: string | number | boolean): Promise<void>;
  /** Set multiple attributes then flush */
  attrs(record: Record<string, string | number | boolean>): Promise<void>;
  /** Wait for all reactive updates and animation frames */
  flush(options?: FlushOptions): Promise<void>;
  /** Run a callback then flush — the standard way to trigger and assert a reactive update */
  act(fn: () => unknown): Promise<void>;
  /** Remove the component from the DOM */
  destroy(): void;
}

export interface MountOptions {
  /** Properties assigned directly onto the element */
  props?: Record<string, unknown>;
  /** HTML attributes to set on the element */
  attrs?: Record<string, string | number | boolean>;
  /** Inner HTML for slot content */
  html?: string;
  /** Parent container (default: document.body) */
  container?: HTMLElement;
  /** Extra component options when passing an inline setup function */
  componentOptions?: Omit<ComponentDefinition<any, any>, 'setup'>;
}

type MountProps = { readonly [x: string]: ReadonlySignal<unknown> };

// Bivariant callback type keeps inline test callbacks ergonomic across varying setup context specializations.
export type MountSetup = {
  bivarianceHack: (props: MountProps, ctx: SetupContextBag<any>) => HTMLResult | null | Promise<HTMLResult | null>;
}['bivarianceHack'];

// ─── Test environment state ───────────────────────────────────────────────────

export const _mountedElements: HTMLElement[] = [];
export let _componentTagCounter = 0;

// Never resets — prevents tag name collisions in the shared jsdom customElements
// registry when multiple test files run in the same environment.
const _globalTagCounter = 0;

/**
 * Resets global test counters used for deterministic IDs/markers.
 * @internal
 */
export const _resetCounters = (): void => {
  _resetIdCounter();
  _componentTagCounter = 0;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function applyAttr(element: Element, name: string, value: string | number | boolean): void {
  if (value === false) element.removeAttribute(name);
  else element.setAttribute(name, value === true ? '' : String(value));
}

const toError = (value: unknown): Error => {
  return value instanceof Error ? value : new Error(String(value));
};

const withWindowErrorCapture = async <T>(action: () => Promise<T>): Promise<T> => {
  if (typeof window === 'undefined') return action();

  let captured: Error | null = null;
  const onError = (event: ErrorEvent) => {
    captured = toError(event.error ?? event.message);
    event.preventDefault();
  };
  const onUnhandledRejection = (event: PromiseRejectionEvent) => {
    captured = toError(event.reason);
    event.preventDefault();
  };

  window.addEventListener('error', onError);
  window.addEventListener('unhandledrejection', onUnhandledRejection);

  try {
    const result = await action();

    if (captured) throw captured;

    return result;
  } finally {
    window.removeEventListener('error', onError);
    window.removeEventListener('unhandledrejection', onUnhandledRejection);
  }
};

// ─── API ─────────────────────────────────────────────────────────────────────

/**
 * Mount a component into the DOM and return a test fixture.
 *
 * Accepts a registered tag name, an inline setup function, or a component
 * options object. Setup functions are auto-registered with generated tag names.
 *
 * @example — inline setup function
 * const { query } = await mount(() => {
 *   const count = signal(0);
 *   return html`<button @click=${() => count.value++}>${count}</button>`;
 * });
 *
 * @example — registered tag name
 * const { query } = await mount('my-counter');
 */
export async function mount<T extends HTMLElement = HTMLElement>(
  tagOrSetup: string,
  options?: MountOptions,
): Promise<Fixture<T>>;
export async function mount<T extends HTMLElement = HTMLElement>(
  tagOrSetup: MountSetup,
  options?: MountOptions,
): Promise<Fixture<T>>;
export async function mount<T extends HTMLElement = HTMLElement>(
  tagOrSetup: string | MountSetup,
  options: MountOptions = {},
): Promise<Fixture<T>> {
  const { attrs = {}, componentOptions, container = document.body, html, props = {} } = options;

  let tagName: string;
  let inlineDefinition: ComponentDefinition<any, any> | undefined;

  if (typeof tagOrSetup === 'string') {
    tagName = tagOrSetup;
  } else {
    tagName = `trial-${++_globalTagCounter}`;
    _componentTagCounter = _globalTagCounter;
    inlineDefinition = {
      ...(componentOptions ?? {}),
      setup: tagOrSetup as ComponentDefinition<any, any>['setup'],
    };
  }

  if (inlineDefinition) {
    define(tagName, inlineDefinition);
  }

  const element = document.createElement(tagName) as T;

  if (html) element.innerHTML = html;

  if (Object.keys(props).length) Object.assign(element, props);

  for (const [name, value] of Object.entries(attrs)) applyAttr(element, name, value);

  await withWindowErrorCapture(async () => {
    container.appendChild(element);
    _mountedElements.push(element);
    await flush();
  });

  return {
    async act(fn) {
      await fn();
      await flush();
    },

    async attr(name, value) {
      applyAttr(element, name, value);
      await flush();
    },

    async attrs(record) {
      for (const [name, value] of Object.entries(record)) applyAttr(element, name, value);
      await flush();
    },

    destroy() {
      element.remove();

      const i = _mountedElements.indexOf(element);

      if (i !== -1) _mountedElements.splice(i, 1);
    },
    element,

    flush,

    query<E extends Element = Element>(selector: string): E | null {
      return (element.shadowRoot ?? element).querySelector<E>(selector);
    },

    queryAll<E extends Element = Element>(selector: string): E[] {
      return Array.from((element.shadowRoot ?? element).querySelectorAll<E>(selector));
    },

    queryAllByTestId<E extends Element = Element>(testId: string): E[] {
      return Array.from((element.shadowRoot ?? element).querySelectorAll<E>(`[data-testid="${testId}"]`));
    },

    queryAllByText<E extends Element = Element>(text: string, selector = '*'): E[] {
      return queryAllByText<E>((element.shadowRoot ?? element) as Element, text, selector);
    },

    queryByTestId<E extends Element = Element>(testId: string): E | null {
      return (element.shadowRoot ?? element).querySelector<E>(`[data-testid="${testId}"]`);
    },

    queryByText<E extends Element = Element>(text: string, selector = '*'): E | null {
      return queryByText<E>((element.shadowRoot ?? element) as Element, text, selector);
    },

    get shadow(): ShadowRoot | null {
      return element.shadowRoot;
    },
  };
}

/**
 * Register and mount a component definition in a single call.
 *
 * Combines `define(tag, definition)` + `mount(tag, options)` — the standard
 * pattern for testing full custom-element lifecycle (props, reconnect, etc.).
 *
 * @example
 * const { query } = await mountComponent('my-counter', {
 *   props: { count: prop.number(0) },
 *   setup: (props) => html`<div>${props.count}</div>`,
 * });
 */
export async function mountComponent<T extends HTMLElement = HTMLElement>(
  tag: string,
  definition: ComponentDefinition<any, any>,
  options?: MountOptions,
): Promise<Fixture<T>> {
  define(tag, definition);

  return mount<T>(tag, options);
}

/**
 * Register a stub custom element (no-op if already defined).
 *
 * @example
 * mock('child-button', '<slot></slot>');
 */
export function mock(tagName: string, template = ''): void {
  if (!customElements.get(tagName)) {
    customElements.define(
      tagName,
      class extends HTMLElement {
        connectedCallback() {
          this.innerHTML = template;
        }
      },
    );
  }
}

/**
 * Remove all elements mounted via `mount()`.
 * Call in `afterEach` to keep tests isolated.
 *
 * @example
 * afterEach(() => cleanup());
 */
export function cleanup(): void {
  for (const el of _mountedElements) el.remove();
  _mountedElements.length = 0;
  _resetRawSanitizer();
  _resetLiveSignals();
  _clearStylesheetCache();
  _resetIdCounter();
}

/** @internal re-export for within() */
export type { QueryScope };

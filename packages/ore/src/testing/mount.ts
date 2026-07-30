/**
 * Component mounting utilities for test environments.
 */

import type { Readable } from '@vielzeug/ripple';

import { type QueryScope, within } from '@vielzeug/assay';

import { type ComponentDefinition } from '../component-types';
import { define } from '../define';
import { type HTMLResult } from '../template/result';
import { setAttr } from '../utils/dom';
import { flush, type FlushOptions } from './flush';
import { resetOreForTests } from './reset';

// ─── Types ───────────────────────────────────────────────────────────────────

// Fixture's query/queryAll/queryBy*/queryAllBy* methods are exactly QueryScope's surface —
// extending it (rather than redeclaring all six signatures a second time) means a future
// addition to one is automatically part of the other, with the type system enforcing it.
/**
 * A mounted component ready for assertions. Every inherited `QueryScope` method (`query`,
 * `queryAll`, `queryByText`, `queryAllByText`, `queryByTestId`, `queryAllByTestId`) is scoped
 * to `element.shadowRoot` — falling back to `element` itself for light-DOM components
 * (`shadow: false` / no shadow root).
 */
export interface Fixture<T extends HTMLElement = HTMLElement> extends QueryScope {
  /** Delegates to `dispose()`. Enables `using` declarations. */
  [Symbol.dispose](): void;
  /** Run a callback then flush — the standard way to trigger and assert a reactive update */
  act(fn: () => unknown): Promise<void>;
  /** Set an attribute (boolean `false` removes it) then flush */
  attr(name: string, value: string | number | boolean): Promise<void>;
  /** Set multiple attributes then flush */
  attrs(record: Record<string, string | number | boolean>): Promise<void>;
  /** Remove the component from the DOM. Idempotent. */
  dispose(): void;
  /** `true` after `dispose()` has been called. */
  readonly disposed: boolean;
  /** The component element */
  element: T;
  /** Wait for all reactive updates and animation frames */
  flush(options?: FlushOptions): Promise<void>;
  /** The component's shadow root (null for light-DOM components) */
  readonly shadow: ShadowRoot | null;
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
  componentOptions?: Omit<ComponentDefinition<any>, 'setup'>;
}

type MountProps = { readonly [x: string]: Readable<unknown> };

// Bivariant callback type keeps inline test callbacks ergonomic across varying prop specializations.
export type MountSetup = {
  bivarianceHack: (props: MountProps) => HTMLResult | null | Promise<HTMLResult | null>;
}['bivarianceHack'];

// ─── Test environment state ───────────────────────────────────────────────────

export const _mountedElements: HTMLElement[] = [];

// Monotonic across the whole test run — never reset: custom element registrations
// are permanent, so a re-used tag name would throw on re-define. Deterministic
// within a run (trial-1, trial-2, ...) without a random suffix.
let _componentTagCounter = 0;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function applyAttr(element: Element, name: string, value: string | number | boolean): void {
  // Same write path as the runtime's attribute bindings, so tests never set up
  // states the runtime itself can't produce (e.g. boolean true → "true").
  setAttr(element, name, value);
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
  let inlineDefinition: ComponentDefinition<any> | undefined;

  if (typeof tagOrSetup === 'string') {
    tagName = tagOrSetup;
  } else {
    tagName = `trial-${++_componentTagCounter}`;
    inlineDefinition = {
      ...(componentOptions ?? {}),
      setup: tagOrSetup as ComponentDefinition<any>['setup'],
    };
  }

  if (inlineDefinition) {
    define(tagName, inlineDefinition);
  }

  const element = document.createElement(tagName) as T;

  if (html) element.innerHTML = html;

  if (Object.keys(props).length) Object.assign(element, props);

  for (const [name, value] of Object.entries(attrs)) applyAttr(element, name, value);

  try {
    await withWindowErrorCapture(async () => {
      container.appendChild(element);
      _mountedElements.push(element);
      await flush();
    });
  } catch (err) {
    element.remove();

    const i = _mountedElements.indexOf(element);

    if (i !== -1) _mountedElements.splice(i, 1);

    throw err;
  }

  let isDisposed = false;

  function dispose() {
    if (isDisposed) return;

    isDisposed = true;
    element.remove();

    const i = _mountedElements.indexOf(element);

    if (i !== -1) _mountedElements.splice(i, 1);
  }

  const scope = within((element.shadowRoot ?? element) as Element);

  return {
    ...scope,

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

    dispose,

    get disposed(): boolean {
      return isDisposed;
    },

    element,

    flush,

    get shadow(): ShadowRoot | null {
      return element.shadowRoot;
    },

    [Symbol.dispose]() {
      dispose();
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
  definition: ComponentDefinition<any>,
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
  resetOreForTests();
}

/** @internal re-export for within() */
export type { QueryScope };

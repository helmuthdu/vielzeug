import { signal, type ReadonlySignal, type Signal } from '@vielzeug/stateit';

import { fire } from './runtime';
import { currentRuntime } from './runtime';

let _idCounter = 0;

export const _resetIdCounter = (): void => {
  _idCounter = 0;
};

export const createId = (prefix?: string): string => `${prefix ? `${prefix}-` : 'cft-'}${++_idCounter}`;
export type Ref<T extends Element> = Signal<T | null>;
export function ref<T extends Element>(): Ref<T> {
  return signal<T | null>(null);
}

export type Refs<T extends Element> = T[];

export function refs<T extends Element>(): Refs<T> {
  return [];
}

export type RefCallback<T extends Element> = (el: T | null) => void;

export interface HTMLResult {
  __bindings: Binding[];
  __craftitHtmlResult: true;
  __html: string;
  toString(): string;
}

export function htmlResult(html: string, bindings: Binding[] = []): HTMLResult {
  return {
    __bindings: bindings,
    __craftitHtmlResult: true,
    __html: html,
    toString() {
      return html;
    },
  };
}

export const isHtmlResult = (value: unknown): value is HTMLResult =>
  typeof value === 'object' && !!value && (value as HTMLResult).__craftitHtmlResult === true;

export function extractResult(v: string | HTMLResult): { bindings: Binding[]; html: string } {
  return typeof v === 'string' ? { bindings: [], html: v } : { bindings: v.__bindings, html: v.__html };
}

export type TextBinding = {
  signal: ReadonlySignal<unknown>;
  type: 'text';
  uid: string;
};

export type AttrBinding = {
  mode: 'bool' | 'attr';
  name: string;
  signal?: ReadonlySignal<unknown>;
  type: 'attr';
  uid: string;
  value?: unknown;
};

export type PropBinding = {
  model?: Signal<unknown>;
  name: string;
  signal?: ReadonlySignal<unknown>;
  type: 'prop';
  uid: string;
  value?: unknown;
};

export type EventBinding = {
  handler: (e: Event) => void;
  modifiers?: {
    capture?: boolean;
    once?: boolean;
    passive?: boolean;
    prevent?: boolean;
    self?: boolean;
    stop?: boolean;
  };
  name: string;
  type: 'event';
  uid: string;
};

export type RefBinding = {
  ref: Ref<Element> | Refs<Element> | RefCallback<Element>;
  type: 'ref';
  uid: string;
};

export type HtmlBinding = {
  keyed?: boolean;
  signal: ReadonlySignal<{
    bindings: Binding[];
    html: string;
    items?: Array<{ bindings: Binding[]; html: string }>;
    keys?: (string | number)[];
  }>;
  type: 'html';
  uid: string;
};

export type Binding = TextBinding | AttrBinding | PropBinding | EventBinding | RefBinding | HtmlBinding;
export const EACH_SIGNAL: unique symbol = Symbol('craftit.eachSignal');
export const CF_ID_ATTR = 'u';

// Shared across rekeyHtmlResult — safe to reuse with replace() (lastIndex not used by replace)
const ATTR_ID_RE = new RegExp(`${CF_ID_ATTR}="([^"]+)"`, 'g');

/** @internal — creates a sequential numeric ID factory starting at 0. */
export const createMarkerIdFactory = (): (() => string) => {
  let n = 0;

  return () => String(n++);
};

/** @internal — remaps binding UIDs in an HTMLResult using a shared ID factory. */
export const rekeyHtmlResult = (result: HTMLResult, getNextId: () => string): { bindings: Binding[]; html: string } => {
  const idMap = new Map<string, string>();
  const getMappedId = (id: string): string => {
    const mapped = idMap.get(id);

    if (mapped) return mapped;

    const next = getNextId();

    idMap.set(id, next);

    return next;
  };

  return {
    bindings: result.__bindings.map((binding) => ({ ...binding, uid: getMappedId(binding.uid) }) as Binding),
    html: result.__html
      .replace(ATTR_ID_RE, (_, id: string) => `${CF_ID_ATTR}="${getMappedId(id)}"`)
      .replace(/<!--(\d+)-->/g, (_, id: string) => `<!--${getMappedId(id)}-->`),
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// INTERNAL DOM & EVENT UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

/** @internal — Iterate an iterable and call every function in it. */
export const runAll = (fns: Iterable<() => void>): void => {
  const callbacks = [...fns];

  for (let index = callbacks.length - 1; index >= 0; index--) {
    callbacks[index]?.();
  }
};

/** @internal — Set an attribute on an element, handling boolean and null values. */
export const setAttr = (el: Element, name: string, val: unknown): void => {
  // Avoid inline event-handler attributes (onclick, onerror, ...) to reduce injection risk.
  if (/^on/i.test(name)) {
    el.removeAttribute(name);

    return;
  }

  if (val == null || val === false) {
    el.removeAttribute(name);
  } else if (val === true) {
    el.setAttribute(name, name.startsWith('aria-') ? 'true' : '');
  } else {
    el.setAttribute(name, String(val));
  }
};

/** @internal — Attach an event listener with automatic cleanup. */
export const listen = (
  el: EventTarget,
  name: string,
  handler: (e: any) => void,
  options?: AddEventListenerOptions,
): (() => void) => {
  const listener: EventListener = handler as EventListener;

  el.addEventListener(name, listener, options);

  return () => el.removeEventListener(name, listener, options);
};

// ─────────────────────────────────────────────────────────────────────────────
// INTERNAL STRING UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

export const toKebab = (str: string): string => str.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

const ESC: Record<string, string> = { "'": '&#39;', '"': '&quot;', '&': '&amp;', '<': '&lt;', '>': '&gt;' };

/** @internal — Escape untrusted text for HTML text/attribute contexts. */
export const escapeHtml = (value: unknown): string => String(value).replace(/[&<>"']/g, (c) => ESC[c]);

// ─────────────────────────────────────────────────────────────────────────────
// INTERNAL EMIT TYPES & HELPERS
// ─────────────────────────────────────────────────────────────────────────────

type NoDetail = void | undefined | never;
type KeysWithoutDetail<T extends Record<string, unknown>> = {
  [P in keyof T]: [T[P]] extends [NoDetail] ? P : never;
}[keyof T];

export type EmitFn<T extends Record<string, unknown>> = {
  <K extends KeysWithoutDetail<T>>(event: K): void;
  <K extends Exclude<keyof T, KeysWithoutDetail<T>>>(event: K, detail: T[K]): void;
};

/** @internal — Create a type-safe custom event emitter for the current runtime host. */
export const createEmitFn = <T extends Record<string, unknown>>(): EmitFn<T> => {
  const el = currentRuntime().el;

  return ((event: keyof T, ...rest: unknown[]) => {
    fire.custom(el, String(event), rest.length > 0 ? { detail: rest[0] } : undefined);
  }) as EmitFn<T>;
};

// ─────────────────────────────────────────────────────────────────────────────
// INTERNAL CSS & STYLESHEET UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

export type CSSResult = {
  content: string;
  toString(): string;
};

const cssResultToString = function (this: CSSResult): string {
  return this.content;
};

/** @internal — Compile CSS template strings into a CSSResult. */
export const css = (strings: TemplateStringsArray, ...values: unknown[]): CSSResult => {
  let content = '';

  for (let i = 0; i < strings.length; i++) {
    content += strings[i];

    if (i < values.length) {
      const v = values[i];

      content += v && typeof v === 'object' && 'content' in v ? (v as CSSResult).content : (v ?? '');
    }
  }

  return { content: content.trim(), toString: cssResultToString };
};

const stylesheetStringCache = new Map<string, CSSStyleSheet>();

/** @internal — Load a stylesheet string or CSSResult into an adoptedStyleSheet. */
export const loadStylesheet = (style: string | CSSStyleSheet | CSSResult): CSSStyleSheet => {
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

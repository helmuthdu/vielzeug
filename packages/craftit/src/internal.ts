import { signal, type ReadonlySignal, type Signal } from '@vielzeug/stateit';

import { CRAFTIT_ERRORS } from './errors';
import { currentElementOrThrow } from './runtime';

export type Ref<T extends Element> = Signal<T | null>;

export function ref<T extends Element>(): Ref<T> {
  return signal<T | null>(null);
}

export type Refs<T extends Element> = T[];

export function refs<T extends Element>(): Refs<T> {
  return [];
}

export type RefCallback<T extends Element> = (el: T | null) => void;

export type TextBinding = {
  signal: ReadonlySignal<unknown>;
  type: 'text';
  uid: string;
};

export type AttrBinding = {
  /** When true the binding uses live-write semantics: stale app-state writes are
   * skipped if the DOM value has diverged from the last programmatic write. */
  live?: true;
  mode: 'bool' | 'attr';
  name: string;
  signal?: ReadonlySignal<unknown>;
  type: 'attr';
  uid: string;
  value?: unknown;
};

export type EventBinding = {
  handler: (e: Event) => void;
  name: string;
  options?: AddEventListenerOptions;
  type: 'event';
  uid: string;
};

export type RefBinding = {
  ref: Ref<Element> | Refs<Element> | RefCallback<Element>;
  type: 'ref';
  uid: string;
};

export type HtmlBindingPayload = {
  bindings: Binding[];
  html: string;
};

export type RuntimeDirective = {
  __craftitDirective: true;
  mount: (anchor: Comment, registerCleanup: (fn: () => void) => void) => void;
};

export type DirectiveResult = RuntimeDirective;

export const isDirectiveResult = (value: unknown): value is DirectiveResult =>
  typeof value === 'object' &&
  value !== null &&
  (value as RuntimeDirective).__craftitDirective === true &&
  typeof (value as RuntimeDirective).mount === 'function';

export type HtmlBinding = {
  signal: ReadonlySignal<HtmlBindingPayload>;
  type: 'html';
  uid: string;
};

export type DirectiveBinding = {
  directive: RuntimeDirective;
  type: 'directive';
  uid: string;
};

export type Binding = TextBinding | AttrBinding | EventBinding | RefBinding | HtmlBinding | DirectiveBinding;

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
  typeof value === 'object' && value !== null && (value as HTMLResult).__craftitHtmlResult === true;

export function extractResult(v: string | HTMLResult): { bindings: Binding[]; html: string } {
  return typeof v === 'string' ? { bindings: [], html: v } : { bindings: v.__bindings, html: v.__html };
}

export type CSSResult = {
  __craftitCssResult: true;
  content: string;
  toString(): string;
};

export const isCssResult = (value: unknown): value is CSSResult =>
  typeof value === 'object' && !!value && (value as CSSResult).__craftitCssResult === true;

// ─────────────────────────────────────────────────────────────────────────────
// DOM UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

export const runAll = (fns: (() => void)[]): void => {
  const errors: unknown[] = [];

  for (let i = fns.length - 1; i >= 0; i--) {
    try {
      fns[i]();
    } catch (err) {
      errors.push(err);
    }
  }

  if (errors.length > 0) {
    throw new AggregateError(errors, CRAFTIT_ERRORS.cleanupFailed);
  }
};

export const removeNodes = (nodes: Node[]): void => {
  for (const node of nodes) {
    (node as ChildNode).remove();
  }
};

export const setAttr = (el: Element, name: string, val: unknown): void => {
  if (/^on/i.test(name)) {
    el.removeAttribute(name);

    return;
  }

  if (val == null || val === false) {
    el.removeAttribute(name);
  } else {
    el.setAttribute(name, val === true ? 'true' : String(val));
  }
};

export const listen = (
  el: EventTarget | null | undefined,
  name: string,
  handler: (e: any) => void,
  options?: AddEventListenerOptions,
): (() => void) => {
  if (!el) return () => {};

  const listener: EventListener = handler as EventListener;

  el.addEventListener(name, listener, options);

  return () => el.removeEventListener(name, listener, options);
};

export const toKebab = (str: string): string => str.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

const ESC: Record<string, string> = { "'": '&#39;', '"': '&quot;', '&': '&amp;', '<': '&lt;', '>': '&gt;' };

export const escapeHtml = (value: unknown): string => String(value).replace(/[&<>"']/g, (c) => ESC[c]);

// ─────────────────────────────────────────────────────────────────────────────
// EMIT UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

type NoDetail = void | undefined | never;
type KeysWithoutDetail<T extends Record<string, unknown>> = {
  [P in keyof T]: [T[P]] extends [NoDetail] ? P : never;
}[keyof T];

type StrictEmitFn<T extends Record<string, unknown>> = {
  <K extends KeysWithoutDetail<T>>(event: K): void;
  <K extends Exclude<keyof T, KeysWithoutDetail<T>>>(event: K, detail: T[K]): void;
};

type LooseEmitFn = (event: string, detail?: unknown) => void;

export type EmitFn<T extends Record<string, unknown>> = StrictEmitFn<T> & LooseEmitFn;

export const createEmitFn = <T extends Record<string, unknown>>(): EmitFn<T> => {
  const el = currentElementOrThrow();

  return ((event: keyof T, ...rest: unknown[]) => {
    fire.custom(el, String(event), rest.length > 0 ? { detail: rest[0] } : undefined);
  }) as EmitFn<T>;
};

// ─────────────────────────────────────────────────────────────────────────────
// FIRE UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

type FireDefaults = Pick<EventInit, 'bubbles' | 'cancelable' | 'composed'>;

export type FireApi = {
  custom<Detail = unknown>(target: EventTarget, type: string, options?: CustomEventInit<Detail>): boolean;
  event(target: EventTarget, event: Event): boolean;
  focus(target: EventTarget, type: string, options?: FocusEventInit): boolean;
  keyboard(target: EventTarget, type: string, options?: KeyboardEventInit): boolean;
  mouse(target: EventTarget, type: string, options?: MouseEventInit): boolean;
  touch(target: EventTarget, type: string, options?: TouchEventInit): boolean;
};

const DEFAULT_FIRE_OPTIONS: FireDefaults = { bubbles: true, cancelable: true, composed: true };

export const fire: FireApi = {
  custom<Detail = unknown>(target: EventTarget, type: string, options: CustomEventInit<Detail> = {}) {
    return target.dispatchEvent(new CustomEvent<Detail>(type, { ...DEFAULT_FIRE_OPTIONS, ...options }));
  },
  event(target, event) {
    return target.dispatchEvent(event);
  },
  focus(target, type, options = {}) {
    return target.dispatchEvent(new FocusEvent(type, { ...DEFAULT_FIRE_OPTIONS, ...options }));
  },
  keyboard(target, type, options = {}) {
    return target.dispatchEvent(new KeyboardEvent(type, { ...DEFAULT_FIRE_OPTIONS, ...options }));
  },
  mouse(target, type, options = {}) {
    return target.dispatchEvent(new MouseEvent(type, { ...DEFAULT_FIRE_OPTIONS, ...options }));
  },
  touch(target, type, options = {}) {
    if (typeof TouchEvent !== 'undefined') {
      return target.dispatchEvent(new TouchEvent(type, { ...DEFAULT_FIRE_OPTIONS, ...options }));
    }

    return target.dispatchEvent(new CustomEvent(type, { ...DEFAULT_FIRE_OPTIONS, ...options }));
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// ID UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

let _idCounter = 0;

export const _resetIdCounter = (): void => {
  _idCounter = 0;
};

export const createId = (prefix?: string): string => `${prefix ? `${prefix}-` : 'cft-'}${++_idCounter}`;

export const CF_ID_ATTR = 'u';

const ATTR_ID_RE = new RegExp(`${CF_ID_ATTR}="([^"]+)"`, 'g');

export const createMarkerIdFactory = (): (() => string) => {
  let n = 0;

  return () => String(n++);
};

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
// CSS UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

const cssResultToString = function (this: CSSResult): string {
  return this.content;
};

export const css = (strings: TemplateStringsArray, ...values: unknown[]): CSSResult => {
  let content = '';

  for (let i = 0; i < strings.length; i++) {
    content += strings[i];

    if (i < values.length) {
      const v = values[i];

      content += isCssResult(v) ? v.content : (v ?? '');
    }
  }

  return { __craftitCssResult: true as const, content: content.trim(), toString: cssResultToString };
};

const stylesheetStringCache = new Map<string, CSSStyleSheet>();

export const loadStylesheet = (style: string | CSSStyleSheet | CSSResult): CSSStyleSheet => {
  if (style instanceof CSSStyleSheet) return style;

  const cssText = typeof style === 'string' ? style : style.content;
  const cached = stylesheetStringCache.get(cssText);

  if (cached) return cached;

  const sheet = new CSSStyleSheet();

  try {
    sheet.replaceSync(cssText);
  } catch (err) {
    console.error(CRAFTIT_ERRORS.styleReplaceFailed, err);
  }

  stylesheetStringCache.set(cssText, sheet);

  return sheet;
};

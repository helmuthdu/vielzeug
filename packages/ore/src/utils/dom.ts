/**
 * Low-level DOM utilities used throughout the runtime and binding layers.
 */

import { isReactive, type Readable } from '@vielzeug/ripple';

import { warn } from '../_dev';
import { ORE_ERRORS } from '../errors';

/**
 * Resolves a value that may be a plain value, a getter function, or a reactive
 * signal — the one shared three-way branch used by `classMap`/`styleMap`/`bind()`.
 */
export const resolveMaybeReactive = <T>(value: T | Readable<T> | (() => T)): T =>
  typeof value === 'function' ? (value as () => T)() : isReactive(value) ? value.value : value;

/**
 * Characters that can break out of a CSS declaration in an inline style value or property name.
 * Semicolons end the current declaration; braces are meaningful in stylesheet rules but not
 * inline style values, and signal an injection attempt there.
 */
export const UNSAFE_CSS_CHARS = /[;{}]/g;

export const sanitizeCssToken = (value: string): string => value.replace(UNSAFE_CSS_CHARS, '');

export const runAll = (fns: (() => void)[]): void => {
  for (let i = fns.length - 1; i >= 0; i--) fns[i]?.();
};

export const removeNodes = (nodes: Node[]): void => {
  for (const node of nodes) {
    (node as ChildNode).remove();
  }
};

/**
 * Tracks "whatever is currently rendered in one spot" — a list of live DOM nodes plus the
 * cleanup functions that were registered while mounting them. `clear()` tears both down and
 * resets to empty, ready for the next render.
 *
 * Every directive/binding that swaps its rendered content when a reactive source changes
 * (`when()`, `unsafeHtml()`, `each()`'s empty-list fallback, `applyHtmlBinding()`) needs exactly this
 * bookkeeping — this is the one shared implementation instead of four independently-maintained
 * `currentNodes`/`currentCleanups` variable pairs.
 */
export type ReplaceableSlot = {
  /** Tears down every registered cleanup and removes every tracked node, then resets to empty. */
  clear(): void;
  /** Currently tracked nodes — read after mounting to know what's live. */
  readonly nodes: Node[];
  /** Pass as the `registerCleanup` callback to whatever mounts the next render. */
  registerCleanup(fn: () => void): void;
  /** Replace the tracked node list (call once mounting the next render is complete). */
  setNodes(nodes: Node[]): void;
};

export const createReplaceableSlot = (): ReplaceableSlot => {
  let nodes: Node[] = [];
  let cleanups: (() => void)[] = [];

  return {
    clear() {
      runAll(cleanups);
      removeNodes(nodes);
      cleanups = [];
      nodes = [];
    },
    get nodes() {
      return nodes;
    },
    registerCleanup(fn) {
      cleanups.push(fn);
    },
    setNodes(next) {
      nodes = next;
    },
  };
};

/**
 * HTML attributes that accept URLs. Values bound to these attributes are
 * checked for dangerous schemes before being set.
 *
 * `srcdoc` is deliberately excluded: it holds raw HTML (not a URL), so scheme
 * checking doesn't apply — it's blocked unconditionally below, alongside `on*`.
 */
const URL_ATTRS = new Set([
  'action',
  'cite',
  'codebase',
  'data',
  'formaction',
  'href',
  'manifest',
  'ping',
  'poster',
  'src',
  'xlink:href',
]);

/**
 * Schemes that execute JavaScript or can embed arbitrary HTML. Blocked
 * unconditionally in URL-accepting attributes.
 * Covers: javascript:, vbscript:, blob:, and data: variants that carry HTML/XML
 * or script-capable SVG. Plain data: image URIs (e.g. data:image/png) are
 * intentionally allowed.
 */
const DANGEROUS_SCHEME_RE =
  /^\s*(?:(?:javascript|vbscript|blob):|data:(?:[^,]*\/(?:html|svg\+xml)|application\/(?:xhtml|xml)))/i;

export const setAttr = (el: Element, name: string, val: unknown): void => {
  const lowerName = name.toLowerCase();

  if (/^on[a-z]/i.test(name)) {
    warn(
      `Blocked setAttribute("${name}", ...) — inline event handler attributes are not supported. Use @${name.slice(2)} binding syntax instead.`,
    );
    el.removeAttribute(name);

    return;
  }

  if (lowerName === 'srcdoc') {
    warn(
      `Blocked setAttribute("srcdoc", ...) — "srcdoc" holds raw HTML, not a URL, and is not supported via attribute binding. Sanitize untrusted content, then use unsafeHtml() if HTML injection is required.`,
    );
    el.removeAttribute(name);

    return;
  }

  if (val == null || val === false) {
    el.removeAttribute(name);

    return;
  }

  const strVal = val === true ? 'true' : String(val);

  if (URL_ATTRS.has(lowerName) && DANGEROUS_SCHEME_RE.test(strVal)) {
    warn(
      `Blocked dangerous URL scheme in attribute "${name}". Only safe URLs are permitted in URL-accepting attributes.`,
    );
    el.removeAttribute(name);

    return;
  }

  el.setAttribute(name, strVal);
};

export const listen = (
  el: EventTarget | null | undefined,
  name: string,
  handler: EventListener,
  options?: AddEventListenerOptions,
): (() => void) => {
  if (!el) {
    warn(ORE_ERRORS.listenNullTarget(name));

    return () => {};
  }

  const listener: EventListener = handler;

  el.addEventListener(name, listener, options);

  return () => el.removeEventListener(name, listener, options);
};

export const toKebab = (str: string): string => str.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

export const isStructuredValue = (value: unknown): value is object =>
  Array.isArray(value) || (typeof value === 'object' && value !== null);

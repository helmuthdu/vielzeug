/**
 * Low-level DOM utilities used throughout the runtime and binding layers.
 */

import { createScope, isReactive, type Readable, type Scope } from '@vielzeug/ripple';

import { warn } from '../_dev';
import { ORE_ERRORS } from '../errors';

/**
 * A value that may be a plain value, a reactive signal, or a getter function :
 * the shape `when()`, `each()`, `classMap()`, and `bind()` accept.
 * Exported so consumers can annotate their own composable parameters with it.
 */
export type MaybeReactive<T> = T | Readable<T> | (() => T);

/**
 * Resolves a value that may be a plain value, a getter function, or a reactive
 * signal: the one shared three-way branch used by `classMap`/`styleMap`/`bind()`.
 */
export const resolveMaybeReactive = <T>(value: MaybeReactive<T>): T =>
  typeof value === 'function' ? (value as () => T)() : isReactive(value) ? value.value : value;

/**
 * Characters that can break out of a CSS declaration in an inline style value or property name.
 * Semicolons end the current declaration; braces are meaningful in stylesheet rules but not
 * inline style values, and signal an injection attempt there.
 */
export const UNSAFE_CSS_CHARS = /[;{}]/g;

export const sanitizeCssToken = (value: string): string => value.replace(UNSAFE_CSS_CHARS, '');

export const removeNodes = (nodes: Node[]): void => {
  for (const node of nodes) {
    (node as ChildNode).remove();
  }
};

/**
 * Tracks "whatever is currently rendered in one spot": a list of live DOM nodes plus the
 * ripple scope that owns the effects and `onCleanup` callbacks registered while mounting
 * them. `clear()` disposes that scope and removes the nodes.
 *
 * Every directive/binding that swaps its rendered content when a reactive source changes
 * (`when()`, `unsafeHtml()`, `applyHtmlBinding()`) mounts the next render inside `render()`,
 * so nested effects belong to this slot rather than to whichever effect happens to be
 * running. `scope.run()` clears the transient effect-run owner.
 */
export type ReplaceableSlot = {
  /** Dispose the current render scope and remove every tracked node. */
  clear(): void;
  /** Currently tracked nodes. */
  readonly nodes: Node[];
  /**
   * Dispose the previous render, then run `fn` inside a fresh scope. Call
   * `setNodes` from `fn` once mounting finishes.
   */
  render<T>(fn: () => T): T;
  /** Replace the tracked node list (call once mounting the next render is complete). */
  setNodes(nodes: Node[]): void;
};

export const createReplaceableSlot = (): ReplaceableSlot => {
  let nodes: Node[] = [];
  let scope: Scope | null = null;

  const clear = (): void => {
    scope?.dispose();
    scope = null;
    removeNodes(nodes);
    nodes = [];
  };

  return {
    clear,
    get nodes() {
      return nodes;
    },
    render(fn) {
      clear();

      const next = createScope();

      scope = next;

      try {
        return next.run(fn);
      } catch (error) {
        next.dispose();
        scope = null;
        throw error;
      }
    },
    setNodes(nextNodes) {
      nodes = nextNodes;
    },
  };
};

/**
 * HTML attributes that accept URLs. Values bound to these attributes are
 * checked for dangerous schemes before being set.
 *
 * `srcdoc` is deliberately excluded: it holds raw HTML (not a URL), so scheme
 * checking doesn't apply: it's blocked unconditionally below, alongside `on*`.
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

/**
 * Control characters and spaces, normalized away before the scheme check to
 * mirror the WHATWG URL parser browsers use when resolving URL attributes: it
 * removes every ASCII tab/LF/CR anywhere in the input and trims C0 controls and
 * spaces from both ends. So `java\tscript:alert(1)` executes even though the raw
 * string does not start with `javascript:`. Testing the normalized form closes
 * that gap while leaving benign URLs (e.g. one with an internal space) untouched.
 */
const URL_REMOVE_RE = /[\t\n\r]/g;
const URL_TRIM_RE = /^[\s\p{C}]+|[\s\p{C}]+$/gu;

const normalizeUrlForSchemeCheck = (value: string): string => value.replace(URL_REMOVE_RE, '').replace(URL_TRIM_RE, '');

const isDangerousUrl = (value: string): boolean => DANGEROUS_SCHEME_RE.test(normalizeUrlForSchemeCheck(value));

/**
 * The name-only classification `setAttr` branches on. Attribute names repeat
 * constantly on hot update paths (a template binds `class`/`href`/... once and
 * writes them on every signal change), so the regex/toLowerCase/set-lookup
 * pass runs once per name and every write just reads the cached plan.
 */
type AttrWritePlan = {
  event: boolean;
  srcdoc: boolean;
  url: boolean;
};

const attrWritePlans = new Map<string, AttrWritePlan>();
const ATTR_WRITE_PLAN_LIMIT = 512;

const getAttrWritePlan = (name: string): AttrWritePlan => {
  const cached = attrWritePlans.get(name);

  if (cached) return cached;

  const lowerName = name.toLowerCase();
  const plan: AttrWritePlan = {
    event: /^on[a-z]/i.test(name),
    srcdoc: lowerName === 'srcdoc',
    url: URL_ATTRS.has(lowerName),
  };

  if (attrWritePlans.size >= ATTR_WRITE_PLAN_LIMIT) attrWritePlans.clear();

  attrWritePlans.set(name, plan);

  return plan;
};

export const setAttr = (el: Element, name: string, val: unknown): void => {
  const plan = getAttrWritePlan(name);

  if (plan.event) {
    warn(
      `Blocked setAttribute("${name}", ...): inline event handler attributes are not supported. Use @${name.slice(2)} binding syntax instead.`,
    );
    el.removeAttribute(name);

    return;
  }

  if (plan.srcdoc) {
    warn(
      `Blocked setAttribute("srcdoc", ...): "srcdoc" holds raw HTML, not a URL, and is not supported via attribute binding. Sanitize untrusted content, then use unsafeHtml() if HTML injection is required.`,
    );
    el.removeAttribute(name);

    return;
  }

  if (val == null || val === false) {
    el.removeAttribute(name);

    return;
  }

  const strVal = val === true ? 'true' : String(val);

  if (plan.url && isDangerousUrl(strVal)) {
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

/**
 * Normalize a CSS property name for use in a declaration (camelCase → kebab-case,
 * injection characters stripped). Custom properties (`--*`) are case-sensitive, so
 * they skip the kebab conversion. Shared by `styleMap()` (template side) and
 * `bind({ style })` (host side) so both sanitize identically.
 */
export const cssDeclarationName = (name: string): string =>
  sanitizeCssToken(name.startsWith('--') ? name : toKebab(name));

/**
 * Resolve a style value to its declaration text ('' for null/false/empty).
 * Shared by `styleMap()` and `bind({ style })`.
 */
export const cssDeclarationValue = (value: unknown): string => {
  const resolved = resolveMaybeReactive(value as MaybeReactive<string | number | null | undefined | false>);

  if (resolved == null || resolved === false) return '';

  return sanitizeCssToken(String(resolved));
};

/**
 * Resolve a class map to the set of active class tokens: keys with truthy
 * (possibly reactive) values, whitespace stripped from each key (spaces would
 * inject extra class tokens). Shared by `classMap()` (joins the set into a
 * class attribute) and `bind({ class })` (diffs the set against classList).
 */
export const resolveClassTokens = (record: Record<string, MaybeReactive<boolean>>): Set<string> => {
  const tokens = new Set<string>();

  for (const [key, value] of Object.entries(record)) {
    if (!resolveMaybeReactive(value)) continue;

    const token = key.replace(/\s+/g, '');

    if (token) tokens.add(token);
  }

  return tokens;
};

export const isStructuredValue = (value: unknown): value is object =>
  Array.isArray(value) || (typeof value === 'object' && value !== null);

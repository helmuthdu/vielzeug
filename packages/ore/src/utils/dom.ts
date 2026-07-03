/**
 * Low-level DOM utilities used throughout the runtime and binding layers.
 */

import { warn } from '../_dev';

export const runAll = (fns: (() => void)[]): void => {
  for (let i = fns.length - 1; i >= 0; i--) fns[i]!();
};

export const removeNodes = (nodes: Node[]): void => {
  for (const node of nodes) {
    (node as ChildNode).remove();
  }
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
      `Blocked setAttribute("srcdoc", ...) — "srcdoc" holds raw HTML, not a URL, and is not supported via attribute binding. Use raw() with a registered sanitizer if you need to inject trusted HTML.`,
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
  if (!el) return () => {};

  const listener: EventListener = handler;

  el.addEventListener(name, listener, options);

  return () => el.removeEventListener(name, listener, options);
};

export const toKebab = (str: string): string => str.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

export const isStructuredValue = (value: unknown): value is object =>
  Array.isArray(value) || (typeof value === 'object' && value !== null);

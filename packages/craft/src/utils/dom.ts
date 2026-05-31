/**
 * Low-level DOM utilities used throughout the runtime and binding layers.
 */

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
  'srcdoc',
  'xlink:href',
]);

/**
 * Schemes that execute JavaScript or can embed arbitrary HTML. Blocked
 * unconditionally in URL-accepting attributes — no DEV-only guard.
 * `data:` URIs are intentionally not blocked; they are safe in img/video src
 * and only dangerous in href/action/formaction (not commonly misused in templates).
 */
const DANGEROUS_SCHEME_RE = /^\s*(?:javascript|vbscript):/i;

export const setAttr = (el: Element, name: string, val: unknown): void => {
  if (/^on[a-z]/i.test(name)) {
    if (import.meta.env.DEV) {
      console.warn(
        `[craft] Blocked setAttribute("${name}", ...) — inline event handler attributes are not supported. Use @${name.slice(2)} binding syntax instead.`,
      );
    }

    el.removeAttribute(name);

    return;
  }

  if (val == null || val === false) {
    el.removeAttribute(name);

    return;
  }

  const strVal = val === true ? 'true' : String(val);

  if (URL_ATTRS.has(name.toLowerCase()) && DANGEROUS_SCHEME_RE.test(strVal)) {
    if (import.meta.env.DEV) {
      console.warn(
        `[craft] Blocked dangerous URL scheme in attribute "${name}". Only safe URLs are permitted in URL-accepting attributes.`,
      );
    }

    el.removeAttribute(name);

    return;
  }

  el.setAttribute(name, strVal);
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

export const isStructuredValue = (value: unknown): value is object =>
  Array.isArray(value) || (typeof value === 'object' && value !== null);

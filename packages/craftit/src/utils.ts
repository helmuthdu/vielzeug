// ─── Counter singletons ───────────────────────────────────────────────────────
let _idCounter = 0;

/** @internal — resets the ID counter. Used by __resetCounters in the barrel. */
export const _resetIdCounter = (): void => {
  _idCounter = 0;
};

// ─── Shared DOM/string utilities ──────────────────────────────────────────────
/** Iterate an iterable and call every function in it. */
export const runAll = (fns: Iterable<() => void>): void => {
  for (const fn of fns) fn();
};

export const setAttr = (el: Element, name: string, val: unknown): void => {
  if (val == null || val === false) {
    el.removeAttribute(name);
  } else if (val === true) {
    el.setAttribute(name, '');
  } else {
    el.setAttribute(name, String(val));
  }
};

export const listen = (
  el: EventTarget,
  name: string,
  handler: (e: any) => void,
  options?: AddEventListenerOptions,
): (() => void) => {
  el.addEventListener(name, handler, options);

  return () => el.removeEventListener(name, handler, options);
};

/**
 * Creates a unique, stable ID string — suitable for `aria-labelledby`, `aria-describedby`,
 * and similar accessibility linkages. Call once per component instance (at setup time or inside `onMount`).
 */
export const createId = (prefix?: string): string => `${prefix ? `${prefix}-` : 'cft-'}${++_idCounter}`;

/**
 * Generates a stable set of ARIA-related IDs for a form control.
 * Snapshot `name` at call time — IDs are stable strings, not reactive.
 * `name` must be a non-empty string — callers that need a generated ID should
 * pass `createId(prefix)` as the name argument.
 *
 * @example
 * const { fieldId, labelId, helperId, errorId } = createFormIds('input', props.name.value);
 */
export const createFormIds = (prefix: string, name?: string | null) => {
  const normalizedName = name && name.trim() ? name : createId(prefix);
  const fieldId = `${prefix}-${normalizedName}`;

  return {
    errorId: `error-${fieldId}`,
    fieldId,
    helperId: `helper-${fieldId}`,
    labelId: `label-${fieldId}`,
  };
};

/**
 * Wraps an event handler with a guard condition. The handler is only invoked when `condition()` returns `true`.
 * Use for disabled checks, readonly guards, or any runtime condition.
 *
 * @example
 * const handleClick = guard(() => !props.disabled.value, (e) => toggle(e));
 */
export const guard =
  <E extends Event = Event>(condition: () => unknown, handler: (e: E) => void): ((e: E) => void) =>
  (e) => {
    if (condition()) handler(e);
  };

export const toKebab = (str: string): string => str.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

const _ESC: Record<string, string> = { "'": '&#39;', '"': '&quot;', '&': '&amp;', '<': '&lt;', '>': '&gt;' };

/**
 * Escapes HTML entity characters (`&`, `<`, `>`, `"`, `'`) in a value.
 * **Safe only in HTML text/attribute contexts.** Do NOT use for CSS values,
 * `javascript:` URLs, event handler attributes, or inline `<script>` content.
 */
export const escapeHtml = (value: unknown): string => String(value).replace(/[&<>"']/g, (c) => _ESC[c]);

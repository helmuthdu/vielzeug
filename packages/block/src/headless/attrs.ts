// ── DOM attribute helpers ─────────────────────────────────────────────────────
// Framework-agnostic helpers for manipulating HTML attributes.
// Used by headless primitives and components that need lightweight DOM attribute wiring.

/**
 * Sets `name` to `value` when truthy; removes it otherwise.
 * Use for optional string attributes like `color`, `name`, `size`.
 */
export const setMaybeAttribute = (el: HTMLElement, name: string, value: string | undefined): void => {
  if (value) el.setAttribute(name, value);
  else el.removeAttribute(name);
};

/**
 * Toggles a boolean attribute on/off.
 * Use for presence-only attributes like `disabled`, `checked`.
 */
export const setBooleanAttribute = (el: HTMLElement, name: string, active: boolean): void => {
  el.toggleAttribute(name, active);
};

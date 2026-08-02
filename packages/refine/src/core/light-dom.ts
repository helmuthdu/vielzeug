// ── Slot / light-DOM query helpers ────────────────────────────────────────────
// Utilities for querying slotted light-DOM children and resolving labels from
// option elements. Used by group components (checkbox-group, radio-group) and
// choice-field components (select, combobox).

/**
 * Returns all light-DOM descendants matching `tag` inside `host`.
 * Uses `getElementsByTagName` on the host's light DOM \u2014 not Shadow DOM slot assignment.
 */
export const getLightChildrenByTag = (host: HTMLElement, tag: string): HTMLElement[] =>
  Array.from(host.getElementsByTagName(tag)) as HTMLElement[];

/**
 * Returns the `textContent` of the item whose `value` attribute matches `value`,
 * falling back to `value` itself when no match is found.
 * Used by choice-field components to derive labels for emitted change events.
 */
export const getChoiceLabel = (items: HTMLElement[], value: string): string => {
  const item = items.find((el) => (el.getAttribute('value') ?? '') === value);

  return item?.textContent?.replace(/\s+/g, ' ').trim() || value;
};

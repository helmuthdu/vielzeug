import { parsePositiveNumber } from '../utils/field-values';

/** Set or remove an optional string attribute based on value presence. */
export function syncOptionalAttribute(element: HTMLElement, name: string, value: string | null | undefined): void {
  if (value == null || value === '') element.removeAttribute(name);
  else element.setAttribute(name, value);
}

/** Parse a positive numeric value and apply/remove the target mapping accordingly. */
export function syncOptionalPositiveNumber(value: unknown, onSet: (parsed: number) => void, onUnset: () => void): void {
  const parsed = parsePositiveNumber(value);

  if (parsed != null) onSet(parsed);
  else onUnset();
}

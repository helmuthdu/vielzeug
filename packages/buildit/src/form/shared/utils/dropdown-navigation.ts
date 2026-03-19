/**
 * Returns the next focusable index after `from`, skipping disabled entries.
 * Returns `from` unchanged if already at the last enabled option.
 */
export function navigateNext<T extends { disabled: boolean }>(opts: T[], from: number): number {
  let next = from + 1;

  while (next < opts.length && opts[next].disabled) next++;

  return next < opts.length ? next : from;
}

/**
 * Returns the previous focusable index before `from`, skipping disabled entries.
 * Returns `from` unchanged if already at the first enabled option.
 */
export function navigatePrev<T extends { disabled: boolean }>(opts: T[], from: number): number {
  let prev = from - 1;

  while (prev >= 0 && opts[prev].disabled) prev--;

  return prev >= 0 ? prev : from;
}

/**
 * Returns the index of the first non-disabled option, or -1 if none exist.
 */
export function navigateFirst<T extends { disabled: boolean }>(opts: T[]): number {
  const idx = opts.findIndex((o) => !o.disabled);

  return idx;
}

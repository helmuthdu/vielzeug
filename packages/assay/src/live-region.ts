import { AssayQueryError } from './errors';
import { retry, type WaitOptions } from './wait';

/** Politeness levels for ARIA live regions. */
export type LiveRegionPoliteness = 'assertive' | 'off' | 'polite';

/**
 * ARIA roles that carry an implicit `aria-live` value per the WAI-ARIA spec.
 * `role="status"` → `polite`, `role="alert"` → `assertive`. Elements with these
 * roles are live regions even without an explicit `aria-live` attribute.
 */
const IMPLICIT_ROLE_POLITENESS: Record<string, LiveRegionPoliteness> = {
  alert: 'assertive',
  status: 'polite',
};

export interface LiveRegionQueryOptions {
  /** The document to search. Defaults to the global `document`. */
  document?: Document;
  /** Politeness to match via `aria-live` (or implicit role). Defaults to `'polite'`. */
  politeness?: LiveRegionPoliteness;
  /** ARIA role to match (e.g. `'status'`, `'alert'`). Omit to match any role. */
  role?: string;
  /** Root to scope the query. Defaults to `document.body`. */
  root?: ParentNode;
}

/**
 * Resolves the effective politeness of an element: explicit `aria-live` wins,
 * otherwise falls back to the implicit value from `role="status"`/`role="alert"`.
 * Returns `null` when the element is not a live region.
 */
function resolvePoliteness(el: HTMLElement): LiveRegionPoliteness | null {
  const explicit = el.getAttribute('aria-live');

  if (explicit) return explicit as LiveRegionPoliteness;

  const role = el.getAttribute('role');

  if (role && role in IMPLICIT_ROLE_POLITENESS) return IMPLICIT_ROLE_POLITENESS[role];

  return null;
}

/**
 * Queries the first live region matching the given politeness (and optional role)
 * within `root`. Returns `null` when none exists — safe to call before the region
 * has been lazily created.
 *
 * Matches both explicit `aria-live` attributes and implicit roles (`status` →
 * polite, `alert` → assertive) per the WAI-ARIA spec.
 *
 * @example
 * const region = queryLiveRegion({ politeness: 'polite' });
 * expect(region).not.toBeNull();
 */
export function queryLiveRegion(options: LiveRegionQueryOptions = {}): HTMLElement | null {
  const doc = options.document ?? (typeof document !== 'undefined' ? document : null);
  const politeness = options.politeness ?? 'polite';
  const root = options.root ?? doc?.body ?? null;

  if (!root) return null;

  const candidates = Array.from(root.querySelectorAll<HTMLElement>('[aria-live], [role="status"], [role="alert"]'));

  for (const el of candidates) {
    if (resolvePoliteness(el) !== politeness) continue;

    if (options.role !== undefined && el.getAttribute('role') !== options.role) continue;

    return el;
  }

  return null;
}

/**
 * Queries all live regions matching the given politeness (and optional role)
 * within `root`. Useful for asserting no duplicate regions were created.
 *
 * @example
 * expect(queryAllLiveRegions({ politeness: 'polite' })).toHaveLength(1);
 */
export function queryAllLiveRegions(options: LiveRegionQueryOptions = {}): HTMLElement[] {
  const doc = options.document ?? (typeof document !== 'undefined' ? document : null);
  const politeness = options.politeness ?? 'polite';
  const root = options.root ?? doc?.body ?? null;

  if (!root) return [];

  return Array.from(root.querySelectorAll<HTMLElement>('[aria-live], [role="status"], [role="alert"]')).filter((el) => {
    if (resolvePoliteness(el) !== politeness) return false;

    if (options.role !== undefined && el.getAttribute('role') !== options.role) return false;

    return true;
  });
}

export interface WaitForLiveRegionOptions extends WaitOptions {
  /** The document to search. Defaults to the global `document`. */
  document?: Document;
  /** Politeness to match via `aria-live`. Defaults to `'polite'`. */
  politeness?: LiveRegionPoliteness;
  /** ARIA role to match. Omit to match any role. */
  role?: string;
  /** Root to scope the query. Defaults to `document.body`. */
  root?: ParentNode;
}

/**
 * Retries until a live region matching the politeness/role exists and contains
 * `text` (substring match). Throws `AssayTimeoutError` on timeout.
 *
 * Handles the clear-then-set announce pattern: the region may briefly be empty
 * before the message is written, so polling until the text appears is the
 * correct approach rather than a single snapshot assertion.
 *
 * @example
 * await waitForLiveRegion({ text: '3 results found' });
 * await waitForLiveRegion({ politeness: 'assertive', text: 'Session expired' });
 */
export async function waitForLiveRegion(text: string, options: WaitForLiveRegionOptions = {}): Promise<HTMLElement> {
  const politeness = options.politeness ?? 'polite';
  let matched: HTMLElement | null = null;

  await retry(
    () => {
      const region = queryLiveRegion({
        document: options.document,
        politeness,
        role: options.role,
        root: options.root,
      });

      if (!region) throw new AssayQueryError(`No ${politeness} live region found.`);

      if (!region.textContent?.includes(text)) {
        throw new AssayQueryError(`Live region text "${region.textContent}" does not include "${text}".`);
      }

      matched = region;
    },
    {
      interval: options.interval,
      message: `waitForLiveRegion("${text}")`,
      signal: options.signal,
      timeout: options.timeout,
    },
  );

  // `retry` only resolves once the assertion stops throwing, so `matched` is set.
  return matched!;
}

/**
 * Retries until a live region matching the politeness/role exists and is empty
 * (cleared). Throws `AssayTimeoutError` on timeout.
 *
 * @example
 * await waitForLiveRegionCleared();
 */
export async function waitForLiveRegionCleared(options: WaitForLiveRegionOptions = {}): Promise<void> {
  const politeness = options.politeness ?? 'polite';

  await retry(
    () => {
      const region = queryLiveRegion({
        document: options.document,
        politeness,
        role: options.role,
        root: options.root,
      });

      if (!region) throw new AssayQueryError(`No ${politeness} live region found.`);

      if (region.textContent !== '') {
        throw new AssayQueryError(`Live region not cleared: "${region.textContent}".`);
      }
    },
    {
      interval: options.interval,
      message: 'waitForLiveRegionCleared',
      signal: options.signal,
      timeout: options.timeout,
    },
  );
}

import { AssayQueryError } from './errors';
import { eventually, type WaitOptions } from './wait';

/** Politeness levels for ARIA live regions. */
export type LiveRegionPoliteness = 'assertive' | 'off' | 'polite';

/**
 * ARIA roles that carry an implicit `aria-live` value per the WAI-ARIA spec.
 * `alert` is assertive; `log` and `status` are polite; `marquee` and `timer` are
 * off. Elements with these roles are live regions without explicit `aria-live`.
 */
const IMPLICIT_ROLE_POLITENESS: Record<string, LiveRegionPoliteness> = {
  alert: 'assertive',
  log: 'polite',
  marquee: 'off',
  status: 'polite',
  timer: 'off',
};
const LIVE_REGION_SELECTOR =
  '[aria-live], [role="alert"], [role="log"], [role="marquee"], [role="status"], [role="timer"]';

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

function candidates(root: ParentNode): HTMLElement[] {
  const descendants = Array.from(root.querySelectorAll<HTMLElement>(LIVE_REGION_SELECTOR));
  const rootElement = root as ParentNode & { matches?: (selector: string) => boolean };

  return rootElement.matches?.(LIVE_REGION_SELECTOR) ? [root as HTMLElement, ...descendants] : descendants;
}

function matchesOptions(element: HTMLElement, politeness: LiveRegionPoliteness, role?: string): boolean {
  return resolvePoliteness(element) === politeness && (role === undefined || element.getAttribute('role') === role);
}

/**
 * Queries the first live region matching the given politeness (and optional role)
 * within `root`. Returns `null` when none exists — safe to call before the region
 * has been lazily created.
 *
 * Matches explicit `aria-live` attributes and implicit live-region roles.
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

  return candidates(root).find((element) => matchesOptions(element, politeness, options.role)) ?? null;
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

  return candidates(root).filter((element) => matchesOptions(element, politeness, options.role));
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
 * await waitForLiveRegion('3 results found');
 * await waitForLiveRegion('Session expired', { politeness: 'assertive' });
 */
export async function waitForLiveRegion(text: string, options: WaitForLiveRegionOptions = {}): Promise<HTMLElement> {
  const politeness = options.politeness ?? 'polite';
  let matched: HTMLElement | null = null;

  await eventually(
    () => {
      const regions = queryAllLiveRegions({
        document: options.document,
        politeness,
        role: options.role,
        root: options.root,
      });
      const region = regions.find((candidate) => candidate.textContent?.includes(text));

      if (region) {
        matched = region;
        return;
      }

      if (regions.length === 0) throw new AssayQueryError(`No ${politeness} live region found.`);
      throw new AssayQueryError(`No ${politeness} live region includes "${text}".`);
    },
    {
      interval: options.interval,
      message: `waitForLiveRegion("${text}")`,
      signal: options.signal,
      timeout: options.timeout,
    },
  );

  // `eventually` only resolves once the assertion stops throwing, so `matched` is set.
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

  await eventually(
    () => {
      const regions = queryAllLiveRegions({
        document: options.document,
        politeness,
        role: options.role,
        root: options.root,
      });

      if (regions.some((region) => region.textContent === '')) return;
      if (regions.length === 0) throw new AssayQueryError(`No ${politeness} live region found.`);
      throw new AssayQueryError(`No ${politeness} live region is cleared.`);
    },
    {
      interval: options.interval,
      message: 'waitForLiveRegionCleared',
      signal: options.signal,
      timeout: options.timeout,
    },
  );
}

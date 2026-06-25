// ── Live-Region Announcer ─────────────────────────────────────────────────────
// Programmatic announcements to screen readers without requiring a visible
// DOM element. Used for status messages, selection feedback, and count updates
// that live in components where the visible element is hidden or absent.
//
// Two visually-hidden live regions are lazily created in `<body>` — one polite,
// one assertive. The clear-then-set pattern forces AT to re-read even identical
// consecutive messages.
//
// Usage:
// ```ts
// import { announce } from './announcer';
// announce(`${selectedCount} items selected`);
// announce('Error: field is required', { politeness: 'assertive' });
// ```

// ── Visually-hidden style ─────────────────────────────────────────────────────

const HIDDEN_STYLES =
  'position:absolute;width:1px;height:1px;padding:0;overflow:hidden;clip:rect(0,0,0,0);' +
  'white-space:nowrap;border:0;margin:-1px;';

// ── Per-document live regions (WeakMap for automatic GC + test isolation) ────

type DocumentRegions = { assertive?: HTMLElement; polite?: HTMLElement };

const _regions = new WeakMap<Document, DocumentRegions>();
const _timers = new WeakMap<HTMLElement, ReturnType<typeof setTimeout>>();

/** Creates and mounts a visually-hidden live region with the given politeness. */
const createRegion = (politeness: 'assertive' | 'polite', doc: Document): HTMLElement => {
  const el = doc.createElement('div');

  el.setAttribute('aria-live', politeness);
  el.setAttribute('aria-atomic', 'true');
  el.setAttribute('data-block-announcer', politeness);
  el.style.cssText = HIDDEN_STYLES;

  doc.body.appendChild(el);

  return el;
};

/**
 * Returns the live region for the requested politeness in the given document,
 * creating it on first access. Returns `null` outside a browser context.
 */
const getRegion = (politeness: 'assertive' | 'polite', doc: Document): HTMLElement | null => {
  let regions = _regions.get(doc);

  // Re-create if this specific region was removed from the DOM (e.g. by test teardown).
  if (regions?.[politeness] && !doc.body.contains(regions[politeness])) {
    regions[politeness] = undefined;
  }

  if (!regions?.[politeness]) {
    if (!regions) {
      regions = {};
      _regions.set(doc, regions);
    }

    regions[politeness] = createRegion(politeness, doc);
  }

  return regions[politeness] ?? null;
};

// ── Public API ────────────────────────────────────────────────────────────────

export type AnnouncePoliteness = 'assertive' | 'polite';

export type AnnounceOptions = {
  /**
   * `'polite'` — queues the announcement; does not interrupt ongoing speech.
   * `'assertive'` — interrupts immediately. Use sparingly; reserve for errors.
   *
   * Default: `'polite'`.
   */
  politeness?: AnnouncePoliteness;
};

/**
 * Announces a message to screen readers via a singleton visually-hidden
 * live region. Safe to call outside a component lifecycle (no cleanup needed).
 *
 * The clear-then-set pattern (50 ms delay) forces AT to re-read even when the
 * message text hasn't changed.
 *
 * @example
 * ```ts
 * announce('3 results found');
 * announce('Session expired', { politeness: 'assertive' });
 * ```
 */
export const announce = (message: string, options: AnnounceOptions = {}): void => {
  if (typeof document === 'undefined') return;

  const politeness = options.politeness ?? 'polite';
  const region = getRegion(politeness, document);

  if (!region) return;

  // Clear immediately so AT registers a content change, then set after a short
  // delay. The 50 ms window is the established minimum for most AT/browser combos.
  region.textContent = '';

  // Use a per-element timer so concurrent polite + assertive announcements don't
  // clobber each other's pending writes.
  const existing = _timers.get(region);

  if (existing !== undefined) clearTimeout(existing);

  const timer = setTimeout(() => {
    region.textContent = message;
    _timers.delete(region);
  }, 50);

  _timers.set(region, timer);
};

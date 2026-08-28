// ── Live-Region Announcer ─────────────────────────────────────────────────────
// Programmatic announcements to screen readers without requiring a visible
// DOM element. Used for status messages, selection feedback, and count updates
// that live in components where the visible element is hidden or absent.
//
// Two visually-hidden live regions are lazily created in the target document's
// `<body>` — one polite, one assertive. The clear-then-set pattern forces AT to
// re-read even identical consecutive messages.
//
// Behavior is latest-value replacement (debounce), not queueing: rapid
// consecutive calls to the same politeness cancel pending writes so only the
// last message survives. JavaScript cannot know when assistive technology
// finishes speaking, so a queue would be dishonest.
//
// Usage:
// ```ts
// import { announce } from './announcer';
// announce(`${selectedCount} items selected`);
// announce('Error: field is required', { politeness: 'assertive' });
// announce('Saved', { document: getHost().ownerDocument });
// ```

import { SR_ONLY_INLINE_STYLE } from '../styles';

// ── Per-document live regions (WeakMap for automatic GC + test isolation) ────

type DocumentRegions = { assertive?: HTMLElement; polite?: HTMLElement };

const _regions = new WeakMap<Document, DocumentRegions>();
const _timers = new WeakMap<HTMLElement, ReturnType<typeof setTimeout>>();

/** Creates and mounts a visually-hidden live region with the given politeness. */
const createRegion = (politeness: 'assertive' | 'polite', doc: Document): HTMLElement | null => {
  if (!doc.body) return null;

  const el = doc.createElement('div');

  el.setAttribute('aria-live', politeness);
  el.setAttribute('aria-atomic', 'true');
  el.setAttribute('data-block-announcer', politeness);
  el.style.cssText = SR_ONLY_INLINE_STYLE;

  doc.body.appendChild(el);

  return el;
};

/**
 * Returns the live region for the requested politeness in the given document,
 * creating it on first access. Returns `null` outside a browser context or
 * when the document has no `<body>`.
 */
const getRegion = (politeness: 'assertive' | 'polite', doc: Document): HTMLElement | null => {
  let regions = _regions.get(doc);

  // Re-create if this specific region was removed from the DOM (e.g. by test teardown).
  if (regions?.[politeness] && !doc.body?.contains(regions[politeness])) {
    regions[politeness] = undefined;
  }

  if (!regions?.[politeness]) {
    const el = createRegion(politeness, doc);

    if (!el) return null;

    if (!regions) {
      regions = {};
      _regions.set(doc, regions);
    }

    regions[politeness] = el;
  }

  return regions[politeness] ?? null;
};

// ── Public API ────────────────────────────────────────────────────────────────

export type AnnouncePoliteness = 'assertive' | 'polite';

export type AnnounceOptions = {
  /**
   * The document whose `<body>` will host the visually-hidden live region.
   * Defaults to the global `document`. Pass `getHost().ownerDocument` from
   * inside a component that may live in an iframe to announce through the
   * correct accessibility tree.
   */
  document?: Document;
  /**
   * `'polite'` — latest-value replacement; does not interrupt ongoing speech.
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
 * Uses latest-value replacement: rapid consecutive calls to the same politeness
 * cancel pending writes so only the last message is spoken. The clear-then-set
 * pattern (short delay) forces AT to re-read even when the message text hasn't
 * changed.
 *
 * @example
 * ```ts
 * announce('3 results found');
 * announce('Session expired', { politeness: 'assertive' });
 * announce('Saved', { document: getHost().ownerDocument });
 * ```
 */
export const announce = (message: string, options: AnnounceOptions = {}): void => {
  const doc = options.document ?? (typeof document !== 'undefined' ? document : null);

  if (!doc) return;

  const politeness = options.politeness ?? 'polite';
  const region = getRegion(politeness, doc);

  if (!region) return;

  // Clear immediately so AT registers a content change, then set after a short
  // delay. This is a debounce window, not a guaranteed speech timing — AT speech
  // timing varies across browsers and screen readers.
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

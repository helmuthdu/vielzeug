// ── Focus Trap ────────────────────────────────────────────────────────────────
// Implements the WAI-ARIA modal dialog focus-containment pattern.
//
// When active, Tab/Shift-Tab wrap within the container's focusable descendants
// instead of leaving it. The focusable list is re-queried on every Tab keydown
// so DOM changes (e.g. lazy-rendered content) are always reflected without a
// MutationObserver.
//
// Usage (inside a ore component):
// ```ts
// const trap = createFocusTrap(() => dialogEl);
// onOpen: () => trap.activate(),
// onClose: () => trap.deactivate(),
// ```

// ── Constants ─────────────────────────────────────────────────────────────────

/**
 * CSS selector matching all focusable elements, including:
 * - Native HTML interactive elements
 * - Elements with explicit `tabindex` (covers custom elements that correctly manage focus)
 * - Custom elements using ARIA interactive roles that are inherently focusable
 *   but may not carry a native `tabindex` attribute
 *
 * Note: `[tabindex]:not([tabindex="-1"])` already covers any element that
 * explicitly opts into the tab order. The ARIA role selectors below additionally
 * capture elements that rely on the implicit focusability of their role
 * without a redundant `tabindex="0"` attribute.
 */
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'details > summary:not([disabled])',
  'iframe',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[contenteditable]:not([contenteditable="false"])',
  '[tabindex]:not([tabindex="-1"])',
  // ARIA interactive roles that should participate in focus order.
  // These cover custom components that set role but not explicit tabindex.
  '[role="button"]:not([disabled]):not([aria-disabled="true"])',
  '[role="link"]:not([aria-disabled="true"])',
  '[role="menuitem"]:not([aria-disabled="true"])',
  '[role="menuitemcheckbox"]:not([aria-disabled="true"])',
  '[role="menuitemradio"]:not([aria-disabled="true"])',
  '[role="option"]:not([aria-disabled="true"])',
  '[role="tab"]:not([aria-disabled="true"])',
  // Note: [role="gridcell"] and [role="row"] are intentionally omitted — they
  // participate in focus order only when an explicit tabindex is set, which is
  // already caught by the [tabindex]:not([tabindex="-1"]) selector above.
].join(',');

// ── Types ─────────────────────────────────────────────────────────────────────

export type FocusTrapOptions = {
  /**
   * When provided, the trap only processes events when this returns `true`.
   * Useful to pause trapping while an inner dialog is open.
   */
  enabled?: () => boolean;
  /**
   * Optional `AbortSignal`. When aborted, `deactivate()` is called automatically.
   * Prevents global `keydown` listener leaks if the component is destroyed while
   * the trap is still active.
   */
  signal?: AbortSignal;
};

export type FocusTrap = {
  [Symbol.dispose](): void;
  /** Start trapping Tab/Shift-Tab. Safe to call when already active. */
  activate(): void;
  /** Whether the trap is currently active. */
  readonly active: boolean;
  /** Stop trapping. Safe to call when already inactive. */
  deactivate(): void;
  /** Alias for `deactivate()`. Conforms to the monorepo disposal convention. */
  dispose(): void;
};

// ── Factory ───────────────────────────────────────────────────────────────────

/**
 * Creates a WAI-ARIA modal focus trap for a container element.
 *
 * When active, Tab wraps from the last focusable child to the first, and
 * Shift-Tab wraps in reverse. The focusable list is re-queried live on each
 * Tab keydown — no MutationObserver required.
 *
 * The container itself is queried lazily via `getContainer()` so it may be
 * `null` at construction time (the typical case when the container is inside
 * an initially-hidden overlay).
 *
 * @example
 * ```ts
 * const trap = createFocusTrap(() => dialogEl);
 *
 * onOpen: () => trap.activate(),
 * onClose: () => trap.deactivate(),
 * ```
 */
export const createFocusTrap = (
  getContainer: () => HTMLElement | ShadowRoot | null,
  options: FocusTrapOptions = {},
): FocusTrap => {
  let _active = false;

  const getFocusable = (): HTMLElement[] => {
    const container = getContainer();

    if (!container) return [];

    return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
      // Exclude elements hidden from the accessibility tree or removed from tab order.
      // aria-hidden="true" and [hidden] have long been standard; [inert] is the
      // modern successor that browsers honour natively from 2022+.
      (el) => !el.closest('[aria-hidden="true"]') && !el.closest('[hidden]') && !el.closest('[inert]'),
    );
  };

  const handleKeydown = (event: KeyboardEvent): void => {
    if (!_active) return;

    if (options.enabled?.() === false) return;

    if (event.key !== 'Tab') return;

    const focusable = getFocusable();

    if (focusable.length === 0) {
      // Prevent focus from escaping the empty container.
      event.preventDefault();

      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    // Prefer event.target over document.activeElement: the capture-phase handler
    // fires before focus has moved in some environments (e.g. jsdom).
    const current = (event.target as HTMLElement) ?? document.activeElement;

    if (event.shiftKey) {
      // Shift+Tab from first (or outside) → wrap to last.
      if (current === first || !focusable.includes(current as HTMLElement)) {
        event.preventDefault();
        last.focus();
      }
    } else {
      // Tab from last (or outside) → wrap to first.
      if (current === last || !focusable.includes(current as HTMLElement)) {
        event.preventDefault();
        first.focus();
      }
    }
  };

  const activate = (): void => {
    if (_active) return;

    _active = true;
    document.addEventListener('keydown', handleKeydown, true);
  };

  const deactivate = (): void => {
    if (!_active) return;

    _active = false;
    document.removeEventListener('keydown', handleKeydown, true);
  };

  if (options.signal && !options.signal.aborted) {
    options.signal.addEventListener('abort', deactivate, { once: true });
  }

  return {
    activate,
    get active() {
      return _active;
    },
    deactivate,
    dispose: deactivate,
    [Symbol.dispose]: deactivate,
  };
};

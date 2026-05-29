// ── Types ─────────────────────────────────────────────────────────────────────

export type FocusManagerOptions = {
  /** Returns the CSS selector for the element that should receive focus on open. */
  getInitialFocusSelector: () => string | undefined;
  /**
   * Returns whether focus should be restored to the previously focused element
   * on close. `undefined` or `true` means restore; `false` means skip.
   */
  getReturnFocus: () => boolean | undefined;
  /** Host element used for `querySelector` when resolving the initial focus target. */
  host: HTMLElement;
};

export type FocusManager = {
  /** Move focus to the element matching `getInitialFocusSelector` (deferred one frame). */
  applyInitialFocus: () => void;
  /** Capture the currently focused element so it can be restored later. */
  captureReturnFocus: () => void;
  /** Restore focus to the element captured by `captureReturnFocus`. */
  restoreFocus: () => void;
};

// ── Factory ───────────────────────────────────────────────────────────────────

/**
 * Encapsulates the three-step focus lifecycle used by dialogs and drawers:
 * 1. Capture the element that triggered the open.
 * 2. Move focus inside the overlay (optionally to a specific element).
 * 3. Restore focus when the overlay closes.
 */
export function createFocusManager(options: FocusManagerOptions): FocusManager {
  let returnFocusEl: HTMLElement | null = null;

  return {
    applyInitialFocus() {
      const selector = options.getInitialFocusSelector();

      if (selector) {
        // Query the shadow root first (all block components render into Shadow DOM),
        // falling back to the host's light-DOM tree for non-Shadow contexts.
        const root = options.host.shadowRoot ?? options.host;
        const target = root.querySelector<HTMLElement>(selector);

        if (target) requestAnimationFrame(() => target.focus());
      }
    },

    captureReturnFocus() {
      returnFocusEl = document.activeElement as HTMLElement;
    },

    restoreFocus() {
      if (options.getReturnFocus() !== false && returnFocusEl) {
        returnFocusEl.focus();
        returnFocusEl = null;
      }
    },
  };
}

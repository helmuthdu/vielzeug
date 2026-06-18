// ── Types ─────────────────────────────────────────────────────────────────────

export type FocusManagerOptions = {
  /**
   * Returns the CSS selector for the element that should receive focus on open.
   *
   * **Security note:** this value is passed directly to `querySelector`. It must
   * come from trusted developer-controlled configuration, never from raw user input.
   */
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
  /** Cancel a pending `applyInitialFocus` rAF, if any. */
  cancelInitialFocus: () => void;
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
  let rafHandle: ReturnType<typeof requestAnimationFrame> | null = null;

  return {
    applyInitialFocus() {
      if (rafHandle !== null) {
        cancelAnimationFrame(rafHandle);
        rafHandle = null;
      }

      const selector = options.getInitialFocusSelector();

      if (selector) {
        // Query the shadow root first (all sigil components render into Shadow DOM),
        // falling back to the host's light-DOM tree for non-Shadow contexts.
        const root = options.host.shadowRoot ?? options.host;

        let target: HTMLElement | null = null;

        try {
          target = root.querySelector<HTMLElement>(selector);
        } catch {
          // Malformed selector (SyntaxError) — skip initial focus rather than throw.
          return;
        }

        if (target) {
          rafHandle = requestAnimationFrame(() => {
            rafHandle = null;
            target.focus();
          });
        }
      }
    },

    cancelInitialFocus() {
      if (rafHandle !== null) {
        cancelAnimationFrame(rafHandle);
        rafHandle = null;
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

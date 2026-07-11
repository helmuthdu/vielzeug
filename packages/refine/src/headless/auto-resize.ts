import type { Readable } from '@vielzeug/ripple';

export type AutoResizeOptions = {
  /** Gates growth; omit for an always-on composer field, or pass a signal for a toggleable `auto-resize` attribute. */
  enabled?: Readable<boolean | undefined>;
};

export type AutoResizeControl = {
  /** Recomputes height from the wired element's current content. No-ops when `enabled` is false or nothing is wired. */
  recompute: () => void;
  /** Wire onto the raw `<textarea>` when it mounts. Returns a detach function to call on unmount. */
  wire: (el: HTMLTextAreaElement) => () => void;
};

/**
 * Grows a `<textarea>`'s height to fit its content, shared by every component that offers
 * auto-resize (`ore-textarea`, `ore-message-composer`) instead of each reimplementing it.
 *
 * Owns only height — manual-resize cursor/direction is a per-component styling concern, not
 * shared behavior, so it stays local to whichever component renders a resize handle.
 *
 * @example
 * ```ts
 * const autoResize = createAutoResize({ enabled: props['auto-resize'] });
 *
 * onElement(textareaRef, (el) => autoResize.wire(el));
 * // after a programmatic value change that doesn't fire a native `input` event:
 * autoResize.recompute();
 * ```
 */
export const createAutoResize = (options: AutoResizeOptions = {}): AutoResizeControl => {
  let wiredEl: HTMLTextAreaElement | null = null;

  const recompute = (): void => {
    if (!wiredEl || options.enabled?.value === false) return;

    wiredEl.style.height = 'auto';
    wiredEl.style.height = `${wiredEl.scrollHeight}px`;
  };

  const wire = (el: HTMLTextAreaElement): (() => void) => {
    wiredEl = el;
    el.addEventListener('input', recompute);

    // Deferred a frame: right after mount, the browser hasn't necessarily finished laying out
    // the textarea yet, so a synchronous `scrollHeight` read here can be stale — often reading
    // as 0 and collapsing the field until the next real `input` event happens to correct it.
    // `ore-textarea` has always worked around this locally with its own extra `requestAnimationFrame`
    // call; folding the deferral into `wire()` itself means every consumer gets it for free.
    requestAnimationFrame(recompute);

    return () => {
      el.removeEventListener('input', recompute);

      if (wiredEl === el) wiredEl = null;
    };
  };

  return { recompute, wire };
};

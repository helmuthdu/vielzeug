/**
 * Reveal contract for clipped text.
 *
 * Ellipsis truncation is a visual affordance only: assistive tech reads the full
 * text either way, but a sighted pointer user (and every hover-based tooltip
 * system) has no way back to what the `…` hid. Components that clip a label
 * (`ore-list-item`, `ore-menu-item`, `ore-sidebar-item`, `ore-text`) therefore
 * mirror the full text into `title` *while it is actually clipped*, and drop it
 * again as soon as there is room, so the reveal never shadows a real tooltip.
 *
 * `title` is set from rendered `textContent`, so it stays correct for slotted
 * content, and re-checked on resize, because "is this clipped?" is a layout
 * question that container width, font size, and user zoom all get to change.
 */

const clippedHorizontally = (el: HTMLElement): boolean => el.scrollWidth > el.clientWidth + 1;

const clippedVertically = (el: HTMLElement): boolean => el.scrollHeight > el.clientHeight + 1;

const isClipped = (el: HTMLElement, bothAxes: boolean): boolean =>
  clippedHorizontally(el) || (bothAxes && clippedVertically(el));

const normalize = (raw: string | null | undefined): string => raw?.replace(/\s+/g, ' ').trim() ?? '';

/**
 * The text to reveal. A shadow-DOM label wrapper (`.item-label`, `.title`) has an
 * empty `textContent` of its own: the label is light-DOM nodes assigned to its
 * slot, so read the slot's assigned nodes when one is wired, else the element's
 * own text (the `ore-text` host case, where content is slotted through the host).
 */
const revealText = (el: HTMLElement, slot: HTMLSlotElement | null | undefined): string =>
  slot
    ? normalize(
        slot
          .assignedNodes({ flatten: true })
          .map((node) => node.textContent)
          .join(' '),
      )
    : normalize(el.textContent);

/**
 * Keeps `title` mirrored to `el`'s text while it is clipped. Returns a handle;
 * {@link truncationRevealRef} is the lifecycle-managed form most components want.
 *
 * Both axes are checked when `bothAxes` is set, which is how a multi-line clamp
 * (`-webkit-line-clamp`) reports overflow: width fits, height does not.
 *
 * Pass the `slot` that feeds `el` so a change to the slotted text re-syncs even
 * when the box happens to stay the same size (a live-updating label).
 */
export type TruncationRevealHandle = {
  /** Stops observing and stops updating `title`. */
  detach: () => void;
  /** Re-checks clipping now; call after a layout change the observer cannot see (e.g. an expansion the element itself just made). */
  sync: () => void;
};

export const applyTruncationReveal = (
  el: HTMLElement,
  options: { bothAxes?: boolean; slot?: HTMLSlotElement | null } = {},
): TruncationRevealHandle => {
  const { bothAxes = false, slot } = options;

  // The exact title string this helper last wrote, so detach() can undo it without
  // ever touching a title the consumer set themselves.
  let ownedTitle: string | null = null;

  const sync = (): void => {
    const text = revealText(el, slot);

    if (text && isClipped(el, bothAxes)) {
      if (el.getAttribute('title') !== text) el.setAttribute('title', text);

      ownedTitle = text;
    } else {
      if (ownedTitle !== null && el.getAttribute('title') === ownedTitle) el.removeAttribute('title');

      ownedTitle = null;
    }
  };

  slot?.addEventListener('slotchange', sync);

  // Initial check at wire time: layout may not be final yet (the observer and the
  // next-frame re-check below correct it), but a label that is already clipped
  // gets its reveal immediately rather than a frame later.
  sync();

  // No ResizeObserver (older engines, jsdom): the initial sync plus slotchange
  // still cover the common cases, and nothing can go stale in a layout that never changes.
  if (typeof ResizeObserver !== 'function') {
    return {
      detach: () => {
        slot?.removeEventListener('slotchange', sync);

        if (ownedTitle !== null && el.getAttribute('title') === ownedTitle) el.removeAttribute('title');

        ownedTitle = null;
      },
      sync,
    };
  }

  const observer = new ResizeObserver(sync);

  observer.observe(el);
  // First layout pass may not have happened yet at wire time; re-check on the
  // next frame so a label that mounts already-clipped gets its reveal.
  const frame = requestAnimationFrame(sync);

  return {
    detach: () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      slot?.removeEventListener('slotchange', sync);

      if (ownedTitle !== null && el.getAttribute('title') === ownedTitle) el.removeAttribute('title');

      ownedTitle = null;
    },
    sync,
  };
};

/**
 * An ore `ref` callback that applies {@link applyTruncationReveal} when the label
 * mounts and detaches it when the label unmounts. Prefer this for a label inside
 * a conditionally rendered template: ore re-invokes the callback with the new
 * element (and `null` for the old one) whenever that branch re-renders, so the
 * reveal can never be left pointing at a detached node. The handle is tracked
 * locally rather than via `onCleanup`, because a re-render can fire the callback
 * outside the setup context where `onCleanup` is unavailable.
 *
 * The label's own `<slot>` child is used automatically.
 *
 * @example
 * ```ts
 * <span class="item-label" part="item-label" ref=${truncationRevealRef()}>
 *   <slot></slot>
 * </span>
 * ```
 */
export const truncationRevealRef = (options: { bothAxes?: boolean } = {}): ((el: HTMLElement | null) => void) => {
  let detach: (() => void) | null = null;

  return (el: HTMLElement | null): void => {
    detach?.();
    detach = null;

    if (!el) return;

    detach = applyTruncationReveal(el, { ...options, slot: el.querySelector('slot') }).detach;
  };
};

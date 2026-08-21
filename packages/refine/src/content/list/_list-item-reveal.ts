import { createSwipeGesture, type SwipeGesture, type SwipeGestureDetail } from '@vielzeug/gesture';
import type { Readable } from '@vielzeug/ripple';
import type { ListItemRevealSide } from './list-item';

/** Drag distance (px) past which the action panel snaps fully open on release. */
const REVEAL_THRESHOLD = 64;
/** Drag distance (px) past which the swipe auto-confirms the action — "swiped all the way". */
const CONFIRM_THRESHOLD = REVEAL_THRESHOLD * 3;
/** Fraction of CONFIRM_THRESHOLD past which `data-confirming` warns the drag is about to fire. */
const CONFIRM_WARNING_RATIO = 0.85;

export type RevealStateOptions = {
  disabled: Readable<boolean>;
  hasActions: (side: ListItemRevealSide) => boolean;
  /** The full-swipe-through gesture fired — emit `confirm` and click the slot's own action. */
  onConfirm: (side: ListItemRevealSide) => void;
};

/**
 * The swipe-reveal-confirm gesture behind `ore-list-item`'s `actions-left`/`actions-right` slots
 * — isolated here since it's the one genuinely tricky part of the component (three distance
 * thresholds, inline style/attribute choreography during an active drag). Deliberately *not* a
 * shared primitive: `createSwipeGesture` itself already is one (shared with `ore-toast`),
 * but this two-stage reveal/confirm layer on top of it has exactly one consumer today —
 * generalizing it further would be speculative, not reusable.
 *
 * Only sets/clears the `revealed`/`data-dragging`/`data-confirming` attributes and `--_swipe-x`
 * style — it does not itself emit `reveal`/`conceal`. `ore-list-item` already watches `revealed`
 * for transitions (to cover *both* this gesture and a directly-set attribute uniformly), so this
 * module setting the attribute is enough to drive both that watcher and `list.css`'s
 * `[revealed]` styling.
 */
export function createRevealState(el: HTMLElement, options: RevealStateOptions): SwipeGesture {
  const resolveSide = (detail: SwipeGestureDetail): ListItemRevealSide => (detail.distance < 0 ? 'right' : 'left');

  // Inline `--_swipe-x` override during an active drag lets the row (and both action panels,
  // which read the same variable) follow the pointer 1:1 with no transition lag. Clearing it
  // hands control back to the `[revealed]`/`:focus-within` CSS rules in list-item.css, which
  // then animate normally via the CSS `transition`.
  const resetInline = (): void => {
    el.removeAttribute('data-dragging');
    el.removeAttribute('data-confirming');
    el.style.removeProperty('--_swipe-x');
  };

  return createSwipeGesture({
    axis: () => 'x',
    // Do not capture the pointer — capture would steal clicks from action buttons revealed
    // mid-gesture (same reasoning as ore-toast's swipe-to-dismiss).
    captureTarget: () => null,
    disabled: () => options.disabled.value,
    disabledBehavior: () => 'cancel-active',
    onCancel: resetInline,
    // `threshold`/`distance`/`progress` are all wired to CONFIRM_THRESHOLD (the outer, rarer
    // gesture) — onCommit only fires once the swipe has gone all the way through.
    onCommit: (detail) => {
      const side = resolveSide(detail);

      resetInline();

      if (!options.hasActions(side)) return;

      el.removeAttribute('revealed');
      options.onConfirm(side);
    },
    onMove: (detail) => {
      const side = resolveSide(detail);

      if (!options.hasActions(side)) return;

      // Reveal follows the pointer up to REVEAL_THRESHOLD, then holds fully open while the
      // drag continues on toward CONFIRM_THRESHOLD (still tracked by `detail`/onCommit above).
      const revealProgress = Math.min(Math.abs(detail.distance) / REVEAL_THRESHOLD, 1);

      el.setAttribute('data-dragging', '');
      el.toggleAttribute('data-confirming', detail.progress >= CONFIRM_WARNING_RATIO);
      el.style.setProperty('--_swipe-x', String((side === 'left' ? 1 : -1) * revealProgress));
    },
    onRelease: (detail) => {
      const side = resolveSide(detail);

      resetInline();

      if (options.hasActions(side) && Math.abs(detail.distance) >= REVEAL_THRESHOLD) el.setAttribute('revealed', side);
    },
    threshold: () => CONFIRM_THRESHOLD,
  });
}

import { createPanGesture, type PanGesture, type PanGestureDetail } from '@vielzeug/gesture';
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
 * shared primitive: `createPanGesture` itself already is one (shared with `ore-toast`),
 * but this two-stage reveal/confirm layer on top of it has exactly one consumer today —
 * generalizing it further would be speculative, not reusable.
 *
 * Only sets/clears the `revealed`/`data-dragging`/`data-confirming` attributes and `--_swipe-x`
 * style — it does not itself emit `reveal`/`conceal`. `ore-list-item` already watches `revealed`
 * for transitions (to cover *both* this gesture and a directly-set attribute uniformly), so this
 * module setting the attribute is enough to drive both that watcher and `list.css`'s
 * `[revealed]` styling.
 */
export function createRevealState(el: HTMLElement, target: Element, options: RevealStateOptions): PanGesture {
  const resolveSide = (detail: PanGestureDetail): ListItemRevealSide => (detail.distance < 0 ? 'right' : 'left');

  // Inline `--_swipe-x` override during an active drag lets the row (and both action panels,
  // which read the same variable) follow the pointer 1:1 with no transition lag. Clearing it
  // hands control back to the `[revealed]`/`:focus-within` CSS rules in list-item.css, which
  // then animate normally via the CSS `transition`.
  const resetInline = (): void => {
    el.removeAttribute('data-dragging');
    el.removeAttribute('data-confirming');
    el.style.removeProperty('--_swipe-x');
  };

  let pan: PanGesture;

  pan = createPanGesture(target, {
    axis: 'x',
    disabled: () => options.disabled.value,
    onEnd: (detail) => {
      resetInline();

      if (detail.reason !== 'release') return;

      const side = resolveSide(detail);

      if (options.hasActions(side) && Math.abs(detail.distance) >= REVEAL_THRESHOLD) el.setAttribute('revealed', side);
    },
    onMove: (detail) => {
      const side = resolveSide(detail);

      if (!options.hasActions(side)) return;

      const distance = Math.abs(detail.distance);

      if (distance >= CONFIRM_THRESHOLD) {
        pan.cancel();
        el.removeAttribute('revealed');
        options.onConfirm(side);

        return;
      }

      const revealProgress = Math.min(distance / REVEAL_THRESHOLD, 1);

      el.setAttribute('data-dragging', '');
      el.toggleAttribute('data-confirming', distance / CONFIRM_THRESHOLD >= CONFIRM_WARNING_RATIO);
      el.style.setProperty('--_swipe-x', String((side === 'left' ? 1 : -1) * revealProgress));
    },
    pointerCapture: false,
  });

  return pan;
}

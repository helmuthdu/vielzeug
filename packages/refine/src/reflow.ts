import type { AnimationGroup } from '@vielzeug/necromancer';
import { captureLayout, type LayoutTransition } from '@vielzeug/necromancer';

/**
 * FLIP reflow motion shared by the components whose lists move: the datagrid's
 * sorted rows, the command palette's filtered results, the toast stack. It is
 * also the public entry for an app's own keyed lists.
 *
 * The FLIP recipe (capture, mutate, animate the delta) is necromancer's
 * `captureLayout`; this module owns only the house rules around it:
 *
 * - Timing comes from the design tokens, read through getComputedStyle: the
 *   Web Animations API takes resolved values only, so a `var(--duration-200)`
 *   passed as options would be ignored. Reading the computed value is also
 *   what makes motion mode work for free — the Reduced Motion block in
 *   theme.css zeroes `--duration-*` under either the OS preference or
 *   `data-motion='reduced'`, and a zero duration means "skip".
 * - Motion is an enhancement: every path that cannot animate (no elements, no
 *   stable keys, zeroed tokens, a disposed lifecycle, a browser without the
 *   Web Animations API) still runs the mutation exactly once and never throws.
 *
 * @example
 * ```ts
 * import { animateReflow } from '@vielzeug/refine';
 *
 * const reflow = animateReflow(list, signal, {
 *   elements: () => [...list.querySelectorAll('li')],
 *   getKey: (item) => item.dataset.id,
 * });
 *
 * // Capture, mutate, animate the delta in one call.
 * reflow.run(() => renderItems(nextItems));
 * ```
 */

/** Elements move, they do not scale: a subtle overshoot reads as a slip. */
const DEFAULT_MOVE_EASING = 'cubic-bezier(0.25, 1, 0.5, 1)';

export interface ReflowOptions {
  /** Duration token to honor; defaults to `--duration-200`. */
  durationToken?: string;
  /** Easing token to honor; defaults to `--ease-move`. */
  easingToken?: string;
  /**
   * Returns the elements to track, read live from the DOM on both sides of the
   * mutation. Elements must carry a stable identity through `getKey`.
   */
  elements: () => HTMLElement[];
  /** Reads a stable key from an element; every element must return one. */
  getKey: (element: HTMLElement) => string | undefined;
  /** Per-element delay in ms, so a reflow reads as a cascade, not a jump. */
  stagger?: number;
}

export interface Reflow {
  /**
   * Captures the current layout, runs `mutate`, then animates the tracked
   * elements into their new positions. Returns nothing: the animation is
   * fire-and-forget and disposed with the lifecycle signal.
   *
   * Call this only where `mutate` triggers a synchronous or microtask-scheduled
   * re-render; the committed layout is measured on the next frame.
   */
  run(mutate: () => void): void;
}

/** Reads a duration token as milliseconds; `NaN` when absent or unparseable. */
function readDuration(host: Element, token: string): number {
  const raw = getComputedStyle(host).getPropertyValue(token).trim();

  if (raw === '' || raw === 'none') return Number.NaN;

  return Number.parseFloat(raw);
}

/** Reads an easing token, falling back to the house move curve. */
function readEasing(host: Element, token: string): string {
  const raw = getComputedStyle(host).getPropertyValue(token).trim();

  // 'none' is a valid CSS easing keyword but a useless FLIP curve; treat it as
  // unset so a reduced-motion reset of the token cannot flatten the move.
  return raw === '' || raw === 'none' ? DEFAULT_MOVE_EASING : raw;
}

/**
 * Builds a reflow-motion helper for one host element.
 *
 * @param host - The element whose computed style carries the timing tokens
 *   (usually the component host; its shadow root holds the tracked elements).
 * @param signal - Lifecycle signal: disposing it cancels in-flight animations.
 */
export function animateReflow(host: HTMLElement, signal: AbortSignal, options: ReflowOptions): Reflow {
  const { elements, getKey, durationToken = '--duration-200', easingToken = '--ease-move', stagger = 0 } = options;

  // The in-flight reflow, if any. Rapid mutations (typing into a filter, a
  // burst of toasts) must not stack additive FLIP offsets: the previous group
  // is disposed at the moment the new animation takes over, inside the same
  // frame, so the element never paints a snapped intermediate.
  let inFlight: AnimationGroup | undefined;

  return {
    run(mutate: () => void): void {
      const before = elements();
      // Without stable keys, a re-render replaces or reuses nodes and identity
      // matching finds nothing; a keyed capture is what makes the swap animatable.
      const keys = before.map(getKey);
      const keyable = before.length > 0 && keys.every((key) => key !== undefined);
      if (!keyable) {
        mutate();

        return;
      }

      const duration = readDuration(host, durationToken);
      if (!Number.isFinite(duration) || duration <= 0) {
        mutate();

        return;
      }

      let transition: LayoutTransition;

      try {
        transition = captureLayout(before, { getKey: (element) => getKey(element) as string });
      } catch {
        // Duplicate or empty keys are a data problem, not a motion problem.
        mutate();

        return;
      }

      mutate();

      // One frame: ore's render is a microtask, but layout is only committed
      // after the browser has had a chance to recalculate styles. The capture
      // above measured getBoundingClientRect(), which includes any in-flight
      // FLIP offset, so the new delta starts from what the user actually sees.
      requestAnimationFrame(() => {
        if (signal.aborted || !host.isConnected) return;

        try {
          inFlight?.dispose();
          inFlight = transition.animate({
            duration,
            easing: readEasing(host, easingToken),
            elements: elements(),
            signal,
            stagger,
          });
        } catch {
          // A consumed or unsupported transition must never break the component.
        }
      });
    },
  };
}

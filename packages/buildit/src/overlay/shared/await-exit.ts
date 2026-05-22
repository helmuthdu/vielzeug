/**
 * Waits for a CSS exit animation or transition to finish, then calls `onDone`.
 *
 * Uses the Web Animations API (`element.getAnimations()`) when available for
 * precise, synchronous detection. Falls back to a single microtask + immediate
 * call when no relevant animations are running (e.g. `prefers-reduced-motion`
 * or overridden styles).
 *
 * @param el   - The element whose animations/transitions to observe.
 * @param onDone - Callback invoked exactly once when all animations end.
 * @param type - `'animation'` (default) or `'transition'`.
 */
export function awaitExit(el: Element, onDone: () => void, type: 'animation' | 'transition' = 'animation'): void {
  queueMicrotask(() => {
    const getAnimations = typeof el.getAnimations === 'function' ? () => el.getAnimations() : () => [];
    const relevant = getAnimations().filter((a) => {
      if (type === 'animation') return a instanceof CSSAnimation;

      if (type === 'transition') return a instanceof CSSTransition;

      return false;
    });

    if (relevant.length === 0) {
      onDone();

      return;
    }

    let done = false;
    const finish = () => {
      if (done) return;

      done = true;
      onDone();
    };

    // Resolve when ALL relevant animations are finished or cancelled.
    Promise.allSettled(relevant.map((a) => a.finished)).then(finish);
  });
}

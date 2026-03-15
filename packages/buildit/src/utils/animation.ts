/**
 * Waits for a CSS exit animation or transition to finish, then calls `onDone`.
 *
 * When the element has no animation/transition running (e.g. reduced-motion or
 * overridden styles), `onDone` is called synchronously on the next microtask so
 * callers can safely set exit state before this call.
 *
 * @param el      - The element whose animation/transition to observe.
 * @param onDone  - Callback invoked exactly once when the animation ends.
 * @param type    - `'animation'` (default) or `'transition'`.
 */
/** Safety buffer added to the computed CSS duration before the fallback timer fires. */
const ANIMATION_FALLBACK_BUFFER_MS = 50;

export function awaitExit(el: Element, onDone: () => void, type: 'animation' | 'transition' = 'animation'): void {
  let finished = false;
  let fallbackTimer: ReturnType<typeof setTimeout> | null = null;

  const finish = () => {
    if (finished) return;

    finished = true;

    if (fallbackTimer !== null) {
      clearTimeout(fallbackTimer);
      fallbackTimer = null;
    }

    onDone();
  };

  queueMicrotask(() => {
    const styles = getComputedStyle(el);

    if (type === 'animation') {
      const names = styles.animationName.split(',').map((v) => v.trim());
      const durations = styles.animationDuration.split(',').map((v) => {
        if (v.endsWith('ms')) return Number.parseFloat(v);

        if (v.endsWith('s')) return Number.parseFloat(v) * 1000;

        return 0;
      });

      const hasAnimation = names.some((n) => n && n !== 'none');
      const maxDuration = Math.max(0, ...durations);

      if (!hasAnimation || maxDuration <= 0) {
        finish();

        return;
      }

      el.addEventListener('animationend', finish, { once: true });
      fallbackTimer = setTimeout(finish, maxDuration + ANIMATION_FALLBACK_BUFFER_MS);
    } else {
      const duration = Number.parseFloat(styles.transitionDuration);

      if (!duration || duration <= 0) {
        finish();

        return;
      }

      el.addEventListener('transitionend', finish, { once: true });
      fallbackTimer = setTimeout(finish, duration * 1000 + ANIMATION_FALLBACK_BUFFER_MS);
    }
  });
}

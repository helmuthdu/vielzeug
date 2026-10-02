import { createFullscreen, createWakeLock } from '@vielzeug/sentinel';
import { onScopeDispose, type Ref, ref, watch } from 'vue';

/**
 * Keeps the fight board visible: a screen wake lock prevents the device from sleeping
 * during a hunt, and a fullscreen sentinel tracks the immersion toggle. Both are
 * best-effort: browsers may refuse and both silently degrade.
 *
 * The wake lock is requested automatically on board routes and auto-releases when the
 * tab is hidden; the sentinel re-acquires it on `visibilitychange`. Leaving a board
 * route exits fullscreen and releases the lock. Both are released when the calling
 * scope is disposed.
 */
export function useBoardFocus(active: Ref<boolean>): { fullscreen: Ref<boolean>; toggleFullscreen: () => void } {
  const wakeLock = createWakeLock();
  const fullscreenSentinel = createFullscreen();
  const fullscreen = ref(fullscreenSentinel.getSnapshot().active);

  const unsubscribe = fullscreenSentinel.subscribe(() => {
    fullscreen.value = fullscreenSentinel.getSnapshot().active;
  });

  /** Immerses the board: the sentinel degrades silently where activation is required. */
  function toggleFullscreen(): void {
    fullscreenSentinel.toggle();
  }

  watch(
    active,
    (isBoard) => {
      if (isBoard) {
        wakeLock.request();
      } else {
        fullscreenSentinel.exit();
        wakeLock.release();
      }
    },
    { immediate: true },
  );

  onScopeDispose(() => {
    unsubscribe();
    fullscreenSentinel.dispose();
    wakeLock.release();
    wakeLock.dispose();
  });

  return { fullscreen, toggleFullscreen };
}

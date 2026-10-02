import { createLongPress, type LongPress, type LongPressDetail } from '@vielzeug/gesture';
import { onScopeDispose, type Ref, watch } from 'vue';

/**
 * Long-press as the touch Quick Look: hold ~500ms and the detail opens. The gesture package's
 * recognizer owns the pointer tracking: a move beyond a small slop (scrolling) cancels back to
 * a normal press, the release's click is swallowed so the hold never commits, and the page
 * hiding or the window blurring cancels the hold.
 *
 * Point `target` at a stable ancestor of the pressed elements (capture phase, so the swallow
 * precedes any press handler below); the recognizer follows the ref, so swapping or unmounting
 * the element rebinds or releases it. `shouldStart` gates which pointers may open a hold :
 * touch/pen only, scoped to the pressed control.
 */
export function useLongPress(
  target: Ref<HTMLElement | null>,
  onLongPress: (detail: LongPressDetail) => void,
  shouldStart?: (event: PointerEvent) => boolean,
): void {
  let recognizer: LongPress | null = null;

  watch(
    target,
    (element) => {
      recognizer?.dispose();
      recognizer = null;
      if (element) recognizer = createLongPress(element, { onLongPress, shouldStart });
    },
    { immediate: true },
  );

  onScopeDispose(() => recognizer?.dispose());
}

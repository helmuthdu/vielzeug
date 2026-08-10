import type { AnimationHandle } from './types';

// Scoped to one DOM element by design: `interrupt: 'cancel'` answers "replace whatever
// Necromancer is doing to *this* element", not "coordinate across element categories".
// A caller that needs to cancel an animation on a different element (or coordinate several
// elements as one unit) already has that element's own handle, or should use `animateEach()`
// and a shared `signal` instead. Keeping the WeakMap element-scoped means it only ever needs
// to answer one question and never grows into a general-purpose animation registry.
const handlesByElement = new WeakMap<Element, Set<AnimationHandle>>();

/** Cancels active Necromancer-owned animations without touching native animations owned by callers. */
export function interruptAnimations(element: Element): void {
  for (const handle of handlesByElement.get(element) ?? []) handle.dispose();
}

/** Tracks a handle until its terminal result releases the element association. */
export function trackAnimation(element: Element, handle: AnimationHandle): void {
  let handles = handlesByElement.get(element);

  if (!handles) {
    handles = new Set();
    handlesByElement.set(element, handles);
  }

  handles.add(handle);

  void handle.result.then(() => {
    handles?.delete(handle);

    if (handles?.size === 0) handlesByElement.delete(element);
  });
}

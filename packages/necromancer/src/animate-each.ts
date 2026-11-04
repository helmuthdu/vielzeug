import { uniqueElements } from './_elements';
import { createAnimationGroup } from './_handle';
import { withStaggeredDelay } from './_options';
import { animate } from './animate';
import { NecromancerConfigError } from './errors';
import type { AnimateEachOptions, AnimationGroup, AnimationHandle, KeyframeFactory, Keyframes } from './types';

function validateStagger(stagger: number, delay: number | string | null | undefined): void {
  if (!Number.isFinite(stagger) || stagger < 0) {
    throw new NecromancerConfigError('stagger must be a finite, non-negative number.');
  }

  // A non-zero stagger adds to the delay, so it needs a numeric one. Checking here,
  // before any animation starts, keeps a pure config error free of side effects.
  if (stagger > 0 && delay !== undefined && typeof delay !== 'number') {
    throw new NecromancerConfigError(`A non-zero stagger requires a numeric delay; received ${typeof delay}.`);
  }
}

/**
 * Starts lifecycle-owned animations for unique elements in iteration order.
 *
 * Each subsequent element starts after `stagger` milliseconds. A keyframe factory
 * receives the stable unique-element index and total before any animation starts.
 */
export function animateEach<ElementType extends Element>(
  elements: Iterable<ElementType>,
  keyframes: Keyframes | KeyframeFactory<ElementType>,
  options: AnimateEachOptions = {},
): AnimationGroup {
  const { signal, stagger = 0, ...animationOptions } = options;

  validateStagger(stagger, animationOptions.delay);

  signal?.throwIfAborted();

  const unique = uniqueElements(elements);
  const frames = unique.map((element, index) =>
    typeof keyframes === 'function' ? keyframes(element, index, unique.length) : keyframes,
  );

  signal?.throwIfAborted();

  const handles: AnimationHandle[] = [];

  try {
    for (const [index, element] of unique.entries()) {
      // `frames` was built above from `unique`, one entry per element, so this index is always in range.
      const currentFrames = frames[index]!;

      handles.push(animate(element, currentFrames, withStaggeredDelay(animationOptions, index * stagger)));
    }
  } catch (error) {
    for (const handle of handles) handle.dispose(error);

    throw error;
  }

  return createAnimationGroup(handles, signal);
}

import type { AnimateEachOptions, AnimationGroup, AnimationHandle, KeyframeFactory, Keyframes } from './types';

import { uniqueElements } from './_elements';
import { createAnimationGroup } from './_handle';
import { withStaggeredDelay } from './_motion';
import { animate } from './animate';
import { NecromancerConfigError } from './errors';

function validateStagger(stagger: number): void {
  if (!Number.isFinite(stagger) || stagger < 0) {
    throw new NecromancerConfigError('stagger must be a finite, non-negative number.');
  }
}

/**
 * Starts lifecycle-owned animations for unique elements in iteration order.
 *
 * Each subsequent element starts after `stagger` milliseconds. A keyframe factory
 * receives the stable unique-element index and total before any animation starts.
 */
export function animateEach(
  elements: Iterable<Element>,
  keyframes: Keyframes | KeyframeFactory,
  options: AnimateEachOptions = {},
): AnimationGroup {
  const { signal, stagger = 0, ...animationOptions } = options;

  validateStagger(stagger);

  if (signal?.aborted) throw signal.reason;

  const unique = uniqueElements(elements);
  const frames = unique.map((element, index) =>
    typeof keyframes === 'function' ? keyframes(element, index, unique.length) : keyframes,
  );
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

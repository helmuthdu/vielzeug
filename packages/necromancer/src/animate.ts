import type { AnimateOptions, AnimationHandle, Keyframes } from './types';

import { interruptAnimations, trackAnimation } from './_active';
import { createAnimationHandle } from './_handle';
import { resolveAnimationOptions, shouldReduceMotion } from './_motion';
import { NecromancerUnsupportedError } from './errors';

/**
 * Starts a lifecycle-owned native Web Animation for one element.
 *
 * The returned handle cancels its native animation when disposed. By default, the
 * operating system's reduced-motion preference suppresses movement.
 */
export function animate(element: Element, keyframes: Keyframes, options: AnimateOptions = {}): AnimationHandle {
  if (options.signal?.aborted) throw options.signal.reason;

  if (typeof element.animate !== 'function') {
    throw new NecromancerUnsupportedError('The Web Animations API is not available in this environment.');
  }

  if (options.interrupt === 'cancel') interruptAnimations(element);

  const reduced = shouldReduceMotion(options.motion ?? 'system');
  const nativeAnimation = element.animate(
    keyframes as Keyframe[] | PropertyIndexedKeyframes,
    resolveAnimationOptions(options, reduced),
  );
  const handle = createAnimationHandle(nativeAnimation, options.signal, reduced);

  trackAnimation(element, handle);

  return handle;
}

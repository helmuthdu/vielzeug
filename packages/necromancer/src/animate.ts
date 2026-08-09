import type { AnimateOptions, AnimationHandle, Keyframes } from './types';

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

  const reduced = shouldReduceMotion(options.motion ?? 'system');
  const nativeAnimation = element.animate(keyframes, resolveAnimationOptions(options, reduced));

  return createAnimationHandle(nativeAnimation, options.signal, reduced);
}

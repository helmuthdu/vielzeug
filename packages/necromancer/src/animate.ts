import { createAnimationHandle } from './_handle';
import { resolveAnimationOptions } from './_options';
import { NecromancerUnsupportedError } from './errors';
import { shouldReduceMotion } from './motion';
import type { AnimateOptions, AnimationHandle, Keyframes } from './types';

/**
 * Starts a lifecycle-owned native Web Animation for one element.
 *
 * The returned handle cancels its native animation when disposed. By default, the
 * operating system's reduced-motion preference suppresses movement.
 */
export function animate(element: Element, keyframes: Keyframes, options: AnimateOptions = {}): AnimationHandle {
  options.signal?.throwIfAborted();

  if (typeof element.animate !== 'function') {
    throw new NecromancerUnsupportedError('The Web Animations API is not available in this environment.');
  }

  const nativeAnimation = element.animate(
    keyframes as Keyframe[] | PropertyIndexedKeyframes,
    resolveAnimationOptions(options, shouldReduceMotion(options.motion ?? 'system')),
  );
  return createAnimationHandle(nativeAnimation, options.signal);
}

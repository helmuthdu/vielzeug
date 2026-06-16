import type { TransitionConfig } from '../types';

import { resolveEasing } from './easing';
import { tweenNumber } from './tween';

export interface AnimationTarget {
  attrs: Record<string, { from: number; to: number }>;
  el: SVGElement;
}

export function animate(targets: AnimationTarget[], config?: TransitionConfig, onComplete?: () => void): void {
  const duration = config?.duration ?? 300;
  const easing = resolveEasing(config?.easing);
  const stagger = Math.max(0, config?.stagger ?? 0);

  if (duration === 0 || targets.length === 0) {
    for (const target of targets) {
      for (const [attr, { to }] of Object.entries(target.attrs)) {
        target.el.setAttribute(attr, String(to));
      }
    }

    onComplete?.();

    return;
  }

  let startTime: number | null = null;
  const totalDuration = Math.max(duration, duration + stagger * (targets.length - 1));

  function frame(timestamp: number) {
    if (startTime === null) startTime = timestamp;

    const elapsed = timestamp - startTime;

    for (let i = 0; i < targets.length; i++) {
      const target = targets[i];
      const delay = stagger * i;
      const localElapsed = Math.max(0, elapsed - delay);
      const t = Math.min(1, localElapsed / duration);
      const eased = easing(t);

      for (const [attr, { from, to }] of Object.entries(target.attrs)) {
        target.el.setAttribute(attr, String(tweenNumber(from, to, eased)));
      }
    }

    if (elapsed < totalDuration) {
      requestAnimationFrame(frame);
    } else {
      onComplete?.();
    }
  }

  requestAnimationFrame(frame);
}

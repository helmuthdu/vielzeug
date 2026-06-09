import type { TransitionConfig } from '../types';

import { resolveEasing } from './easing';
import { tweenNumber } from './tween';

export interface AnimationTarget {
  attrs: Record<string, { from: number; to: number }>;
  el: SVGElement;
}

export function animate(targets: AnimationTarget[], config?: TransitionConfig): Promise<void> {
  const duration = config?.duration ?? 300;
  const easing = resolveEasing(config?.easing);
  const stagger = config?.stagger ?? 0;

  if (duration === 0) {
    for (const target of targets) {
      for (const [attr, { to }] of Object.entries(target.attrs)) {
        target.el.setAttribute(attr, String(to));
      }
    }

    return Promise.resolve();
  }

  return new Promise((done) => {
    let startTime: number | null = null;
    const totalDuration = duration + stagger * (targets.length - 1);

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
        done();
      }
    }

    requestAnimationFrame(frame);
  });
}

export function reconcileElements<D>(
  parent: SVGElement,
  data: D[],
  key: (d: D) => string,
  handlers: {
    enter: (d: D) => SVGElement;
    exit: (el: SVGElement) => void;
    update: (el: SVGElement, d: D) => void;
  },
): void {
  const existingMap = new Map<string, SVGElement>();

  for (const child of Array.from(parent.children) as SVGElement[]) {
    const k = child.getAttribute('data-key');

    if (k) existingMap.set(k, child);
  }

  const newKeys = new Set(data.map(key));

  for (const [k, el] of existingMap) {
    if (!newKeys.has(k)) {
      handlers.exit(el);
    }
  }

  for (const d of data) {
    const k = key(d);
    const existing = existingMap.get(k);

    if (existing) {
      handlers.update(existing, d);
    } else {
      const el = handlers.enter(d);

      el.setAttribute('data-key', k);
      parent.appendChild(el);
    }
  }
}

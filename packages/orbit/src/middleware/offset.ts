import type { Middleware, MiddlewareState } from '../types';

import { getSide, tagMiddleware } from '../utils';

export type OffsetConfig = {
  /** Offset perpendicular to the main axis. */
  crossAxis?: number;
  /** Offset along the axis away from the reference. */
  mainAxis?: number;
};

export type OffsetValue = number | OffsetConfig | ((state: MiddlewareState) => number | OffsetConfig);

function resolveOffsetConfig(value: OffsetValue, state: MiddlewareState): Required<OffsetConfig> {
  const raw = typeof value === 'function' ? value(state) : value;

  if (typeof raw === 'number') return { crossAxis: 0, mainAxis: raw };

  return { crossAxis: raw.crossAxis ?? 0, mainAxis: raw.mainAxis ?? 0 };
}

/**
 * Shifts the floating element along the main axis (away from reference) and/or
 * the cross axis. Accepts a number, config object, or a function for dynamic values.
 *
 * Must be the **first** middleware in the pipeline.
 */
export function offset(value: OffsetValue): Middleware {
  return tagMiddleware(function offsetMiddleware(state: Parameters<Middleware>[0]): ReturnType<Middleware> {
    const side = getSide(state.placement);
    const { crossAxis, mainAxis } = resolveOffsetConfig(value, state);

    switch (side) {
      case 'bottom':
        return { x: state.x + crossAxis, y: state.y + mainAxis };
      case 'left':
        return { x: state.x - mainAxis, y: state.y + crossAxis };
      case 'right':
        return { x: state.x + mainAxis, y: state.y + crossAxis };
      case 'top':
        return { x: state.x + crossAxis, y: state.y - mainAxis };
    }
  }, 'offset');
}

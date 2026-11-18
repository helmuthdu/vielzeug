import { WireConfigError } from './errors.js';
import type { PortAnchor, PortSide, Rect } from './types.js';

/**
 * Places a port on `side` of `rect` and returns its world position with the side it faces.
 *
 * `offset` is the 0..1 fraction along the side (0 is the side's lower coordinate,
 * 0.5 the middle). Screen convention applies: `top` is smaller y.
 */
export function portAnchor(rect: Rect, side: PortSide, offset = 0.5): PortAnchor {
  if (!Number.isFinite(offset) || offset < 0 || offset > 1) {
    throw new WireConfigError(`Port offset must be a finite number between 0 and 1, received ${String(offset)}.`);
  }
  switch (side) {
    case 'bottom':
      return { side, x: rect.x + rect.width * offset, y: rect.y + rect.height };
    case 'left':
      return { side, x: rect.x, y: rect.y + rect.height * offset };
    case 'right':
      return { side, x: rect.x + rect.width, y: rect.y + rect.height * offset };
    case 'top':
      return { side, x: rect.x + rect.width * offset, y: rect.y };
  }
}

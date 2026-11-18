import { WireConfigError } from './errors.js';
import type { Point, PortAnchor, PortSide, Rect } from './types.js';

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

/**
 * Returns the side of `rect` that faces the point `toward`.
 *
 * The side is chosen by the dominant axis from the rect's center: the larger of
 * `|dx|` and `|dy|` wins. Ties (`|dx| === |dy|`, including the zero vector when
 * `toward` sits exactly on the center) resolve to the horizontal side, with the
 * sign picking `right`/`left` — and `right` for a zero vector, where both signs
 * are absent. Screen convention applies: `top` is smaller y.
 *
 * @throws {@link WireConfigError} when the rect or point has non-finite coordinates.
 */
export function floatingSide(rect: Rect, toward: Point): PortSide {
  if (
    !Number.isFinite(rect.x) ||
    !Number.isFinite(rect.y) ||
    !Number.isFinite(rect.width) ||
    !Number.isFinite(rect.height)
  ) {
    throw new WireConfigError(
      `Floating rect must have finite coordinates, received (${rect.x}, ${rect.y}, ${rect.width}, ${rect.height}).`,
    );
  }
  if (!Number.isFinite(toward.x) || !Number.isFinite(toward.y)) {
    throw new WireConfigError(`Floating target must have finite coordinates, received (${toward.x}, ${toward.y}).`);
  }
  const dx = toward.x - (rect.x + rect.width / 2);
  const dy = toward.y - (rect.y + rect.height / 2);
  // Horizontal wins ties, including the zero vector (dx === dy === 0 -> 'right').
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0 ? 'right' : 'left';
  }
  return dy > 0 ? 'bottom' : 'top';
}

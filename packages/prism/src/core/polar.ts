// Angles are radians measured clockwise from 12 o'clock.

export function polarX(cx: number, r: number, angle: number): number {
  return cx + r * Math.sin(angle);
}

export function polarY(cy: number, r: number, angle: number): number {
  return cy - r * Math.cos(angle);
}

/** SVG path coordinate pair (`x,y`) for a polar position. */
export function polarPoint(cx: number, cy: number, r: number, angle: number): string {
  return `${polarX(cx, r, angle)},${polarY(cy, r, angle)}`;
}

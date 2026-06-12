import type { Point } from '../svg/path';

export function getMousePosition(svg: SVGSVGElement, event: MouseEvent, offsetX: number, offsetY: number): Point {
  const rect = svg.getBoundingClientRect();

  return {
    x: event.clientX - rect.left - offsetX,
    y: event.clientY - rect.top - offsetY,
  };
}

import type { GestureEndReason, GestureHandle } from './_gesture.js';
import { createPointerSession, type PointerSessionDetail, resolveActivationDistance } from './_pointer-session.js';

export type DragEndReason = GestureEndReason;
export type DragPoint = Readonly<{ x: number; y: number }>;

export type DragGestureDetail = Readonly<{
  current: DragPoint;
  delta: DragPoint;
  event: PointerEvent;
  pointerId: number;
  pointerType: string;
  start: DragPoint;
  target: Element;
}>;

export type DragGestureEndDetail = DragGestureDetail & Readonly<{ reason: GestureEndReason }>;

export type DragGestureOptions = Readonly<{
  activationDistance?: number;
  disabled?: boolean | (() => boolean | undefined);
  onEnd?: (detail: DragGestureEndDetail) => void;
  onMove?: (detail: DragGestureDetail) => void;
  onStart?: (detail: DragGestureDetail) => void;
  pointerCapture?: boolean;
  shouldStart?: (event: PointerEvent) => boolean;
  signal?: AbortSignal;
}>;

export type DragGesture = GestureHandle;

function toDragDetail(detail: PointerSessionDetail): DragGestureDetail {
  const start = { x: detail.startX, y: detail.startY };
  const current = { x: detail.currentX, y: detail.currentY };
  return {
    current,
    delta: { x: current.x - start.x, y: current.y - start.y },
    event: detail.event,
    pointerId: detail.pointerId,
    pointerType: detail.pointerType,
    start,
    target: detail.target,
  };
}

export function createDragGesture(target: Element, options: DragGestureOptions = {}): DragGesture {
  const { activationDistance, disabled, onEnd, onMove, onStart, pointerCapture = true, shouldStart, signal } = options;

  return createPointerSession(target, {
    activationDistance: resolveActivationDistance(activationDistance),
    disabled,
    onEnd: onEnd ? (detail) => onEnd({ ...toDragDetail(detail), reason: detail.reason }) : undefined,
    onMove: onMove ? (detail) => onMove(toDragDetail(detail)) : undefined,
    onStart: onStart ? (detail) => onStart(toDragDetail(detail)) : undefined,
    pointerCapture,
    shouldStart,
    signal,
  });
}

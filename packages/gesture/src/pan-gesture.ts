import type { GestureEndReason, GestureHandle } from './_gesture.js';
import {
  createPointerSession,
  type PointerAxis,
  type PointerSessionDetail,
  resolveActivationDistance,
} from './_pointer-session.js';

export type PanAxis = PointerAxis;
export type PanEndReason = GestureEndReason;

export type PanGestureDetail = Readonly<{
  axis: PanAxis;
  current: number;
  distance: number;
  event: PointerEvent;
  pointerId: number;
  pointerType: string;
  start: number;
  target: Element;
}>;

export type PanGestureEndDetail = PanGestureDetail & Readonly<{ reason: PanEndReason }>;

export type PanGestureOptions = Readonly<{
  activationDistance?: number;
  axis?: PanAxis | (() => PanAxis);
  disabled?: boolean | (() => boolean | undefined);
  onEnd?: (detail: PanGestureEndDetail) => void;
  onMove?: (detail: PanGestureDetail) => void;
  onStart?: (detail: PanGestureDetail) => void;
  pointerCapture?: boolean;
  shouldStart?: (event: PointerEvent) => boolean;
  signal?: AbortSignal;
}>;

export type PanGesture = GestureHandle;

function toPanDetail(detail: PointerSessionDetail): PanGestureDetail {
  const axis = detail.axis as PanAxis;
  const start = axis === 'x' ? detail.startX : detail.startY;
  const current = axis === 'x' ? detail.currentX : detail.currentY;
  return {
    axis,
    current,
    distance: current - start,
    event: detail.event,
    pointerId: detail.pointerId,
    pointerType: detail.pointerType,
    start,
    target: detail.target,
  };
}

export function createPanGesture(target: Element, options: PanGestureOptions = {}): PanGesture {
  const {
    activationDistance,
    axis,
    disabled,
    onEnd,
    onMove,
    onStart,
    pointerCapture = true,
    shouldStart,
    signal,
  } = options;

  return createPointerSession(target, {
    activationDistance: resolveActivationDistance(activationDistance),
    axis: axis ?? 'x',
    disabled,
    onEnd: onEnd ? (detail) => onEnd({ ...toPanDetail(detail), reason: detail.reason }) : undefined,
    onMove: onMove ? (detail) => onMove(toPanDetail(detail)) : undefined,
    onStart: onStart ? (detail) => onStart(toPanDetail(detail)) : undefined,
    pointerCapture,
    shouldStart,
    signal,
  });
}

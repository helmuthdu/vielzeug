import type { GestureEndReason, GestureHandle } from './_gesture.js';
import {
  createMultiPointerSession,
  type MultiPointerBaseline,
  type MultiPointerState,
  resolvePinchActivationDistance,
} from './_multi-pointer-session.js';

export type PinchEndReason = GestureEndReason;

export type PinchPoint = Readonly<{ x: number; y: number }>;

export type PinchGestureDetail = Readonly<{
  /** Current distance between the pointers divided by the distance when they went down. */
  scale: number;
  /** Rotation of the pointer line since the pointers went down, radians; positive is clockwise. */
  rotation: number;
  /** Midpoint of the two pointers in client coordinates. */
  centroid: PinchPoint;
  /** Midpoint of the two pointers when they went down, in client coordinates. */
  startCentroid: PinchPoint;
  /** `scale` minus the value reported by the previous event (the start event's baseline). */
  deltaScale: number;
  /** `rotation` minus the value reported by the previous event (the start event's baseline). */
  deltaRotation: number;
  /** Centroid movement since the previous event (the start event's baseline). */
  deltaCentroid: PinchPoint;
  event: PointerEvent;
  target: Element;
}>;

export type PinchGestureEndDetail = PinchGestureDetail & Readonly<{ reason: PinchEndReason }>;

export type PinchGestureOptions = Readonly<{
  /** Span change in pixels required before the pinch activates. Default 6. */
  activationDistance?: number;
  disabled?: boolean | (() => boolean | undefined);
  onEnd?: (detail: PinchGestureEndDetail) => void;
  onMove?: (detail: PinchGestureDetail) => void;
  onStart?: (detail: PinchGestureDetail) => void;
  pointerCapture?: boolean;
  signal?: AbortSignal;
}>;

export type PinchGesture = GestureHandle;

/** Wrap an angle difference to (-π, π] so crossing the ±π seam reports a small rotation. */
function normalizeAngle(radians: number): number {
  const wrapped = (radians + Math.PI) % (2 * Math.PI);
  return ((wrapped + 2 * Math.PI) % (2 * Math.PI)) - Math.PI;
}

type Frame = PinchGestureDetail;

/**
 * Two-pointer pinch/rotate recognition over an element: scale and rotation are relative to
 * the positions where the two pointers went down, and per-frame deltas let consumers apply
 * incremental transforms without tracking history. The session ends when either pointer
 * lifts; the remaining pointer never continues the gesture. Set `touch-action: none` on the
 * target. Pair with a drag gesture by cancelling the drag from `onStart` so single-finger
 * dragging and pinching never fight over the same surface.
 */
export function createPinchGesture(target: Element, options: PinchGestureOptions = {}): PinchGesture {
  const { activationDistance, disabled, onEnd, onMove, onStart, pointerCapture = true, signal } = options;

  let baseline: MultiPointerBaseline | null = null;
  let previous: { rotation: number; scale: number; x: number; y: number } | null = null;

  const toDetail = (state: MultiPointerState): Frame | null => {
    if (!baseline) return null;
    const scale = baseline.span === 0 ? 1 : state.span / baseline.span;
    const rotation = normalizeAngle(state.angle - baseline.angle);
    return {
      centroid: { x: state.centroidX, y: state.centroidY },
      deltaCentroid: previous
        ? { x: state.centroidX - previous.x, y: state.centroidY - previous.y }
        : { x: state.centroidX - baseline.centroidX, y: state.centroidY - baseline.centroidY },
      deltaRotation: previous ? normalizeAngle(rotation - previous.rotation) : rotation,
      deltaScale: previous ? scale - previous.scale : scale - 1,
      event: state.event,
      rotation,
      scale,
      startCentroid: { x: baseline.centroidX, y: baseline.centroidY },
      target,
    };
  };

  const emit = (
    state: MultiPointerState,
    handlers: { onStart?: typeof onStart; onMove?: typeof onMove; onEnd?: typeof onEnd },
    kind: 'start' | 'move' | 'end',
    reason?: GestureEndReason,
  ): void => {
    const detail = toDetail(state);
    if (!detail) return;
    previous = { rotation: detail.rotation, scale: detail.scale, x: detail.centroid.x, y: detail.centroid.y };
    if (kind === 'start') handlers.onStart?.(detail);
    else if (kind === 'move') handlers.onMove?.(detail);
    else handlers.onEnd?.({ ...detail, reason: reason as GestureEndReason });
  };

  return createMultiPointerSession(target, {
    activationDistance: resolvePinchActivationDistance(activationDistance),
    disabled,
    onActivate: (state, sessionBaseline) => {
      baseline = sessionBaseline;
      previous = null;
      emit(state, { onStart }, 'start');
    },
    onEnd: (state, reason) => {
      emit(state, { onEnd }, 'end', reason);
      baseline = null;
      previous = null;
    },
    onMove: (state) => emit(state, { onMove }, 'move'),
    pointerCapture,
    signal,
  });
}

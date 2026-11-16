import { warn } from '../_dev.js';
import type { Matrix } from '../_shapes.js';

/** Version of the stage worker protocol. Bumped whenever the message shapes change. */
export const STAGE_WORKER_PROTOCOL = 1;

/** Layer description sent to the worker at init. Painters live worker-side. */
export interface StageWorkerLayerSpec {
  id: string;
}

/** Init message posted to the worker with the transferred canvas. */
export interface StageWorkerInit {
  background: string | null;
  canvas: OffscreenCanvas;
  dpr: number;
  height: number;
  layers: readonly StageWorkerLayerSpec[];
  protocol: number;
  type: 'init';
  width: number;
}

/** Commands the main thread sends to the worker. */
export type StageWorkerCommand =
  | { type: 'resize'; protocol: number; width: number; height: number; dpr: number }
  | { type: 'matrix'; protocol: number; matrix: Matrix }
  | { type: 'invalidate'; protocol: number; layerId?: string }
  | { type: 'blob'; protocol: number; id: number; options?: { type?: string; quality?: number } }
  /** Application payload forwarded verbatim to the worker-side `onScene` handler. */
  | { type: 'scene'; protocol: number; scene: unknown }
  | { type: 'dispose'; protocol: number };

/** Events the worker sends back to the main thread. */
export type StageWorkerEvent =
  | { type: 'ready'; protocol: number }
  | { type: 'blob'; protocol: number; id: number; ok: true; blob: Blob }
  | { type: 'blob'; protocol: number; id: number; ok: false; error: string }
  | { type: 'error'; protocol: number; error: string };

/** @internal Verify a message carries the expected protocol version, warning on mismatch. */
export function checkProtocol(message: { protocol?: number }, direction: string): boolean {
  if (message.protocol !== STAGE_WORKER_PROTOCOL) {
    warn(
      `${direction} message protocol ${String(message.protocol)} does not match ${STAGE_WORKER_PROTOCOL}. Ignoring.`,
    );
    return false;
  }
  return true;
}

/**
 * Internal worker message shapes. Not part of the public surface: both halves
 * always ship from the same package build, so only the init/ready handshake
 * carries the protocol version to catch a stale cached worker.
 */

import type { Matrix } from '@vielzeug/atlas';

import type { StageBlobOptions } from '../stage.js';

/** Version of the stage worker protocol. Bumped whenever the message shapes change. */
export const STAGE_WORKER_PROTOCOL = 2;

/** Init message posted to the worker with the transferred canvas. */
export interface StageWorkerInit {
  background: string | null;
  canvas: OffscreenCanvas;
  dpr: number;
  height: number;
  protocol: number;
  type: 'init';
  width: number;
}

/** Commands the main thread sends to the worker. */
export type StageWorkerCommand =
  | { type: 'resize'; width: number; height: number; dpr: number }
  | { type: 'matrix'; matrix: Matrix }
  | { type: 'invalidate'; layerId?: string }
  | { type: 'blob'; id: number; options?: StageBlobOptions }
  /** Application payload forwarded verbatim to the worker-side `onScene` handler. */
  | { type: 'scene'; scene: unknown }
  | { type: 'dispose' };

/** Events the worker sends back to the main thread. */
export type StageWorkerEvent =
  | { type: 'ready'; protocol: number }
  | { type: 'blob'; id: number; ok: true; blob: Blob }
  | { type: 'blob'; id: number; ok: false; error: string; kind?: StageWorkerErrorKind }
  | { type: 'error'; error: string };

/** Coarse error taxonomy for failed blob exports, mapped back to typed errors main-side. */
export type StageWorkerErrorKind = 'disposed' | 'unsupported' | 'failed';

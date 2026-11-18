import type { Matrix, Size } from '@vielzeug/atlas';
import { warn } from '../_dev.js';
import { requireDpr, requireFiniteMatrix, requireSize } from '../_validate.js';
import { StageDisposedError, StageError, StageUnsupportedError } from '../errors.js';
import type { StageController } from '../stage.js';
import type { StageWorkerCommand, StageWorkerEvent } from './protocol.js';
import { STAGE_WORKER_PROTOCOL } from './protocol.js';

/**
 * The message scope a worker stage talks to (a `Worker` in production).
 * Declared with method syntax so the DOM `Worker`'s overloaded `postMessage`
 * remains assignable.
 */
export type WorkerScope = Readonly<{
  postMessage(message: unknown, transfer?: Transferable[]): void;
  addEventListener(type: 'message', listener: (event: { data: unknown }) => void): void;
  removeEventListener(type: 'message', listener: (event: { data: unknown }) => void): void;
}>;

export type WorkerStageOptions = Readonly<{
  dpr?: number;
  /** Background color cleared under the layers; defaults to transparent. */
  background?: string | null;
}>;

/**
 * Main-thread half of a worker-rendered stage. `Scene` is the application
 * payload type accepted by `sendScene` and delivered to the worker-side
 * `onScene` handler. The creator owns the worker: terminate it through
 * `disposalSignal` when the stage is disposed.
 */
export type WorkerStage<Scene = unknown> = StageController &
  Readonly<{
    /** Resolves when the worker acknowledges init with a matching `ready`; rejects on a protocol mismatch. */
    readonly ready: Promise<void>;
    /** Forward an application payload to the worker-side `onScene` handler; the handler decides what to invalidate. */
    sendScene: (scene: Scene) => void;
  }>;

/** Surface a worker error like an uncaught error, matching main-thread painter behaviour. */
function reportWorkerError(message: string): void {
  const error = new StageError(`Worker stage error: ${message}`);
  const globalReportError = (globalThis as { reportError?: (err: Error) => void }).reportError;
  if (typeof globalReportError === 'function') globalReportError(error);
  else
    queueMicrotask(() => {
      throw error;
    });
}

/**
 * Creates the main-thread half of a worker-rendered stage: transfers the
 * canvas to `worker` exactly once via `transferControlToOffscreen` and
 * forwards resize/transform/invalidate/scene commands. Blob requests are
 * correlated by id; disposal rejects pending requests with
 * `StageDisposedError`. Invalid size/DPR/matrix input throws `StageConfigError`
 * here, the same as `createStage`.
 */
export function createWorkerStage<Scene = unknown>(
  canvas: HTMLCanvasElement,
  worker: WorkerScope,
  options: WorkerStageOptions & Readonly<{ width: number; height: number }>,
): WorkerStage<Scene> {
  const { width, height } = options;
  requireSize({ height, width }, 'Worker stage');
  const dpr = options.dpr ?? 1;
  requireDpr(dpr, 'Worker stage');
  if (typeof canvas.transferControlToOffscreen !== 'function') {
    throw new StageUnsupportedError('This canvas cannot be transferred to a worker (transferControlToOffscreen).');
  }
  const controller = new AbortController();
  const pending = new Map<number, { reject: (err: Error) => void; resolve: (blob: Blob) => void }>();
  let nextBlobId = 1;
  let disposed = false;

  const offscreen = canvas.transferControlToOffscreen();
  const command = (cmd: StageWorkerCommand): void => {
    if (!disposed) worker.postMessage(cmd);
  };

  let resolveReady: () => void = () => {};
  let rejectReady: (err: Error) => void = () => {};
  const ready = new Promise<void>((resolve, reject) => {
    resolveReady = resolve;
    rejectReady = reject;
  });
  // A stage disposed before the worker ever answered should not leave an
  // unhandled rejection in fire-and-forget usage.
  ready.catch(() => {});

  const onMessage = (event: { data: unknown }): void => {
    const message = event.data as StageWorkerEvent & { type?: string };
    if (!message || typeof message !== 'object' || typeof message.type !== 'string') {
      warn(`Ignoring unrecognized message from worker.`);
      return;
    }
    if (message.type === 'ready') {
      if (message.protocol !== STAGE_WORKER_PROTOCOL) {
        // A stale cached worker: fail loudly and tear the stage down.
        const error = new StageError(
          `Worker stage protocol ${String(message.protocol)} does not match ${STAGE_WORKER_PROTOCOL}.`,
        );
        rejectReady(error);
        dispose();
        return;
      }
      resolveReady();
      return;
    }
    if (message.type === 'blob') {
      const entry = pending.get(message.id);
      if (!entry) {
        warn(`Ignoring blob response for unknown request id ${String(message.id)}.`);
        return;
      }
      pending.delete(message.id);
      if (message.ok) entry.resolve(message.blob);
      else if (message.kind === 'disposed')
        entry.reject(new StageDisposedError(`Worker blob export failed: ${message.error}`));
      else if (message.kind === 'unsupported')
        entry.reject(new StageUnsupportedError(`Worker blob export failed: ${message.error}`));
      else entry.reject(new StageError(`Worker blob export failed: ${message.error}`));
      return;
    }
    if (message.type === 'error') {
      reportWorkerError(message.error);
      return;
    }
    warn(`Ignoring unknown message type "${String((message as { type?: unknown }).type)}" from worker.`);
  };
  worker.addEventListener('message', onMessage);

  worker.postMessage(
    {
      background: options.background ?? null,
      canvas: offscreen,
      dpr,
      height,
      protocol: STAGE_WORKER_PROTOCOL,
      type: 'init',
      width,
    },
    [offscreen],
  );

  const dispose = (): void => {
    if (disposed) return;
    disposed = true;
    worker.postMessage({ type: 'dispose' });
    worker.removeEventListener('message', onMessage);
    for (const entry of pending.values()) entry.reject(new StageDisposedError('Stage disposed before blob export.'));
    pending.clear();
    rejectReady(new StageDisposedError('Stage disposed before the worker became ready.'));
    controller.abort();
  };

  return {
    disposalSignal: controller.signal,
    dispose,
    get disposed() {
      return disposed;
    },
    invalidate(layerId) {
      command({ layerId, type: 'invalidate' });
    },
    ready,
    resize(size: Size, nextDpr?: number) {
      requireSize(size, 'Worker stage');
      const resolvedDpr = nextDpr ?? dpr;
      requireDpr(resolvedDpr, 'Worker stage');
      command({ dpr: resolvedDpr, type: 'resize', ...size });
    },
    [Symbol.dispose]: dispose,
    sendScene(scene: Scene) {
      command({ scene, type: 'scene' });
    },
    setTransform(matrix: Matrix) {
      requireFiniteMatrix(matrix);
      command({ matrix, type: 'matrix' });
    },
    async toBlob(blobOptions) {
      if (disposed) throw new StageDisposedError('Cannot export a disposed stage.');
      const id = nextBlobId++;
      const blob = await new Promise<Blob>((resolve, reject) => {
        pending.set(id, { reject, resolve });
        command({ id, options: blobOptions, type: 'blob' });
      });
      return blob;
    },
  };
}

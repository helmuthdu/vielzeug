import { warn } from '../_dev.js';
import type { Matrix } from '../_shapes.js';
import { StageDisposedError, StageUnsupportedError } from '../errors.js';
import type { StageWorkerCommand, StageWorkerEvent } from './protocol.js';
import { checkProtocol, STAGE_WORKER_PROTOCOL } from './protocol.js';

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
  /** Layer ids rendered worker-side; painters are registered via `serveStage`. */
  layers: readonly { id: string }[];
  /** Background color cleared under the layers; defaults to transparent. */
  background?: string | null;
}>;

export type WorkerStage = {
  /** Resolves when the worker acknowledges init with `ready`. */
  readonly ready: Promise<void>;
  readonly disposed: boolean;
  readonly disposalSignal: AbortSignal;
  /** Resize the CSS size and DPR; forwarded to the worker. */
  resize: (size: { width: number; height: number }, dpr?: number) => void;
  /** Set the world→screen matrix; forwarded to the worker. */
  setTransform: (matrix: Matrix) => void;
  /** Mark one layer dirty on the worker (omit to mark all). */
  invalidate: (layerId?: string) => void;
  /** Forward an application payload to the worker-side `onScene` handler. */
  sendScene: (scene: unknown) => void;
  /** Ask the worker to rasterize the composited canvas. */
  toBlob: (options?: { type?: string; quality?: number }) => Promise<Blob>;
  dispose: () => void;
  [Symbol.dispose]: () => void;
};

/**
 * Creates the main-thread half of a worker-rendered stage: transfers the
 * canvas to `worker` exactly once via `transferControlToOffscreen` and
 * forwards resize/transform/invalidate/scene commands over the versioned
 * protocol. Blob requests are correlated by id; disposal rejects pending
 * requests with `StageDisposedError`.
 */
export function createWorkerStage(
  canvas: HTMLCanvasElement,
  worker: WorkerScope,
  options: WorkerStageOptions & Readonly<{ width: number; height: number }>,
): WorkerStage {
  const { width, height } = options;
  if (typeof canvas.transferControlToOffscreen !== 'function') {
    throw new StageUnsupportedError('This canvas cannot be transferred to a worker (transferControlToOffscreen).');
  }
  const dpr = options.dpr ?? 1;
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
    if (!checkProtocol(message, 'worker→main')) return;
    if (message.type === 'ready') {
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
      else entry.reject(new StageUnsupportedError(`Worker blob export failed: ${message.error}`));
      return;
    }
    if (message.type === 'error') {
      warn(`Worker reported an error: ${message.error}`);
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
      layers: options.layers,
      protocol: STAGE_WORKER_PROTOCOL,
      type: 'init',
      width,
    },
    [offscreen],
  );

  const dispose = (): void => {
    if (disposed) return;
    disposed = true;
    worker.postMessage({ protocol: STAGE_WORKER_PROTOCOL, type: 'dispose' });
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
      command({ layerId, protocol: STAGE_WORKER_PROTOCOL, type: 'invalidate' });
    },
    ready,
    resize(size, nextDpr) {
      command({ dpr: nextDpr ?? dpr, protocol: STAGE_WORKER_PROTOCOL, type: 'resize', ...size });
    },
    [Symbol.dispose]: dispose,
    sendScene(scene) {
      command({ protocol: STAGE_WORKER_PROTOCOL, scene, type: 'scene' });
    },
    setTransform(matrix) {
      command({ matrix, protocol: STAGE_WORKER_PROTOCOL, type: 'matrix' });
    },
    async toBlob(blobOptions) {
      if (disposed) throw new StageDisposedError('Cannot export a disposed stage.');
      const id = nextBlobId++;
      const blob = await new Promise<Blob>((resolve, reject) => {
        pending.set(id, { reject, resolve });
        command({ id, options: blobOptions, protocol: STAGE_WORKER_PROTOCOL, type: 'blob' });
      });
      return blob;
    },
  };
}

import { warn } from '../_dev.js';
import { StageDisposedError, StageUnsupportedError } from '../errors.js';
import type { Stage, StageLayerOptions } from '../stage.js';
import { createStage } from '../stage.js';
import type { StageWorkerCommand, StageWorkerErrorKind, StageWorkerInit } from './protocol.js';
import { checkProtocol, STAGE_WORKER_PROTOCOL } from './protocol.js';

/** The message scope available inside a worker (`self` in production). */
export type WorkerSelfScope = Readonly<{
  postMessage: (message: unknown) => void;
  addEventListener: (type: 'message', listener: (event: { data: unknown }) => void) => void;
  removeEventListener?: (type: 'message', listener: (event: { data: unknown }) => void) => void;
}>;

export type StageSceneMessage = Readonly<{ scene: unknown }>;

export type ServeStageSetup = Readonly<{
  /** Layer painters, keyed by the ids the main thread declared in its init. */
  layers: readonly StageLayerOptions[];
  /** Called for each `scene` command forwarded from the main thread. */
  onScene?: ((message: StageSceneMessage) => void) | undefined;
  /** Called after the stage is created; useful to keep model state alive. */
  onStart?: ((stage: Stage) => void) | undefined;
  /** Called on dispose; release anything `onStart` allocated. */
  onDispose?: (() => void) | undefined;
}>;

export type StageServer = Readonly<{
  readonly stage: Stage | undefined;
  dispose: () => void;
  [Symbol.dispose]: () => void;
}>;

/**
 * Worker half of a worker-rendered stage: waits for the `init` message,
 * creates a `createStage` bound to the transferred `OffscreenCanvas`, and
 * services resize/transform/invalidate/scene/blob commands. Painters are
 * registered worker-side in `setup`; the main thread only names the layers.
 */
export function serveStage(scope: WorkerSelfScope, setup: (init: StageWorkerInit) => ServeStageSetup): StageServer {
  let stage: Stage | undefined;
  let current: ServeStageSetup | undefined;
  let disposed = false;

  const fail = (error: unknown): void => {
    scope.postMessage({ error: String(error), protocol: STAGE_WORKER_PROTOCOL, type: 'error' });
  };

  const handle = (message: StageWorkerCommand | StageWorkerInit): void => {
    if (!checkProtocol(message, 'main→worker')) return;
    // After dispose the scope may still deliver queued messages (a scope
    // without removeEventListener cannot be fully detached).
    if (disposed) return;
    switch (message.type) {
      case 'init': {
        if (stage) {
          warn('Ignoring a second init message; the canvas was already transferred.');
          return;
        }
        current = setup(message);
        stage = createStage(message.canvas as unknown as HTMLCanvasElement, {
          background: message.background,
          dpr: message.dpr,
          height: message.height,
          layers: current.layers,
          width: message.width,
        });
        current.onStart?.(stage);
        scope.postMessage({ protocol: STAGE_WORKER_PROTOCOL, type: 'ready' });
        return;
      }
      case 'resize': {
        stage?.resize({ height: message.height, width: message.width }, message.dpr);
        return;
      }
      case 'matrix': {
        stage?.setTransform(message.matrix);
        return;
      }
      case 'invalidate': {
        stage?.invalidate(message.layerId);
        return;
      }
      case 'scene': {
        current?.onScene?.({ scene: message.scene });
        stage?.invalidate();
        return;
      }
      case 'blob': {
        if (!stage) {
          scope.postMessage({
            error: 'Stage is not initialized.',
            id: message.id,
            kind: 'failed',
            ok: false,
            protocol: STAGE_WORKER_PROTOCOL,
            type: 'blob',
          });
          return;
        }
        stage.render();
        void stage
          .toBlob(message.options)
          .then((blob) => {
            scope.postMessage({ blob, id: message.id, ok: true, protocol: STAGE_WORKER_PROTOCOL, type: 'blob' });
          })
          .catch((error: unknown) => {
            const kind: StageWorkerErrorKind =
              error instanceof StageDisposedError
                ? 'disposed'
                : error instanceof StageUnsupportedError
                  ? 'unsupported'
                  : 'failed';
            scope.postMessage({
              error: String(error),
              id: message.id,
              kind,
              ok: false,
              protocol: STAGE_WORKER_PROTOCOL,
              type: 'blob',
            });
          });
        return;
      }
      case 'dispose': {
        shutdown();
        return;
      }
      default: {
        warn(`Ignoring unknown command "${String((message as { type?: unknown }).type)}" from main thread.`);
      }
    }
  };

  const onMessage = (event: { data: unknown }): void => {
    const message = event.data as (StageWorkerCommand | StageWorkerInit) & { type?: unknown };
    if (!message || typeof message !== 'object' || typeof message.type !== 'string') {
      warn('Ignoring unrecognized message from main thread.');
      return;
    }
    try {
      handle(message);
    } catch (error) {
      fail(error);
    }
  };

  const shutdown = (): void => {
    if (disposed) return;
    disposed = true;
    scope.removeEventListener?.('message', onMessage);
    stage?.dispose();
    stage = undefined;
    current?.onDispose?.();
    current = undefined;
  };

  scope.addEventListener('message', onMessage);

  return {
    dispose: shutdown,
    get stage() {
      return stage;
    },
    [Symbol.dispose]: shutdown,
  };
}

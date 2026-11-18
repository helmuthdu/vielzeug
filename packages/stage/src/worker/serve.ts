import { warn } from '../_dev.js';
import { StageDisposedError, StageUnsupportedError } from '../errors.js';
import type { Stage, StageLayerOptions } from '../stage.js';
import { createStage } from '../stage.js';
import type { StageWorkerCommand, StageWorkerErrorKind, StageWorkerInit } from './protocol.js';
import { STAGE_WORKER_PROTOCOL } from './protocol.js';

/** The message scope available inside a worker (`self` in production). */
export type WorkerSelfScope = Readonly<{
  postMessage: (message: unknown) => void;
  addEventListener: (type: 'message', listener: (event: { data: unknown }) => void) => void;
  removeEventListener?: (type: 'message', listener: (event: { data: unknown }) => void) => void;
}>;

export type ServeStageSetup<Scene = unknown> = Readonly<{
  /** Layer painters; the worker owns them, the main thread never names layers. */
  layers: readonly StageLayerOptions[];
  /**
   * Called for each `scene` command forwarded from the main thread. The
   * handler owns repaints: call `stage.invalidate(layerId)` for the layers
   * the payload actually changed.
   */
  onScene?: ((scene: Scene, stage: Stage) => void) | undefined;
  /** Called on dispose; release anything the setup or `onScene` allocated. */
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
 * `Scene` is the application payload type handled by `onScene`.
 */
export function serveStage<Scene = unknown>(
  scope: WorkerSelfScope,
  setup: (init: StageWorkerInit) => ServeStageSetup<Scene>,
): StageServer {
  let stage: Stage | undefined;
  let current: ServeStageSetup<Scene> | undefined;
  let disposed = false;

  const fail = (error: unknown): void => {
    scope.postMessage({ error: String(error), type: 'error' });
  };

  const handle = (message: StageWorkerCommand | StageWorkerInit): void => {
    // After dispose the scope may still deliver queued messages (a scope
    // without removeEventListener cannot be fully detached).
    if (disposed) return;
    switch (message.type) {
      case 'init': {
        if (stage) {
          warn('Ignoring a second init message; the canvas was already transferred.');
          return;
        }
        if (message.protocol !== STAGE_WORKER_PROTOCOL) {
          fail(
            new StageUnsupportedError(
              `Main thread protocol ${String(message.protocol)} does not match ${STAGE_WORKER_PROTOCOL}.`,
            ),
          );
          return;
        }
        current = setup(message);
        stage = createStage(message.canvas, {
          background: message.background,
          dpr: message.dpr,
          height: message.height,
          layers: current.layers,
          width: message.width,
        });
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
        if (stage) current?.onScene?.(message.scene as Scene, stage);
        return;
      }
      case 'blob': {
        if (!stage) {
          scope.postMessage({
            error: 'Stage is not initialized.',
            id: message.id,
            kind: 'failed',
            ok: false,
            type: 'blob',
          });
          return;
        }
        stage.render();
        void stage
          .toBlob(message.options)
          .then((blob) => {
            scope.postMessage({ blob, id: message.id, ok: true, type: 'blob' });
          })
          .catch((error: unknown) => {
            const kind: StageWorkerErrorKind =
              error instanceof StageDisposedError
                ? 'disposed'
                : error instanceof StageUnsupportedError
                  ? 'unsupported'
                  : 'failed';
            scope.postMessage({ error: String(error), id: message.id, kind, ok: false, type: 'blob' });
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

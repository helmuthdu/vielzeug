import type { FrameScheduler, Matrix, Rect, Size } from '@vielzeug/atlas';
import {
  createStage,
  type PaintContext,
  type Stage,
  type StageBlobOptions,
  StageConfigError,
  type StageController,
  StageError,
  type StageFrameInfo,
  type StageOptions,
  StageUnsupportedError,
} from '@vielzeug/stage';
import { createWorkerStage, type WorkerScope, type WorkerStage } from '@vielzeug/stage/worker';

declare const canvas: HTMLCanvasElement;
declare const worker: WorkerScope;

const scheduler: FrameScheduler = {
  cancelFrame: (handle: number) => void handle,
  now: () => performance.now(),
  requestFrame: (callback: (time: number) => void) => requestAnimationFrame(callback),
};
const matrix: Matrix = [1, 0, 0, 1, 0, 0];
const size: Size = { height: 200, width: 200 };

type Scene = Readonly<{ type: 'move' }>;

const options: StageOptions & Readonly<{ height: number; width: number }> = {
  height: 400,
  layers: [
    {
      id: 'tiles',
      paint: (ctx: CanvasRenderingContext2D, frame: PaintContext) => {
        ctx.fillRect(frame.visibleRect.x, frame.visibleRect.y, 1, 1);
      },
    },
  ],
  scheduler,
  width: 400,
};

const stage: Stage = createStage(canvas, options);
stage.resize(size, 2);
stage.setTransform(matrix);
stage.invalidate('tiles');
const info: StageFrameInfo = stage.render(0);
void info;
const rect: Rect = stage.visibleRect;
void rect;
const blob: Promise<Blob> = stage.toBlob();
void blob;
const regionBlob: Promise<Blob> = stage.toBlob({
  region: { height: 100, width: 200, x: 0, y: 0 },
  scale: 2,
  type: 'image/png',
});
void regionBlob;
const blobOptions: StageBlobOptions = { scale: 3 };
void blobOptions;

// Both modes are interchangeable wherever only control is needed.
const mainController: StageController = stage;
void mainController;
const remote: WorkerStage<Scene> = createWorkerStage<Scene>(canvas, worker, { height: 400, width: 400 });
const remoteController: StageController = remote;
void remoteController;
remote.sendScene({ type: 'move' });
void remote.ready;

void new StageError('x');
void new StageConfigError('x');
void new StageUnsupportedError('x');
using auto = stage;
void auto;

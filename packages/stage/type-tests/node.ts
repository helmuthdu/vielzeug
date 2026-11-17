import {
  createStage,
  type FrameScheduler,
  type Matrix,
  type PaintContext,
  type Rect,
  type Stage,
  StageConfigError,
  StageError,
  type StageFrameInfo,
  type StageOptions,
  type StageSpriteSheet,
  StageUnsupportedError,
} from '@vielzeug/stage';

declare const canvas: HTMLCanvasElement;

const scheduler: FrameScheduler = {
  cancelFrame: (handle: number) => void handle,
  requestFrame: (callback: (time: number) => void) => requestAnimationFrame(callback),
};
const matrix: Matrix = [1, 0, 0, 1, 0, 0];
const rect: Rect = { height: 10, width: 10, x: 0, y: 0 };
const sheet: StageSpriteSheet = { columns: 4, frameHeight: 16, frames: 8, frameWidth: 16 };

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
stage.resize({ height: 200, width: 200 }, 2);
stage.setTransform(matrix);
stage.invalidate('tiles');
const info: StageFrameInfo = stage.render(0);
void info;
stage.drawSpriteFrame(canvas.getContext('2d') as CanvasRenderingContext2D, canvas, sheet, 0, rect);
const blob: Promise<Blob> = stage.toBlob();
void blob;
const ids: readonly string[] = stage.layerIds;
void ids;
void new StageError('x');
void new StageConfigError('x');
void new StageUnsupportedError('x');
using auto = stage;
void auto;

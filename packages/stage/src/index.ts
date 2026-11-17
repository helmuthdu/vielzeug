// Public root surface of @vielzeug/stage. Every public export goes through this file.

export { StageConfigError, StageDisposedError, StageError, StageUnsupportedError } from './errors.js';
export type { Matrix, Point, Rect } from './shapes.js';
export {
  type CreateSurface,
  createStage,
  type FrameScheduler,
  type PaintContext,
  type Stage,
  type StageFrameInfo,
  type StageLayerOptions,
  type StageOptions,
  type StageSpriteSheet,
  type StageSurface,
} from './stage.js';

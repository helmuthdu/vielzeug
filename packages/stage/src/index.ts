// Public root surface of @vielzeug/stage. Every public export goes through this file.

export type { Matrix, Point, Rect } from './_shapes.js';
export { StageConfigError, StageError, StageUnsupportedError } from './errors.js';
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

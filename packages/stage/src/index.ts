// Public root surface of @vielzeug/stage. Every public export goes through this file.

export { StageConfigError, StageDisposedError, StageError, StageUnsupportedError } from './errors.js';
export {
  type CreateSurface,
  createStage,
  type PaintContext,
  type Stage,
  type StageBlobOptions,
  type StageController,
  type StageFrameInfo,
  type StageLayerOptions,
  type StageOptions,
  type StageSurface,
} from './stage.js';

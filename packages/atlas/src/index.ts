// Public root surface of @vielzeug/atlas. Every public export goes through this file.
export type { Matrix, Point, Rect } from './_shapes.js';
export {
  type AnimationOptions,
  type Camera,
  type CameraOptions,
  type CameraState,
  createCamera,
  type FrameScheduler,
} from './camera.js';
export { AtlasConfigError, AtlasError } from './errors.js';
export { boundsOf, distanceToPolyline, pointInPolygon, pointNearPolygon } from './geometry.js';
export {
  apply,
  around,
  IDENTITY,
  invert,
  multiply,
  rotate,
  scale,
  scaleOf,
  toCssMatrix,
  translate,
} from './matrix.js';
export {
  type OBB,
  obbBounds,
  obbCenter,
  obbCorners,
  obbFromRect,
  obbsIntersect,
  pointInOBB,
  rectIntersectsOBB,
} from './obb.js';
export {
  containsPoint,
  containsRect,
  inflateRect,
  intersectRect,
  rectBottom,
  rectCenter,
  rectFromPoints,
  rectRight,
  rectsIntersect,
  unionRect,
} from './rect.js';
export {
  createSpatialIndex,
  type SpatialEntry,
  type SpatialIndex,
  type SpatialIndexOptions,
  type SpatialQueryOptions,
} from './spatial-index.js';

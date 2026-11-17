/**
 * Public surface of the `@vielzeug/atlas/grid` subpath: square-tile grids,
 * field-of-view, and fog-of-war. Kept independent of the atlas root surface
 * (only structural shape types and the error classes are shared).
 */
export { AtlasConfigError, AtlasError } from '../errors.js';
export {
  type BlockPredicate,
  computeFov,
  createFog,
  type Fog,
  type FogSnapshot,
  type FogState,
  type FovOptions,
} from './fov.js';
export {
  chunkKey,
  chunkOf,
  type GridConfig,
  iterateTileRange,
  type TileCoord,
  type TileRange,
  tileCenter,
  tileKey,
  tileToRect,
  visibleTileRange,
  worldToTile,
} from './tile.js';

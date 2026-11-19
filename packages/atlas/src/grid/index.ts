/**
 * Public surface of the `@vielzeug/atlas/grid` subpath: square-tile and hex
 * grids, grid topologies, pathfinding, field-of-view, and fog-of-war. Kept
 * independent of the atlas root surface (only structural shape types and the
 * error classes are shared).
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
  computeHexFov,
  HEX_DIRECTIONS,
  type HexCoord,
  type HexLayout,
  hexCorners,
  hexDistance,
  hexKey,
  hexLine,
  hexNeighbors,
  hexRange,
  hexTopology,
  hexToWorld,
  visibleHexes,
  worldToHex,
} from './hex.js';
export {
  findPath,
  type ReachEntry,
  reachable,
  type SearchOptions,
} from './path.js';
export {
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
export {
  type GridTopology,
  squareTopology,
} from './topology.js';

import {
  type AlignEdge,
  AtlasConfigError,
  AtlasError,
  alignRects,
  type Camera,
  type CameraOptions,
  type CameraState,
  createCamera,
  createSpatialIndex,
  distributeRects,
  type Matrix,
  type Point,
  type Rect,
  type SnapOptions,
  type SnapResult,
  type SpatialEntry,
  type SpatialIndex,
  snapRect,
} from '@vielzeug/atlas';
import {
  chunkKey,
  chunkOf,
  computeFov,
  createFog,
  type Fog,
  type FogSnapshot,
  type GridConfig,
  iterateTileRange,
  type TileCoord,
  type TileRange,
  tileCenter,
  tileKey,
  tileToRect,
  visibleTileRange,
  worldToTile,
} from '@vielzeug/atlas/grid';

declare const rect: Rect;
declare const point: Point;

const matrix: Matrix = [1, 0, 0, 1, 0, 0];
const transform: CameraState = { rotation: 0, x: 0, y: 0, zoom: 1 };
const camera: Camera = createCamera({ initial: transform } satisfies CameraOptions);
camera.zoomAt(point, 1.25);
camera.panBy(10, -10);
const worldPoint: Point = camera.toWorld(point);
const screenPoint: Point = camera.toScreen(worldPoint);
const visible: Rect = camera.visibleRect({ x: 800, y: 600 });
const unsubscribe: () => void = camera.subscribe((state) => void state.zoom);
const cameraMatrix: Matrix = camera.matrix;
camera.dispose();

const index: SpatialIndex<string> = createSpatialIndex({ maxEntriesPerNode: 16 });
index.insert('a', rect, 'value');
index.update('a', rect);
const hits: SpatialEntry<string>[] = index.queryRect(rect);
const pointHits: SpatialEntry<string>[] = index.queryPoint(point, { tolerance: 2 });
const removed: boolean = index.remove('a');
index.dispose();

const snapOptions: SnapOptions = { candidates: [rect], threshold: 4 };
const snapped: SnapResult = snapRect(rect, snapOptions);
const edge: AlignEdge = 'horizontal-center';
const aligned: Rect[] = alignRects([rect, rect], edge);
const distributed: Rect[] = distributeRects([rect, rect, rect], 'x');

const grid: GridConfig = { tileSize: 32 };
const coord: TileCoord = worldToTile(point, grid);
const tileRect: Rect = tileToRect(coord, grid);
const center: Point = tileCenter(coord, grid);
const key: string = tileKey(coord);
const chunk: Readonly<{ cx: number; cy: number }> = chunkOf(coord, 8);
const chunkName: string = chunkKey(coord, 8);
const range: TileRange = visibleTileRange(rect, grid);
const tiles: TileCoord[] = [...iterateTileRange(range)];
const fov: Set<string> = computeFov(coord, 5, { blocks: (c) => c.col === 3 });
const fog: Fog = createFog();
fog.revealKeys(new Set([key]));
fog.demote();
const fogSnapshot: FogSnapshot = fog.exportState();
fog.importState(fogSnapshot);
const fogState: string = fog.state(coord);
const visibleKeys: Iterable<string> = fog.visibleKeys;

void matrix;
void worldPoint;
void screenPoint;
void visible;
void unsubscribe;
void cameraMatrix;
void hits;
void pointHits;
void removed;
void snapped;
void aligned;
void distributed;
void tileRect;
void center;
void tiles;
void fov;
void chunk;
void chunkName;
void fogState;
void visibleKeys;
void AtlasError;
void AtlasConfigError;

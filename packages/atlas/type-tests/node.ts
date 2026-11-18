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
  type Size,
  type SnapOptions,
  type SnapResult,
  type SpatialIndex,
  snapRect,
} from '@vielzeug/atlas';
import {
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
const viewport: Size = { height: 600, width: 800 };
const camera: Camera = createCamera({ initial: transform, viewport } satisfies CameraOptions);
camera.zoomAt(point, 1.25);
camera.panBy(10, -10);
camera.set({ zoom: 2 });
camera.resize({ height: 400, width: 1000 });
const worldPoint: Point = camera.toWorld(point);
const screenPoint: Point = camera.toScreen(worldPoint);
const visible: Rect = camera.visibleRect;
const cameraViewport: Size = camera.viewport;
const inverseMatrix: Matrix = camera.inverse;
const unsubscribe: () => void = camera.subscribe((state) => void state.zoom);
const cameraMatrix: Matrix = camera.matrix;
camera.fitBounds(rect, { padding: 16 });
camera.dispose();

const index: SpatialIndex<string> = createSpatialIndex({ maxEntriesPerNode: 16 });
index.set('a', rect);
const storedRect: Rect | undefined = index.get('a');
const present: boolean = index.has('a');
const hits: string[] = index.queryRect(rect);
const pointHits: string[] = index.queryPoint(point, { tolerance: 2 });
const removed: boolean = index.delete('a');
const numericIndex: SpatialIndex<number> = createSpatialIndex();
numericIndex.set(1, rect);

const snapOptions: SnapOptions = { candidates: [rect], spacing: true, threshold: 4 };
const snapped: SnapResult = snapRect(rect, snapOptions);
const edge: AlignEdge = 'horizontal-center';
const aligned: Rect[] = alignRects([rect, rect], edge);
const distributed: Rect[] = distributeRects([rect, rect, rect], 'x');

const grid: GridConfig = { tileSize: 32 };
const coord: TileCoord = worldToTile(point, grid);
const tileRect: Rect = tileToRect(coord, grid);
const center: Point = tileCenter(coord, grid);
const key: string = tileKey(coord);
const range: TileRange = visibleTileRange(rect, grid);
const tiles: TileCoord[] = [...iterateTileRange(range)];
const fov: Set<string> = computeFov(coord, 5, { blocks: (c) => c.col === 3 });
const fog: Fog = createFog();
fog.update(new Set([key]));
const fogSnapshot: FogSnapshot = fog.exportState();
fog.importState(fogSnapshot);
const fogState: string = fog.state(key);
const visibleTiles: ReadonlySet<string> = fog.visible;

void matrix;
void worldPoint;
void screenPoint;
void visible;
void cameraViewport;
void inverseMatrix;
void unsubscribe;
void cameraMatrix;
void storedRect;
void present;
void hits;
void pointHits;
void removed;
void numericIndex;
void snapped;
void aligned;
void distributed;
void tileRect;
void center;
void tiles;
void fov;
void fogState;
void visibleTiles;
void AtlasError;
void AtlasConfigError;

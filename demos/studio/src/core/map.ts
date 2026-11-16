import { createSpatialIndex, type Point, type Rect, type SpatialIndex } from '@vielzeug/atlas';
import { computeFov, createFog, type Fog, type TileCoord, tileKey, tileToRect } from '@vielzeug/atlas/grid';

export const TILE_SIZE = 48;
export const GRID = { tileSize: TILE_SIZE } as const;
export const FOV_RADIUS = 7;

export type MapToken = Readonly<{
  color: string;
  col: number;
  id: string;
  label: string;
  row: number;
}>;

export interface MapModel {
  dispose(): void;
  readonly fog: Fog;
  readonly heroId: string;
  /** Tiles whose terrain blocks light (walls). */
  isWall(coord: TileCoord): boolean;
  /** Moves a token; returns false for unknown ids. */
  moveToken(id: string, coord: TileCoord): boolean;
  /** Recomputes visibility from the hero token and reveals it in the fog. */
  refreshFov(): void;
  subscribe(listener: () => void, options?: Readonly<{ signal?: AbortSignal }>): () => void;
  /** Deterministic terrain color for a tile (grass/sand/water bands). */
  terrainColor(coord: TileCoord): string;
  token(id: string): MapToken | undefined;
  /** Token whose tile the world point falls on, if any. */
  tokenAtWorld(point: Point): MapToken | undefined;
  /** World-space rect of a token's tile. */
  tokenRect(token: MapToken): Rect;
  readonly tokens: readonly MapToken[];
  [Symbol.dispose](): void;
}

const WALLS: readonly TileCoord[] = [
  [4, 0],
  [4, 1],
  [4, 2],
  [4, 3],
  [4, 5],
  [4, 6],
  [4, 7],
  [8, -2],
  [8, -1],
  [8, 0],
  [8, 1],
  [8, 2],
  [1, 6],
  [2, 6],
  [3, 6],
  [5, 6],
  [6, 6],
].map(([col, row]) => ({ col, row }));

const TOKENS: readonly MapToken[] = [
  { col: 0, color: '#38bdf8', id: 'hero', label: 'H', row: 3 },
  { col: 6, color: '#f472b6', id: 'scout', label: 'S', row: 2 },
  { col: 10, color: '#fbbf24', id: 'cart', label: 'C', row: 0 },
  { col: 2, color: '#34d399', id: 'camp', label: '+', row: -3 },
];

function hash2(col: number, row: number): number {
  let h = (col * 374761393 + row * 668265263) | 0;
  h = (h ^ (h >> 13)) * 1274126177;
  return ((h ^ (h >> 16)) >>> 0) / 4294967296;
}

export function createMapModel(): MapModel {
  const tokens = new Map<string, MapToken>(TOKENS.map((t) => [t.id, t]));
  const order = TOKENS.map((t) => t.id);
  const walls = new Set(WALLS.map((c) => tileKey(c)));
  const index: SpatialIndex<MapToken> = createSpatialIndex<MapToken>();
  const fog: Fog = createFog();
  const listeners = new Set<() => void>();
  let disposed = false;

  const notify = (): void => {
    for (const listener of [...listeners]) listener();
  };

  for (const token of tokens.values()) {
    index.insert(token.id, tileToRect(token, GRID), token);
  }

  const model: MapModel = {
    dispose() {
      if (disposed) return;
      disposed = true;
      index.dispose();
      listeners.clear();
    },
    [Symbol.dispose]: () => model.dispose(),
    fog,
    heroId: 'hero',
    isWall(coord) {
      return walls.has(tileKey(coord));
    },
    moveToken(id, coord) {
      const token = tokens.get(id);
      if (!token) return false;
      const next: MapToken = { ...token, col: coord.col, row: coord.row };
      tokens.set(id, next);
      index.update(id, tileToRect(next, GRID));
      notify();
      return true;
    },
    refreshFov() {
      const hero = tokens.get('hero');
      fog.demote();
      if (!hero) return;
      const lit = computeFov(hero, FOV_RADIUS, { blocks: (c) => model.isWall(c) });
      fog.revealKeys(lit);
      notify();
    },
    subscribe(listener, options) {
      if (options?.signal) {
        if (options.signal.aborted) return () => {};
        options.signal.addEventListener('abort', () => listeners.delete(listener), { once: true });
      }
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    terrainColor(coord) {
      const r = hash2(coord.col, coord.row);
      if (r < 0.12) return '#2d6ca3'; // water
      if (r < 0.28) return '#b7a06a'; // sand
      if (model.isWall(coord)) return '#6b7280'; // stone wall
      return r < 0.66 ? '#3f7a45' : '#4c8a50'; // grass shades
    },
    token(id) {
      return tokens.get(id);
    },
    tokenAtWorld(point) {
      const hits = index.queryPoint(point);
      return hits[0]?.value;
    },
    tokenRect(token) {
      return tileToRect(token, GRID);
    },
    get tokens() {
      return order.map((id) => tokens.get(id) as MapToken);
    },
  };
  model.refreshFov();
  return model;
}

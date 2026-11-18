/**
 * Tile/world conversion, visible tile ranges, and chunk keys for square-tile
 * grids. Tile (col, row) covers the world rect `[col*size, row*size)`;
 * world→tile floors, so negative coordinates land on negative tiles.
 */
import { AtlasConfigError } from '../errors.js';
import type { Point, Rect } from '../shapes.js';

/** A tile addressed by integer column and row. */
export type TileCoord = Readonly<{ col: number; row: number }>;

/** A square-tile grid: world units per tile edge. */
export type GridConfig = Readonly<{ tileSize: number }>;

/** An inclusive rectangle of tiles. */
export type TileRange = Readonly<{ maxCol: number; maxRow: number; minCol: number; minRow: number }>;

function assertGrid(grid: GridConfig): void {
  if (!(grid.tileSize > 0)) {
    throw new AtlasConfigError(`grid.tileSize must be positive, got ${grid.tileSize}`);
  }
}

/** Converts a world point to the tile containing it (floor at tile borders). */
export function worldToTile(point: Point, grid: GridConfig): TileCoord {
  assertGrid(grid);
  return { col: Math.floor(point.x / grid.tileSize), row: Math.floor(point.y / grid.tileSize) };
}

/** The world rect covered by a tile. */
export function tileToRect(coord: TileCoord, grid: GridConfig): Rect {
  assertGrid(grid);
  return { height: grid.tileSize, width: grid.tileSize, x: coord.col * grid.tileSize, y: coord.row * grid.tileSize };
}

/** The world center of a tile. */
export function tileCenter(coord: TileCoord, grid: GridConfig): Point {
  assertGrid(grid);
  return { x: (coord.col + 0.5) * grid.tileSize, y: (coord.row + 0.5) * grid.tileSize };
}

/** The inclusive tile range covering a world rect (a superset at exact edges). */
export function visibleTileRange(view: Rect, grid: GridConfig): TileRange {
  assertGrid(grid);
  return {
    maxCol: Math.floor((view.x + view.width) / grid.tileSize),
    maxRow: Math.floor((view.y + view.height) / grid.tileSize),
    minCol: Math.floor(view.x / grid.tileSize),
    minRow: Math.floor(view.y / grid.tileSize),
  };
}

/** Iterates the coordinates in a range in row-major order. */
export function* iterateTileRange(range: TileRange): Generator<TileCoord> {
  for (let row = range.minRow; row <= range.maxRow; row += 1) {
    for (let col = range.minCol; col <= range.maxCol; col += 1) {
      yield { col, row };
    }
  }
}

/** A stable string key for a tile, e.g. `"3:-1"`. */
export function tileKey(coord: TileCoord): string {
  return `${String(coord.col)}:${String(coord.row)}`;
}

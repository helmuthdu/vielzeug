/**
 * Recursive shadowcasting field-of-view and fog-of-war state for square
 * tile grids. Pure data in, sets out: no DOM, no canvas, no framework.
 *
 * The grid is symmetric about tile corners: a tile at `(col, row)` spans
 * world `[col*t, (col+1)*t]` on x and the same on y. FOV walks the eight
 * octants defined by the vectors below, so results are symmetric under
 * mirroring and transposition in open space.
 */

import { AtlasConfigError } from '../errors.js';
import { type TileCoord, tileKey } from './tile.js';

/** Decides whether a tile blocks sight. */
export type BlockPredicate = (coord: TileCoord) => boolean;

const _noBlocks: BlockPredicate = () => false;

/** Options for {@link computeFov}. */
export interface FovOptions {
  /** Returns true when sight cannot pass through the tile. Default: nothing blocks. */
  blocks?: BlockPredicate;
}

/**
 * Recursive shadowcasting over the eight octants. The origin is always in
 * the result. Blocking tiles within range are visible (you can see a wall
 * you face) but cast shadows behind themselves.
 *
 * Cost is O(radius²) in the worst case (fully open); walls prune work.
 */
export function computeFov(origin: TileCoord, radius: number, options: FovOptions = {}): Set<string> {
  if (!Number.isInteger(radius) || radius < 0) {
    throw new AtlasConfigError(`FOV radius must be a non-negative integer, got ${radius}`);
  }
  const blocks = options.blocks ?? _noBlocks;
  const lit = new Set<string>();
  lit.add(tileKey(origin));
  if (radius === 0) return lit;

  // Each octant maps (row, col) offsets onto grid offsets: row walks out
  // from the origin along the octant's primary axis, col spans the slope.
  const octants: ReadonlyArray<readonly [number, number, number, number]> = [
    [1, 0, 0, 1],
    [0, 1, 1, 0],
    [0, -1, 1, 0],
    [-1, 0, 0, 1],
    [-1, 0, 0, -1],
    [0, -1, -1, 0],
    [0, 1, -1, 0],
    [1, 0, 0, -1],
  ];
  // Distance test uses the tile centre; allow half a tile of slack so the
  // visible disc matches what a player perceives at the tile edges.
  const radiusSq = radius * radius + radius;

  const castLight = (
    row: number,
    startSlope: number,
    endSlope: number,
    xx: number,
    xy: number,
    yx: number,
    yy: number,
  ): void => {
    if (startSlope < endSlope || row > radius) return;

    let nextStartSlope = startSlope;
    // `col` walks from the octant's shallow edge toward its steep edge, so
    // scanned slopes descend from 1 to 0.
    for (let col = row; col >= 0; col -= 1) {
      const dx = row * xx + col * xy;
      const dy = row * yx + col * yy;
      // The tile subtends [leftSlope, rightSlope] from the origin's centre.
      const leftSlope = (col - 0.5) / (row + 0.5);
      const rightSlope = (col + 0.5) / (row - 0.5);
      if (startSlope < leftSlope) continue;
      if (endSlope > rightSlope) break;

      const distSq = dx * dx + dy * dy;
      if (distSq <= radiusSq) {
        lit.add(tileKey({ col: origin.col + dx, row: origin.row + dy }));
      }

      if (blocks({ col: origin.col + dx, row: origin.row + dy })) {
        // The wall is visible but shadows the wedge it subtends. Explore
        // the still-lit wedge above it recursively, then continue the scan
        // below it from the wall's shallow edge.
        if (nextStartSlope > rightSlope) {
          castLight(row + 1, nextStartSlope, rightSlope, xx, xy, yx, yy);
        }
        nextStartSlope = leftSlope;
        if (leftSlope <= endSlope) break;
      }
    }

    castLight(row + 1, nextStartSlope, endSlope, xx, xy, yx, yy);
  };

  for (const [xx, xy, yx, yy] of octants) {
    castLight(1, 1, 0, xx, xy, yx, yy);
  }
  return lit;
}

/** Fog-of-war states for a tile. */
export type FogState = 'seen' | 'unseen' | 'visible';

/** Serializable fog state: tile keys grouped by state. */
export interface FogSnapshot {
  seen: string[];
  visible: string[];
}

/**
 * Three-state fog-of-war bookkeeping over `tileKey` strings: `unseen` tiles
 * were never observed, `seen` tiles were observed earlier but are not
 * currently in view, and `visible` tiles are in view right now. `computeFov`
 * produces the same keys, so its result feeds `update()` directly.
 */
export interface Fog {
  /** Serializable snapshot for save files. */
  exportState(): FogSnapshot;
  /** Replaces all fog state with a snapshot. */
  importState(snapshot: FogSnapshot): void;
  /** Current state of one tile. */
  state(key: string): FogState;
  /**
   * Applies a new view: the previously visible tiles become `seen`, the given
   * keys become `visible`, and keys already `seen` stay seen.
   */
  update(visibleKeys: Iterable<string>): void;
  /** Keys currently in view. */
  readonly visible: ReadonlySet<string>;
}

/** Creates an empty fog-of-war tracker (everything `unseen`). */
export function createFog(): Fog {
  const seen = new Set<string>();
  const visible = new Set<string>();

  return {
    exportState() {
      return { seen: [...seen], visible: [...visible] };
    },
    importState(snapshot) {
      seen.clear();
      visible.clear();
      for (const key of snapshot.seen) seen.add(key);
      for (const key of snapshot.visible) visible.add(key);
    },
    state(key) {
      if (visible.has(key)) return 'visible';
      return seen.has(key) ? 'seen' : 'unseen';
    },
    update(visibleKeys) {
      for (const key of visible) seen.add(key);
      visible.clear();
      for (const key of visibleKeys) {
        seen.delete(key);
        visible.add(key);
      }
    },
    get visible() {
      return visible;
    },
  };
}

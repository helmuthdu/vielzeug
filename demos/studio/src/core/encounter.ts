import { computeFov, computeHexFov, type GridTopology, hexTopology, squareTopology } from '@vielzeug/atlas/grid';
import type { ReversibleCommand } from '@vielzeug/ledger';

/**
 * Encounter state for the map scene: a bounded grid, blocked cells, and units.
 * One cell type (`{ q, r }`) serves both grids, so the model, the turn engine,
 * and the painters never branch on the coordinate shape; only the topology and
 * the geometry do.
 */

export type GridKind = 'hex' | 'square';

/** A cell on either grid. On a square grid, `q` is the column and `r` the row. */
export type Cell = Readonly<{ q: number; r: number }>;

export type Team = 'enemy' | 'hero';

export interface Unit {
  /** Catalog archetype name, when the unit came from the bestiary. */
  catalogId?: string;
  id: string;
  /** Stats were tuned by hand; the class identity stays, marked as changed. */
  modified?: boolean;
  move: number;
  name: string;
  q: number;
  r: number;
  /** Attack reach in cells (grid distance, not path cost). */
  range: number;
  team: Team;
}

/** Fog as transported to the worker twin: the toggle plus the two key sets. */
export interface FogData {
  enabled: boolean;
  seen: readonly string[];
  visible: readonly string[];
}

/** Terrain bands the painter resolves to theme colors. */
export type TerrainKind = 'grass' | 'grass-alt' | 'sand' | 'wall' | 'water';

export interface EncounterState {
  /** Cell keys (`"q:r"`) that units cannot enter or cross. */
  blocked: readonly string[];
  grid: GridKind;
  units: readonly Unit[];
}

/** Half-width of the bounded world in cells; the map edge is also the search edge. */
export const WORLD_RADIUS = 24;

/** Radius of a unit's vision for the fog toggle. */
export const FOV_RADIUS = 7;

export function cellKey(cell: Cell): string {
  return `${String(cell.q)}:${String(cell.r)}`;
}

export function emptyEncounter(grid: GridKind = 'square'): EncounterState {
  return { blocked: [], grid, units: [] };
}

/** The 4-way topology over `{ q, r }` cells, matching the hex one's shape. */
const squareTopologyQR: GridTopology<Cell> = (() => {
  const base = squareTopology();
  const toCell = (t: { col: number; row: number }): Cell => ({ q: t.col, r: t.row });
  return {
    distance: (a, b) => Math.abs(a.q - b.q) + Math.abs(a.r - b.r),
    key: cellKey,
    line: (a, b) => base.line({ col: a.q, row: a.r }, { col: b.q, row: b.r }).map(toCell),
    neighbors: (c) => base.neighbors({ col: c.q, row: c.r }).map(toCell),
  };
})();

/** The topology for a grid kind: 4-way square steps, or six hex directions. */
export function topologyFor(grid: GridKind): GridTopology<Cell> {
  return grid === 'hex' ? hexTopology : squareTopologyQR;
}

/** True when the cell lies inside the bounded world. */
export function inBounds(cell: Cell): boolean {
  return Math.abs(cell.q) <= WORLD_RADIUS && Math.abs(cell.r) <= WORLD_RADIUS;
}

export interface EncounterModel {
  /** Cell is inside the world and not blocked. */
  canStand(cell: Cell): boolean;
  readonly disposalSignal: AbortSignal;
  dispose(): void;
  readonly disposed: boolean;
  /** Serializable fog for the worker twin's snapshots. */
  exportFog(): FogData;
  readonly fogEnabled: boolean;
  /** Fog state for a cell key; 'visible' for every cell when fog is off. */
  fogState(cell: Cell): 'seen' | 'unseen' | 'visible';
  /** Replaces fog state (worker side of a snapshot). */
  importFog(fog: FogData): void;
  /** Replaces the whole state (undo/redo, restore, clear). */
  replace(state: EncounterState): void;
  /** Fog on or off; the toggle also recomputes visibility. */
  setFog(enabled: boolean): void;
  readonly state: EncounterState;
  subscribe(listener: () => void, options?: Readonly<{ signal?: AbortSignal }>): () => void;
  /** Deterministic terrain band for a cell; the painter maps it to a color. */
  terrainKind(cell: Cell): TerrainKind;
  readonly topology: GridTopology<Cell>;
  /** Unit standing on a cell, if any. */
  unitAt(cell: Cell): Unit | undefined;
  [Symbol.dispose](): void;
}

function hash2(q: number, r: number): number {
  let h = (q * 374761393 + r * 668265263) | 0;
  h = (h ^ (h >> 13)) * 1274126177;
  return ((h ^ (h >> 16)) >>> 0) / 4294967296;
}

/**
 * DOM-free encounter state with subscriptions. Mutations are the model's own
 * methods (they enforce occupancy and bounds); history lives in a ledger fed
 * by {@link stateCommand}, which snapshots whole states.
 */
export function createEncounterModel(initial: EncounterState = emptyEncounter()): EncounterModel {
  const listeners = new Set<() => void>();
  const controller = new AbortController();
  let state = initial;
  let fogOn = false;
  let visible: ReadonlySet<string> = new Set<string>();
  let seen: ReadonlySet<string> = new Set<string>();

  const notify = (): void => {
    recomputeFov();
    for (const listener of [...listeners]) listener();
  };

  function recomputeFov(): void {
    if (!fogOn) {
      visible = new Set<string>();
      seen = new Set<string>();
      return;
    }
    const blocked = new Set(state.blocked);
    const next = new Set<string>();
    for (const unit of state.units) {
      if (unit.team !== 'hero') continue;
      const cell: Cell = { q: unit.q, r: unit.r };
      const lit =
        state.grid === 'hex'
          ? computeHexFov(cell, FOV_RADIUS, { blocks: (c) => blocked.has(cellKey(c)) })
          : computeFov({ col: cell.q, row: cell.r }, FOV_RADIUS, {
              blocks: (c) => blocked.has(`${String(c.col)}:${String(c.row)}`),
            });
      for (const key of lit) next.add(key);
    }
    const merged = new Set(seen);
    for (const key of visible) merged.add(key);
    seen = merged;
    visible = next;
  }

  const model: EncounterModel = {
    canStand: (cell) => inBounds(cell) && !state.blocked.includes(cellKey(cell)),
    get disposalSignal() {
      return controller.signal;
    },
    dispose() {
      controller.abort();
      listeners.clear();
    },
    get disposed() {
      return controller.signal.aborted;
    },
    exportFog() {
      return { enabled: fogOn, seen: [...seen], visible: [...visible] };
    },
    get fogEnabled() {
      return fogOn;
    },
    fogState(cell) {
      if (!fogOn) return 'visible';
      const key = cellKey(cell);
      if (visible.has(key)) return 'visible';
      return seen.has(key) ? 'seen' : 'unseen';
    },
    importFog(fog) {
      fogOn = fog.enabled;
      seen = new Set(fog.seen);
      visible = new Set(fog.visible);
    },
    replace(next) {
      state = next;
      notify();
    },
    setFog(enabled) {
      fogOn = enabled;
      recomputeFov();
      notify();
    },
    get state() {
      return state;
    },
    subscribe(listener, options) {
      if (options?.signal) {
        if (options.signal.aborted) return () => {};
        options.signal.addEventListener('abort', () => listeners.delete(listener), { once: true });
      }
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    terrainKind(cell) {
      if (state.blocked.includes(cellKey(cell))) return 'wall';
      const r = hash2(cell.q, cell.r);
      if (r < 0.12) return 'water';
      if (r < 0.28) return 'sand';
      return r < 0.66 ? 'grass' : 'grass-alt';
    },
    get topology() {
      return topologyFor(state.grid);
    },
    unitAt(cell) {
      const key = cellKey(cell);
      return state.units.find((unit) => cellKey(unit) === key);
    },
    [Symbol.dispose]: () => model.dispose(),
  };
  recomputeFov();
  return model;
}

/**
 * Records an already-applied whole-state transition. Encounter state is small
 * enough that snapshotting it beats per-action inverse commands: every edit,
 * grid switch, and turn application undoes with the same two lines.
 */
export function stateCommand(
  model: EncounterModel,
  label: string,
  before: EncounterState,
  after: EncounterState,
): ReversibleCommand {
  return {
    apply: () => model.replace(after),
    label,
    revert: () => model.replace(before),
  };
}

import {
  hexCorners,
  hexToWorld,
  iterateTileRange,
  tileToRect,
  visibleHexes,
  visibleTileRange,
  worldToHex,
} from '@vielzeug/atlas/grid';
import type { StageLayerOptions } from '@vielzeug/stage';
import {
  type Cell,
  cellKey,
  type EncounterModel,
  type EncounterState,
  type FogData,
  type TerrainKind,
  WORLD_RADIUS,
} from './encounter.ts';
import { unitClass } from './encounter-catalog.ts';
import type { ReachableMap } from './turn.ts';

/**
 * Painters for the map scene, shared by the main-thread stage and the worker
 * stage so both draw the identical scene from an EncounterModel. Geometry
 * follows the state's grid kind; colors come from a resolved palette because a
 * canvas cannot read CSS custom properties itself.
 */

/** World-unit radius of a cell (square half-edge, hex centre-to-corner). */
export const CELL_SIZE = 30;

export const MAP_LAYOUT = { orientation: 'pointy', size: CELL_SIZE } as const;

/** Square cell's world rect. */
export function cellRect(cell: Cell): { height: number; width: number; x: number; y: number } {
  return tileToRect({ col: cell.q, row: cell.r }, { tileSize: CELL_SIZE * 2 });
}

/** The square cell containing a world point. */
export function worldToCell(point: { x: number; y: number }): Cell {
  return { q: Math.floor(point.x / (CELL_SIZE * 2)), r: Math.floor(point.y / (CELL_SIZE * 2)) };
}

/** The cell containing a world point on the active grid. */
export function cellAt(point: { x: number; y: number }, grid: 'hex' | 'square'): Cell {
  if (grid === 'hex') {
    const hex = worldToHex(point, MAP_LAYOUT);
    return { q: hex.q, r: hex.r };
  }
  return worldToCell(point);
}

/** The colors a frame needs, resolved from the page's Refine tokens. */
export interface MapPalette {
  background: string;
  blocked: string;
  /** Lightness used for class-hue token fills; the dark theme lifts it so
   * labels keep their contrast against the token. */
  classLightness: string;
  fallen: string;
  fogSeen: string;
  fogUnseen: string;
  ghost: string;
  grid: string;
  hover: string;
  labelFont: string;
  reachable: string;
  route: string;
  selected: string;
  terrain: Record<TerrainKind, string>;
  unitEnemy: string;
  unitHero: string;
  unitText: string;
}

/**
 * Resolves the map palette from computed styles, so canvas matches the theme.
 * Custom properties compute to their literal text (often `light-dark(...)`),
 * which canvas cannot parse; painting them through a standard property on a
 * hidden probe lets the browser resolve the color first.
 */
export function resolveMapPalette(source: HTMLElement): MapPalette {
  const probe = document.createElement('span');
  probe.setAttribute('aria-hidden', 'true');
  probe.style.display = 'none';
  source.append(probe);
  const read = (name: string, fallback: string): string => {
    probe.style.color = `var(${name}, ${fallback})`;
    return getComputedStyle(probe).color.trim() || fallback;
  };
  const palette: MapPalette = {
    background: read('--color-neutral-backdrop', '#111417'),
    blocked: read('--color-neutral-darker', '#3f3f46'),
    // The theme class flips the token values, but the class-hue fills are
    // composed here, so the lightness has to follow the theme too.
    classLightness: document.documentElement.classList.contains('dark') ? '68%' : '58%',
    fallen: read('--color-error', '#e11d48'),
    fogSeen: read('--overlay-veil', 'rgba(0, 0, 0, 0.55)'),
    fogUnseen: read('--color-scrim', 'rgba(0, 0, 0, 0.9)'),
    ghost: read('--color-neutral-border', 'rgba(120, 120, 120, 0.5)'),
    grid: read('--color-neutral-border', 'rgba(120, 120, 120, 0.3)'),
    hover: read('--color-primary-backdrop', 'rgba(120, 90, 200, 0.25)'),
    labelFont: getComputedStyle(source).fontFamily || 'sans-serif',
    reachable: read('--color-primary-border', 'rgba(120, 90, 200, 0.35)'),
    // Routes are planned movement, selection is intent: they must not share
    // the primary colour, or a trail reads as a selected unit.
    route: read('--color-info', '#3b82f6'),
    selected: read('--color-primary', '#7c3aed'),
    terrain: {
      grass: read('--color-success-backdrop', '#2f5d3a'),
      'grass-alt': read('--color-success-lighter', '#3a6f47'),
      sand: read('--color-warning-backdrop', '#8a6d3b'),
      wall: read('--color-neutral-dark', '#52525b'),
      water: read('--color-info-backdrop', '#1f4d6b'),
    },
    unitEnemy: read('--color-error', '#e11d48'),
    unitHero: read('--color-success', '#16a34a'),
    unitText: read('--color-neutral-contrast', '#ffffff'),
  };
  probe.remove();
  return palette;
}

/** Cells to paint for a world rect on the active grid, bounded by the world. */
function visibleCells(view: { height: number; width: number; x: number; y: number }, grid: 'hex' | 'square'): Cell[] {
  const out: Cell[] = [];
  if (grid === 'hex') {
    for (const hex of visibleHexes(view, MAP_LAYOUT)) {
      if (Math.abs(hex.q) <= WORLD_RADIUS && Math.abs(hex.r) <= WORLD_RADIUS) out.push({ q: hex.q, r: hex.r });
    }
    return out;
  }
  const range = visibleTileRange(view, { tileSize: CELL_SIZE * 2 });
  for (const tile of iterateTileRange(range)) {
    if (Math.abs(tile.col) <= WORLD_RADIUS && Math.abs(tile.row) <= WORLD_RADIUS) {
      out.push({ q: tile.col, r: tile.row });
    }
  }
  return out;
}

function cellPath(ctx: CanvasRenderingContext2D, cell: Cell, grid: 'hex' | 'square'): void {
  ctx.beginPath();
  if (grid === 'square') {
    const rect = cellRect(cell);
    ctx.rect(rect.x, rect.y, rect.width, rect.height);
    return;
  }
  const corners = hexCorners(cell, MAP_LAYOUT);
  const first = corners[0];
  if (!first) return;
  ctx.moveTo(first.x, first.y);
  for (const corner of corners.slice(1)) ctx.lineTo(corner.x, corner.y);
  ctx.closePath();
}

/**
 * The centre of a cell in world units, honouring the active grid. Square cells
 * are centred from their tile rect; using the hex formula there would paint
 * units beside the terrain they stand on.
 */
export function cellCenter(cell: Cell, grid: 'hex' | 'square'): { x: number; y: number } {
  if (grid === 'square') {
    const rect = cellRect(cell);
    return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
  }
  return hexToWorld(cell, MAP_LAYOUT);
}

/** Hero tokens are circles, enemy tokens diamonds: team reads without colour. */
function tokenPath(
  ctx: CanvasRenderingContext2D,
  center: { x: number; y: number },
  radius: number,
  team: 'enemy' | 'hero',
): void {
  ctx.beginPath();
  if (team === 'hero') {
    ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
    return;
  }
  ctx.moveTo(center.x, center.y - radius);
  ctx.lineTo(center.x + radius, center.y);
  ctx.lineTo(center.x, center.y + radius);
  ctx.lineTo(center.x - radius, center.y);
  ctx.closePath();
}

export interface MapLayerOptions {
  /** Cell the keyboard cursor sits on, or null. The scene only sets this
   * while the canvas has keyboard focus, so mouse users never see it. */
  cursor?: Cell | null;
  /** Cells where a unit fell during the last turn. */
  fallen?: readonly Cell[];
  /** Cells units vacated during the last turn, drawn as ghosts. */
  ghosts?: readonly Cell[];
  /** Cell highlighted from the turn-results list, or null. */
  highlight?: Cell | null;
  /** Cell the pointer hovers over, or null. */
  hover?: Cell | null;
  palette: MapPalette;
  reachable?: ReachableMap;
  /** Routes walked during the last turn, one list per moving enemy. */
  routes?: readonly (readonly Cell[])[];
  selectedId?: string | null;
}

/**
 * Builds the layer list. The mutable `overlay` object is read at paint time,
 * so the scene updates it and invalidates the overlay layer without rebuilding
 * the stage.
 */
export function createMapLayers(
  model: EncounterModel,
  overlay: { current: MapLayerOptions },
): readonly StageLayerOptions[] {
  return [
    {
      id: 'terrain',
      paint: (ctx, { visibleRect }) => {
        const { palette } = overlay.current;
        const grid = model.state.grid;
        ctx.fillStyle = palette.background;
        ctx.fillRect(visibleRect.x, visibleRect.y, visibleRect.width, visibleRect.height);
        for (const cell of visibleCells(visibleRect, grid)) {
          cellPath(ctx, cell, grid);
          // Blocked cells get their own flat treatment instead of reusing the
          // terrain palette; decorative terrain stays a subtle variation.
          if (model.state.blocked.includes(cellKey(cell))) {
            ctx.fillStyle = palette.blocked;
            ctx.fill();
            ctx.strokeStyle = palette.grid;
            ctx.lineWidth = 1;
            ctx.stroke();
            continue;
          }
          ctx.globalAlpha = 0.45;
          ctx.fillStyle = palette.terrain[model.terrainKind(cell)];
          ctx.fill();
          ctx.globalAlpha = 1;
          ctx.strokeStyle = palette.grid;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      },
    },
    {
      id: 'reachable',
      paint: (ctx) => {
        const { reachable, palette } = overlay.current;
        if (!reachable || reachable.size === 0) return;
        const grid = model.state.grid;
        ctx.fillStyle = palette.reachable;
        for (const cell of reachable.keys()) {
          cellPath(ctx, keyToCell(cell), grid);
          ctx.fill();
        }
      },
    },
    {
      id: 'routes',
      paint: (ctx) => {
        const { routes, palette } = overlay.current;
        if (!routes || routes.length === 0) return;
        const grid = model.state.grid;
        ctx.strokeStyle = palette.route;
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.setLineDash([10, 7]);
        for (const route of routes) {
          if (route.length < 2) continue;
          ctx.beginPath();
          const first = cellCenter(route[0] as Cell, grid);
          ctx.moveTo(first.x, first.y);
          for (const cell of route.slice(1)) {
            const p = cellCenter(cell, grid);
            ctx.lineTo(p.x, p.y);
          }
          ctx.stroke();
        }
        ctx.setLineDash([]);
        // Destination markers so the route end is unmistakable.
        ctx.fillStyle = palette.route;
        for (const route of routes) {
          if (route.length < 2) continue;
          const end = cellCenter(route[route.length - 1] as Cell, grid);
          cellPath(ctx, route[route.length - 1] as Cell, grid);
          ctx.globalAlpha = 0.35;
          ctx.fill();
          ctx.globalAlpha = 1;
          ctx.beginPath();
          ctx.arc(end.x, end.y, 5, 0, Math.PI * 2);
          ctx.fill();
        }
      },
    },
    {
      id: 'ghosts',
      paint: (ctx) => {
        const { ghosts, palette } = overlay.current;
        if (!ghosts || ghosts.length === 0) return;
        const grid = model.state.grid;
        ctx.globalAlpha = 0.45;
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = palette.ghost;
        ctx.lineWidth = 2;
        for (const cell of ghosts) {
          cellPath(ctx, cell, grid);
          ctx.stroke();
        }
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
      },
    },
    {
      id: 'units',
      paint: (ctx) => {
        const { palette, selectedId, highlight } = overlay.current;
        const font = palette.labelFont;
        const grid = model.state.grid;
        for (const unit of model.state.units) {
          const center = cellCenter({ q: unit.q, r: unit.r }, grid);
          const radius = CELL_SIZE * 0.62;
          const entry = unitClass(unit.team, unit.catalogId);
          tokenPath(ctx, center, radius, unit.team);
          // The class hue identifies the archetype; the team stays legible
          // twice over, in the token shape and in the ring drawn under it.
          ctx.fillStyle = entry
            ? `oklch(${palette.classLightness} 0.16 ${String(entry.hue)})`
            : unit.team === 'hero'
              ? palette.unitHero
              : palette.unitEnemy;
          ctx.fill();
          if (unit.id === selectedId) {
            ctx.lineWidth = 3;
            ctx.strokeStyle = palette.selected;
            ctx.stroke();
          } else if (highlight && highlight.q === unit.q && highlight.r === unit.r) {
            ctx.lineWidth = 3;
            ctx.strokeStyle = palette.route;
            ctx.stroke();
          } else {
            ctx.lineWidth = 3;
            ctx.strokeStyle = unit.team === 'hero' ? palette.unitHero : palette.unitEnemy;
            ctx.stroke();
          }
          ctx.fillStyle = palette.unitText;
          ctx.font = `bold ${String(Math.round(CELL_SIZE * 0.7))}px ${font}`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText((entry?.token ?? unit.name.slice(0, 2)).toUpperCase(), center.x, center.y + 1);
        }
      },
    },
    {
      id: 'fallen',
      paint: (ctx) => {
        const { fallen, palette } = overlay.current;
        if (!fallen || fallen.length === 0) return;
        const grid = model.state.grid;
        // A cross at the cell where the unit fell: the kill stays visible
        // after the token disappears.
        ctx.strokeStyle = palette.fallen;
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        for (const cell of fallen) {
          const center = cellCenter(cell, grid);
          const arm = CELL_SIZE * 0.42;
          ctx.beginPath();
          ctx.moveTo(center.x - arm, center.y - arm);
          ctx.lineTo(center.x + arm, center.y + arm);
          ctx.moveTo(center.x + arm, center.y - arm);
          ctx.lineTo(center.x - arm, center.y + arm);
          ctx.stroke();
        }
      },
    },
    {
      id: 'hover',
      paint: (ctx) => {
        const { hover, palette } = overlay.current;
        if (!hover) return;
        cellPath(ctx, hover, model.state.grid);
        ctx.fillStyle = palette.hover;
        ctx.fill();
      },
    },
    {
      id: 'cursor',
      paint: (ctx) => {
        const { cursor, palette } = overlay.current;
        if (!cursor) return;
        cellPath(ctx, cursor, model.state.grid);
        // The scene clears this while the canvas is unfocused, so what is
        // drawn here is always the keyboard cursor and deserves emphasis.
        ctx.lineWidth = 3;
        ctx.strokeStyle = palette.selected;
        ctx.stroke();
      },
    },
    {
      id: 'fog',
      paint: (ctx, { visibleRect }) => {
        if (!model.fogEnabled) return;
        const { palette } = overlay.current;
        const grid = model.state.grid;
        for (const cell of visibleCells(visibleRect, grid)) {
          const state = model.fogState(cell);
          if (state === 'visible') continue;
          cellPath(ctx, cell, grid);
          ctx.fillStyle = state === 'seen' ? palette.fogSeen : palette.fogUnseen;
          ctx.fill();
        }
      },
    },
  ];
}

function keyToCell(key: string): Cell {
  const [q, r] = key.split(':').map(Number);
  return { q: q as number, r: r as number };
}

/**
 * The one message the worker receives: a full state snapshot plus the overlay
 * and palette needed to paint it. One message type means the worker's twin can
 * never drift from the main-thread model.
 */
export interface MapSceneMessage {
  fog: FogData;
  overlay: {
    cursor: Cell | null;
    fallen: readonly Cell[];
    ghosts: readonly Cell[];
    highlight: Cell | null;
    hover: Cell | null;
    palette: MapPalette;
    reachable: readonly string[];
    routes: readonly (readonly Cell[])[];
    selectedId: string | null;
  };
  state: EncounterState;
  type: 'state';
}

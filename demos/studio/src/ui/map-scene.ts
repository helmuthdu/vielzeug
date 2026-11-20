import '@vielzeug/refine/badge';
import '@vielzeug/refine/button';
import '@vielzeug/refine/button-group';
import '@vielzeug/refine/counter';
import '@vielzeug/refine/dock';
import '@vielzeug/refine/drawer';
import '@vielzeug/refine/icon';
import '@vielzeug/refine/icons/lucide/all';
import '@vielzeug/refine/input';
import '@vielzeug/refine/list';
import '@vielzeug/refine/select';
import '@vielzeug/refine/separator';
import '@vielzeug/refine/switch';
import '@vielzeug/refine/tooltip';

import { createCamera, scaleOf } from '@vielzeug/atlas';
import { createDragGesture } from '@vielzeug/gesture';
import { createKeymap, formatShortcut } from '@vielzeug/keymap';
import { createLedger } from '@vielzeug/ledger';
import { createStage, type StageController } from '@vielzeug/stage';
import { createWorkerStage } from '@vielzeug/stage/worker';
import {
  type Cell,
  cellKey,
  createEncounterModel,
  type EncounterState,
  emptyEncounter,
  stateCommand,
  type Unit,
  WORLD_RADIUS,
} from '../core/encounter.ts';
import { ENEMY_CATALOG, HERO_CATALOG, type UnitClass, unitClass } from '../core/encounter-catalog.ts';
import {
  CELL_SIZE,
  cellAt,
  cellCenter,
  createMapLayers,
  type MapPalette,
  type MapSceneMessage,
  resolveMapPalette,
} from '../core/map-layers.ts';
import { createEncounterPersistence, type EncounterRow, studioStore } from '../core/persist.ts';
import { planTurn, reachableCells, type TurnPlan, type UnitPlan } from '../core/turn.ts';
import MapWorker from '../worker/map.worker.ts?worker&inline';
import { createCameraGestures } from './camera-gestures.ts';
import { trackDockHeight } from './dock-badge.ts';
import './map.css';
import type { SceneHandle } from './shell.ts';

type RenderMode = 'main' | 'worker';
type MapTool = 'block' | 'enemy' | 'erase' | 'hero' | 'select';

function catalogOptions(catalog: readonly UnitClass[]): { label: string; value: string }[] {
  return [
    { label: 'Custom unit', value: '' },
    ...catalog.map((entry) => ({
      label: `${entry.name} · move ${String(entry.move)} · reach ${String(entry.range)}`,
      value: entry.name,
    })),
  ];
}

function toolTip(label: string, shortcut: string): string {
  return `${label} (${formatShortcut(shortcut)})`;
}

/** "1 hero" / "3 heroes" for the status line. */
function count(n: number, singular: string, plural: string): string {
  return n === 1 ? `1 ${singular}` : `${String(n)} ${plural}`;
}

/**
 * True when the key was typed into a field. Composed keydowns from a custom
 * element's shadow `<input>` retarget to the host, so the path is walked
 * instead of trusting `event.target`.
 */
function isEditableTarget(event: KeyboardEvent): boolean {
  return event
    .composedPath()
    .some(
      (node) =>
        node instanceof HTMLElement &&
        (node.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(node.tagName)),
    );
}

function nextId(units: readonly Unit[], prefix: string): string {
  let n = 1;
  const taken = new Set(units.map((unit) => unit.id));
  while (taken.has(`${prefix}-${String(n)}`)) n += 1;
  return `${prefix}-${String(n)}`;
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"]/g,
    (char) => ({ '"': '&quot;', '&': '&amp;', '<': '&lt;', '>': '&gt;' })[char] as string,
  );
}

/** A cell step for an arrow key; the same keys work on both grids. */
function cursorStep(key: string): Cell | null {
  switch (key) {
    case 'ArrowUp':
      return { q: 0, r: -1 };
    case 'ArrowDown':
      return { q: 0, r: 1 };
    case 'ArrowLeft':
      return { q: -1, r: 0 };
    case 'ArrowRight':
      return { q: 1, r: 0 };
    default:
      return null;
  }
}

/** The first-run encounter: blockers, two heroes, three bestiary enemies. */
function seedEncounter(): EncounterState {
  const blocked = [
    { q: 2, r: -4 },
    { q: 2, r: -3 },
    { q: 2, r: -2 },
    { q: 2, r: -1 },
    { q: 2, r: 1 },
    { q: 2, r: 2 },
    { q: -3, r: 3 },
    { q: -2, r: 3 },
    { q: -1, r: 3 },
  ];
  return {
    ...emptyEncounter('square'),
    blocked: blocked.map(cellKey),
    units: [
      { catalogId: 'Ranger', id: 'hero-1', move: 4, name: 'Ranger', q: -4, r: -2, range: 5, team: 'hero' },
      { catalogId: 'Cleric', id: 'hero-2', move: 3, name: 'Cleric', q: -5, r: 1, range: 2, team: 'hero' },
      { catalogId: 'Brute', id: 'enemy-1', move: 4, name: 'Brute', q: 5, r: -3, range: 1, team: 'enemy' },
      { catalogId: 'Archer', id: 'enemy-2', move: 3, name: 'Archer', q: 6, r: 0, range: 5, team: 'enemy' },
      { catalogId: 'Skirmisher', id: 'enemy-3', move: 6, name: 'Skirmisher', q: 4, r: 3, range: 1, team: 'enemy' },
    ],
  };
}

/**
 * Mounts the map scene: an encounter editor over a square or hex grid. Paint
 * blockers and place units with the dock tools, edit a selected unit in the
 * inspector drawer, and run a simple explained enemy turn. Every edit is a
 * ledger command (undo/redo), the encounter persists through vault, and the
 * whole scene can render on a worker thread via @vielzeug/stage/worker.
 */
export function mountMapScene(container: HTMLElement): SceneHandle {
  container.replaceChildren();

  const root = document.createElement('div');
  root.className = 'map-root';
  root.dataset.testid = 'map-root';
  container.append(root);

  const mount = document.createElement('div');
  mount.className = 'map-mount';
  mount.dataset.testid = 'map-mount';
  root.append(mount);

  const ghost = document.createElement('div');
  ghost.className = 'map-token-ghost';
  ghost.dataset.testid = 'map-token-ghost';
  ghost.hidden = true;
  root.append(ghost);

  const toolbar = document.createElement('ore-dock');
  toolbar.setAttribute('floating', '');
  toolbar.setAttribute('label', 'Map actions');
  toolbar.className = 'studio-dock';
  toolbar.dataset.testid = 'map-toolbar';
  toolbar.innerHTML = `
    <ore-button-group label="Map tools" size="sm" value="select" data-testid="map-tools">
      <ore-tooltip content="${toolTip('Select / move', 'v')}" placement="top"><ore-button data-tool="select" value="select" variant="ghost" icon-only label="Select"><ore-icon name="mouse-pointer-2"></ore-icon></ore-button></ore-tooltip>
      <ore-tooltip content="${toolTip('Paint blocker', 'b')}" placement="top"><ore-button data-tool="block" value="block" variant="ghost" icon-only label="Paint blocker"><ore-icon name="brick-wall"></ore-icon></ore-button></ore-tooltip>
      <ore-tooltip content="${toolTip('Place hero', 'h')}" placement="top"><ore-button data-tool="hero" value="hero" variant="ghost" icon-only label="Place hero"><ore-icon name="circle-user"></ore-icon></ore-button></ore-tooltip>
      <ore-tooltip content="${toolTip('Place enemy', 'e')}" placement="top"><ore-button data-tool="enemy" value="enemy" variant="ghost" icon-only label="Place enemy"><ore-icon name="skull"></ore-icon></ore-button></ore-tooltip>
      <ore-tooltip content="${toolTip('Erase', 'x')}" placement="top"><ore-button data-tool="erase" value="erase" variant="ghost" icon-only label="Erase"><ore-icon name="eraser"></ore-icon></ore-button></ore-tooltip>
    </ore-button-group>
    <ore-separator orientation="vertical"></ore-separator>
    <ore-button-group label="Grid shape" size="sm" value="square" data-testid="map-grid">
      <ore-tooltip content="Square grid" placement="top"><ore-button value="square" variant="ghost" icon-only label="Square grid"><ore-icon name="grid-3x3"></ore-icon></ore-button></ore-tooltip>
      <ore-tooltip content="Hex grid" placement="top"><ore-button value="hex" variant="ghost" icon-only label="Hex grid"><ore-icon name="hexagon"></ore-icon></ore-button></ore-tooltip>
    </ore-button-group>
    <ore-separator orientation="vertical"></ore-separator>
    <ore-button-group label="History" size="sm">
      <ore-tooltip content="${toolTip('Undo', 'mod+z')}" placement="top"><ore-button data-history="undo" variant="ghost" icon-only label="Undo"><ore-icon name="undo-2"></ore-icon></ore-button></ore-tooltip>
      <ore-tooltip content="${toolTip('Redo', 'mod+shift+z')}" placement="top"><ore-button data-history="redo" variant="ghost" icon-only label="Redo"><ore-icon name="redo-2"></ore-icon></ore-button></ore-tooltip>
    </ore-button-group>
    <ore-separator orientation="vertical"></ore-separator>
    <ore-tooltip content="Fog of war" placement="top"><ore-switch data-action="fog" size="sm" label="Fog of war"></ore-switch></ore-tooltip>
    <ore-tooltip content="Export PNG" placement="top"><ore-button data-action="export" variant="ghost" icon-only label="Export PNG"><ore-icon name="image-down"></ore-icon></ore-button></ore-tooltip>`;
  root.append(toolbar);

  // The render-thread toggle is a developer control: it lives beside the
  // status badge, out of the editing dock, so the dock stays about the task.
  const threadDock = document.createElement('div');
  threadDock.className = 'map-thread-dock';
  threadDock.dataset.testid = 'map-thread';
  threadDock.innerHTML = `<ore-button-group label="Render thread" size="sm" value="main">
    <ore-tooltip content="Render on the main thread" placement="top"><ore-button value="main" variant="ghost">Main</ore-button></ore-tooltip>
    <ore-tooltip content="Render on a worker thread" placement="top"><ore-button value="worker" variant="ghost">Worker</ore-button></ore-tooltip>
  </ore-button-group>`;
  root.append(threadDock);

  // The shell moves this element to the very end of the dock, after its zoom
  // cluster, so the scene's primary action sits furthest right. It stays a
  // child of the toolbar, so the toolbar's click delegation still catches it.
  const dockTail = document.createElement('div');
  dockTail.className = 'map-dock-tail';
  dockTail.dataset.testid = 'map-dock-tail';
  dockTail.innerHTML = `<ore-tooltip content="${toolTip('Run turn', 'mod+enter')}" placement="top"><ore-button data-action="turn" variant="primary" data-testid="map-turn"><ore-icon name="swords" slot="prefix"></ore-icon>Run turn</ore-button></ore-tooltip>`;
  toolbar.append(dockTail);

  const status = document.createElement('ore-badge');
  status.setAttribute('variant', 'frost');
  status.setAttribute('rounded', 'full');
  status.className = 'studio-badge';
  status.dataset.testid = 'map-status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  root.append(status);
  const stopDockTrack = trackDockHeight(toolbar, root);

  // Shown when a turn ends the round. "Retry encounter" replays the
  // encounter as it stood before the first turn of this run; "Start demo
  // map" falls back to the seed layout.
  const gameOver = document.createElement('div');
  gameOver.className = 'map-gameover';
  gameOver.dataset.testid = 'map-gameover';
  gameOver.setAttribute('role', 'status');
  gameOver.hidden = true;
  gameOver.innerHTML = `
    <div class="map-gameover-card">
      <p class="map-gameover-title" data-testid="map-gameover-title">Game over</p>
      <p class="map-gameover-sub" data-testid="map-gameover-sub">The enemies wiped out the party.</p>
      <div class="map-gameover-actions">
        <ore-button data-action="retry" variant="primary" size="sm" data-testid="map-retry">Retry encounter</ore-button>
        <ore-button data-action="restart" variant="outline" size="sm" data-testid="map-restart">Start demo map</ore-button>
      </div>
    </div>`;
  root.append(gameOver);

  const inspector = document.createElement('ore-drawer');
  inspector.setAttribute('placement', 'right');
  inspector.setAttribute('modal', 'false');
  inspector.setAttribute('title', 'Unit');
  inspector.dataset.testid = 'map-inspector';
  inspector.innerHTML = `
    <form class="map-inspector-form" data-testid="map-inspector-form">
      <ore-input data-field="name" label="Name" value=""></ore-input>
      <ore-select data-field="team" label="Team" value="hero">
        <option value="hero">Hero</option>
        <option value="enemy">Enemy</option>
      </ore-select>
      <ore-select data-field="catalog" label="Class" value="">
        ${catalogOptions(ENEMY_CATALOG)
          .map((option) => `<option value="${escapeHtml(option.value)}">${escapeHtml(option.label)}</option>`)
          .join('')}
      </ore-select>
      <p class="map-inspector-ability" data-field="ability" hidden></p>
      <div class="map-inspector-counters">
        <ore-counter data-field="move" label="Move" size="sm" min="0" max="12" value="3"></ore-counter>
        <ore-counter data-field="range" label="Reach" size="sm" min="0" max="12" value="1"></ore-counter>
      </div>
      <div class="map-inspector-actions">
        <ore-button data-action="delete-unit" variant="error" size="sm">Remove unit</ore-button>
      </div>
    </form>`;
  root.append(inspector);

  const results = document.createElement('ore-drawer');
  results.setAttribute('placement', 'bottom');
  results.setAttribute('modal', 'false');
  results.setAttribute('title', 'Turn');
  results.dataset.testid = 'map-results';
  root.append(results);

  const toolGroup = toolbar.querySelector<HTMLElement>('[data-testid="map-tools"]');
  const gridGroup = toolbar.querySelector<HTMLElement>('[data-testid="map-grid"]');
  const threadGroup = threadDock.querySelector<HTMLElement>('ore-button-group');
  const undoButton = toolbar.querySelector<HTMLElement>('[data-history="undo"]');
  const redoButton = toolbar.querySelector<HTMLElement>('[data-history="redo"]');
  const fogSwitch = toolbar.querySelector<HTMLElement>('[data-action="fog"]');

  const persistence = createEncounterPersistence(studioStore());
  const model = createEncounterModel();
  const ledger = createLedger();
  const camera = createCamera({ initial: { x: 0, y: 0, zoom: 1 }, minZoom: 0.25 });

  let tool: MapTool = 'select';
  let mode: RenderMode = 'main';
  let selectedId: string | null = null;
  let cursor: Cell | null = null;
  let palette: MapPalette = resolveMapPalette(root);
  let renderer: StageController | null = null;
  // Set in worker mode: pushes a full snapshot to the worker twin.
  let sendSnapshot: ((message: MapSceneMessage) => void) | null = null;
  let detached: (() => void) | null = null;
  let statusTimer = 0;
  let restoring = true;

  // Turn visuals: routes, vacated cells, and fallen markers from the last
  // turn, cleared by the next edit or when the results panel closes.
  let turnRoutes: readonly (readonly Cell[])[] = [];
  let turnGhosts: readonly Cell[] = [];
  let turnFallen: readonly Cell[] = [];
  // The encounter as it stood before this run's first turn, so the game-over
  // card can replay what the user built instead of the demo seed.
  let preTurnState: EncounterState | null = null;
  // The keyboard cursor is drawn only while the canvas has focus.
  let canvasFocused = false;

  const overlay = {
    current: {
      cursor: null as Cell | null,
      fallen: [] as readonly Cell[],
      ghosts: [] as readonly Cell[],
      highlight: null as Cell | null,
      hover: null as Cell | null,
      palette,
      reachable: new Map<string, number>() as ReadonlyMap<string, number>,
      routes: [] as readonly (readonly Cell[])[],
      selectedId: null as string | null,
    },
  };

  function updateStatus(message?: string): void {
    if (message) {
      status.textContent = message;
      window.clearTimeout(statusTimer);
      statusTimer = window.setTimeout(() => updateStatus(), 2200);
      return;
    }
    const state = model.state;
    const heroes = state.units.filter((unit) => unit.team === 'hero').length;
    const enemies = state.units.length - heroes;
    status.textContent = `${count(heroes, 'hero', 'heroes')} · ${count(enemies, 'enemy', 'enemies')} · ${state.grid} grid`;
    status.dataset.units = String(state.units.length);
    status.dataset.grid = state.grid;
    status.dataset.mode = mode;
    // The badge truncates on narrow screens; the shared contract expects a title.
    status.title = status.textContent ?? '';
  }

  /** Pushes the current state + overlay to whichever renderer is live. */
  function sync(): void {
    if (!renderer) return;
    if (sendSnapshot) {
      sendSnapshot({
        fog: model.exportFog(),
        overlay: {
          cursor,
          fallen: overlay.current.fallen,
          ghosts: overlay.current.ghosts,
          highlight: overlay.current.highlight,
          hover: overlay.current.hover,
          palette,
          reachable: [...overlay.current.reachable.keys()],
          routes: overlay.current.routes,
          selectedId,
        },
        state: model.state,
        type: 'state',
      });
      return;
    }
    renderer.invalidate('terrain');
    renderer.invalidate('reachable');
    renderer.invalidate('routes');
    renderer.invalidate('ghosts');
    renderer.invalidate('units');
    renderer.invalidate('fallen');
    renderer.invalidate('hover');
    renderer.invalidate('cursor');
    renderer.invalidate('fog');
  }

  function refreshOverlay(): void {
    // The cursor is a keyboard affordance: mouse users never see it.
    overlay.current.cursor = canvasFocused ? cursor : null;
    overlay.current.palette = palette;
    overlay.current.selectedId = selectedId;
    overlay.current.reachable = selectedId ? reachableCells(model.state, selectedId) : new Map();
    overlay.current.routes = turnRoutes;
    overlay.current.ghosts = turnGhosts;
    overlay.current.fallen = turnFallen;
  }

  /** Turn trails belong to one turn; any edit or closed panel retires them. */
  function clearTurnVisuals(): void {
    const highlight = overlay.current.highlight;

    if (turnRoutes.length === 0 && turnGhosts.length === 0 && turnFallen.length === 0 && !highlight) return;
    turnRoutes = [];
    turnGhosts = [];
    turnFallen = [];
    root.dataset.turnFallen = '0';
    overlay.current.highlight = null;
    refreshOverlay();
  }

  /** Pans the camera only as far as needed to keep the keyboard cursor visible. */
  function keepCursorInView(): void {
    if (!cursor) return;
    const point = cellCenter(cursor, model.state.grid);
    const view = camera.visibleRect;
    let { x, y } = camera.state;
    if (point.x < view.x) x -= view.x - point.x;
    else if (point.x > view.x + view.width) x += point.x - (view.x + view.width);
    if (point.y < view.y) y -= view.y - point.y;
    else if (point.y > view.y + view.height) y += point.y - (view.y + view.height);
    if (x !== camera.state.x || y !== camera.state.y) camera.animateTo({ x, y }, { duration: 90 });
  }

  /** What the keyboard cursor is on, for the status announcement. */
  function describeCursorCell(): string {
    if (!cursor) return 'Cursor off the map';
    const key = cellKey(cursor);
    const unit = model.state.units.find((candidate) => cellKey(candidate) === key);
    if (unit) return `${unit.name} at ${key}`;
    return model.state.blocked.includes(key) ? `Blocker at ${key}` : `Empty cell ${key}`;
  }

  function snapshot(): EncounterRow {
    return { fog: model.exportFog(), id: 'encounter', state: model.state };
  }

  /** Applies a state transition, records it on the ledger, repaints. */
  function commit(label: string, next: EncounterState): void {
    const before = model.state;
    model.replace(next);
    ledger.record(stateCommand(model, label, before, next));
  }

  /**
   * Stepping history means the encounter the user built no longer matches the
   * snapshot the game-over card would replay, so "Retry" falls back to the seed.
   */
  function stepHistory(direction: 'undo' | 'redo'): void {
    preTurnState = null;
    void (direction === 'undo' ? ledger.undo() : ledger.redo());
  }

  const unsubscribeModel = model.subscribe(() => {
    if (restoring) return;
    // Any change after a turn (an edit, an undo, a drag) retires its trails.
    clearTurnVisuals();
    // Undoing a wipeout (or reviving a hero) takes the game-over card away.
    if (model.state.units.some((unit) => unit.team === 'hero')) gameOver.hidden = true;
    // The model is the source of truth for the inspector: undo, redo, a turn,
    // or an erase elsewhere can change or remove the selected unit at any time.
    if (selectedId && !model.state.units.some((unit) => unit.id === selectedId)) {
      selectedId = null;
      inspector.toggleAttribute('open', false);
    }
    if (selectedId) {
      const unit = model.state.units.find((candidate) => candidate.id === selectedId);
      if (unit) fillInspector(unit);
    }
    refreshOverlay();
    sync();
    updateStatus();
    persistence.schedule(() => [snapshot()]);
  });

  const unsubscribeLedger = ledger.state.subscribe(() => {
    const snap = ledger.state.getSnapshot();
    undoButton?.toggleAttribute('disabled', snap.undo.length === 0);
    redoButton?.toggleAttribute('disabled', snap.redo.length === 0);
  });

  // ── Editing ───────────────────────────────────────────────────────────────

  function setBlocked(cell: Cell, blocked: boolean): void {
    const key = cellKey(cell);
    const current = new Set(model.state.blocked);
    if (blocked === current.has(key)) return;
    if (blocked) current.add(key);
    else current.delete(key);
    // A blocker evicts whatever stood on the cell.
    const units = blocked ? model.state.units.filter((unit) => cellKey(unit) !== key) : model.state.units;
    commit(blocked ? 'Paint blocker' : 'Clear blocker', { ...model.state, blocked: [...current], units });
  }

  function placeUnit(cell: Cell, team: 'enemy' | 'hero'): void {
    const key = cellKey(cell);
    if (!model.canStand(cell) || model.state.units.some((unit) => cellKey(unit) === key)) {
      updateStatus('That cell is taken or blocked');
      return;
    }
    const klass = team === 'enemy' ? ENEMY_CATALOG[0] : HERO_CATALOG[0];
    // Names carry the next free ordinal so several same-class units are
    // distinguishable in the turn results and on the canvas. A scan (not a
    // count) means deleting "Brute 1" does not produce a second "Brute 2".
    const sameKind = model.state.units.filter((unit) => unit.team === team && unit.catalogId === klass.name);
    const taken = new Set(sameKind.map((unit) => unit.name));
    let ordinal = 1;
    while (taken.has(`${klass.name} ${String(ordinal)}`)) ordinal += 1;
    const unit: Unit = {
      catalogId: klass.name,
      id: nextId(model.state.units, team),
      move: klass.move,
      name: `${klass.name} ${String(ordinal)}`,
      q: cell.q,
      r: cell.r,
      range: klass.range,
      team,
    };
    commit(`Place ${unit.name}`, { ...model.state, units: [...model.state.units, unit] });
  }

  function erase(cell: Cell): void {
    const unit = model.state.units.find((candidate) => cellKey(candidate) === cellKey(cell));
    if (unit) {
      commit(`Remove ${unit.name}`, { ...model.state, units: model.state.units.filter((c) => c.id !== unit.id) });
      if (selectedId === unit.id) select(null);
      return;
    }
    setBlocked(cell, false);
  }

  function applyTool(cell: Cell): void {
    switch (tool) {
      case 'block':
        setBlocked(cell, true);
        break;
      case 'enemy':
        placeUnit(cell, 'enemy');
        break;
      case 'erase':
        erase(cell);
        break;
      case 'hero':
        placeUnit(cell, 'hero');
        break;
      case 'select': {
        const unit = model.state.units.find((candidate) => cellKey(candidate) === cellKey(cell));
        select(unit?.id ?? null);
        break;
      }
    }
  }

  function select(id: string | null): void {
    selectedId = id;
    const unit = id ? model.state.units.find((candidate) => candidate.id === id) : undefined;
    inspector.toggleAttribute('open', unit !== undefined);
    if (unit) fillInspector(unit);
    refreshOverlay();
    sync();
  }

  function setFieldValue(el: HTMLElement, value: string): void {
    if ('value' in el) (el as HTMLInputElement).value = value;
  }

  function fillInspector(unit: Unit): void {
    const field = (name: string): HTMLElement | null => inspector.querySelector(`[data-field="${name}"]`);
    const name = field('name');
    if (name) setFieldValue(name, unit.name);
    const team = field('team');
    if (team) setFieldValue(team, unit.team);
    const catalog = field('catalog');
    const ability = field('ability');
    const klass = unitClass(unit.team, unit.catalogId);
    if (catalog) {
      // The class list follows the unit's team: hero classes for heroes, the
      // bestiary for enemies.
      catalog.hidden = false;
      const options = catalogOptions(unit.team === 'hero' ? HERO_CATALOG : ENEMY_CATALOG);
      catalog.innerHTML = options
        .map((option) => `<option value="${escapeHtml(option.value)}">${escapeHtml(option.label)}</option>`)
        .join('');
      setFieldValue(catalog, unit.catalogId ?? '');
    }
    if (ability) {
      ability.hidden = !klass;
      // A hand-tuned class stays recognisable but says so.
      ability.textContent = klass ? (unit.modified ? `${klass.ability} (modified)` : klass.ability) : '';
    }
    const move = field('move');
    if (move) setFieldValue(move, String(unit.move));
    const range = field('range');
    if (range) setFieldValue(range, String(unit.range));
    inspector.setAttribute('title', unit.name);
    inspector.dataset.unit = unit.id;
  }

  function updateSelected(patch: Partial<Unit>): void {
    if (!selectedId) return;
    const units = model.state.units.map((unit) => (unit.id === selectedId ? { ...unit, ...patch } : unit));
    commit('Edit unit', { ...model.state, units });
  }

  /** A name a class placement generated: the bare class name or "Class N". */
  function isDefaultName(name: string, className: string | undefined): boolean {
    if (!className) return false;
    return name === className || new RegExp(`^${className.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} \\d+$`).test(name);
  }

  /** The next free "Class N" name for a team, matching the placement rule. */
  function nextClassName(team: 'enemy' | 'hero', className: string): string {
    const taken = new Set(
      model.state.units.filter((unit) => unit.team === team && unit.catalogId === className).map((unit) => unit.name),
    );
    let ordinal = 1;
    while (taken.has(`${className} ${String(ordinal)}`)) ordinal += 1;
    return `${className} ${String(ordinal)}`;
  }

  // All inspector edits commit on `change`, not `input`: typing a name or
  // tapping a counter steps the undo ledger once per edit, not per keystroke.
  inspector.addEventListener('change', (event) => {
    const target = event.target instanceof Element ? event.target.closest('[data-field]') : null;
    if (!(target instanceof HTMLElement)) return;
    // ore-counter fires a CustomEvent carrying the numeric value; fields fire
    // native events whose value lives on the element. Read the value off the
    // field (event.target): this listener is delegated on the drawer, so
    // currentTarget is the drawer itself and carries no value.
    const detail = (event as Event & { detail?: { value?: number } }).detail;
    const fieldEl = target as HTMLElement & { value?: unknown };
    const raw = detail?.value ?? (typeof fieldEl.value === 'string' ? fieldEl.value : undefined);
    const value = String(raw ?? '');
    const field = target.dataset.field;
    if (field === 'name') {
      updateSelected({ name: value.trim() || 'Unit' });
    } else if (field === 'move' || field === 'range') {
      // A stat tweak keeps the class identity (token, hue, ability) and marks
      // the unit modified, instead of silently detaching it from its class.
      const selected = model.state.units.find((unit) => unit.id === selectedId);
      const stat =
        field === 'move'
          ? { move: Math.max(0, Math.round(Number(value) || 0)) }
          : { range: Math.max(0, Math.round(Number(value) || 0)) };
      updateSelected({ ...stat, modified: selected?.catalogId ? true : undefined });
    } else if (field === 'team') {
      const team = value === 'enemy' ? 'enemy' : 'hero';
      updateSelected({ catalogId: undefined, modified: undefined, team });
    } else if (field === 'catalog') {
      const selected = model.state.units.find((unit) => unit.id === selectedId);
      const catalog = selected?.team === 'hero' ? HERO_CATALOG : ENEMY_CATALOG;
      const klass = catalog.find((entry) => entry.name === value);
      if (klass && selected) {
        // Switching class keeps a name the user typed; a default class name
        // is replaced with the new class's name and a free ordinal, so two
        // Brutes turned into Casters do not both read "Caster".
        const name = isDefaultName(selected.name, selected.catalogId)
          ? nextClassName(selected.team, klass.name)
          : selected.name;
        updateSelected({ catalogId: klass.name, modified: undefined, move: klass.move, name, range: klass.range });
      } else {
        // "Custom unit": detach from the class without touching the stats.
        updateSelected({ catalogId: undefined, modified: undefined });
      }
    }
    // The model round-trips through the subscription, which re-fills the form.
  });

  // Closing the inspector (Escape, drag, or the close button) clears the
  // selection so the ring and reachable overlay do not linger on the map.
  inspector.addEventListener('open-change', (event) => {
    // ore-select inside the form emits its own bubbling open-change when a
    // dropdown closes; only the drawer's own events clear the selection.
    if (event.target !== inspector) return;
    const detail = (event as CustomEvent<{ open?: boolean }>).detail;
    if (!detail?.open && selectedId) select(null);
  });

  inspector.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target.closest('[data-action="delete-unit"]') : null;
    if (!target || !selectedId) return;
    const unit = model.state.units.find((candidate) => candidate.id === selectedId);
    if (!unit) return;
    commit(`Remove ${unit.name}`, { ...model.state, units: model.state.units.filter((c) => c.id !== unit.id) });
    select(null);
  });

  // ── Turn ──────────────────────────────────────────────────────────────────

  function runTurn(): void {
    const before = model.state;
    const plan = planTurn(before);
    if (plan.enemyPlans.length === 0 && plan.heroPlans.length === 0) {
      updateStatus('Nothing to move');
      return;
    }
    // Remember what the user built before this run's first turn; the
    // game-over card offers to replay exactly that.
    if (preTurnState === null) preTurnState = before;
    model.replace(plan.next);
    ledger.record(stateCommand(model, 'Run turn', before, plan.next));
    // Paint where each unit came from, the cells it walked, and where anyone
    // fell, so the written reasons in the results panel are readable on the
    // map itself.
    const acted = [...plan.enemyPlans, ...plan.heroPlans];
    turnRoutes = acted.filter((entry) => entry.route.length > 1).map((entry) => entry.route);
    turnGhosts = acted
      .filter((entry) => entry.destination.q !== entry.route[0]?.q || entry.destination.r !== entry.route[0]?.r)
      .map((entry) => entry.route[0])
      .filter((cell): cell is Cell => cell !== undefined);
    turnFallen = plan.fallen.map((mark) => mark.cell);
    // Canvas paint is invisible to tests; the count travels as a data attr,
    // like the camera readout above.
    root.dataset.turnFallen = String(turnFallen.length);
    renderResults(plan);
    if (plan.wipeout || plan.victory) showOutcome(plan);
    refreshOverlay();
    sync();
    updateStatus();
    persistence.schedule(() => [snapshot()]);
  }

  function showOutcome(plan: TurnPlan): void {
    const title = gameOver.querySelector('[data-testid="map-gameover-title"]');
    const sub = gameOver.querySelector('[data-testid="map-gameover-sub"]');
    if (plan.wipeout) {
      gameOver.dataset.outcome = 'defeat';
      if (title) title.textContent = 'Game over';
      if (sub) sub.textContent = 'The enemies wiped out the party.';
    } else {
      gameOver.dataset.outcome = 'victory';
      if (title) title.textContent = 'Victory';
      if (sub) sub.textContent = 'The party cleared the field.';
    }
    gameOver.hidden = false;
  }

  function renderResults(plan: TurnPlan): void {
    lastPlans = [...plan.enemyPlans, ...plan.heroPlans];
    // Entries are grouped by phase so the two sides of the round read apart.
    const entryHtml = (entry: UnitPlan): string => {
      const unit = model.state.units.find((candidate) => candidate.id === entry.unitId);
      const lines = entry.reasons.map((reason) => `<li>${escapeHtml(reason)}</li>`).join('');
      return `<li class="map-turn-entry" tabindex="0" data-unit="${escapeHtml(entry.unitId)}"><strong>${escapeHtml(unit?.name ?? entry.unitId)}</strong><ul>${lines}</ul></li>`;
    };
    const section = (label: string, entries: readonly UnitPlan[]): string =>
      entries.length === 0 ? '' : `<p class="map-turn-heading">${label}</p><ul>${entries.map(entryHtml).join('')}</ul>`;
    const fallenNames = [...plan.heroKills, ...plan.enemyKills];
    const killLine =
      fallenNames.length > 0
        ? `<p class="map-turn-kills" data-testid="map-turn-kills">${fallenNames.map((name) => escapeHtml(name)).join(', ')} ${fallenNames.length === 1 ? 'falls' : 'fall'}.</p>`
        : '';
    results.innerHTML = `<ore-list class="map-turn-list" data-testid="map-turn-list">${section('Enemies', plan.enemyPlans)}${section('Heroes', plan.heroPlans)}</ore-list>${killLine}`;
    results.toggleAttribute('open', true);
  }

  /** Points the map at the cell an entry's unit occupies or walked through. */
  function highlightEntry(entry: Element | null): void {
    const id = entry instanceof HTMLElement ? entry.dataset.unit : undefined;
    const plan = id ? lastPlans.find((candidate) => candidate.unitId === id) : undefined;
    const unit = id ? model.state.units.find((candidate) => candidate.id === id) : undefined;
    overlay.current.highlight = unit ? { q: unit.q, r: unit.r } : (plan?.destination ?? null);
    sync();
  }

  let lastPlans: readonly UnitPlan[] = [];

  results.addEventListener('pointerover', (event) => {
    highlightEntry(event.target instanceof Element ? event.target.closest('.map-turn-entry') : null);
  });
  results.addEventListener('pointerleave', () => {
    overlay.current.highlight = null;
    sync();
  });
  results.addEventListener('focusin', (event) => {
    highlightEntry(event.target instanceof Element ? event.target.closest('.map-turn-entry') : null);
  });
  results.addEventListener('focusout', () => {
    overlay.current.highlight = null;
    sync();
  });
  results.addEventListener('click', (event) => {
    const entry = event.target instanceof Element ? event.target.closest('.map-turn-entry') : null;
    if (entry instanceof HTMLElement) select(entry.dataset.unit ?? null);
  });
  // Entries are buttons in list clothing: Enter selects the unit, like click.
  results.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    const entry = event.target instanceof Element ? event.target.closest('.map-turn-entry') : null;
    if (entry instanceof HTMLElement) {
      event.preventDefault();
      select(entry.dataset.unit ?? null);
    }
  });
  // Closing the results panel retires its trails and ghosts. An open panel
  // lifts the dock (and the badge) above it so Run turn stays reachable.
  results.addEventListener('open-change', (event) => {
    if (event.target !== results) return;
    const detail = (event as CustomEvent<{ open?: boolean }>).detail;
    root.toggleAttribute('data-turn-open', Boolean(detail?.open));
    if (!detail?.open) {
      clearTurnVisuals();
      sync();
    }
  });

  // ── Grid + tools ──────────────────────────────────────────────────────────

  function setGrid(grid: 'hex' | 'square'): void {
    if (model.state.grid === grid) return;
    // Cells are shared between grids, so switching keeps the encounter intact;
    // only the geometry and the topology change.
    commit(`Switch to ${grid} grid`, { ...model.state, grid });
  }

  toolGroup?.addEventListener('change', (event) => {
    const value = (event as CustomEvent<{ values?: string[] }>).detail?.values?.[0];
    if (value === 'block' || value === 'enemy' || value === 'erase' || value === 'hero' || value === 'select') {
      pickTool(value);
    }
  });

  gridGroup?.addEventListener('change', (event) => {
    const value = (event as CustomEvent<{ values?: string[] }>).detail?.values?.[0];
    if (value === 'hex' || value === 'square') setGrid(value);
  });

  function pickTool(next: MapTool): void {
    tool = next;
    const group = toolGroup as (HTMLElement & { value?: string }) | null;
    if (group && 'value' in group) group.value = next;
    // The canvas cursor follows the tool through [data-tool] in map.css.
    const canvas = mount.querySelector<HTMLCanvasElement>('.map-canvas');
    if (canvas) canvas.dataset.tool = next;
  }

  toolbar.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target.closest('[data-history],[data-action]') : null;
    if (!target) return;
    const history = target.getAttribute('data-history');
    if (history === 'undo' || history === 'redo') stepHistory(history);
    if (target.getAttribute('data-action') === 'turn') runTurn();
    if (target.getAttribute('data-action') === 'export') exportPng();
  });

  // Both buttons replay a state as one undoable command, so the party comes
  // back without losing the ledger. "Retry" replays what the user built
  // before this run's first turn; "Start demo map" replays the seed.
  gameOver.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target.closest('[data-action]') : null;
    const action = target?.getAttribute('data-action');
    if (action !== 'retry' && action !== 'restart') return;
    gameOver.hidden = true;
    results.toggleAttribute('open', false);
    selectedId = null;
    inspector.toggleAttribute('open', false);
    const next = action === 'retry' && preTurnState ? preTurnState : seedEncounter();
    preTurnState = null;
    commit(action === 'retry' ? 'Retry encounter' : 'Start a new game', next);
    const bounds = encounterBounds();
    if (bounds) camera.fitBounds(bounds, { padding: 24 });
  });

  // ore-switch dispatches a plain Event; read the state off the element.
  fogSwitch?.addEventListener('change', () => {
    model.setFog('checked' in fogSwitch && Boolean((fogSwitch as HTMLInputElement).checked));
  });

  // ── Keyboard ──────────────────────────────────────────────────────────────

  const keymap = createKeymap(
    [
      { handler: () => stepHistory('undo'), id: 'undo', shortcut: 'mod+z' },
      { handler: () => stepHistory('redo'), id: 'redo', shortcut: 'mod+shift+z' },
      { handler: runTurn, id: 'turn', shortcut: 'mod+enter' },
      { handler: () => pickTool('select'), id: 'tool-select', shortcut: 'v' },
      { handler: () => pickTool('block'), id: 'tool-block', shortcut: 'b' },
      { handler: () => pickTool('hero'), id: 'tool-hero', shortcut: 'h' },
      { handler: () => pickTool('enemy'), id: 'tool-enemy', shortcut: 'e' },
      { handler: () => pickTool('erase'), id: 'tool-erase', shortcut: 'x' },
    ],
    { when: (event) => !isEditableTarget(event) },
  );
  const unmountKeymap = keymap.mount(root.ownerDocument);

  // ── Renderer lifecycle ────────────────────────────────────────────────────

  function attach(): void {
    palette = resolveMapPalette(root);
    refreshOverlay();

    const canvas = document.createElement('canvas');
    canvas.className = 'map-canvas';
    canvas.dataset.testid = 'map-canvas';
    canvas.tabIndex = 0;
    canvas.dataset.tool = tool;
    // The keyboard cursor only paints while the canvas has focus, so mouse
    // users never see a primary outline that looks like a selection.
    canvas.addEventListener('focus', () => {
      canvasFocused = true;
      refreshOverlay();
      sync();
    });
    canvas.addEventListener('blur', () => {
      canvasFocused = false;
      refreshOverlay();
      sync();
    });
    mount.append(canvas);

    function canvasSize(): { height: number; width: number } {
      return { height: canvas.clientHeight || 480, width: canvas.clientWidth || 800 };
    }

    const dpr = window.devicePixelRatio || 1;
    const layers = createMapLayers(model, overlay);
    if (mode === 'main') {
      renderer = createStage(canvas, { background: palette.background, dpr, layers, ...canvasSize() });
    } else {
      const worker = new MapWorker() as Worker;
      const remote = createWorkerStage<MapSceneMessage>(canvas, worker, {
        background: palette.background,
        dpr,
        ...canvasSize(),
      });
      // The creator owns the worker: terminate it when the stage is disposed.
      remote.disposalSignal.addEventListener('abort', () => worker.terminate());
      // Every later sync() forwards a full snapshot instead of invalidating
      // local layers; the worker twin owns its repaints.
      sendSnapshot = (message) => remote.sendScene(message);
      renderer = remote;
    }
    const current: StageController = renderer;
    current.setTransform(camera.matrix);
    // Full snapshot first: the worker twin starts empty, and a main-thread
    // stage needs its first paint. One path for both modes.
    sync();

    const unsubscribeCamera = camera.subscribe(() => {
      current.setTransform(camera.matrix);
      root.dataset.camera = `${camera.state.x.toFixed(1)},${camera.state.y.toFixed(1)}`;
    });

    function toWorld(clientX: number, clientY: number): { x: number; y: number } {
      const box = canvas.getBoundingClientRect();
      return camera.toWorld({ x: clientX - box.left, y: clientY - box.top });
    }

    type MapDrag =
      | { kind: 'paint'; blocked: boolean; seen: Set<string> }
      | { kind: 'pan' }
      | { kind: 'unit'; id: string };
    let dragTarget: MapDrag | null = null;
    // A completed drag suppresses the trailing click event.
    let dragged = false;
    let panLast = { x: 0, y: 0 };

    const drag = createDragGesture(canvas, {
      activationDistance: 4,
      onEnd: (detail) => {
        ghost.hidden = true;
        canvas.classList.remove('is-grabbing');
        // A released drag suppresses the trailing click, so a drag cannot place
        // a second unit or toggle a cell twice. A canceled drag emits no click,
        // so it must not swallow the user's next one.
        dragged = detail.reason === 'release';
        if (!dragTarget || dragTarget.kind === 'pan') {
          dragTarget = null;
          return;
        }
        if (dragTarget.kind === 'unit') {
          const cell = cellAt(toWorld(detail.current.x, detail.current.y), model.state.grid);
          const id = dragTarget.id;
          const occupied = model.state.units.some((other) => other.id !== id && cellKey(other) === cellKey(cell));
          if (occupied || !model.canStand(cell)) {
            updateStatus('That cell is taken or blocked');
          } else {
            const before = model.state;
            const units = before.units.map((unit) => (unit.id === id ? { ...unit, q: cell.q, r: cell.r } : unit));
            model.replace({ ...before, units });
            ledger.record(stateCommand(model, 'Move unit', before, model.state));
          }
        }
        dragTarget = null;
      },
      onMove: (detail) => {
        const previous = panLast;
        panLast = { x: detail.current.x, y: detail.current.y };
        if (!dragTarget) return;
        if (dragTarget.kind === 'pan') {
          // gesture's delta is cumulative from the start; pan needs per-move.
          camera.panBy(detail.current.x - previous.x, detail.current.y - previous.y);
          return;
        }
        if (dragTarget.kind === 'paint') {
          const cell = cellAt(toWorld(detail.current.x, detail.current.y), model.state.grid);
          const key = cellKey(cell);
          if (dragTarget.seen.has(key)) return;
          dragTarget.seen.add(key);
          if (dragTarget.blocked) setBlocked(cell, true);
          else erase(cell);
          return;
        }
        const box = root.getBoundingClientRect();
        ghost.style.transform = `translate(${String(detail.current.x - box.left)}px, ${String(detail.current.y - box.top)}px)`;
      },
      onStart: (detail) => {
        panLast = { x: detail.start.x, y: detail.start.y };
        const cell = cellAt(toWorld(detail.start.x, detail.start.y), model.state.grid);
        cursor = cell;
        if (tool === 'block' || tool === 'erase') {
          dragTarget = { blocked: tool === 'block', kind: 'paint', seen: new Set([cellKey(cell)]) };
          if (tool === 'block') setBlocked(cell, true);
          else erase(cell);
          return;
        }
        if (tool === 'hero' || tool === 'enemy') {
          placeUnit(cell, tool);
          return;
        }
        const unit = model.state.units.find((candidate) => cellKey(candidate) === cellKey(cell));
        if (unit) {
          select(unit.id);
          dragTarget = { id: unit.id, kind: 'unit' };
          ghost.hidden = false;
          // The ghost carries the dragged unit's team colour.
          ghost.dataset.team = unit.team;
          const box = root.getBoundingClientRect();
          ghost.style.transform = `translate(${String(detail.start.x - box.left)}px, ${String(detail.start.y - box.top)}px)`;
          return;
        }
        // Empty-area drag pans the map, like the other scenes' canvases.
        dragTarget = { kind: 'pan' };
        canvas.classList.add('is-grabbing');
      },
    });

    const cameraGestures = createCameraGestures(canvas, camera, () => drag.cancel());

    // A plain click never reaches the drag handlers (they need movement), so
    // selection and placement on click live here.
    canvas.addEventListener('click', (event) => {
      if (dragged) {
        dragged = false;
        return;
      }
      const cell = cellAt(toWorld(event.clientX, event.clientY), model.state.grid);
      cursor = cell;
      applyTool(cell);
    });

    // Hover preview so pointer users see which cell a click or drop targets.
    canvas.addEventListener('pointermove', (event) => {
      if (dragTarget) return;
      const cell = cellAt(toWorld(event.clientX, event.clientY), model.state.grid);
      const same = overlay.current.hover && overlay.current.hover.q === cell.q && overlay.current.hover.r === cell.r;
      if (same) return;
      overlay.current.hover = cell;
      sync();
    });
    canvas.addEventListener('pointerleave', () => {
      if (!overlay.current.hover) return;
      overlay.current.hover = null;
      sync();
    });

    canvas.addEventListener('keydown', (event) => {
      const step = cursorStep(event.key);
      if (step) {
        event.preventDefault();
        const next = cursor ? { q: cursor.q + step.q, r: cursor.r + step.r } : { q: 0, r: 0 };
        // Clamp to the world so the cursor cannot walk off the map.
        cursor = {
          q: Math.max(-WORLD_RADIUS, Math.min(WORLD_RADIUS, next.q)),
          r: Math.max(-WORLD_RADIUS, Math.min(WORLD_RADIUS, next.r)),
        };
        keepCursorInView();
        refreshOverlay();
        sync();
        updateStatus(describeCursorCell());
        return;
      }
      if (event.key === 'Enter' && cursor) {
        event.preventDefault();
        applyTool(cursor);
        return;
      }
      if ((event.key === 'Delete' || event.key === 'Backspace') && cursor) {
        event.preventDefault();
        erase(cursor);
      }
    });

    const observer = new ResizeObserver(() => {
      current.resize(canvasSize(), window.devicePixelRatio || 1);
      camera.resize(canvasSize());
    });
    observer.observe(canvas);

    detached = () => {
      observer.disconnect();
      cameraGestures.dispose();
      drag.dispose();
      unsubscribeCamera();
      current.dispose();
      canvas.remove();
      renderer = null;
      sendSnapshot = null;
    };
  }

  function exportPng(): void {
    if (!renderer) return;
    // toBlob flushes pending repaints on both modes before rasterizing.
    // Hi-res export: current viewport region at 2x the on-screen density.
    const exportScale = scaleOf(camera.matrix) * (window.devicePixelRatio || 1) * 2;
    const rotated = camera.state.rotation !== 0;
    void renderer
      .toBlob(rotated ? { type: 'image/png' } : { region: camera.visibleRect, scale: exportScale, type: 'image/png' })
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'vielzeug-map.png';
        link.dataset.testid = 'map-export-link';
        link.click();
        link.remove();
        // Let the download start before releasing the blob URL.
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      })
      .catch((error: unknown) => {
        updateStatus(`Export failed: ${String(error)}`);
      });
  }

  threadGroup?.addEventListener('change', (event) => {
    const value = (event as CustomEvent<{ values?: string[] }>).detail?.values?.[0];
    if (value !== 'main' && value !== 'worker') return;
    mode = value;
    detached?.();
    detached = null;
    updateStatus();
    // The canvas transfer to an OffscreenCanvas is one-shot, so switching
    // modes disposes the stage and mounts a fresh canvas.
    attach();
  });

  // ── Theme ─────────────────────────────────────────────────────────────────

  const themeObserver = new MutationObserver(() => {
    palette = resolveMapPalette(root);
    refreshOverlay();
    sync();
  });
  themeObserver.observe(document.documentElement, { attributeFilter: ['class'] });

  // ── Restore ───────────────────────────────────────────────────────────────

  void persistence
    .load()
    .then((rows) => {
      const row = rows[0];
      if (row) {
        model.importFog(row.fog);
        model.replace(row.state);
        if (fogSwitch) {
          if (row.fog.enabled) fogSwitch.setAttribute('checked', '');
          else fogSwitch.removeAttribute('checked');
        }
        const group = gridGroup as (HTMLElement & { value?: string }) | null;
        if (group && 'value' in group) group.value = row.state.grid;
      } else {
        model.replace(seedEncounter());
      }
      cursor = { q: 0, r: 0 };
      restoring = false;
      refreshOverlay();
      // The restored state can differ from the empty scene the renderer first
      // painted (a persisted hex grid, for instance), so repaint now that the
      // model is in place.
      sync();
      updateStatus();
    })
    .catch(() => {
      restoring = false;
      model.replace(seedEncounter());
      refreshOverlay();
      sync();
      updateStatus();
    });

  updateStatus();
  attach();

  function dispose(): void {
    restoring = true;
    stopDockTrack();
    window.clearTimeout(statusTimer);
    themeObserver.disconnect();
    unmountKeymap();
    keymap.dispose();
    detached?.();
    detached = null;
    unsubscribeLedger();
    unsubscribeModel();
    persistence.stop();
    ledger.dispose();
    model.dispose();
    camera.dispose();
  }

  /** World bounds of everything on the map, or null when it is empty. */
  function encounterBounds(): { height: number; width: number; x: number; y: number } | null {
    const points: { x: number; y: number }[] = [];
    for (const unit of model.state.units) points.push(cellCenter({ q: unit.q, r: unit.r }, model.state.grid));
    for (const key of model.state.blocked) {
      const [q, r] = key.split(':').map(Number);
      if (q !== undefined && r !== undefined) points.push(cellCenter({ q, r }, model.state.grid));
    }
    if (points.length === 0) return null;
    const pad = CELL_SIZE * 2;
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    for (const p of points) {
      minX = Math.min(minX, p.x - pad);
      minY = Math.min(minY, p.y - pad);
      maxX = Math.max(maxX, p.x + pad);
      maxY = Math.max(maxY, p.y + pad);
    }
    return { height: maxY - minY, width: maxX - minX, x: minX, y: minY };
  }

  return {
    camera,
    dispose,
    dock: toolbar,
    dockTail,
    fit: () => {
      const bounds = encounterBounds();
      if (bounds) camera.fitBounds(bounds, { padding: 24 });
      else camera.animateTo({ x: 0, y: 0, zoom: 1 }, { duration: 180 });
    },
  };
}

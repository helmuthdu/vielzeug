import { createSpatialIndex, type Point, pointInPolygon, type Rect, type SpatialIndex } from '@vielzeug/atlas';
import type { StrokePoint } from '@vielzeug/ink';
import type { ReversibleCommand } from '@vielzeug/ledger';

/** A rectangle on the board. `x`/`y` are the world position of the top-left corner. */
export interface BoardRect {
  height: number;
  id: string;
  kind: 'rect';
  width: number;
  x: number;
  y: number;
}

/**
 * A freehand stroke. `points` (centerline) and `outline` (variable-width
 * polygon) are stored relative to `x`/`y`, so moving a stroke is the same
 * position update as moving a rect.
 */
export interface BoardStroke {
  height: number;
  id: string;
  kind: 'stroke';
  outline: readonly Point[];
  path: string;
  points: readonly StrokePoint[];
  width: number;
  x: number;
  y: number;
}

export type BoardShape = BoardRect | BoardStroke;

/** Axis-aligned world bounds of any board entity. */
export function shapeBounds(shape: BoardShape): Rect {
  return { height: shape.height, width: shape.width, x: shape.x, y: shape.y };
}

export type ShapePosition = Readonly<{ x: number; y: number }>;

/**
 * DOM-free board state: shapes in a spatial index plus the current selection.
 * Mutations notify subscribers so the view layer can re-render; undo/redo
 * history lives in a ledger that consumes the commands exported below.
 */
export interface BoardModel {
  add(shape: BoardShape): void;
  readonly disposalSignal: AbortSignal;
  dispose(): void;
  readonly disposed: boolean;
  get(id: string): BoardShape | undefined;
  /** Topmost shape containing the point (within `tolerance`), or null. */
  hitTest(point: Point, tolerance?: number): BoardShape | null;
  /** Ids of every shape intersecting `rect`, in z-order. */
  marquee(rect: Rect): string[];
  /** Moves an existing shape and refreshes its index entry. Returns false when unknown. */
  moveTo(id: string, position: ShapePosition): boolean;
  /** Removes the shape and its selection entry. Returns false when unknown. */
  remove(id: string): boolean;
  /** Replaces the stored geometry of an existing shape (same id), refreshing its index entry. */
  replace(shape: BoardShape): boolean;
  select(ids: readonly string[]): void;
  /** Selection ids in z-order (insertion order). */
  readonly selection: readonly string[];
  /** Shapes in z-order (insertion order). */
  readonly shapes: readonly BoardShape[];
  subscribe(listener: () => void, options?: Readonly<{ signal?: AbortSignal }>): () => void;
  [Symbol.dispose](): void;
}

export function createBoardModel(): BoardModel {
  const order: string[] = [];
  const shapes = new Map<string, BoardShape>();
  const index: SpatialIndex = createSpatialIndex();
  const listeners = new Set<() => void>();
  let selection: string[] = [];
  const controller = new AbortController();

  const notify = (): void => {
    for (const listener of [...listeners]) listener();
  };

  const model: BoardModel = {
    add(shape) {
      if (shapes.has(shape.id)) return;
      shapes.set(shape.id, { ...shape });
      order.push(shape.id);
      index.set(shape.id, shapeBounds(shape));
      notify();
    },
    get disposalSignal() {
      return controller.signal;
    },
    dispose() {
      controller.abort();
      listeners.clear();
      index.clear();
    },
    get disposed() {
      return controller.signal.aborted;
    },
    get(id) {
      const shape = shapes.get(id);
      return shape ? { ...shape } : undefined;
    },
    hitTest(point, tolerance = 0) {
      const hits = index.queryPoint(point, { tolerance });
      let topmost: BoardShape | null = null;
      let topmostZ = -1;
      for (const id of hits) {
        const shape = shapes.get(id);
        if (!shape) continue;
        // Strokes need polygon narrow-phase inside their bounds; rects already passed it.
        if (shape.kind === 'stroke') {
          const local = { x: point.x - shape.x, y: point.y - shape.y };
          if (!pointInPolygon(shape.outline, local) && tolerance <= 0) continue;
        }
        const z = order.indexOf(id);
        if (z > topmostZ) {
          topmostZ = z;
          topmost = shape;
        }
      }
      return topmost;
    },
    marquee(rect) {
      return index
        .queryRect(rect)
        .map((id) => order.indexOf(id))
        .sort((a, b) => a - b)
        .map((z) => order[z] as string);
    },
    moveTo(id, position) {
      const shape = shapes.get(id);
      if (!shape) return false;
      shape.x = position.x;
      shape.y = position.y;
      index.set(id, shapeBounds(shape));
      notify();
      return true;
    },
    remove(id) {
      if (!shapes.has(id)) return false;
      shapes.delete(id);
      const at = order.indexOf(id);
      if (at !== -1) order.splice(at, 1);
      selection = selection.filter((selected) => selected !== id);
      index.delete(id);
      notify();
      return true;
    },
    replace(shape) {
      if (!shapes.has(shape.id)) return false;
      shapes.set(shape.id, { ...shape });
      index.set(shape.id, shapeBounds(shape));
      notify();
      return true;
    },
    select(ids) {
      const known = new Set(ids.filter((id) => shapes.has(id)));
      selection = order.filter((id) => known.has(id));
      notify();
    },
    get selection() {
      return selection;
    },
    get shapes() {
      return order.map((id) => shapes.get(id) as BoardShape);
    },
    subscribe(listener, options) {
      if (options?.signal?.aborted) return () => {};
      listeners.add(listener);
      options?.signal?.addEventListener('abort', () => listeners.delete(listener), { once: true });
      return () => listeners.delete(listener);
    },
    [Symbol.dispose]() {
      model.dispose();
    },
  };
  return model;
}

/**
 * Records an already-applied move of one or more shapes. `from` must hold the
 * positions the shapes had before the move was applied.
 */
export function moveShapesCommand(
  model: BoardModel,
  ids: readonly string[],
  from: ReadonlyMap<string, ShapePosition>,
): ReversibleCommand {
  const snapshot = new Map<string, ShapePosition>();
  for (const id of ids) {
    const shape = model.get(id);
    if (shape) snapshot.set(id, { x: shape.x, y: shape.y });
  }
  const applyPositions = (positions: ReadonlyMap<string, ShapePosition>): void => {
    for (const [id, position] of positions) {
      model.moveTo(id, position);
    }
  };
  return {
    apply: () => applyPositions(snapshot),
    label: ids.length === 1 ? 'Move shape' : `Move ${String(ids.length)} shapes`,
    revert: () => applyPositions(from),
  };
}

/**
 * Records an already-applied resize of one or more shapes. `from` must hold the
 * full shape snapshots taken before the resize was applied.
 */
export function resizeShapesCommand(model: BoardModel, from: ReadonlyMap<string, BoardShape>): ReversibleCommand {
  const to = new Map<string, BoardShape>();
  for (const id of from.keys()) {
    const shape = model.get(id);
    if (shape) to.set(id, shape);
  }
  const applyShapes = (shapes: ReadonlyMap<string, BoardShape>): void => {
    for (const shape of shapes.values()) model.replace(shape);
  };
  return {
    apply: () => applyShapes(to),
    label: from.size === 1 ? 'Resize shape' : `Resize ${String(from.size)} shapes`,
    revert: () => applyShapes(from),
  };
}

/** Records an already-added shape. */
export function addShapeCommand(model: BoardModel, shape: BoardShape): ReversibleCommand {
  return {
    apply: () => {
      model.add(shape);
    },
    label: 'Add shape',
    revert: () => {
      model.remove(shape.id);
    },
  };
}

/** Records an already-removed set of shapes (snapshotted before removal). */
export function removeShapesCommand(model: BoardModel, shapes: readonly BoardShape[]): ReversibleCommand {
  const snapshot = shapes.map((shape) => ({ ...shape }));
  return {
    apply: () => {
      for (const shape of snapshot) model.remove(shape.id);
    },
    label: snapshot.length === 1 ? 'Delete shape' : `Delete ${String(snapshot.length)} shapes`,
    revert: () => {
      for (const shape of snapshot) model.add(shape);
    },
  };
}

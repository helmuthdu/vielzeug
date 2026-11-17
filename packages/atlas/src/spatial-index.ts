import { AtlasConfigError } from './errors.js';
import { containsPoint, containsRect, rectsIntersect } from './rect.js';
import type { Point, Rect } from './shapes.js';

export type SpatialEntry<T> = Readonly<{ id: string; rect: Rect; value: T }>;

export type SpatialIndexOptions = Readonly<{
  /** Maximum children per node before a split. Default 8. */
  maxEntriesPerNode?: number;
}>;

export type SpatialQueryOptions = Readonly<{
  /** Expand the query point into a box of this half-size. Default 0. */
  tolerance?: number;
}>;

export type SpatialIndex<T> = Readonly<{
  insert(id: string, rect: Rect, value: T): void;
  /** Re-index an existing id; throws for unknown ids. */
  update(id: string, rect: Rect): void;
  remove(id: string): boolean;
  get(id: string): SpatialEntry<T> | undefined;
  queryRect(rect: Rect): SpatialEntry<T>[];
  queryPoint(point: Point, options?: SpatialQueryOptions): SpatialEntry<T>[];
  clear(): void;
  readonly size: number;
  /** Bounding box of all entries; null when empty. */
  readonly bounds: Rect | null;
  dispose(): void;
  readonly disposed: boolean;
  readonly disposalSignal: AbortSignal;
  [Symbol.dispose]: () => void;
}>;

type Leaf<T> = { children: SpatialEntry<T>[]; leaf: true; rect: Rect | null };
type Branch<T> = { children: Node<T>[]; leaf: false; rect: Rect | null };
type Node<T> = Leaf<T> | Branch<T>;

function rectOf<T>(node: Node<T> | SpatialEntry<T>): Rect {
  return node.rect as Rect;
}

function unionRects(a: Rect, b: Rect): Rect {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return {
    height: Math.max(a.y + a.height, b.y + b.height) - y,
    width: Math.max(a.x + a.width, b.x + b.width) - x,
    x,
    y,
  };
}

function area(rect: Rect): number {
  return rect.width * rect.height;
}

function recompute<T>(node: Node<T>): void {
  let rect: Rect | null = null;
  for (const child of node.children) {
    rect = rect === null ? { ...rectOf(child) } : unionRects(rect, rectOf(child));
  }
  node.rect = rect;
}

/**
 * Dynamic R-tree (Guttman, quadratic split) over axis-aligned rectangles:
 * O(log n) rect and point queries for hit-testing, marquee selection, and
 * viewport culling over thousands of items.
 */
export function createSpatialIndex<T>(options: SpatialIndexOptions = {}): SpatialIndex<T> {
  const maxEntries = options.maxEntriesPerNode ?? 8;
  if (!Number.isInteger(maxEntries) || maxEntries < 4) {
    throw new AtlasConfigError(`maxEntriesPerNode must be an integer >= 4, received ${maxEntries}`);
  }
  const minEntries = Math.max(2, Math.ceil(maxEntries / 3));
  const entries = new Map<string, SpatialEntry<T>>();
  let root: Node<T> = { children: [], leaf: true, rect: null };
  let disposed = false;
  const controller = new AbortController();

  const pickChild = (node: Branch<T>, rect: Rect): Node<T> => {
    let best: Node<T> | null = null;
    let bestEnlargement = Infinity;
    let bestArea = Infinity;
    for (const child of node.children) {
      const current = child.rect ?? rect;
      const enlargement = area(unionRects(current, rect)) - area(current);
      if (enlargement < bestEnlargement || (enlargement === bestEnlargement && area(current) < bestArea)) {
        best = child;
        bestEnlargement = enlargement;
        bestArea = area(current);
      }
    }
    return best as Node<T>;
  };

  const split = (node: Node<T>): [Node<T>, Node<T>] => {
    const items = node.children;
    // Quadratic pick-seeds: the pair wasting the most area when combined.
    let si = 0;
    let sj = 1;
    let worst = -Infinity;
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const waste =
          area(unionRects(rectOf(items[i]), rectOf(items[j]))) - area(rectOf(items[i])) - area(rectOf(items[j]));
        if (waste > worst) {
          worst = waste;
          si = i;
          sj = j;
        }
      }
    }
    const groupA: Array<Node<T> | SpatialEntry<T>> = [items[si]];
    const groupB: Array<Node<T> | SpatialEntry<T>> = [items[sj]];
    let rectA = rectOf(items[si]);
    let rectB = rectOf(items[sj]);
    const remaining = items.filter((_, index) => index !== si && index !== sj);
    for (const [index, item] of remaining.entries()) {
      // Force distribution so neither group can exceed maxEntries or fall below minEntries.
      const mustA =
        groupA.length + (remaining.length - index) > maxEntries ||
        groupB.length + (remaining.length - index) - 1 < minEntries;
      const mustB =
        groupB.length + (remaining.length - index) > maxEntries ||
        groupA.length + (remaining.length - index) - 1 < minEntries;
      let toA: boolean;
      if (mustA) toA = true;
      else if (mustB) toA = false;
      else {
        const enlargeA = area(unionRects(rectA, rectOf(item))) - area(rectA);
        const enlargeB = area(unionRects(rectB, rectOf(item))) - area(rectB);
        toA = enlargeA < enlargeB || (enlargeA === enlargeB && area(rectA) <= area(rectB));
      }
      if (toA) {
        groupA.push(item);
        rectA = unionRects(rectA, rectOf(item));
      } else {
        groupB.push(item);
        rectB = unionRects(rectB, rectOf(item));
      }
    }
    const a = (
      node.leaf
        ? { children: groupA as SpatialEntry<T>[], leaf: true, rect: null }
        : { children: groupA as Node<T>[], leaf: false, rect: null }
    ) as Node<T>;
    const b = (
      node.leaf
        ? { children: groupB as SpatialEntry<T>[], leaf: true, rect: null }
        : { children: groupB as Node<T>[], leaf: false, rect: null }
    ) as Node<T>;
    recompute(a);
    recompute(b);
    return [a, b];
  };

  /** Insert `item` under `node`; returns the split pair when `node` overflows. */
  const insertInto = (node: Node<T>, item: Node<T> | SpatialEntry<T>): [Node<T>, Node<T>] | null => {
    if (node.leaf) {
      node.children.push(item as SpatialEntry<T>);
      node.rect = node.rect === null ? { ...rectOf(item) } : unionRects(node.rect, rectOf(item));
      if (node.children.length > maxEntries) return split(node);
      return null;
    }
    const branch = node as Branch<T>;
    const child = pickChild(branch, rectOf(item));
    const overflow = insertInto(child, item);
    recompute(node);
    if (overflow) {
      const index = branch.children.indexOf(child);
      branch.children.splice(index, 1, overflow[0], overflow[1]);
      recompute(node);
    }
    if (node.children.length > maxEntries) return split(node);
    return null;
  };

  const insert = (id: string, rect: Rect, value: T): void => {
    if (disposed) throw new AtlasConfigError('Cannot insert into a disposed spatial index');
    if (entries.has(id)) throw new AtlasConfigError(`Spatial index already contains id: ${id}`);
    const entry: SpatialEntry<T> = { id, rect: { ...rect }, value };
    entries.set(id, entry);
    // A fully emptied root stays as an empty branch after removals; revive it as a leaf.
    if (!root.leaf && root.children.length === 0) {
      root = { children: [], leaf: true, rect: null };
    }
    const overflow = insertInto(root, entry);
    if (overflow) {
      root = { children: overflow, leaf: false, rect: null };
      recompute(root);
    }
  };

  /** Depth-first remove; returns true when `node` became empty. */
  const removeFrom = (node: Node<T>, entry: SpatialEntry<T>): boolean => {
    if (node.leaf) {
      const index = node.children.indexOf(entry);
      if (index !== -1) node.children.splice(index, 1);
      recompute(node);
      return node.children.length === 0;
    }
    const branch = node as Branch<T>;
    for (let i = branch.children.length - 1; i >= 0; i--) {
      const child = branch.children[i];
      // Prune by containment, not intersection: a branch rect is the union of
      // its children, so the entry's rect is always contained in the child
      // that holds it — even for zero-area rects, which never "intersect".
      if (child.rect && containsRect(child.rect, entry.rect)) {
        if (removeFrom(child, entry)) branch.children.splice(i, 1);
      }
    }
    recompute(node);
    return branch.children.length === 0;
  };

  const remove = (id: string): boolean => {
    const entry = entries.get(id);
    if (!entry) return false;
    entries.delete(id);
    removeFrom(root, entry);
    // Collapse a root branch that ended up with a single child.
    while (!root.leaf && root.children.length === 1) {
      root = root.children[0];
    }
    return true;
  };

  const queryInto = (node: Node<T>, bounds: Rect, hits: (rect: Rect) => boolean, out: SpatialEntry<T>[]): void => {
    if (!node.rect || !hits(node.rect)) return;
    if (node.leaf) {
      for (const entry of node.children) {
        if (hits(entry.rect)) out.push(entry);
      }
      return;
    }
    for (const child of (node as Branch<T>).children) queryInto(child, bounds, hits, out);
  };

  const dispose = (): void => {
    if (disposed) return;
    disposed = true;
    entries.clear();
    root = { children: [], leaf: true, rect: null };
    controller.abort();
  };

  return {
    get bounds() {
      return root.rect;
    },
    clear() {
      entries.clear();
      root = { children: [], leaf: true, rect: null };
    },
    get disposalSignal() {
      return controller.signal;
    },
    dispose,
    [Symbol.dispose]: dispose,
    get disposed() {
      return disposed;
    },
    get(id) {
      return entries.get(id);
    },
    insert,
    queryPoint(point, queryOptions) {
      const tolerance = queryOptions?.tolerance ?? 0;
      const out: SpatialEntry<T>[] = [];
      if (tolerance === 0) {
        // A zero-size query box never "intersects" under rect semantics (touching
        // edges are not overlap), so point queries use inclusive containment.
        queryInto(root, { height: 0, width: 0, x: point.x, y: point.y }, (rect) => containsPoint(rect, point), out);
        return out;
      }
      const box: Rect = { height: tolerance * 2, width: tolerance * 2, x: point.x - tolerance, y: point.y - tolerance };
      queryInto(root, box, (rect) => rectsIntersect(rect, box), out);
      return out;
    },
    queryRect(rect) {
      const out: SpatialEntry<T>[] = [];
      queryInto(root, rect, (candidate) => rectsIntersect(candidate, rect), out);
      return out;
    },
    remove,
    get size() {
      return entries.size;
    },
    update(id, rect) {
      const entry = entries.get(id);
      if (!entry) throw new AtlasConfigError(`Unknown spatial index id: ${id}`);
      remove(id);
      insert(id, rect, entry.value);
    },
  };
}

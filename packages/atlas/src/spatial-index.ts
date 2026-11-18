import { AtlasConfigError } from './errors.js';
import { containsRect, inflateRect, rectsIntersect } from './rect.js';
import type { Point, Rect } from './shapes.js';

export type SpatialIndexOptions = Readonly<{
  /** Maximum children per node before a split. Default 8. */
  maxEntriesPerNode?: number;
}>;

export type SpatialQueryOptions = Readonly<{
  /** Expand the query point into a box of this half-size. Default 0. */
  tolerance?: number;
}>;

/**
 * A Map-like index over ids and their bounding rects. The index stores only
 * geometry — the caller owns the data and looks it up from returned ids —
 * so stored values can never go stale.
 */
export type SpatialIndex<K = string> = Readonly<{
  /** Insert `id`, or move it to `rect` when it already exists. */
  set(id: K, rect: Rect): void;
  delete(id: K): boolean;
  /** Current rect for `id`, or undefined. */
  get(id: K): Rect | undefined;
  has(id: K): boolean;
  clear(): void;
  readonly size: number;
  /** Bounding box of all entries; null when empty. */
  readonly bounds: Rect | null;
  /** Ids whose rect overlaps or touches `rect`. */
  queryRect(rect: Rect): K[];
  /** Ids whose rect contains `point`, or comes within `tolerance` of it. */
  queryPoint(point: Point, options?: SpatialQueryOptions): K[];
}>;

interface LeafEntry<K> {
  id: K;
  rect: Rect;
}

type Leaf<K> = { children: LeafEntry<K>[]; leaf: true; rect: Rect | null };
type Branch<K> = { children: Node<K>[]; leaf: false; rect: Rect | null };
type Node<K> = Leaf<K> | Branch<K>;

function rectOf<K>(node: Node<K> | LeafEntry<K>): Rect {
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

function rectsEqual(a: Rect, b: Rect): boolean {
  return a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
}

function recompute<K>(node: Node<K>): void {
  let rect: Rect | null = null;
  for (const child of node.children) {
    rect = rect === null ? { ...rectOf(child) } : unionRects(rect, rectOf(child));
  }
  node.rect = rect;
}

/**
 * Dynamic R-tree (Guttman, quadratic split) over axis-aligned rectangles:
 * O(log n) rect and point queries for hit-testing, marquee selection, and
 * viewport culling over thousands of items. Rect intersection uses closed
 * intervals, so zero-area entries (lines, points) are findable.
 */
export function createSpatialIndex<K = string>(options: SpatialIndexOptions = {}): SpatialIndex<K> {
  const maxEntries = options.maxEntriesPerNode ?? 8;
  if (!Number.isInteger(maxEntries) || maxEntries < 4) {
    throw new AtlasConfigError(`maxEntriesPerNode must be an integer >= 4, received ${maxEntries}`);
  }
  const minEntries = Math.max(2, Math.ceil(maxEntries / 3));
  const entries = new Map<K, LeafEntry<K>>();
  let root: Node<K> = { children: [], leaf: true, rect: null };

  const pickChild = (node: Branch<K>, rect: Rect): Node<K> => {
    let best: Node<K> | null = null;
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
    return best as Node<K>;
  };

  const split = (node: Node<K>): [Node<K>, Node<K>] => {
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
    const groupA: Array<Node<K> | LeafEntry<K>> = [items[si]];
    const groupB: Array<Node<K> | LeafEntry<K>> = [items[sj]];
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
        ? { children: groupA as LeafEntry<K>[], leaf: true, rect: null }
        : { children: groupA as Node<K>[], leaf: false, rect: null }
    ) as Node<K>;
    const b = (
      node.leaf
        ? { children: groupB as LeafEntry<K>[], leaf: true, rect: null }
        : { children: groupB as Node<K>[], leaf: false, rect: null }
    ) as Node<K>;
    recompute(a);
    recompute(b);
    return [a, b];
  };

  /** Insert `item` under `node`; returns the split pair when `node` overflows. */
  const insertInto = (node: Node<K>, item: Node<K> | LeafEntry<K>): [Node<K>, Node<K>] | null => {
    if (node.leaf) {
      node.children.push(item as LeafEntry<K>);
      node.rect = node.rect === null ? { ...rectOf(item) } : unionRects(node.rect, rectOf(item));
      if (node.children.length > maxEntries) return split(node);
      return null;
    }
    const branch = node as Branch<K>;
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

  const insertEntry = (entry: LeafEntry<K>): void => {
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
  const removeFrom = (node: Node<K>, entry: LeafEntry<K>): boolean => {
    if (node.leaf) {
      const index = node.children.indexOf(entry);
      if (index !== -1) node.children.splice(index, 1);
      recompute(node);
      return node.children.length === 0;
    }
    const branch = node as Branch<K>;
    for (let i = branch.children.length - 1; i >= 0; i--) {
      const child = branch.children[i];
      // Prune by containment, not intersection: a branch rect is the union of
      // its children, so the entry's rect is always contained in the child
      // that holds it.
      if (child.rect && containsRect(child.rect, entry.rect)) {
        if (removeFrom(child, entry)) branch.children.splice(i, 1);
      }
    }
    recompute(node);
    return branch.children.length === 0;
  };

  const deleteEntry = (id: K): boolean => {
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

  const queryInto = (node: Node<K>, hits: (rect: Rect) => boolean, out: K[]): void => {
    if (!node.rect || !hits(node.rect)) return;
    if (node.leaf) {
      for (const entry of node.children) {
        if (hits(entry.rect)) out.push(entry.id);
      }
      return;
    }
    for (const child of (node as Branch<K>).children) queryInto(child, hits, out);
  };

  return {
    get bounds() {
      return root.rect;
    },
    clear() {
      entries.clear();
      root = { children: [], leaf: true, rect: null };
    },
    delete: deleteEntry,
    get(id) {
      return entries.get(id)?.rect;
    },
    has(id) {
      return entries.has(id);
    },
    queryPoint(point, queryOptions) {
      const tolerance = queryOptions?.tolerance ?? 0;
      if (!(tolerance >= 0)) {
        throw new AtlasConfigError(`tolerance must be a non-negative finite number, received ${tolerance}`);
      }
      // A point is a zero-size box; closed-interval intersection makes it hit
      // rects that merely touch it, so one shared path covers both query kinds.
      const box: Rect = inflateRect({ ...point, height: 0, width: 0 }, tolerance);
      const out: K[] = [];
      queryInto(root, (rect) => rectsIntersect(rect, box), out);
      return out;
    },
    queryRect(rect) {
      const out: K[] = [];
      queryInto(root, (candidate) => rectsIntersect(candidate, rect), out);
      return out;
    },
    set(id, rect) {
      const existing = entries.get(id);
      if (existing) {
        if (rectsEqual(existing.rect, rect)) return;
        deleteEntry(id);
      }
      const entry: LeafEntry<K> = { id, rect: { ...rect } };
      entries.set(id, entry);
      insertEntry(entry);
    },
    get size() {
      return entries.size;
    },
  };
}

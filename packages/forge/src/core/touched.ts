import { isRecord } from './path.js';

/** Touched field paths as formatted leaf keys (see `formatValuePath`), e.g. `list[0].email`. */
export type TouchedPaths = ReadonlySet<string>;

export const emptyTouched: TouchedPaths = new Set<string>();

export function withTouched(paths: TouchedPaths, key: string, next: boolean): TouchedPaths {
  if (next === paths.has(key)) return paths;

  const copy = new Set(paths);

  if (next) copy.add(key);
  else copy.delete(key);

  return copy;
}

/** Removes the key and every descendant path, mirroring subtree deletion of a touched node. */
export function pruneTouched(paths: TouchedPaths, key: string): TouchedPaths {
  const doomed: string[] = [];

  for (const path of paths) {
    if (path === key || path.startsWith(`${key}.`) || path.startsWith(`${key}[`)) doomed.push(path);
  }

  if (doomed.length === 0) return paths;

  const copy = new Set(paths);

  for (const path of doomed) copy.delete(path);

  return copy;
}

/** Marks every leaf path of a value tree, matching per-field touch granularity: containers stay untouched. */
export function touchAllPaths(value: unknown): TouchedPaths {
  const paths = new Set<string>();
  const collect = (node: unknown, prefix: string): void => {
    const children: Iterable<readonly [string, unknown]> = Array.isArray(node)
      ? node.map((child, index) => [`[${index}]`, child] as const)
      : isRecord(node)
        ? Object.entries(node)
        : [];

    for (const [segment, child] of children) {
      const key = prefix && !segment.startsWith('[') ? `${prefix}.${segment}` : `${prefix}${segment}`;

      if (isRecord(child) || Array.isArray(child)) collect(child, key);
      else paths.add(key);
    }
  };

  collect(value, '');

  return paths;
}

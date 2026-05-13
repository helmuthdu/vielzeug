function similarity(left: string, right: string): number {
  const a = left.toLowerCase();
  const b = right.toLowerCase();

  if (a === b) return 1;

  if (a.length === 0) return b.length === 0 ? 1 : 0;

  if (b.length === 0) return 0;

  const [shorter, longer] = a.length < b.length ? [a, b] : [b, a];
  const shorterLength = shorter.length;
  const longerLength = longer.length;

  let prevRow = Array.from({ length: shorterLength + 1 }, (_, i) => i);
  let currRow = new Array(shorterLength + 1);

  for (let i = 1; i <= longerLength; i++) {
    currRow[0] = i;

    for (let j = 1; j <= shorterLength; j++) {
      const cost = longer[i - 1] === shorter[j - 1] ? 0 : 1;

      currRow[j] = Math.min(currRow[j - 1] + 1, prevRow[j] + 1, prevRow[j - 1] + cost);
    }

    [prevRow, currRow] = [currRow, prevRow];
  }

  const distance = prevRow[shorterLength];

  return 1 - distance / Math.max(a.length, b.length);
}

function seekFuzzy(item: unknown, query: string, tone: number, visited: WeakSet<object>): boolean {
  if (item === null || item === undefined) return false;

  if (typeof item === 'string' || typeof item === 'number') {
    return similarity(String(item), query) >= tone;
  }

  if (Array.isArray(item)) {
    return item.some((value) => seekFuzzy(value, query, tone, visited));
  }

  if (typeof item === 'object') {
    if (visited.has(item)) return false;

    visited.add(item);

    return Object.values(item).some((value) => seekFuzzy(value, query, tone, visited));
  }

  return false;
}

function seekIncludes(item: unknown, query: string, visited: WeakSet<object>): boolean {
  if (item === null || item === undefined) return false;

  if (typeof item === 'string' || typeof item === 'number') {
    return String(item).toLowerCase().includes(query);
  }

  if (Array.isArray(item)) {
    return item.some((value) => seekIncludes(value, query, visited));
  }

  if (typeof item === 'object') {
    if (visited.has(item)) return false;

    visited.add(item);

    return Object.values(item).some((value) => seekIncludes(value, query, visited));
  }

  return false;
}

export function fuzzySearch<T>(array: readonly T[], query: string, tone = 0.25): T[] {
  if (typeof query !== 'string') throw new TypeError('Expected query to be a string');

  if (typeof tone !== 'number' || tone < 0 || tone > 1) {
    throw new TypeError('Tone must be a number between 0 and 1');
  }

  if (!query) return [...array];

  const searchTerm = query.toLowerCase();

  return array.filter((obj) => seekFuzzy(obj, searchTerm, tone, new WeakSet<object>()));
}

export function search<T>(array: readonly T[], query: string): T[] {
  if (typeof query !== 'string') throw new TypeError('Expected query to be a string');

  if (!query) return [...array];

  const searchTerm = query.toLowerCase();

  return array.filter((obj) => seekIncludes(obj, searchTerm, new WeakSet<object>()));
}

/**
 * Picks up to n unique random values from an array.
 */
export function sample<T>(array: T[], n: number): T[] {
  const count = Math.max(0, Math.min(array.length, Math.floor(n)));

  if (count === 0) return [];

  if (count === array.length) return [...array];

  const copy = [...array];

  for (let index = copy.length - 1; index > 0; index--) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    const temp = copy[index];

    copy[index] = copy[randomIndex];
    copy[randomIndex] = temp;
  }

  return copy.slice(0, count);
}

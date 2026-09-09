/**
 * Splits an array into values that match and do not match the predicate.
 *
 * Allocates two new arrays for the accepted and rejected partitions.
 */
export function partition<T>(
  array: readonly T[],
  predicate: (item: T, index: number, array: readonly T[]) => boolean,
): [T[], T[]] {
  const accepted: T[] = [];
  const rejected: T[] = [];

  for (let index = 0; index < array.length; index++) {
    if (predicate(array[index], index, array)) {
      accepted.push(array[index]);
    } else {
      rejected.push(array[index]);
    }
  }

  return [accepted, rejected];
}

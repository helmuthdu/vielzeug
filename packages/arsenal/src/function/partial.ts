/**
 * Partially applies leading arguments and returns a function expecting the rest.
 */
export const partial = <Bound extends unknown[], Rest extends unknown[], Return>(
  callback: (...args: [...Bound, ...Rest]) => Return,
  ...boundArgs: Bound
): ((...restArgs: Rest) => Return) => {
  return (...restArgs: Rest) => callback(...boundArgs, ...restArgs);
};

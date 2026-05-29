const config = { maxIterations: 100 };

/**
 * Adjust global runtime settings. Returns a cleanup function that restores the previous
 * configuration — consistent with the `CleanupFn` contract used throughout.
 *
 * @example
 * ```ts
 * const restore = configure({ maxIterations: 10 });
 * // ... test body
 * restore();
 * ```
 */
export const configure = (options: { maxIterations?: number }): (() => void) => {
  const prev = { ...config };

  if (options.maxIterations !== undefined) {
    if (!Number.isInteger(options.maxIterations) || options.maxIterations < 1) {
      throw new TypeError('[ripple] configure: maxIterations must be a positive integer.');
    }

    config.maxIterations = options.maxIterations;
  }

  return () => {
    Object.assign(config, prev);
  };
};

export { config };

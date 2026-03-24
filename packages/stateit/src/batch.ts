import { _DEV, queue } from './runtime';

/** @internal Drain and run all pending effects from the batch queue, collecting errors. */
export const _flushPending = (): void => {
  const toFlush = [...queue.pending];

  queue.pending.clear();

  const errors: unknown[] = [];

  for (const f of toFlush) {
    try {
      f();
    } catch (e) {
      errors.push(e);
    }
  }

  if (errors.length) throw errors.length === 1 ? errors[0] : new AggregateError(errors, '[stateit] batch errors');
};

/** Runs fn and defers all Signal notifications until fn returns, then flushes once. */
export const batch = <T>(fn: () => T): T => {
  queue.depth++;

  try {
    const result = fn();

    if (--queue.depth === 0) _flushPending();

    return result;
  } catch (e) {
    if (--queue.depth === 0) {
      try {
        _flushPending();
      } catch (flushErr) {
        if (_DEV)
          console.error(
            '[stateit] batch: a secondary flush error was suppressed (callback error takes precedence)',
            flushErr,
          );
      }
    }

    throw e;
  }
};

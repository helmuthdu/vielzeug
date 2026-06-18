import { abortError } from '../async/abortError';

/**
 * Makes any promise abort-aware via AbortSignal.
 */
export function abortable<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) {
    return Promise.reject(abortError(signal));
  }

  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(abortError(signal));

    signal.addEventListener('abort', onAbort, { once: true });

    promise
      .then((value) => resolve(value))
      .catch((error) => reject(error))
      .finally(() => signal.removeEventListener('abort', onAbort));
  });
}

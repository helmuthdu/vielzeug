/**
 * Shared internal utilities. Not part of the public API.
 */

export function createAbortError(signal: AbortSignal): unknown {
  if (signal.reason !== undefined) return signal.reason;

  if (typeof DOMException === 'function') {
    return new DOMException('Aborted', 'AbortError');
  }

  return new Error('Aborted');
}

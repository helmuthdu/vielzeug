import { backoff, retry, stringify } from '@vielzeug/arsenal';

export { retry };

// Internal stable-key helper — used by source factories, not exposed as public API.
export const defaultKeyOf = stringify;

/** Extracts a user-facing error message from a caught exception. */
export const extractError = (reason: unknown): string => {
  if (reason instanceof Error) return reason.message;

  if (typeof reason === 'string' && reason.length > 0) return reason;

  return 'Request failed';
};

/** Default exponential backoff: 1 s, 2 s, 4 s, … capped at 30 s. Receives a 0-indexed failure count. */
export const defaultRetryDelay = (attempt: number): number => backoff(attempt);

import { CodexError } from './errors.js';

/** Parses and validates a --port CLI argument. Returns the port number or null if omitted. */
export function resolvePort(raw: string | undefined): number | null {
  if (raw === undefined) return null;

  const n = Number.parseInt(raw, 10);

  if (!Number.isFinite(n) || n < 1 || n > 65535 || n !== Number(raw)) {
    throw new CodexError(`Invalid --port value: "${raw}". Expected an integer between 1 and 65535.`);
  }

  return n;
}

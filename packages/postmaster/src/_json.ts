import { PostmasterError } from './errors.ts';
import type { JsonValue, StoredFailure, Validate } from './types.ts';

export function runValidate<T>(validate: Validate<T> | undefined, value: unknown): T {
  if (!validate) return value as T;
  if (typeof validate === 'function') return validate(value);
  return validate.parse(value);
}

export function asJsonValue(value: unknown): JsonValue {
  let serialized: string | undefined;

  try {
    serialized = JSON.stringify(value);
  } catch (error) {
    throw new PostmasterError('job payload must be JSON-serializable', { cause: error });
  }

  if (serialized === undefined) {
    throw new PostmasterError('job payload must be JSON-serializable');
  }

  return JSON.parse(serialized) as JsonValue;
}

export function failureFrom(error: unknown, now: number): StoredFailure {
  if (error instanceof Error) {
    return { message: error.message, name: error.name, occurredAt: now };
  }

  return { message: String(error), name: 'Error', occurredAt: now };
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

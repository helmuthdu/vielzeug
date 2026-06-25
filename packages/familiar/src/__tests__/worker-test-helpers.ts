import { expect } from 'vitest';

import {
  FamiliarQueueFullError,
  FamiliarTaskError,
  FamiliarTerminatedError,
  FamiliarTimeoutError,
  FamiliarRuntimeError,
  FamiliarInvalidOptionsError,
} from '../errors';

type FamiliarErrorClass =
  | typeof FamiliarInvalidOptionsError
  | typeof FamiliarQueueFullError
  | typeof FamiliarRuntimeError
  | typeof FamiliarTaskError
  | typeof FamiliarTerminatedError
  | typeof FamiliarTimeoutError;

const CODE_CLASS_MAP: Record<string, FamiliarErrorClass> = {
  invalid_options: FamiliarInvalidOptionsError,
  queue_full: FamiliarQueueFullError,
  task: FamiliarTaskError,
  terminated: FamiliarTerminatedError,
  timeout: FamiliarTimeoutError,
  worker: FamiliarRuntimeError,
};

export async function expectFamiliarErrorCode<T>(promise: Promise<T>, code: string): Promise<void> {
  const cls = CODE_CLASS_MAP[code];

  if (cls) {
    await expect(promise).rejects.toBeInstanceOf(cls);
  } else {
    await expect(promise).rejects.toMatchObject({ name: code });
  }
}

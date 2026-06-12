import { expect } from 'vitest';

export async function expectWorkerErrorCode<T>(promise: Promise<T>, code: string): Promise<void> {
  await expect(promise).rejects.toMatchObject({ code });
}

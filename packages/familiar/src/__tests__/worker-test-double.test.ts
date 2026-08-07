import { describe, expect, it } from 'vitest';

import { createTestWorker } from '../testing';
import { FamiliarTaskError, FamiliarTimeoutError } from '../worker';

describe('createTestWorker', () => {
  it('matches production task error wrapping', async () => {
    const worker = createTestWorker<number, number>(() => {
      throw new TypeError('bad input');
    });

    await expect(worker.run(1)).rejects.toBeInstanceOf(FamiliarTaskError);
    expect(worker.calls).toHaveLength(1);
    expect(worker.calls[0]).toMatchObject({ status: 'rejected' });
  });

  it('clones task inputs and outputs', async () => {
    const worker = createTestWorker<{ values: number[] }, { values: number[] }>((input) => {
      input.values.push(2);

      return input;
    });
    const input = { values: [1] };

    const output = await worker.run(input);

    expect(input).toEqual({ values: [1] });
    expect(output).toEqual({ values: [1, 2] });
    expect(worker.calls).toEqual([{ input: { values: [1, 2] }, status: 'fulfilled', value: { values: [1, 2] } }]);
  });

  it('honors timeouts without exposing unsupported stream capability', async () => {
    const worker = createTestWorker<void, void>(() => new Promise(() => {}), { timeout: 5 });

    await expect(worker.run()).rejects.toBeInstanceOf(FamiliarTimeoutError);
  });

  it('uses shared queue semantics for cancellation and concurrency', async () => {
    let release!: () => void;
    const worker = createTestWorker<number, number>(
      async (value) => {
        await new Promise<void>((resolve) => {
          release = resolve;
        });

        return value;
      },
      { concurrency: 1 },
    );
    const controller = new AbortController();
    const running = worker.run(1);
    const queued = worker.run(2, { signal: controller.signal });

    controller.abort();
    await expect(queued).rejects.toMatchObject({ name: 'AbortError' });
    release();
    await expect(running).resolves.toBe(1);
  });
});

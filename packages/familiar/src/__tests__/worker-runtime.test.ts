import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PROTOCOL_VERSION } from '../protocol';
import {
  batch,
  createStreamWorker,
  createTaskGroup,
  createWorker,
  FamiliarQueueFullError,
  FamiliarTaskError,
} from '../worker';

class WorkerMock {
  static instances: WorkerMock[] = [];
  onerror: ((event: ErrorEvent) => void) | null = null;
  onmessage: ((event: MessageEvent<unknown>) => void) | null = null;
  readonly requests: unknown[] = [];
  terminated = false;
  readonly url: URL | string;
  readonly options: WorkerOptions;

  constructor(url: URL | string, options: WorkerOptions) {
    this.url = url;
    this.options = options;
    WorkerMock.instances.push(this);
  }

  postMessage(message: unknown): void {
    this.requests.push(message);
  }

  respond(message: unknown): void {
    this.onmessage?.({ data: message } as MessageEvent<unknown>);
  }

  terminate(): void {
    this.terminated = true;
  }
}

type WorkerOptions = { type: 'module' };

function worker(): WorkerMock {
  return WorkerMock.instances.at(-1)!;
}

function result(id: number, value: unknown): unknown {
  return { id, kind: 'result', value, version: PROTOCOL_VERSION };
}

beforeEach(() => {
  WorkerMock.instances = [];
  Object.defineProperty(globalThis, 'Worker', { configurable: true, value: WorkerMock, writable: true });
});

afterEach(() => {
  delete (globalThis as { Worker?: unknown }).Worker;
});

describe('createWorker', () => {
  it('uses a module URL and one versioned protocol for requests', async () => {
    const pool = createWorker<number, number>(new URL('https://example.test/worker.js'));
    const task = pool.run(21);

    expect(worker().options).toEqual({ type: 'module' });
    expect(worker().requests).toEqual([{ id: 0, input: 21, kind: 'run', version: PROTOCOL_VERSION }]);

    worker().respond(result(0, 42));
    await expect(task).resolves.toBe(42);
    expect(pool.stats).toEqual({ active: 0, completed: 1, failed: 0, queued: 0 });
  });

  it('wraps protocol task failures with their original cause', async () => {
    const pool = createWorker<void, void>('worker.js');
    const task = pool.run();

    worker().respond({
      error: { message: 'bad input', name: 'TypeError' },
      id: 0,
      kind: 'error',
      version: PROTOCOL_VERSION,
    });

    await expect(task).rejects.toBeInstanceOf(FamiliarTaskError);
  });

  it('rejects incompatible protocol responses instead of leaving work pending', async () => {
    const pool = createWorker<void, void>('worker.js');
    const task = pool.run();

    worker().respond({ id: 0, kind: 'result', value: undefined, version: 999 });

    await expect(task).rejects.toMatchObject({ name: 'FamiliarRuntimeError' });
  });

  it('cancels executing work by terminating its occupied slot', async () => {
    const pool = createWorker<number, number>('worker.js');
    const controller = new AbortController();
    const task = pool.run(1, { signal: controller.signal });
    const occupied = worker();

    controller.abort();

    await expect(task).rejects.toMatchObject({ name: 'AbortError' });
    expect(occupied.terminated).toBe(true);

    const next = pool.run(2);

    expect(worker()).not.toBe(occupied);
    worker().respond(result(1, 4));
    await expect(next).resolves.toBe(4);
  });

  it('applies priority while tasks wait for capacity', async () => {
    const pool = createWorker<number, number>('worker.js');
    const first = pool.run(1);
    const normal = pool.run(2);
    const urgent = pool.run(3, { priority: 1 });

    worker().respond(result(0, 1));
    await Promise.resolve();
    expect(worker().requests.at(-1)).toEqual({ id: 1, input: 3, kind: 'run', version: PROTOCOL_VERSION });
    worker().respond(result(1, 3));
    await Promise.resolve();
    expect(worker().requests.at(-1)).toEqual({ id: 2, input: 2, kind: 'run', version: PROTOCOL_VERSION });
    worker().respond(result(2, 2));

    await expect(Promise.all([first, normal, urgent])).resolves.toEqual([1, 2, 3]);
  });

  it('rejects a full queue or waits with an abortable signal', async () => {
    const rejecting = createWorker<number, number>('worker.js', { maxQueue: 1 });
    const first = rejecting.run(1);

    rejecting.run(2);
    await expect(rejecting.run(3)).rejects.toBeInstanceOf(FamiliarQueueFullError);
    worker().respond(result(0, 1));
    worker().respond(result(1, 2));
    await first;

    const waiting = createWorker<number, number>('worker.js', { maxQueue: 1, onFull: 'wait' });
    const running = waiting.run(1);

    waiting.run(2);

    const controller = new AbortController();
    const blocked = waiting.run(3, { signal: controller.signal });

    controller.abort();
    await expect(blocked).rejects.toMatchObject({ name: 'AbortError' });
    worker().respond(result(0, 1));
    worker().respond(result(1, 2));
    await running;
  });

  it('releases capacity waiters when a queued task is aborted', async () => {
    const pool = createWorker<number, number>('worker.js', { maxQueue: 1, onFull: 'wait' });
    const running = pool.run(1);
    const controller = new AbortController();
    const queued = pool.run(2, { signal: controller.signal });
    const waiting = pool.run(3);

    controller.abort();

    await expect(queued).rejects.toMatchObject({ name: 'AbortError' });
    await Promise.resolve();
    await Promise.resolve();
    expect(pool.stats.queued).toBe(1);

    worker().respond(result(0, 1));
    await Promise.resolve();
    expect(worker().requests.at(-1)).toEqual({ id: 1, input: 3, kind: 'run', version: PROTOCOL_VERSION });
    worker().respond(result(1, 3));

    await expect(Promise.all([running, waiting])).resolves.toEqual([1, 3]);
  });

  it('provides batch and task-group helpers without enlarging pool capability', async () => {
    const pool = createWorker<number, number>('worker.js');
    const values = batch(pool, [1, 2]);
    const iterator = values[Symbol.asyncIterator]();
    const firstValue = iterator.next();

    worker().respond(result(0, 2));
    await expect(firstValue).resolves.toEqual({ done: false, value: 2 });

    const secondValue = iterator.next();

    worker().respond(result(1, 4));
    await expect(secondValue).resolves.toEqual({ done: false, value: 4 });

    const group = createTaskGroup(pool, 'numbers');
    const task = group.run(3);

    worker().respond(result(2, 6));
    await expect(group.drain()).resolves.toEqual([{ status: 'fulfilled', value: 6 }]);
    expect(group.name).toBe('numbers');
    await expect(task).resolves.toBe(6);
  });
});

describe('createStreamWorker', () => {
  it('exposes stream capability on a dedicated handle', async () => {
    const pool = createStreamWorker<number, number>('worker.js');
    const iterator = pool.runStream(2)[Symbol.asyncIterator]();
    const first = iterator.next();

    await Promise.resolve();
    await Promise.resolve();

    expect(worker().requests).toEqual([{ id: 0, input: 2, kind: 'stream', version: PROTOCOL_VERSION }]);
    worker().respond({ id: 0, kind: 'chunk', value: 1, version: PROTOCOL_VERSION });
    await expect(first).resolves.toEqual({ done: false, value: 1 });

    const second = iterator.next();

    worker().respond({ id: 0, kind: 'chunk', value: 2, version: PROTOCOL_VERSION });
    await expect(second).resolves.toEqual({ done: false, value: 2 });

    const end = iterator.next();

    worker().respond(result(0, undefined));
    await expect(end).resolves.toEqual({ done: true, value: undefined });
  });

  it('reuses worker slots after a completed stream', async () => {
    const pool = createStreamWorker<number, number>('worker.js');
    const firstIterator = pool.runStream(1)[Symbol.asyncIterator]();
    const first = firstIterator.next();

    await Promise.resolve();
    await Promise.resolve();

    const slot = worker();

    slot.respond({ id: 0, kind: 'chunk', value: 1, version: PROTOCOL_VERSION });
    await first;

    const firstEnd = firstIterator.next();

    slot.respond(result(0, undefined));
    await firstEnd;

    const secondIterator = pool.runStream(2)[Symbol.asyncIterator]();
    const second = secondIterator.next();

    await Promise.resolve();
    expect(worker()).toBe(slot);
    expect(slot.terminated).toBe(false);
    expect(slot.requests.at(-1)).toEqual({ id: 1, input: 2, kind: 'stream', version: PROTOCOL_VERSION });

    slot.respond({ id: 1, kind: 'chunk', value: 2, version: PROTOCOL_VERSION });
    await second;

    const secondEnd = secondIterator.next();

    slot.respond(result(1, undefined));
    await secondEnd;
  });

  it('applies pool timeout to streams and supports per-run override', async () => {
    vi.useFakeTimers();

    const pool = createStreamWorker<number, number>('worker.js', { timeout: 10 });
    const iterator = pool.runStream(1)[Symbol.asyncIterator]();
    const timedOut = iterator.next();

    await Promise.resolve();
    await Promise.resolve();

    const timeoutExpectation = expect(timedOut).rejects.toMatchObject({ name: 'FamiliarTimeoutError' });

    await vi.advanceTimersByTimeAsync(10);
    await timeoutExpectation;
    expect(worker().terminated).toBe(true);

    const overrideIterator = pool.runStream(2, { timeout: 20 })[Symbol.asyncIterator]();
    const override = overrideIterator.next();

    await Promise.resolve();
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(10);
    expect(worker().terminated).toBe(false);

    worker().respond({ id: 1, kind: 'chunk', value: 2, version: PROTOCOL_VERSION });
    await expect(override).resolves.toEqual({ done: false, value: 2 });

    const end = overrideIterator.next();

    worker().respond(result(1, undefined));
    await end;
    vi.useRealTimers();
  });
});

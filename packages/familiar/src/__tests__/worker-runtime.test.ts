import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PROTOCOL_VERSION } from '../protocol';
import {
  createStreamWorker,
  createWorker,
  FamiliarInvalidOptionsError,
  FamiliarQueueFullError,
  FamiliarRuntimeError,
  FamiliarTaskError,
  FamiliarTerminatedError,
  runBatch,
} from '../worker';

class WorkerMock {
  static instances: WorkerMock[] = [];
  onerror: ((event: ErrorEvent) => void) | null = null;
  onmessage: ((event: MessageEvent<unknown>) => void) | null = null;
  onmessageerror: ((event: MessageEvent<unknown>) => void) | null = null;
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

  it('includes capacity waiters in stats and preserves their priority', async () => {
    const pool = createWorker<number, number>('worker.js', { maxQueue: 1, onFull: 'wait' });
    const running = pool.run(1);
    const queued = pool.run(2);
    const waiting = pool.run(3);
    const urgent = pool.run(4, { priority: 10 });

    await Promise.resolve();
    expect(pool.stats.queued).toBe(3);

    worker().respond(result(0, 1));
    await Promise.resolve();
    expect(worker().requests.at(-1)).toMatchObject({ input: 2 });
    worker().respond(result(1, 2));
    await Promise.resolve();
    await Promise.resolve();
    expect(worker().requests.at(-1)).toMatchObject({ input: 4 });
    worker().respond(result(2, 4));
    await Promise.resolve();
    await Promise.resolve();
    expect(worker().requests.at(-1)).toMatchObject({ input: 3 });
    worker().respond(result(3, 3));

    await expect(Promise.all([running, queued, waiting, urgent])).resolves.toEqual([1, 2, 3, 4]);
  });

  it('settles worker errors before isolating onSlotError failures', async () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const pool = createWorker<number, number>('worker.js', {
      onSlotError: () => {
        throw new Error('observer failed');
      },
    });
    const task = pool.run(1);
    const occupied = worker();

    occupied.onerror?.({ message: 'worker failed' } as ErrorEvent);

    await expect(task).rejects.toBeInstanceOf(FamiliarRuntimeError);
    expect(occupied.terminated).toBe(true);
    expect(warning).toHaveBeenCalledOnce();
    warning.mockRestore();
  });

  it('rejects malformed and undecodable worker responses', async () => {
    const pool = createWorker<number, number>('worker.js');
    const malformed = pool.run(1);

    worker().respond({ id: 0, kind: 'error', version: PROTOCOL_VERSION });
    await expect(malformed).rejects.toBeInstanceOf(FamiliarRuntimeError);

    const protocolMismatch = pool.run(2);
    worker().respond({
      error: { category: 'protocol', message: 'wrong capability', name: 'Error' },
      id: 1,
      kind: 'error',
      version: PROTOCOL_VERSION,
    });
    await expect(protocolMismatch).rejects.toBeInstanceOf(FamiliarRuntimeError);

    const unexpectedChunk = pool.run(3);
    worker().respond({ id: 2, kind: 'chunk', value: 2, version: PROTOCOL_VERSION });
    await expect(unexpectedChunk).rejects.toBeInstanceOf(FamiliarRuntimeError);

    const undecodable = pool.run(3);
    worker().onmessageerror?.({} as MessageEvent<unknown>);
    await expect(undecodable).rejects.toBeInstanceOf(FamiliarRuntimeError);
  });

  it('does not terminate a settled worker when cancellation races its promise continuation', async () => {
    const pool = createWorker<number, number>('worker.js');
    const controller = new AbortController();
    const task = pool.run(1, { signal: controller.signal });
    const occupied = worker();

    occupied.respond(result(0, 1));
    controller.abort();

    await expect(task).resolves.toBe(1);
    expect(occupied.terminated).toBe(false);
  });

  it('snapshots cross-realm worker URLs', async () => {
    const iframe = document.createElement('iframe');
    document.body.append(iframe);
    const ForeignUrl = (iframe.contentWindow as (Window & typeof globalThis) | null)?.URL;
    if (!ForeignUrl) throw new Error('iframe URL unavailable');
    const url = new ForeignUrl('https://example.test/first.worker.js');
    const pool = createWorker<number, number>(url);

    url.pathname = '/second.worker.js';
    const task = pool.run(1);

    expect(worker().url).toBe('https://example.test/first.worker.js');
    worker().respond(result(0, 1));
    await task;
    iframe.remove();
  });

  it('does not count custom abort reasons as task failures', async () => {
    const pool = createWorker<number, number>('worker.js');
    const controller = new AbortController();
    const task = pool.run(1, { signal: controller.signal });

    controller.abort(new Error('obsolete'));
    await expect(task).rejects.toThrow('obsolete');
    expect(pool.stats.failed).toBe(0);
  });

  it.each([0, -1, 0.5, Number.NaN, 2_147_483_648])('rejects invalid operation timeout %s', async (timeout) => {
    const pool = createWorker<number, number>('worker.js');

    await expect(pool.run(1, { timeout })).rejects.toBeInstanceOf(FamiliarInvalidOptionsError);
    await expect(pool.drain({ timeout })).rejects.toBeInstanceOf(FamiliarInvalidOptionsError);
  });

  it('drains active and queued work before disposal', async () => {
    const pool = createWorker<number, number>('worker.js');
    const first = pool.run(1);
    const second = pool.run(2);
    const draining = pool.drain();

    expect(pool.disposed).toBe(false);
    worker().respond(result(0, 1));
    await Promise.resolve();
    worker().respond(result(1, 2));

    await expect(Promise.all([first, second])).resolves.toEqual([1, 2]);
    await expect(draining).resolves.toBeUndefined();
    expect(pool.disposed).toBe(true);
    await expect(pool.drain({ timeout: 0 })).resolves.toBeUndefined();
  });

  it('rejects invalid queue policy and priority', async () => {
    expect(() => createWorker('worker.js', { onFull: 'other' as never })).toThrow(FamiliarInvalidOptionsError);
    const pool = createWorker<number, number>('worker.js');

    await expect(pool.run(1, { priority: Number.NaN })).rejects.toBeInstanceOf(FamiliarInvalidOptionsError);
  });
});

describe('runBatch', () => {
  it('yields concurrent results progressively in input order', async () => {
    const pool = createWorker<number, number>('worker.js', { concurrency: 2 });
    const iterator = runBatch(pool, [1, 2])[Symbol.asyncIterator]();
    const first = iterator.next();
    await Promise.resolve();
    const [firstWorker, secondWorker] = WorkerMock.instances;

    secondWorker.respond(result(0, 20));
    await Promise.resolve();
    firstWorker.respond(result(0, 10));

    await expect(first).resolves.toEqual({ done: false, value: 10 });
    await expect(iterator.next()).resolves.toEqual({ done: false, value: 20 });
    await expect(iterator.next()).resolves.toEqual({ done: true, value: undefined });
  });

  it('cancels sibling work on failure', async () => {
    const pool = createWorker<number, number>('worker.js', { concurrency: 2 });
    const iterator = runBatch(pool, [1, 2])[Symbol.asyncIterator]();
    const first = iterator.next();
    await Promise.resolve();
    const [firstWorker, secondWorker] = WorkerMock.instances;

    secondWorker.respond({
      error: { message: 'failed', name: 'Error' },
      id: 0,
      kind: 'error',
      version: PROTOCOL_VERSION,
    });

    await expect(first).rejects.toBeInstanceOf(FamiliarTaskError);
    expect(firstWorker.terminated).toBe(true);
  });

  it('stops yielding completed results after caller cancellation', async () => {
    const pool = createWorker<number, number>('worker.js', { concurrency: 2 });
    const controller = new AbortController();
    const iterator = runBatch(pool, [1, 2], { signal: controller.signal })[Symbol.asyncIterator]();
    const first = iterator.next();
    await Promise.resolve();
    WorkerMock.instances[0].respond(result(0, 1));
    WorkerMock.instances[1].respond(result(0, 2));
    await expect(first).resolves.toEqual({ done: false, value: 1 });

    controller.abort();

    await expect(iterator.next()).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('cancels pending work when the consumer returns', async () => {
    const pool = createWorker<number, number>('worker.js');
    const iterator = runBatch(pool, [1])[Symbol.asyncIterator]();
    const next = iterator.next();
    await Promise.resolve();
    const occupied = worker();

    const returned = iterator.return!();

    await expect(next).rejects.toBeInstanceOf(FamiliarTerminatedError);
    await expect(returned).resolves.toEqual({ done: true, value: undefined });
    expect(occupied.terminated).toBe(true);
  });

  it('rejects an already-aborted empty batch', async () => {
    const pool = createWorker<number, number>('worker.js');
    const controller = new AbortController();
    controller.abort();

    await expect(
      runBatch(pool, [], { signal: controller.signal })[Symbol.asyncIterator]().next(),
    ).rejects.toMatchObject({
      name: 'AbortError',
    });
  });

  it('selects an independent transfer list for each input', async () => {
    const pool = createWorker<ArrayBuffer, number>('worker.js');
    const inputs = [new ArrayBuffer(1), new ArrayBuffer(2)];
    const getTransferables = vi.fn((input: ArrayBuffer) => [input]);
    const iterator = runBatch(pool, inputs, { getTransferables })[Symbol.asyncIterator]();
    const first = iterator.next();
    await Promise.resolve();

    expect(getTransferables).toHaveBeenNthCalledWith(1, inputs[0], 0);
    expect(getTransferables).toHaveBeenNthCalledWith(2, inputs[1], 1);
    worker().respond(result(0, 1));
    await first;
    const second = iterator.next();
    await Promise.resolve();
    worker().respond(result(1, 2));
    await second;
    await iterator.next();
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

  it('does not attach abort listeners until iteration starts', () => {
    const pool = createStreamWorker<number, number>('worker.js');
    const controller = new AbortController();
    const add = vi.spyOn(controller.signal, 'addEventListener');
    const remove = vi.spyOn(controller.signal, 'removeEventListener');

    pool.runStream(1, { signal: controller.signal });
    pool.dispose();

    expect(add).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
  });

  it('rejects a second iterator for the same stream', async () => {
    const pool = createStreamWorker<number, number>('worker.js');
    const stream = pool.runStream(1);
    const first = stream[Symbol.asyncIterator]();
    const end = first.next();

    await Promise.resolve();
    await Promise.resolve();
    worker().respond(result(0, undefined));
    await expect(end).resolves.toEqual({ done: true, value: undefined });

    await expect(stream[Symbol.asyncIterator]().next()).rejects.toBeInstanceOf(FamiliarRuntimeError);
  });

  it('allows an unused iterator to be discarded before consumption', async () => {
    const pool = createStreamWorker<number, number>('worker.js');
    const stream = pool.runStream(1);
    const unused = stream[Symbol.asyncIterator]();

    await expect(unused.return!()).resolves.toEqual({ done: true, value: undefined });
    const active = stream[Symbol.asyncIterator]();
    const end = active.next();
    await Promise.resolve();
    await Promise.resolve();
    worker().respond(result(0, undefined));

    await expect(end).resolves.toEqual({ done: true, value: undefined });
  });

  it('cancels immediately when return is called during a pending next', async () => {
    const pool = createStreamWorker<number, number>('worker.js');
    const iterator = pool.runStream(1)[Symbol.asyncIterator]();
    const next = iterator.next();
    await Promise.resolve();
    await Promise.resolve();
    const occupied = worker();

    const returned = iterator.return!();

    await expect(next).rejects.toBeInstanceOf(FamiliarTerminatedError);
    await expect(returned).resolves.toEqual({ done: true, value: undefined });
    expect(occupied.terminated).toBe(true);
  });

  it('does not count queue admission rejection as a stream failure', async () => {
    const pool = createStreamWorker<number, number>('worker.js', { maxQueue: 1 });
    const first = pool.runStream(1)[Symbol.asyncIterator]().next();
    await Promise.resolve();
    await Promise.resolve();
    const second = pool.runStream(2)[Symbol.asyncIterator]().next();
    await Promise.resolve();
    const rejected = pool.runStream(3)[Symbol.asyncIterator]().next();

    await expect(rejected).rejects.toBeInstanceOf(FamiliarQueueFullError);
    expect(pool.stats.failed).toBe(0);
    pool.dispose();
    await Promise.allSettled([first, second]);
  });
});

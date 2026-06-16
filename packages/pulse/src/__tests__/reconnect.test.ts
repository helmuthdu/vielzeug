import { createReconnect } from '../reconnect';

describe('createReconnect — disabled (opts=false)', () => {
  it('attempt() always returns false', async () => {
    const handle = createReconnect(false);
    const result = await handle.attempt(() => Promise.resolve(), new AbortController().signal);

    expect(result).toBe(false);
  });

  it('attempt() returns false when opts is undefined', async () => {
    const handle = createReconnect(undefined);
    const result = await handle.attempt(() => Promise.resolve(), new AbortController().signal);

    expect(result).toBe(false);
  });
});

describe('createReconnect — enabled', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns true when connect succeeds', async () => {
    const handle = createReconnect({ delay: 0, maxAttempts: 3 });
    const connect = vi.fn().mockResolvedValue(undefined);
    const ctrl = new AbortController();

    const p = handle.attempt(connect, ctrl.signal);

    await vi.runAllTimersAsync();

    expect(await p).toBe(true);
    expect(connect).toHaveBeenCalledTimes(1);
  });

  it('returns false when connect throws', async () => {
    const handle = createReconnect({ delay: 0, maxAttempts: 1 });
    const connect = vi.fn().mockRejectedValue(new Error('fail'));
    const ctrl = new AbortController();

    const p = handle.attempt(connect, ctrl.signal);

    await vi.runAllTimersAsync();

    expect(await p).toBe(false);
  });

  it('returns false when maxAttempts is exhausted', async () => {
    const handle = createReconnect({ delay: 0, maxAttempts: 2 });
    const connect = vi.fn().mockRejectedValue(new Error('fail'));
    const ctrl = new AbortController();

    let p = handle.attempt(connect, ctrl.signal);

    await vi.runAllTimersAsync();
    await p;

    p = handle.attempt(connect, ctrl.signal);
    await vi.runAllTimersAsync();
    await p;

    const result = await handle.attempt(connect, ctrl.signal);

    expect(result).toBe(false);
    expect(connect).toHaveBeenCalledTimes(2);
  });

  it('returns false when signal is pre-aborted', async () => {
    const handle = createReconnect({ delay: 0, maxAttempts: 5 });
    const connect = vi.fn();
    const signal = AbortSignal.abort();

    const p = handle.attempt(connect, signal);

    await vi.runAllTimersAsync();

    expect(await p).toBe(false);
    expect(connect).not.toHaveBeenCalled();
  });

  it('reset() allows reuse after exhaustion', async () => {
    const handle = createReconnect({ delay: 0, maxAttempts: 1 });
    const connect = vi.fn().mockRejectedValue(new Error('fail'));
    const ctrl = new AbortController();

    let p = handle.attempt(connect, ctrl.signal);

    await vi.runAllTimersAsync();
    await p;

    await handle.attempt(connect, ctrl.signal);

    handle.reset();

    const okConnect = vi.fn().mockResolvedValue(undefined);

    p = handle.attempt(okConnect, ctrl.signal);
    await vi.runAllTimersAsync();

    expect(await p).toBe(true);
  });

  it('uses a fixed numeric delay', async () => {
    const handle = createReconnect({ delay: 500, maxAttempts: 1 });
    const connect = vi.fn().mockResolvedValue(undefined);
    const ctrl = new AbortController();
    let resolved = false;

    handle.attempt(connect, ctrl.signal).then(() => {
      resolved = true;
    });

    await vi.advanceTimersByTimeAsync(499);
    expect(resolved).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    expect(resolved).toBe(true);
  });

  it('uses a function delay', async () => {
    const delayFn = vi.fn().mockReturnValue(200);
    const handle = createReconnect({ delay: delayFn, maxAttempts: 1 });
    const connect = vi.fn().mockResolvedValue(undefined);
    const ctrl = new AbortController();

    const p = handle.attempt(connect, ctrl.signal);

    await vi.runAllTimersAsync();
    await p;

    expect(delayFn).toHaveBeenCalledWith(0);
  });
});

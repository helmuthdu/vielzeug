import { AssayTimeoutError } from '../errors';
import { dispatch } from '../events';
import { delay, eventually, nextTick, waitForEvent, waitUntil } from '../wait';

afterEach(() => vi.useRealTimers());

describe('wait conveniences', () => {
  it('waits for boolean conditions, timers, and one microtask', async () => {
    let ready = false;
    setTimeout(() => (ready = true), 10);

    await waitUntil(() => ready, { interval: 5 });
    await delay(1);

    let ticked = false;
    queueMicrotask(() => (ticked = true));
    await nextTick();
    expect(ticked).toBe(true);
  });
});

describe('waitUntil()', () => {
  it('supports asynchronous predicates', async () => {
    let attempts = 0;

    await waitUntil(async () => ++attempts === 2, { interval: 1 });

    expect(attempts).toBe(2);
  });

  it('enforces timeout while an asynchronous predicate is pending', async () => {
    vi.useFakeTimers();
    const pending = waitUntil(() => new Promise<boolean>(() => undefined), { timeout: 20 });
    const rejection = expect(pending).rejects.toBeInstanceOf(AssayTimeoutError);

    await vi.advanceTimersByTimeAsync(20);
    await rejection;
    vi.useRealTimers();
  });

  it('rejects immediately when a pending predicate is aborted', async () => {
    const controller = new AbortController();
    const reason = new Error('stopped');
    const pending = waitUntil(() => new Promise<boolean>(() => undefined), { signal: controller.signal });

    controller.abort(reason);

    await expect(pending).rejects.toBe(reason);
  });
});

describe('eventually()', () => {
  it('retries assertions until they stop throwing', async () => {
    let count = 0;

    setTimeout(() => count++, 50);
    await eventually(() => expect(count).toBeGreaterThan(0));
  });

  it('resolves immediately when the assertion passes on the first try', async () => {
    await eventually(() => expect(true).toBe(true));
  });

  it('preserves the assertion failure as its timeout cause', async () => {
    const original = new Error('assertion failed');
    let error: AssayTimeoutError | undefined;

    try {
      await eventually(
        () => {
          throw original;
        },
        { timeout: 50 },
      );
    } catch (reason) {
      expect(reason).toBeInstanceOf(AssayTimeoutError);
      error = reason as AssayTimeoutError;
    }

    expect(error).toBeInstanceOf(AssayTimeoutError);
    expect(error?.cause).toBe(original);
    expect(error?.message).toContain('assertion failed');
    expect(original.message).toBe('assertion failed');
  });

  it('rejects on abort without continuing to poll', async () => {
    const controller = new AbortController();
    const reason = new Error('stopped');
    const pending = eventually(
      () => {
        throw new Error('never');
      },
      { signal: controller.signal },
    );

    controller.abort(reason);

    await expect(pending).rejects.toBe(reason);
  });

  it('enforces timeout while an asynchronous assertion is pending', async () => {
    vi.useFakeTimers();
    const pending = eventually(() => new Promise<void>(() => undefined), { timeout: 20 });
    const rejection = expect(pending).rejects.toBeInstanceOf(AssayTimeoutError);

    await vi.advanceTimersByTimeAsync(20);
    await rejection;
  });

  it('does not overshoot timeout by the polling interval', async () => {
    vi.useFakeTimers();
    const pending = eventually(
      () => {
        throw new Error('not ready');
      },
      { interval: 100, timeout: 20 },
    );
    const rejection = expect(pending).rejects.toBeInstanceOf(AssayTimeoutError);

    await vi.advanceTimersByTimeAsync(20);
    await rejection;
  });

  it('includes optional diagnostic context in timeout errors', async () => {
    await expect(
      eventually(
        () => {
          throw new Error('missing');
        },
        { interval: 1, message: 'status did not settle', timeout: 2 },
      ),
    ).rejects.toThrow('status did not settle');
  });
});

describe('scheduling validation', () => {
  it('preserves an explicit microtask boundary', async () => {
    const order: string[] = [];
    const tick = nextTick().then(() => order.push('tick'));

    queueMicrotask(() => order.push('queued-after-call'));
    await tick;

    expect(order).toEqual(['queued-after-call', 'tick']);
  });

  it('uses a cancellable macrotask for delay()', async () => {
    const controller = new AbortController();
    const reason = new Error('cancelled');
    const pending = delay(1000, { signal: controller.signal });

    controller.abort(reason);

    await expect(pending).rejects.toBe(reason);
  });

  it('rejects invalid delays and wait options', async () => {
    expect(() => delay(-1)).toThrow(RangeError);
    expect(() => delay(2_147_483_648)).toThrow(RangeError);
    await expect(waitUntil(() => false, { interval: 0 })).rejects.toThrow(RangeError);
    await expect(eventually(() => undefined, { timeout: Number.POSITIVE_INFINITY })).rejects.toThrow(RangeError);
    expect(() => waitForEvent(new EventTarget(), 'ready', { timeout: -1 })).toThrow(RangeError);
  });
});

describe('waitForEvent()', () => {
  it('resolves with the event when it fires', async () => {
    const element = document.createElement('div');
    const promise = waitForEvent<CustomEvent>(element, 'my-event');

    dispatch(element, new CustomEvent('my-event', { detail: 42 }));

    const event = await promise;

    expect(event.detail).toBe(42);
  });

  it('rejects with AssayTimeoutError when the event never fires', async () => {
    const element = document.createElement('div');

    await expect(waitForEvent(element, 'never-fires', { timeout: 50 })).rejects.toBeInstanceOf(AssayTimeoutError);
  });

  it('removes its event listener after a timeout', async () => {
    const element = document.createElement('div');
    const removeSpy = vi.spyOn(element, 'removeEventListener');

    await expect(waitForEvent(element, 'never-fires', { timeout: 20 })).rejects.toBeInstanceOf(AssayTimeoutError);

    expect(removeSpy).toHaveBeenCalledWith('never-fires', expect.any(Function));
  });

  it('supports any EventTarget and removes its listener when aborted', async () => {
    const target = new EventTarget();
    const controller = new AbortController();
    const removeSpy = vi.spyOn(target, 'removeEventListener');
    const pending = waitForEvent(target, 'ready', { signal: controller.signal });

    controller.abort();

    await expect(pending).rejects.toHaveProperty('name', 'AbortError');
    expect(removeSpy).toHaveBeenCalledWith('ready', expect.any(Function));
  });
});

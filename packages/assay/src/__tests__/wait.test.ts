import { AssayTimeoutError } from '../errors';
import { fire } from '../events';
import { nextTick, wait, waitFor, waitForEvent } from '../wait';

describe('waitFor', () => {
  it('should wait for boolean condition', async () => {
    let ready = false;

    setTimeout(() => (ready = true), 50);
    await waitFor(() => ready);
    expect(ready).toBe(true);
  });

  it('should wait for expect() assertion', async () => {
    let count = 0;

    setTimeout(() => count++, 50);
    await waitFor(() => expect(count).toBeGreaterThan(0));
    expect(count).toBeGreaterThan(0);
  });

  it('should timeout if condition not met', async () => {
    await expect(waitFor(() => false, { timeout: 100 })).rejects.toThrow();
  });

  it('rejects with AssayTimeoutError (not a plain Error) when the callback never throws but never succeeds', async () => {
    await expect(waitFor(() => false, { timeout: 50 })).rejects.toBeInstanceOf(AssayTimeoutError);
  });

  it('should wait for element to appear', async () => {
    const container = document.createElement('div');

    document.body.appendChild(container);
    setTimeout(() => {
      const el = document.createElement('button');

      container.appendChild(el);
    }, 50);
    await waitFor(() => container.querySelector('button'));
    expect(container.querySelector('button')).not.toBeNull();
    container.remove();
  });

  it('should wait for element removal', async () => {
    const container = document.createElement('div');
    const el = document.createElement('div');

    container.appendChild(el);
    document.body.appendChild(container);
    setTimeout(() => el.remove(), 50);
    await waitFor(() => !container.querySelector('div'));
    expect(container.querySelector('div')).toBeNull();
    container.remove();
  });

  it('prefixes a custom message in front of the default timing summary, rather than replacing it', async () => {
    const error = await waitFor(() => false, { message: 'custom failure message', timeout: 50 }).catch(
      (e: unknown) => e as Error,
    );

    expect(error.message).toContain('custom failure message');
    // The default "how long did we wait" summary is always present, even with a custom
    // message — losing it would make a mid-debugging custom message strictly worse than
    // the default.
    expect(error.message).toContain('waitFor timed out after 50ms');
  });

  it('wraps a persistently-thrown error in AssayTimeoutError instead of re-throwing it directly', async () => {
    await expect(
      waitFor(
        () => {
          throw new Error('assertion failed');
        },
        { timeout: 50 },
      ),
    ).rejects.toBeInstanceOf(AssayTimeoutError);
  });

  it('always rejects with AssayTimeoutError on timeout, regardless of whether the last attempt threw or returned falsy', async () => {
    const timedOutFalsy = await waitFor(() => false, { timeout: 50 }).catch((e: unknown) => e);
    const timedOutThrew = await waitFor(
      () => {
        throw new Error('assertion failed');
      },
      { timeout: 50 },
    ).catch((e: unknown) => e);

    expect(timedOutFalsy).toBeInstanceOf(AssayTimeoutError);
    expect(timedOutThrew).toBeInstanceOf(AssayTimeoutError);
  });

  it('preserves the original failure as .cause, in the message, and without mutating the original error', async () => {
    const original = new Error('assertion failed');

    let caught: unknown;

    try {
      await waitFor(
        () => {
          throw original;
        },
        { timeout: 50 },
      );
    } catch (e) {
      caught = e;
    }

    expect(caught).toBeInstanceOf(AssayTimeoutError);
    expect((caught as AssayTimeoutError).cause).toBe(original);
    expect((caught as Error).message).toContain('assertion failed');
    // The caller's error object itself must be untouched — waitFor() no longer mutates it.
    expect(original.message).toBe('assertion failed');
  });
});

describe('waitForEvent', () => {
  it('resolves with the event when it fires', async () => {
    const el = document.createElement('div');
    const promise = waitForEvent<CustomEvent>(el, 'my-event');

    fire.custom(el, 'my-event', { detail: 42 });

    const event = await promise;

    expect(event.detail).toBe(42);
  });

  it('rejects with AssayTimeoutError when the event never fires', async () => {
    const el = document.createElement('div');

    await expect(waitForEvent(el, 'never-fires', 50)).rejects.toBeInstanceOf(AssayTimeoutError);
  });

  it('removes its event listener when the wait times out (no dangling listener)', async () => {
    const el = document.createElement('div');
    const removeSpy = vi.spyOn(el, 'removeEventListener');

    await expect(waitForEvent(el, 'never-fires', 20)).rejects.toBeInstanceOf(AssayTimeoutError);

    expect(removeSpy).toHaveBeenCalledWith('never-fires', expect.any(Function));
  });

  it('removes its event listener once resolved, so a second dispatch does not resolve it again', async () => {
    const el = document.createElement('div');
    const promise = waitForEvent<CustomEvent>(el, 'my-event');

    fire.custom(el, 'my-event', { detail: 1 });

    const first = await promise;

    expect(first.detail).toBe(1);

    // A second dispatch after resolution should not throw or affect anything —
    // the listener was registered with { once: true }.
    expect(() => fire.custom(el, 'my-event', { detail: 2 })).not.toThrow();
  });
});

describe('nextTick()', () => {
  it('resolves after a microtask tick, after synchronous code but before a macrotask', async () => {
    const order: string[] = [];

    const tickPromise = nextTick().then(() => order.push('tick'));

    setTimeout(() => order.push('timeout'), 0);
    order.push('sync');

    await tickPromise;
    await wait(10);

    expect(order).toEqual(['sync', 'tick', 'timeout']);
  });
});

describe('wait()', () => {
  it('resolves after the given delay', async () => {
    const start = Date.now();

    await wait(20);

    expect(Date.now() - start).toBeGreaterThanOrEqual(15);
  });

  it('defaults to a 0ms delay (yields to the macrotask queue)', async () => {
    let ran = false;

    void wait().then(() => {
      ran = true;
    });

    expect(ran).toBe(false);
    await wait(0);
    expect(ran).toBe(true);
  });
});

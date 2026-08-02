import { AssayTimeoutError } from '../errors';
import { fireCustom } from '../events';
import { delay, nextTick, retry, waitForEvent, waitUntil } from '../wait';

describe('waitUntil()', () => {
  it('waits for a boolean condition', async () => {
    let ready = false;

    setTimeout(() => (ready = true), 50);
    await waitUntil(() => ready);

    expect(ready).toBe(true);
  });

  it('supports asynchronous predicates', async () => {
    let count = 0;

    setTimeout(() => count++, 50);
    await waitUntil(async () => count > 0);

    expect(count).toBeGreaterThan(0);
  });

  it('waits for elements to appear and disappear', async () => {
    const container = document.createElement('div');
    const element = document.createElement('button');

    document.body.appendChild(container);
    setTimeout(() => container.appendChild(element), 20);
    await waitUntil(() => container.querySelector('button') !== null);
    setTimeout(() => element.remove(), 20);
    await waitUntil(() => container.querySelector('button') === null);

    container.remove();
  });

  it('rejects with AssayTimeoutError when the condition stays false', async () => {
    await expect(waitUntil(() => false, { timeout: 50 })).rejects.toBeInstanceOf(AssayTimeoutError);
  });

  it('rejects on abort without continuing to poll', async () => {
    const controller = new AbortController();
    const reason = new Error('stopped');
    const pending = waitUntil(() => false, { signal: controller.signal });

    controller.abort(reason);

    await expect(pending).rejects.toBe(reason);
  });
});

describe('retry()', () => {
  it('retries assertions until they stop throwing', async () => {
    let count = 0;

    setTimeout(() => count++, 50);
    await retry(() => expect(count).toBeGreaterThan(0));
  });

  it('preserves the assertion failure as its timeout cause', async () => {
    const original = new Error('assertion failed');
    let error: AssayTimeoutError | undefined;

    try {
      await retry(
        () => {
          throw original;
        },
        { message: 'status did not settle', timeout: 50 },
      );
    } catch (reason) {
      expect(reason).toBeInstanceOf(AssayTimeoutError);
      error = reason as AssayTimeoutError;
    }

    expect(error).toBeInstanceOf(AssayTimeoutError);
    expect(error?.cause).toBe(original);
    expect(error?.message).toContain('status did not settle');
    expect(error?.message).toContain('assertion failed');
    expect(original.message).toBe('assertion failed');
  });
});

describe('waitForEvent()', () => {
  it('resolves with the event when it fires', async () => {
    const element = document.createElement('div');
    const promise = waitForEvent<CustomEvent>(element, 'my-event');

    fireCustom(element, { detail: 42, type: 'my-event' });

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

describe('nextTick()', () => {
  it('resolves after synchronous code and before a macrotask', async () => {
    const order: string[] = [];
    const tickPromise = nextTick().then(() => order.push('tick'));

    setTimeout(() => order.push('timeout'), 0);
    order.push('sync');

    await tickPromise;
    await delay(10);

    expect(order).toEqual(['sync', 'tick', 'timeout']);
  });
});

describe('delay()', () => {
  it('resolves after the given delay', async () => {
    const start = Date.now();

    await delay(20);

    expect(Date.now() - start).toBeGreaterThanOrEqual(15);
  });

  it('defaults to a macrotask delay', async () => {
    let ran = false;

    void delay().then(() => {
      ran = true;
    });

    expect(ran).toBe(false);
    await delay(0);
    expect(ran).toBe(true);
  });
});

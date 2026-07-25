import { createSourceCore } from '../core';
import { SourcererDisposedError, SourcererTimeoutError } from '../errors';

/**
 * Direct unit tests for `createSourceCore()` — independent of any source factory. The rest of
 * the suite exercises this module transitively through remoteSource/cursorSource/infiniteSource/
 * localSource; these pin the actual `notify()`/`subscribe()`/`ready()`/`schedule()` contract
 * on its own (see `core.ts`'s header comment for why this stays a plain `Set<listener>` rather
 * than a `@vielzeug/ripple` signal).
 */
describe('createSourceCore()', () => {
  it('does not fire a listener immediately on subscribe — only on the next notify()', () => {
    const core = createSourceCore();
    const calls: number[] = [];

    core.subscribe(() => calls.push(1));

    expect(calls).toHaveLength(0);

    core.notify();

    expect(calls).toHaveLength(1);
  });

  it('fires every subscribed listener on notify(), in no particular guaranteed order', () => {
    const core = createSourceCore();
    let a = 0;
    let b = 0;

    core.subscribe(() => a++);
    core.subscribe(() => b++);

    core.notify();
    core.notify();

    expect(a).toBe(2);
    expect(b).toBe(2);
  });

  it('unsubscribe stops future notifications for that listener only', () => {
    const core = createSourceCore();
    let a = 0;
    let b = 0;

    const unsubA = core.subscribe(() => a++);

    core.subscribe(() => b++);

    core.notify();
    unsubA();
    core.notify();

    expect(a).toBe(1);
    expect(b).toBe(2);
  });

  it('runs onBefore/onBeforeNotify before listeners observe the new state', () => {
    const core = createSourceCore({ onBeforeNotify: () => order.push('onBeforeNotify') });
    const order: string[] = [];

    core.subscribe(() => order.push('listener'));
    core.notify(() => order.push('onBefore'));

    expect(order).toEqual(['onBefore', 'listener']);
  });

  it('dispose() clears listeners and makes subscribe()/notify() no-ops', () => {
    const core = createSourceCore();
    let calls = 0;

    core.subscribe(() => calls++);
    core.dispose();
    core.notify();

    expect(calls).toBe(0);
    expect(core.isDisposed).toBe(true);
    expect(core.disposalSignal.aborted).toBe(true);

    const unsub = core.subscribe(() => calls++);

    core.notify();
    expect(calls).toBe(0);
    expect(() => unsub()).not.toThrow();
  });

  it('ready() resolves immediately when already idle', async () => {
    const core = createSourceCore();

    await expect(core.ready(() => true)).resolves.toBeUndefined();
  });

  it('ready() resolves once isIdle() becomes true after a notify()', async () => {
    const core = createSourceCore();
    let idle = false;

    const promise = core.ready(() => idle);

    idle = true;
    core.notify();

    await expect(promise).resolves.toBeUndefined();
  });

  it('ready() rejects with SourcererTimeoutError after the timeout elapses while still busy', async () => {
    vi.useFakeTimers();

    const core = createSourceCore();
    const promise = core.ready(() => false, 50);

    vi.advanceTimersByTime(50);

    await expect(promise).rejects.toBeInstanceOf(SourcererTimeoutError);

    vi.useRealTimers();
  });

  it('ready() rejects with SourcererDisposedError when disposed while waiting', async () => {
    const core = createSourceCore();
    const promise = core.ready(() => false);

    core.dispose();

    await expect(promise).rejects.toBeInstanceOf(SourcererDisposedError);
  });

  it('schedule()/cancelTimer()/isScheduled track a plain debounce timer, unrelated to notify', () => {
    vi.useFakeTimers();

    const core = createSourceCore();

    expect(core.isScheduled).toBe(false);

    let ran = false;

    core.schedule(() => {
      ran = true;
    }, 100);

    expect(core.isScheduled).toBe(true);

    core.cancelTimer();
    vi.advanceTimersByTime(200);

    expect(ran).toBe(false);
    expect(core.isScheduled).toBe(false);

    vi.useRealTimers();
  });

  it('flush() cancels a pending timer and immediately invokes the callback', async () => {
    vi.useFakeTimers();

    const core = createSourceCore();
    let scheduledRan = false;

    core.schedule(() => {
      scheduledRan = true;
    }, 100);

    let flushed = false;

    await core.flush(async () => {
      flushed = true;
    });

    expect(flushed).toBe(true);
    expect(core.isScheduled).toBe(false);

    vi.advanceTimersByTime(200);
    expect(scheduledRan).toBe(false);

    vi.useRealTimers();
  });
});

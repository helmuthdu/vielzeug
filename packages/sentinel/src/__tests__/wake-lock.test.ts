import { describe, expect, it, vi } from 'vitest';
import { createWakeLock } from '../index.ts';

class MockWakeLockSentinel extends EventTarget {
  released = false;

  async release(): Promise<void> {
    this.released = true;
    this.dispatchEvent(new Event('release'));
  }
}

class TestWindow extends EventTarget {
  readonly document: Document;
  readonly navigator: Navigator;

  constructor(navigator: Navigator = {} as Navigator) {
    super();
    const doc = new EventTarget() as unknown as Document;
    Object.defineProperty(doc, 'visibilityState', { configurable: true, value: 'visible' });
    this.document = doc;
    this.navigator = navigator;
  }
}

function createTestWindow(navigator?: Navigator): TestWindow {
  return new TestWindow(navigator);
}

describe('createWakeLock', () => {
  it('reports unsupported when wakeLock API is absent', () => {
    const target = createTestWindow();
    const lock = createWakeLock({ target: target as unknown as Window });

    expect(lock.getSnapshot()).toEqual({ active: false, supported: false });
    lock.request();
    expect(lock.getSnapshot().active).toBe(false);
    lock.dispose();
  });

  it('acquires and releases the wake lock', async () => {
    const mockSentinel = new MockWakeLockSentinel();
    const navigator = {
      wakeLock: { request: vi.fn(async () => mockSentinel) },
    } as unknown as Navigator;
    const target = createTestWindow(navigator);
    const lock = createWakeLock({ target: target as unknown as Window });

    expect(lock.getSnapshot().supported).toBe(true);
    expect(lock.getSnapshot().active).toBe(false);

    lock.request();
    await vi.waitFor(() => expect(lock.getSnapshot().active).toBe(true));
    expect(navigator.wakeLock!.request).toHaveBeenCalledWith('screen');

    lock.release();
    expect(lock.getSnapshot().active).toBe(false);
    expect(mockSentinel.released).toBe(true);
    lock.dispose();
  });

  it('re-acquires on visibility change after auto-release', async () => {
    const mockSentinel = new MockWakeLockSentinel();
    let resolvePromise: (value: MockWakeLockSentinel) => void = () => {};
    const navigator = {
      wakeLock: {
        request: vi.fn(() => {
          return new Promise((resolve) => {
            resolvePromise = (value) => resolve(value);
          });
        }),
      },
    } as unknown as Navigator;
    const target = createTestWindow(navigator);
    const lock = createWakeLock({ target: target as unknown as Window });

    lock.request();
    resolvePromise(mockSentinel);
    await vi.waitFor(() => expect(lock.getSnapshot().active).toBe(true));

    // Simulate browser auto-release (tab hidden)
    mockSentinel.dispatchEvent(new Event('release'));
    await vi.waitFor(() => expect(lock.getSnapshot().active).toBe(false));

    // Simulate tab becoming visible again
    Object.defineProperty(target.document, 'visibilityState', { configurable: true, value: 'visible' });
    target.document.dispatchEvent(new Event('visibilitychange'));

    const newSentinel = new MockWakeLockSentinel();
    resolvePromise(newSentinel);
    await vi.waitFor(() => expect(lock.getSnapshot().active).toBe(true));

    lock.dispose();
  });

  it('cleans up listeners on dispose', async () => {
    const mockSentinel = new MockWakeLockSentinel();
    const navigator = {
      wakeLock: { request: vi.fn(async () => mockSentinel) },
    } as unknown as Navigator;
    const target = createTestWindow(navigator);
    const lock = createWakeLock({ target: target as unknown as Window });

    lock.request();
    await vi.waitFor(() => expect(lock.getSnapshot().active).toBe(true));

    const removeSpy = vi.spyOn(target.document, 'removeEventListener');
    lock.dispose();
    expect(removeSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
    expect(mockSentinel.released).toBe(true);
  });
});

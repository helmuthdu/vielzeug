import { afterEach, describe, expect, it, vi } from 'vitest';
import { createElementSize, createIntersection, SentinelUnavailableError } from '../index.ts';

type ObserverWindow = Window & {
  IntersectionObserver?: typeof IntersectionObserver;
  ResizeObserver?: typeof ResizeObserver;
};

class TestResizeObserver implements ResizeObserver {
  static current: TestResizeObserver | undefined;
  readonly disconnect = vi.fn();
  readonly observe = vi.fn();
  readonly unobserve = vi.fn();

  constructor(private readonly callback: ResizeObserverCallback) {
    TestResizeObserver.current = this;
  }

  emit(width: number, height: number): void {
    const entry = {
      contentRect: { height, width },
    } as ResizeObserverEntry;
    this.callback([entry], this);
  }
}

class TestIntersectionObserver implements IntersectionObserver {
  static current: TestIntersectionObserver | undefined;
  readonly disconnect = vi.fn();
  readonly observe = vi.fn();
  readonly root = null;
  readonly rootMargin = '0px';
  readonly scrollMargin = '0px';
  readonly thresholds = [0];
  readonly takeRecords = vi.fn(() => []);
  readonly unobserve = vi.fn();

  constructor(
    private readonly callback: IntersectionObserverCallback,
    readonly options?: IntersectionObserverInit,
  ) {
    TestIntersectionObserver.current = this;
  }

  emit(isIntersecting: boolean, intersectionRatio: number): void {
    const entry = { intersectionRatio, isIntersecting } as IntersectionObserverEntry;
    this.callback([entry], this);
  }
}

const ownerWindow = window as ObserverWindow;
const originalResizeObserver = ownerWindow.ResizeObserver;
const originalIntersectionObserver = ownerWindow.IntersectionObserver;

afterEach(() => {
  ownerWindow.ResizeObserver = originalResizeObserver;
  ownerWindow.IntersectionObserver = originalIntersectionObserver;
  TestResizeObserver.current = undefined;
  TestIntersectionObserver.current = undefined;
});

describe('element Sentinels', () => {
  it('reports element content-box size', () => {
    ownerWindow.ResizeObserver = TestResizeObserver;
    const element = document.createElement('div');
    const sentinel = createElementSize(element);

    expect(sentinel.value).toBeNull();

    TestResizeObserver.current?.emit(320, 180);
    expect(sentinel.value).toEqual({ height: 180, width: 320 });

    sentinel.dispose();
    expect(TestResizeObserver.current?.disconnect).toHaveBeenCalledOnce();
  });

  it('reports normalized intersection state and forwards options', () => {
    ownerWindow.IntersectionObserver = TestIntersectionObserver;
    const element = document.createElement('div');
    const sentinel = createIntersection(element, {
      root: document,
      rootMargin: '20px',
      scrollMargin: '10px',
      threshold: 0.5,
    });

    expect(sentinel.value).toBeNull();
    expect(TestIntersectionObserver.current?.options).toMatchObject({
      root: document,
      rootMargin: '20px',
      scrollMargin: '10px',
      threshold: 0.5,
    });

    TestIntersectionObserver.current?.emit(true, 0.75);
    expect(sentinel.value).toEqual({ intersectionRatio: 0.75, isIntersecting: true });

    sentinel.dispose();
    expect(TestIntersectionObserver.current?.disconnect).toHaveBeenCalledOnce();
  });

  it('reports unavailable element observer APIs', () => {
    ownerWindow.ResizeObserver = undefined;
    ownerWindow.IntersectionObserver = undefined;
    const element = document.createElement('div');

    expect(() => createElementSize(element)).toThrow(SentinelUnavailableError);
    expect(() => createIntersection(element)).toThrow(SentinelUnavailableError);
  });

  it('preserves native observer setup errors', () => {
    class ThrowingResizeObserver implements ResizeObserver {
      readonly disconnect = vi.fn();
      readonly unobserve = vi.fn();

      constructor(_callback: ResizeObserverCallback) {
        TestResizeObserver.current = this as unknown as TestResizeObserver;
      }

      observe(): void {
        throw new DOMException('Invalid target');
      }
    }

    ownerWindow.ResizeObserver = ThrowingResizeObserver;

    expect(() => createElementSize(document.createElement('div'))).toThrow(DOMException);
    expect(TestResizeObserver.current?.disconnect).toHaveBeenCalledOnce();
  });
});

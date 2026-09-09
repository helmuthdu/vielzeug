/**
 * Testing utilities for code that calls Necromancer's animation functions.
 *
 * jsdom (and most non-browser DOM environments) do not implement `Element.animate()`,
 * so any test that exercises `animate()`, `animateEach()`, or `captureLayout()` needs a
 * substitute. This module has no test-runner import — it works the same under Vitest,
 * Jest, or any other runner; use your runner's own spy/mock APIs on top if needed.
 */

export type AnimationCall = {
  readonly animation: FakeAnimation;
  readonly keyframes: Keyframe[] | PropertyIndexedKeyframes;
  readonly options?: KeyframeAnimationOptions;
};

/** A minimal `Animation` stand-in. Call `finish()`/`cancel()` to settle it like the real API would. */
export class FakeAnimation {
  #reject!: (reason?: unknown) => void;
  #resolve!: () => void;

  /** Number of times `cancel()` has been called. */
  cancelCallCount = 0;
  /** Number of times `finish()` has been called. */
  finishCallCount = 0;
  /** Mirrors the native `Animation.finished` promise. */
  finished: Promise<void>;

  constructor() {
    this.finished = new Promise<void>((resolve, reject) => {
      this.#resolve = resolve;
      this.#reject = reject;
    });
  }

  /** Rejects `finished` with an `AbortError`, like a real cancelled `Animation`. */
  cancel = (): void => {
    this.cancelCallCount += 1;
    this.#reject(new DOMException('The animation was canceled.', 'AbortError'));
  };

  /** Resolves `finished`, like a real completed `Animation`. */
  finish = (): void => {
    this.finishCallCount += 1;
    this.#resolve();
  };
}

/**
 * Replaces `Element.prototype.animate` with a deterministic lifecycle fake for a test.
 * Dispose the installation or call `restore()` to restore the original implementation.
 *
 * @example
 * using animations = installFakeAnimations();
 * const handle = animate(element, [{ opacity: 0 }, { opacity: 1 }]);
 * animations.calls[0]?.animation.finish();
 * await handle.result; // { status: 'finished' }
 */
export function installFakeAnimations(): {
  readonly calls: readonly AnimationCall[];
  restore(): void;
  [Symbol.dispose](): void;
} {
  const calls: AnimationCall[] = [];
  const descriptor = Object.getOwnPropertyDescriptor(Element.prototype, 'animate');
  let restored = false;

  Object.defineProperty(Element.prototype, 'animate', {
    configurable: true,
    value: (keyframes: Keyframe[] | PropertyIndexedKeyframes, options?: KeyframeAnimationOptions) => {
      const animation = new FakeAnimation();

      calls.push({ animation, keyframes, options });

      // Necromancer only consumes the documented Animation surface represented by FakeAnimation.
      return animation as unknown as Animation;
    },
    writable: true,
  });

  const restore = (): void => {
    if (restored) return;

    restored = true;
    if (descriptor) Object.defineProperty(Element.prototype, 'animate', descriptor);
    else Reflect.deleteProperty(Element.prototype, 'animate');
  };

  return {
    calls,
    restore,
    [Symbol.dispose]: restore,
  };
}

/** Builds a `DOMRect` for mocking `Element.getBoundingClientRect()` in `captureLayout()` tests. */
export function createRect(x: number, y: number, width = 20, height = 20): DOMRect {
  return new DOMRect(x, y, width, height);
}

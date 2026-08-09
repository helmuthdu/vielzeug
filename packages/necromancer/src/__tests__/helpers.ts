import { vi } from 'vitest';

export type AnimationCall = {
  readonly animation: FakeAnimation;
  readonly keyframes: Keyframe[] | PropertyIndexedKeyframes;
  readonly options?: KeyframeAnimationOptions;
};

export class FakeAnimation {
  #reject!: (reason?: unknown) => void;
  #resolve!: () => void;

  finished: Promise<void>;

  cancel = vi.fn(() => {
    this.#reject(new DOMException('The animation was canceled.', 'AbortError'));
  });

  finish = vi.fn(() => {
    this.#resolve();
  });

  constructor() {
    this.finished = new Promise<void>((resolve, reject) => {
      this.#resolve = resolve;
      this.#reject = reject;
    });
  }
}

/** Installs a deterministic test double because jsdom does not implement Element.animate(). */
export function installWaapi(): { calls: AnimationCall[]; restore: () => void } {
  const calls: AnimationCall[] = [];
  const descriptor = Object.getOwnPropertyDescriptor(Element.prototype, 'animate');

  Object.defineProperty(Element.prototype, 'animate', {
    configurable: true,
    value: vi.fn((keyframes: Keyframe[] | PropertyIndexedKeyframes, options?: KeyframeAnimationOptions) => {
      const animation = new FakeAnimation();

      calls.push({ animation, keyframes, options });

      // The package only consumes the documented Animation surface represented by FakeAnimation.
      return animation as unknown as Animation;
    }),
    writable: true,
  });

  return {
    calls,
    restore() {
      if (descriptor) Object.defineProperty(Element.prototype, 'animate', descriptor);
      else Reflect.deleteProperty(Element.prototype, 'animate');
    },
  };
}

export function rect(x: number, y: number, width = 20, height = 20): DOMRect {
  return new DOMRect(x, y, width, height);
}

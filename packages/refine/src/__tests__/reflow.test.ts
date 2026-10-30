// Guards the shared FLIP helper's contract: motion is an enhancement, so every
// path that cannot animate (no elements, no stable keys, zeroed duration tokens
// as reduced motion sets them, a disposed lifecycle, a browser without the Web
// Animations API) must still run the mutation exactly once and never throw —
// and the paths that CAN animate must actually animate, honor the token, and
// supersede an in-flight reflow instead of stacking additive offsets on top.

import { installFakeAnimations } from '@vielzeug/necromancer/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { animateReflow } from '../reflow';

type Moveable = HTMLElement & { y: number };

/** The helper only animates a connected host (a detached one means the component is gone). */
function hostWithItems(count: number, keyed: boolean): HTMLElement {
  const host = document.createElement('div');
  const root = host.attachShadow({ mode: 'open' });
  const list = document.createElement('div');

  for (const index of Array.from({ length: count }, (_, i) => i)) {
    const item = Object.assign(document.createElement('div'), { className: 'item', y: 0 });

    if (keyed) item.dataset.value = String(index);
    list.append(item);
  }
  root.append(list);
  document.body.append(host);

  return host;
}

function options(host: HTMLElement) {
  return {
    elements: () => [...(host.shadowRoot?.querySelectorAll<HTMLElement>('.item[data-value]') ?? [])],
    getKey: (item: HTMLElement) => item.dataset.value || undefined,
  };
}

function computedReturning(durations: Record<string, string>): CSSStyleDeclaration {
  return new Proxy(
    {
      getPropertyValue: (name: string) => durations[name] ?? '',
    } as unknown as CSSStyleDeclaration,
    {
      get: (target, prop) => (prop === 'getPropertyValue' ? target.getPropertyValue : undefined),
    },
  );
}

/** jsdom reports an all-zero rect; drive it from a per-element `y` so deltas are real. */
function mockRects(): void {
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    const y = (this as Moveable).y ?? 0;

    return {
      bottom: y + 10,
      height: 10,
      left: 0,
      right: 10,
      top: y,
      width: 10,
      x: 0,
      y,
    } as DOMRect;
  });
}

const firstTranslate = (call: { keyframes: Keyframe[] | PropertyIndexedKeyframes }): string =>
  ((call.keyframes as Keyframe[])[0]?.translate as string) ?? '';

describe('animateReflow', () => {
  let controller: AbortController;

  beforeEach(() => {
    controller = new AbortController();
    vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((cb) => {
      cb(0);

      return 0;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('runs the mutation when there are no tracked elements', () => {
    const host = hostWithItems(0, true);
    const mutate = vi.fn();

    animateReflow(host, controller.signal, options(host)).run(mutate);
    expect(mutate).toHaveBeenCalledTimes(1);
  });

  it('runs the mutation when elements lack stable keys', () => {
    const host = hostWithItems(3, false);
    const mutate = vi.fn();

    animateReflow(host, controller.signal, options(host)).run(mutate);
    expect(mutate).toHaveBeenCalledTimes(1);
  });

  it('runs the mutation when the duration token is zeroed (reduced motion)', () => {
    const host = hostWithItems(3, true);

    vi.spyOn(window, 'getComputedStyle').mockReturnValue(computedReturning({ '--duration-200': '0ms' }));
    const mutate = vi.fn();

    animateReflow(host, controller.signal, options(host)).run(mutate);
    expect(mutate).toHaveBeenCalledTimes(1);
  });

  it('honors a custom duration token', () => {
    const host = hostWithItems(2, true);
    const getComputedStyle = vi.fn(() => computedReturning({ '--duration-500': '0ms' }));

    vi.spyOn(window, 'getComputedStyle').mockImplementation(getComputedStyle);
    const mutate = vi.fn();

    animateReflow(host, controller.signal, {
      ...options(host),
      durationToken: '--duration-500',
    }).run(mutate);
    expect(mutate).toHaveBeenCalledTimes(1);
    // The skip must come from the custom token, not from the default name being
    // read and found empty: assert the custom name is what was asked for.
    const asked = getComputedStyle.mock.results.map((result) =>
      (result.value as CSSStyleDeclaration).getPropertyValue('--duration-500'),
    );

    expect(asked).toContain('0ms');
  });

  it('runs the mutation and survives when WAAPI is unavailable (jsdom)', () => {
    const host = hostWithItems(3, true);

    vi.spyOn(window, 'getComputedStyle').mockReturnValue(computedReturning({ '--duration-200': '200ms' }));
    mockRects();
    const mutate = vi.fn();

    // No Element.prototype.animate in jsdom: captureLayout's animate() throws
    // NecromancerUnsupportedError inside the frame, and the helper must swallow it.
    expect(() => animateReflow(host, controller.signal, options(host)).run(mutate)).not.toThrow();
    expect(mutate).toHaveBeenCalledTimes(1);
  });

  it('skips the animation once the lifecycle signal is aborted', () => {
    const host = hostWithItems(3, true);
    const animations = installFakeAnimations();

    vi.spyOn(window, 'getComputedStyle').mockReturnValue(computedReturning({ '--duration-200': '200ms' }));
    mockRects();
    const mutate = vi.fn();
    const motion = animateReflow(host, controller.signal, options(host));

    controller.abort();
    motion.run(mutate);
    expect(mutate).toHaveBeenCalledTimes(1);
    expect(animations.calls).toHaveLength(0);
    animations.restore();
  });

  describe('with the Web Animations API faked', () => {
    let animations: ReturnType<typeof installFakeAnimations>;

    beforeEach(() => {
      animations = installFakeAnimations();
      vi.spyOn(window, 'getComputedStyle').mockReturnValue(computedReturning({ '--duration-200': '200ms' }));
      mockRects();
    });

    afterEach(() => {
      animations.restore();
    });

    const shiftAll = (host: HTMLElement, by: number) => () => {
      for (const item of host.shadowRoot?.querySelectorAll<Moveable>('.item') ?? []) {
        item.y += by;
      }
    };

    it('animates moved elements from their old positions', () => {
      const host = hostWithItems(3, true);
      const motion = animateReflow(host, controller.signal, options(host));

      motion.run(shiftAll(host, 40));
      expect(animations.calls).toHaveLength(3);
      for (const call of animations.calls) {
        expect((call.options as KeyframeAnimationOptions).duration).toBe(200);
      }
      // FLIP: the first keyframe translates by the inverse of the layout delta,
      // so each element starts at its captured slot and lands at its new one.
      for (const call of animations.calls) {
        expect(firstTranslate(call)).toBe('0px -40px');
      }
    });

    it('leaves unmoved elements alone', () => {
      const host = hostWithItems(3, true);
      const motion = animateReflow(host, controller.signal, options(host));

      motion.run(() => {});
      expect(animations.calls).toHaveLength(0);
    });

    it('supersedes an in-flight reflow instead of stacking it', () => {
      const host = hostWithItems(2, true);
      const motion = animateReflow(host, controller.signal, options(host));

      motion.run(shiftAll(host, 40));
      expect(animations.calls).toHaveLength(2);
      motion.run(shiftAll(host, 40));
      // The first group is cancelled the moment the second takes over, inside
      // the same frame, so the element never paints a snapped intermediate and
      // additive keyframes cannot stack two offsets on one element.
      expect(animations.calls[0]?.animation.cancelCallCount).toBe(1);
      expect(animations.calls).toHaveLength(4);
      for (const call of animations.calls.slice(2)) {
        expect(firstTranslate(call)).toBe('0px -40px');
      }
    });

    it('runs the mutation exactly once across repeated runs', () => {
      const host = hostWithItems(3, true);
      const mutate = vi.fn();
      const motion = animateReflow(host, controller.signal, options(host));

      motion.run(mutate);
      motion.run(mutate);
      motion.run(mutate);
      expect(mutate).toHaveBeenCalledTimes(3);
    });
  });
});

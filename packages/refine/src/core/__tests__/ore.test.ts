import { describe, expect, it, vi } from 'vitest';

import { lifecycleSignal } from '../ore';

describe('lifecycleSignal()', () => {
  it('returns an AbortSignal', () => {
    const signal = lifecycleSignal(vi.fn());

    expect(signal).toBeInstanceOf(AbortSignal);
  });

  it('signal is not aborted initially', () => {
    const signal = lifecycleSignal(vi.fn());

    expect(signal.aborted).toBe(false);
  });

  it('aborts the signal when the registered cleanup function is called', () => {
    let registeredCleanup: (() => void) | undefined;
    const onCleanup = (fn: () => void): void => {
      registeredCleanup = fn;
    };

    const signal = lifecycleSignal(onCleanup);

    expect(signal.aborted).toBe(false);
    expect(registeredCleanup).toBeDefined();

    registeredCleanup!();

    expect(signal.aborted).toBe(true);
  });

  it('registers cleanup exactly once', () => {
    const onCleanup = vi.fn();

    lifecycleSignal(onCleanup);

    expect(onCleanup).toHaveBeenCalledTimes(1);
  });

  it('each call produces an independent signal', () => {
    let cleanup1: (() => void) | undefined;
    let cleanup2: (() => void) | undefined;

    const sig1 = lifecycleSignal((fn) => {
      cleanup1 = fn;
    });
    const sig2 = lifecycleSignal((fn) => {
      cleanup2 = fn;
    });

    cleanup1!();

    expect(sig1.aborted).toBe(true);
    expect(sig2.aborted).toBe(false);

    cleanup2!();

    expect(sig2.aborted).toBe(true);
  });
});

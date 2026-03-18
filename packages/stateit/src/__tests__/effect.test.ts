import { effect, onCleanup, signal, type Subscription, untrack } from '../';

// ─── effect ───────────────────────────────────────────────────────────────────

describe('effect', () => {
  it('runs immediately, re-runs on dep change, and stops after dispose', () => {
    const n = signal(0);
    const seen: number[] = [];
    const stop = effect(() => {
      seen.push(n.value);
    });

    n.value = 1;
    n.value = 2;
    expect(seen).toEqual([0, 1, 2]);
    stop();
    n.value = 3;
    expect(seen).toEqual([0, 1, 2]);
  });

  it('cleanup fn is called before each re-run and on final dispose', () => {
    const n = signal(0);
    const cleanup = vi.fn();
    const stop = effect(() => {
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      n.value; // track

      return cleanup;
    });

    n.value = 1; // re-run: cleanup called before fn
    n.value = 2; // re-run: cleanup called again
    expect(cleanup).toHaveBeenCalledTimes(2);
    stop(); // final dispose: cleanup called once more
    expect(cleanup).toHaveBeenCalledTimes(3);
  });

  it('cleanup is not double-called when the re-run throws', () => {
    const n = signal(0);
    const cleanup = vi.fn();

    effect(() => {
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      n.value;

      if (n.value > 0) throw new Error('oops');

      return cleanup;
    });
    expect(() => {
      n.value = 1;
    }).toThrow('oops');
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it('nested effect restores the outer tracking context', () => {
    const a = signal(0);
    const outer: number[] = [];
    const stop = effect(() => {
      outer.push(a.value);

      const stopInner = effect(() => {
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        signal(99).value;
      });

      stopInner();
    });

    a.value = 1;
    expect(outer).toEqual([0, 1]);
    stop();
  });

  it('re-entrant write is deferred and re-runs until the value stabilises', () => {
    const n = signal(0);
    const seen: number[] = [];
    const stop = effect(() => {
      seen.push(n.value);

      if (n.value < 3) n.value++;
    });

    expect(seen).toEqual([0, 1, 2, 3]);
    stop();
  });

  it('circuit-breaker throws after 100 iterations to prevent infinite loops', () => {
    const n = signal(0);

    expect(() =>
      effect(() => {
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        n.value;
        n.value = n.peek() + 1;
      }),
    ).toThrow(/infinite reactive loop/);
  });

  it('all subscribers are notified even when one throws', () => {
    const n = signal(0);
    const second = vi.fn();
    const stop1 = effect(() => {
      if (n.value > 0) throw new Error('boom');
    });
    const stop2 = effect(() => {
      if (n.value > 0) second();
    });

    expect(() => {
      n.value = 1;
    }).toThrow('boom');
    expect(second).toHaveBeenCalledTimes(1);
    stop1();
    stop2();
  });

  it('dispose is idempotent — calling the cleanup fn multiple times does not re-run cleanup or re-subscribe', () => {
    const n = signal(0);
    const cleanup = vi.fn();
    const stop = effect(() => {
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      n.value;

      return cleanup;
    });

    expect(cleanup).toHaveBeenCalledTimes(0);
    stop();
    stop(); // second call — should be a no-op
    expect(cleanup).toHaveBeenCalledTimes(1);
    n.value = 1; // effect is disposed — must not re-run
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it('returns a Subscription with .dispose() and [Symbol.dispose] aliases', () => {
    const n = signal(0);
    const seen: number[] = [];
    const sub: Subscription = effect(() => {
      seen.push(n.value);
    });

    expect(typeof sub).toBe('function');
    expect(typeof sub.dispose).toBe('function');
    expect(typeof sub[Symbol.dispose]).toBe('function');
    sub.dispose();
    n.value = 1;
    expect(seen).toEqual([0]); // disposed — no re-run
  });

  it('per-effect maxIterations overrides the global setting', () => {
    const n = signal(0);

    expect(() =>
      effect(
        () => {
          // eslint-disable-next-line @typescript-eslint/no-unused-expressions
          n.value;
          n.value = n.peek() + 1;
        },
        { maxIterations: 5 },
      ),
    ).toThrow(/infinite reactive loop/);
  });
});

// ─── untrack ──────────────────────────────────────────────────────────────────

describe('untrack', () => {
  it('reads inside untrack do not create a reactive subscription', () => {
    const n = signal(0);
    const seen: number[] = [];
    const stop = effect(() => {
      seen.push(untrack(() => n.value));
    });

    n.value = 1; // n was only read via untrack — effect does NOT re-run
    expect(seen).toEqual([0]);
    stop();
  });
});

// ─── onCleanup ────────────────────────────────────────────────────────────────

describe('onCleanup', () => {
  it('registered fn is called before each re-run', () => {
    const n = signal(0);
    const teardowns: number[] = [];
    const stop = effect(() => {
      const current = n.value;

      onCleanup(() => teardowns.push(current));
    });

    n.value = 1;
    n.value = 2;
    expect(teardowns).toEqual([0, 1]);
    stop();
    expect(teardowns).toEqual([0, 1, 2]);
  });

  it('warns in dev and is a no-op when called outside an effect', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(() => onCleanup(() => {})).not.toThrow();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('outside of an active effect'));
    warnSpy.mockRestore();
  });
});

// ─── effect({ onError }) ─────────────────────────────────────────────────────

describe('effect({ onError })', () => {
  it('calls onError with the thrown value and stops the effect', () => {
    const n = signal(0);
    const errors: unknown[] = [];
    const stop = effect(
      () => {
        if (n.value > 0) throw new Error('boom');
      },
      { onError: (e) => errors.push(e) },
    );

    n.value = 1; // triggers throw → onError called, effect auto-disposed
    n.value = 2; // no re-run — already disposed
    expect(errors).toHaveLength(1);
    expect((errors[0] as Error).message).toBe('boom');
    stop(); // idempotent
  });

  it('without onError the error propagates synchronously', () => {
    const n = signal(0);

    effect(() => {
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      n.value;
    }); // initial run fine

    const n2 = signal(0);

    expect(() => {
      effect(() => {
        if (n2.value > 0) throw new Error('unhandled');
      });
      n2.value = 1;
    }).toThrow('unhandled');
  });
});

// ─── effect({ onError }) + onCleanup interaction ─────────────────────────────

describe('effect({ onError }) + onCleanup', () => {
  it('onCleanup registrations from the throwing run are flushed before the error handler', () => {
    const n = signal(0);
    const log: string[] = [];

    effect(
      () => {
        const current = n.value;

        onCleanup(() => log.push(`cleanup@${current}`));

        if (current > 0) throw new Error('boom');
      },
      { onError: () => log.push('error') },
    );

    n.value = 1; // run 0→cleanup@0 (prior-run teardown), run 1→cleanup@1 (this-run teardown), then onError
    expect(log).toEqual(['cleanup@0', 'cleanup@1', 'error']);
  });
});

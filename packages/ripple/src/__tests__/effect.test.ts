import { computed, effect, effectAsync, onCleanup, scope, signal } from '../';
import { RippleError, RippleInfiniteLoopError, RippleInvalidCleanupError } from '../';
import { debugEffect } from '../devtools';

describe('effects and cleanup', () => {
  it('runs cleanups before re-run and on dispose', () => {
    const n = signal(0);
    const cleanA = vi.fn(() => {
      throw new Error('cleanA');
    });
    const cleanB = vi.fn();
    const stop = effect(() => {
      void n.value;
      onCleanup(cleanA);
      onCleanup(cleanB);
    });

    expect(() => {
      n.value = 1;
    }).toThrow(/cleanA/);
    expect(cleanA).toHaveBeenCalledTimes(1);
    expect(cleanB).toHaveBeenCalledTimes(1);
    stop.dispose();
    expect(cleanA).toHaveBeenCalledTimes(1);
    expect(cleanB).toHaveBeenCalledTimes(1);
  });

  it('throws RippleInvalidCleanupError when onCleanup is called outside an active context', () => {
    let caught: unknown;

    try {
      onCleanup(() => {});
    } catch (e) {
      caught = e;
    }

    expect(caught).toBeInstanceOf(RippleError);
    expect(caught).toBeInstanceOf(RippleInvalidCleanupError);
    expect((caught as RippleInvalidCleanupError).name).toBe('RippleInvalidCleanupError');
  });

  it('prevents subscription leakage across nested effects', () => {
    const a = signal(0);
    const b = signal(0);
    const outerLog: number[] = [];
    const innerLog: number[] = [];
    const stopOuter = effect(() => {
      outerLog.push(a.value);

      const stopInner = effect(() => {
        innerLog.push(b.value);
      });

      onCleanup(() => stopInner.dispose());
    });

    b.value = 1;
    expect(innerLog).toEqual([0, 1]);
    expect(outerLog).toEqual([0]);
    a.value = 1;
    expect(outerLog).toEqual([0, 1]);

    const prevInnerLen = innerLog.length;

    b.value = 2;
    expect(innerLog.length).toBe(prevInnerLen + 1);
    stopOuter.dispose();
  });

  it('throws RippleInfiniteLoopError after the loop guard limit for self-triggering effects', () => {
    const n = signal(0);
    let caught: unknown;

    try {
      effect(() => {
        if (n.value < 200) n.value++;
      });
    } catch (e) {
      caught = e;
    }

    expect(caught).toBeInstanceOf(RippleError);
    expect(caught).toBeInstanceOf(RippleInfiniteLoopError);
    expect((caught as RippleInfiniteLoopError).name).toBe('RippleInfiniteLoopError');
  });

  it('preserves the original effect error when cleanup registered in the failed run also throws', () => {
    const n = signal(0);
    let shouldThrow = false;
    let caught: unknown;
    const stop = effect(() => {
      void n.value;

      if (!shouldThrow) return;

      onCleanup(() => {
        throw new Error('cleanup-boom');
      });
      throw new Error('effect-boom');
    });

    try {
      shouldThrow = true;
      n.value = 1;
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(AggregateError);
    expect((caught as AggregateError).errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ message: 'effect-boom' }),
        expect.objectContaining({ message: 'cleanup-boom' }),
      ]),
    );
    expect((caught as AggregateError).cause).toMatchObject({ message: 'effect-boom' });
    stop.dispose();
  });
});

describe('effect throws on non-function returns', () => {
  it('throws RippleInvalidCleanupError when effect returns a number', () => {
    let caught: unknown;

    try {
      effect(() => 42 as unknown as void);
    } catch (e) {
      caught = e;
    }

    expect(caught).toBeInstanceOf(RippleError);
    expect(caught).toBeInstanceOf(RippleInvalidCleanupError);
  });

  it('throws RippleInvalidCleanupError when effect returns true', () => {
    let caught: unknown;

    try {
      effect(() => true as unknown as void);
    } catch (e) {
      caught = e;
    }

    expect(caught).toBeInstanceOf(RippleError);
    expect(caught).toBeInstanceOf(RippleInvalidCleanupError);
  });

  it('does not throw when effect returns undefined', () => {
    const stop = effect(() => undefined);

    expect(() => stop.dispose()).not.toThrow();
  });

  it('does not throw when effect returns a function (cleanup)', () => {
    const stop = effect(() => () => {});

    expect(() => stop.dispose()).not.toThrow();
  });
});

describe('effect options — infinite loop protection', () => {
  it('throws INFINITE_LOOP when effect exceeds default max iterations', () => {
    const n = signal(0);
    let caught: unknown;

    try {
      effect(() => {
        if (n.value < 200) n.value++;
      });
    } catch (e) {
      caught = e;
    }

    expect(caught).toBeInstanceOf(RippleError);
    expect(caught).toBeInstanceOf(RippleInfiniteLoopError);
  });

  it('name appears in INFINITE_LOOP error message', () => {
    const n = signal(0);
    let caught: unknown;

    try {
      effect(
        () => {
          if (n.value < 200) n.value++;
        },
        { name: 'myEffect' },
      );
    } catch (e) {
      caught = e;
    }

    expect((caught as RippleError).message).toContain('myEffect');
  });
});

describe('effect scheduler option', () => {
  it('scheduler: sync (default) runs immediately on signal change', () => {
    const n = signal(0);
    const log: number[] = [];
    const stop = effect(() => {
      log.push(n.value);
    });

    n.value = 1;
    expect(log).toEqual([0, 1]);
    stop.dispose();
  });

  it('scheduler: microtask defers re-runs via queueMicrotask', async () => {
    const n = signal(0);
    const log: number[] = [];
    const stop = effect(
      () => {
        log.push(n.value);
      },
      { scheduler: 'microtask' },
    );

    expect(log).toEqual([0]);
    n.value = 1;
    expect(log).toEqual([0]);
    await Promise.resolve();
    expect(log).toEqual([0, 1]);
    stop.dispose();
  });

  it('scheduler: microtask coalesces multiple writes into one re-run', async () => {
    const n = signal(0);
    const log: number[] = [];
    const stop = effect(
      () => {
        log.push(n.value);
      },
      { scheduler: 'microtask' },
    );

    n.value = 1;
    n.value = 2;
    n.value = 3;
    await Promise.resolve();
    expect(log).toEqual([0, 3]);
    stop.dispose();
  });
});

describe('effect getDependencies()', () => {
  it("signal dependency has kind: 'signal'", () => {
    const n = signal(0);
    const stop = effect(() => void n.value);
    const deps = stop.getDependencies();

    expect(deps).toHaveLength(1);
    expect(deps[0]!.kind).toBe('signal');
    stop.dispose();
    n.dispose();
  });

  it("computed dependency has kind: 'computed'", () => {
    const n = signal(0);
    const c = computed(() => n.value * 2);
    const stop = effect(() => void c.value);
    const deps = stop.getDependencies();

    expect(deps).toHaveLength(1);
    expect(deps[0]!.kind).toBe('computed');
    stop.dispose();
    c.dispose();
    n.dispose();
  });

  it('mixed dependencies report correct kinds', () => {
    const n = signal(0);
    const c = computed(() => n.value * 2);
    const stop = effect(() => {
      void n.value;
      void c.value;
    });
    const deps = stop.getDependencies();
    const kinds = new Set(deps.map((d) => d.kind));

    expect(kinds).toContain('signal');
    expect(kinds).toContain('computed');
    stop.dispose();
    c.dispose();
    n.dispose();
  });
});

describe('effectAsync', () => {
  it('runs async work with reactive dependencies', async () => {
    const src = signal(1);
    const results: number[] = [];
    const stop = effectAsync(async (abortSignal) => {
      const n = src.value;

      await Promise.resolve();

      if (!abortSignal.aborted) results.push(n);
    });

    await Promise.resolve();
    await Promise.resolve();
    expect(results).toEqual([1]);
    stop.dispose();
  });

  it('aborts in-flight work when dependencies change', async () => {
    const src = signal(1);
    const started: number[] = [];
    const completed: number[] = [];
    const stop = effectAsync(async (abortSignal) => {
      const n = src.value;

      started.push(n);
      await Promise.resolve();

      if (!abortSignal.aborted) completed.push(n);
    });

    src.value = 2;
    await Promise.resolve();
    await Promise.resolve();
    expect(started).toContain(1);
    expect(started).toContain(2);
    expect(completed).not.toContain(1);
    expect(completed).toContain(2);
    stop.dispose();
  });

  it('calls resolved cleanup on re-run and dispose', async () => {
    const src = signal(0);
    const cleanups: number[] = [];
    const stop = effectAsync(async (_abortSignal) => {
      const n = src.value;

      await Promise.resolve();

      return () => cleanups.push(n);
    });

    await Promise.resolve();
    await Promise.resolve();
    src.value = 1;
    await Promise.resolve();
    await Promise.resolve();
    expect(cleanups).toContain(0);
    stop.dispose();
    expect(cleanups).toContain(1);
  });

  it('calls onError for unhandled async errors', async () => {
    const errors: unknown[] = [];
    const stop = effectAsync(
      async () => {
        await Promise.resolve();
        throw new Error('async-boom');
      },
      { onError: (e) => errors.push(e) },
    );

    await Promise.resolve();
    await Promise.resolve();
    stop.dispose();
    expect(errors).toHaveLength(1);
    expect((errors[0] as Error).message).toBe('async-boom');
  });

  it('silently drops errors from aborted runs', async () => {
    const src = signal(0);
    const errors: unknown[] = [];
    const stop = effectAsync(
      async (abortSignal) => {
        void src.value;
        await Promise.resolve();

        if (!abortSignal.aborted) throw new Error('should-not-surface');
      },
      { onError: (e) => errors.push(e) },
    );

    src.value = 1;
    await Promise.resolve();
    stop.dispose();
    await Promise.resolve();
    expect(errors).toHaveLength(0);
  });

  it('disposeAsync awaits in-flight work before resolving', async () => {
    const order: string[] = [];
    const stop = effectAsync(async () => {
      await Promise.resolve();
      order.push('async-done');
    });

    await stop[Symbol.asyncDispose]();
    order.push('after-dispose');
    expect(order).toEqual(['async-done', 'after-dispose']);
  });

  it('returns an AsyncSubscription with correct shape', () => {
    const stop = effectAsync(async () => {});

    expect(typeof stop).toBe('object');
    expect(typeof stop.dispose).toBe('function');
    expect(typeof stop.run).toBe('function');
    expect(typeof stop[Symbol.dispose]).toBe('function');
    expect(typeof stop[Symbol.asyncDispose]).toBe('function');
    stop.dispose();
  });

  it('calling disposeAsync() twice returns the same promise', async () => {
    const stop = effectAsync(async () => {
      await Promise.resolve();
    });
    const p1 = stop[Symbol.asyncDispose]();
    const p2 = stop[Symbol.asyncDispose]();

    expect(p1).toBe(p2);
    await p1;
  });

  it('Symbol.asyncDispose disposes and resolves', async () => {
    const userId = signal('u1');
    const stop = effectAsync(async (sig) => {
      void userId.value;
      await new Promise<void>((r) => {
        if (!sig.aborted) r();
      });
    });

    expect(stop.disposed).toBe(false);
    await stop[Symbol.asyncDispose]();
    expect(stop.disposed).toBe(true);
  });

  it('disposed is false before dispose()', () => {
    const stop = effectAsync(async () => {});

    expect(stop.disposed).toBe(false);
    stop.dispose();
  });

  it('disposed is true after dispose()', () => {
    const stop = effectAsync(async () => {});

    stop.dispose();
    expect(stop.disposed).toBe(true);
  });

  it('disposed is true after disposeAsync()', async () => {
    const stop = effectAsync(async () => {});

    await stop[Symbol.asyncDispose]();
    expect(stop.disposed).toBe(true);
  });
});

describe('effectAsync — onError option', () => {
  it('calls custom onError instead of console.error when factory rejects', async () => {
    const errors: unknown[] = [];
    const dep = signal(0);
    const stop = effectAsync(
      async () => {
        void dep.value;
        throw new Error('boom');
      },
      { onError: (err) => errors.push(err) },
    );

    await new Promise((r) => setTimeout(r, 0));
    expect(errors).toHaveLength(1);
    expect((errors[0] as Error).message).toBe('boom');
    await stop.dispose();
  });

  it('calls onError on re-run rejections', async () => {
    const errors: unknown[] = [];
    const dep = signal(0);
    const stop = effectAsync(
      async () => {
        void dep.value;
        throw new Error(`run-${dep.peek()}`);
      },
      { onError: (err) => errors.push(err) },
    );

    await new Promise((r) => setTimeout(r, 0));
    dep.value = 1;
    await new Promise((r) => setTimeout(r, 0));
    expect(errors).toHaveLength(2);
    await stop.dispose();
  });
});

describe('effectAsync — name option', () => {
  it('passes name to internal DevTools run event', async () => {
    const { installDevTools } = await import('../devtools');
    const runs: Array<string | undefined> = [];

    installDevTools({ run: ({ name }) => runs.push(name) });

    const stop = effectAsync(async () => {}, { name: 'myAsyncEffect' });

    expect(runs).toContain('myAsyncEffect');
    stop.dispose();
    installDevTools(null);
  });
});

describe('computed cycle error includes name when provided', () => {
  it('computed cycle error includes name when provided', () => {
    const proxy = { fn: (): number => 0 };
    const a = computed(() => proxy.fn() + 1, { name: 'myComputed' });
    const b = computed(() => a.value + 1);

    proxy.fn = () => b.value;

    let caught: unknown;

    try {
      void a.value;
    } catch (e) {
      caught = e;
    }

    expect((caught as RippleError).message).toContain('myComputed');
    a.dispose();
    b.dispose();
  });
});

describe('debugEffect', () => {
  it('logs initial deps on the first run', () => {
    const groupSpy = vi.spyOn(console, 'group').mockImplementation(() => {});

    vi.spyOn(console, 'groupEnd').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});

    const n = signal(0, { name: 'counter' });
    const stop = debugEffect(
      () => {
        void n.value;
      },
      { name: 'initTest' },
    );

    expect(groupSpy).toHaveBeenCalledWith(expect.stringContaining('"initTest" initial deps'));
    stop.dispose();
    vi.restoreAllMocks();
  });

  it('logs changed sources on re-run', () => {
    const groupSpy = vi.spyOn(console, 'group').mockImplementation(() => {});

    vi.spyOn(console, 'groupEnd').mockImplementation(() => {});
    vi.spyOn(console, 'debug').mockImplementation(() => {});

    const n = signal(1, { name: 'mySignal' });
    const stop = debugEffect(() => void n.value, { name: 'myEffect' });

    n.value = 2;
    expect(groupSpy).toHaveBeenCalledWith(expect.stringContaining('myEffect'));
    expect(groupSpy).toHaveBeenCalledWith(expect.stringContaining('re-running'));
    stop.dispose();
    n.dispose();
    vi.restoreAllMocks();
  });

  it('does not log anything on initial run when there are no deps', () => {
    const groupSpy = vi.spyOn(console, 'group').mockImplementation(() => {});

    vi.spyOn(console, 'groupEnd').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});

    const stop = debugEffect(() => {}, { name: 'noDeps' });

    expect(groupSpy).not.toHaveBeenCalled();
    stop.dispose();
    vi.restoreAllMocks();
  });

  it('trace logs changed sources on re-run without throwing', () => {
    const consoleSpy = vi.spyOn(console, 'group').mockImplementation(() => {});
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});

    vi.spyOn(console, 'groupEnd').mockImplementation(() => {});

    const n = signal(0, { name: 'counter' });
    const stop = debugEffect(
      () => {
        void n.value;
      },
      { name: 'tracer' },
    );

    n.value = 1;
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('tracer'));
    expect(debugSpy).toHaveBeenCalledWith(expect.stringContaining('counter'));
    stop.dispose();
    vi.restoreAllMocks();
  });
});

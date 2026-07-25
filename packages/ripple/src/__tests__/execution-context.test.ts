// execution-context.ts is internal-only (never exported from index.ts), unlike every
// other test file in this suite which exercises behavior through the public API. It's
// tested directly here anyway because runInContext() is a single shared primitive now
// relied on by withTracking(), withScopeCleanups(), and the /ripple/ssr hook — its own
// restore-on-throw and hook-delegation contract deserves a test that isn't incidental
// to whichever higher-level primitive happens to call it.
import {
  _installContextHook,
  createSchedulingState,
  getExecutionContext,
  getScopeCleanups,
  runInContext,
  withScopeCleanups,
  type ContextHook,
  type ExecutionContext,
} from '../execution-context';

describe('execution-context', () => {
  afterEach(() => {
    // Guard against a test leaving a hook installed and leaking into the next one.
    _installContextHook(null);
  });

  it('getExecutionContext returns the module-level singleton when no hook is installed', () => {
    const ctx = getExecutionContext();

    expect(ctx.scopeCleanups).toBeNull();
    expect(ctx.tracking).toBeNull();
    expect(ctx.scheduling.batchDepth).toBe(0);
  });

  it('runInContext merges the patch onto the current context — callers never need to spread it themselves', () => {
    const before = getExecutionContext();
    const cleanups: (() => void)[] = [];

    runInContext({ scopeCleanups: cleanups }, () => {
      const during = getExecutionContext();

      expect(during.scopeCleanups).toBe(cleanups);
      // Untouched fields carry over unchanged from the pre-patch context.
      expect(during.scheduling).toBe(before.scheduling);
      expect(during.tracking).toBe(before.tracking);
    });
  });

  it('runInContext restores the previous context after fn returns', () => {
    const before = getExecutionContext();

    runInContext({ scopeCleanups: [] }, () => {});
    expect(getExecutionContext()).toBe(before);
  });

  it('runInContext restores the previous context after fn throws', () => {
    const before = getExecutionContext();

    expect(() =>
      runInContext({ scopeCleanups: [] }, () => {
        throw new Error('boom');
      }),
    ).toThrow('boom');
    expect(getExecutionContext()).toBe(before);
  });

  it('nested runInContext calls restore the correct intermediate frame, not the outermost one', () => {
    const outerCleanups: (() => void)[] = [];
    const innerCleanups: (() => void)[] = [];
    const seenDuringInner: (() => void)[][] = [];
    const seenAfterInner: (() => void)[][] = [];

    runInContext({ scopeCleanups: outerCleanups }, () => {
      runInContext({ scopeCleanups: innerCleanups }, () => {
        seenDuringInner.push(getExecutionContext().scopeCleanups!);
      });
      seenAfterInner.push(getExecutionContext().scopeCleanups!);
    });

    expect(seenDuringInner[0]).toBe(innerCleanups);
    expect(seenAfterInner[0]).toBe(outerCleanups);
  });

  it('delegates to an installed hook — getExecutionContext calls hook.get(), runInContext calls hook.run()', () => {
    const hookCtx: ExecutionContext = { scheduling: createSchedulingState(), scopeCleanups: null, tracking: null };
    const runSpy = vi.fn((ctx: ExecutionContext, fn: () => unknown) => fn());
    const hook: ContextHook = { get: () => hookCtx, run: runSpy };

    _installContextHook(hook);
    expect(getExecutionContext()).toBe(hookCtx);

    runInContext({ scopeCleanups: [] }, () => {});
    expect(runSpy).toHaveBeenCalledTimes(1);
    expect(runSpy.mock.calls[0]?.[0].scopeCleanups).toEqual([]);
  });

  it('_installContextHook returns the previous hook so callers can restore it', () => {
    const hookA: ContextHook = { get: () => getExecutionContext(), run: (ctx, fn) => fn() };
    const hookB: ContextHook = { get: () => getExecutionContext(), run: (ctx, fn) => fn() };

    const prevBeforeA = _installContextHook(hookA);
    const prevBeforeB = _installContextHook(hookB);

    expect(prevBeforeA).toBeNull();
    expect(prevBeforeB).toBe(hookA);
  });

  it('getScopeCleanups reflects the active scopeCleanups field; withScopeCleanups scopes and restores it', () => {
    expect(getScopeCleanups()).toBeNull();

    const cleanups: (() => void)[] = [];
    const result = withScopeCleanups(cleanups, () => {
      expect(getScopeCleanups()).toBe(cleanups);

      return 'done';
    });

    expect(result).toBe('done');
    expect(getScopeCleanups()).toBeNull();
  });
});

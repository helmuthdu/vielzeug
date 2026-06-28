import { computed, effect, onCleanup, scope, signal, store } from '../';
import {
  RippleComputedCycleError,
  RippleDisposedScopeError,
  RippleError,
  RippleInfiniteLoopError,
  RippleInvalidCleanupError,
  RippleInvalidStoreError,
} from '../';

describe('RippleError', () => {
  it('is instanceof Error with correct name and message', () => {
    const err = new RippleComputedCycleError('test message');

    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(RippleError);
    expect(err).toBeInstanceOf(RippleComputedCycleError);
    expect(err.name).toBe('RippleComputedCycleError');
    expect(err.message).toBe('test message');
  });

  it('each error condition throws the correct named subclass', () => {
    // RippleComputedCycleError
    const proxy = { fn: (): number => 0 };
    const a = computed(() => proxy.fn() + 1);
    const b = computed(() => a.value + 1);

    proxy.fn = () => b.value;

    let caught: unknown;

    try {
      void a.value;
    } catch (e) {
      caught = e;
    }

    expect(caught).toBeInstanceOf(RippleComputedCycleError);
    a.dispose();
    b.dispose();

    // RippleDisposedScopeError
    const s = scope();

    s.dispose();
    caught = undefined;

    try {
      s.run(() => {});
    } catch (e) {
      caught = e;
    }

    expect(caught).toBeInstanceOf(RippleDisposedScopeError);

    // RippleInvalidCleanupError
    caught = undefined;

    try {
      onCleanup(() => {});
    } catch (e) {
      caught = e;
    }

    expect(caught).toBeInstanceOf(RippleInvalidCleanupError);

    // RippleInvalidStoreError
    caught = undefined;

    try {
      store([] as unknown as object);
    } catch (e) {
      caught = e;
    }

    expect(caught).toBeInstanceOf(RippleInvalidStoreError);
  });

  it('each named subclass is an instanceof RippleError and Error', () => {
    expect(new RippleComputedCycleError('cycle')).toBeInstanceOf(RippleError);
    expect(new RippleComputedCycleError('cycle')).toBeInstanceOf(Error);
    expect(new RippleDisposedScopeError('disposed')).toBeInstanceOf(RippleError);
    expect(new RippleInfiniteLoopError('loop')).toBeInstanceOf(RippleError);
    expect(new RippleInvalidCleanupError('cleanup')).toBeInstanceOf(RippleError);
    expect(new RippleInvalidStoreError('store')).toBeInstanceOf(RippleError);
  });

  it('each subclass has a correct .name matching the constructor', () => {
    expect(new RippleComputedCycleError('').name).toBe('RippleComputedCycleError');
    expect(new RippleDisposedScopeError('').name).toBe('RippleDisposedScopeError');
    expect(new RippleInfiniteLoopError('').name).toBe('RippleInfiniteLoopError');
    expect(new RippleInvalidCleanupError('').name).toBe('RippleInvalidCleanupError');
    expect(new RippleInvalidStoreError('').name).toBe('RippleInvalidStoreError');
  });

  it('RippleError.is() returns true for any subclass', () => {
    expect(RippleError.is(new RippleComputedCycleError(''))).toBe(true);
    expect(RippleError.is(new RippleInvalidStoreError(''))).toBe(true);
    expect(RippleError.is(new Error('not ripple'))).toBe(false);
  });

  it('RippleError base accepts opts?.cause for chaining', () => {
    const cause = new Error('original');
    const err = new RippleInvalidStoreError('wrapped', { cause });

    expect(err.cause).toBe(cause);
  });
});

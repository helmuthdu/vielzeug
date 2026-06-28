import { effect, onCleanup, scope, signal } from '../';
import { RippleDisposedScopeError, RippleError } from '../';

describe('scope', () => {
  it('supports setup callback to register initial cleanups', () => {
    const log: string[] = [];
    const s = scope(() => {
      onCleanup(() => log.push('setup-cleanup'));
    });

    expect(log).toEqual([]);
    s.dispose();
    expect(log).toEqual(['setup-cleanup']);
  });

  it('runs cleanups in LIFO order on dispose', () => {
    const s = scope();
    const log: string[] = [];

    s.run(() => {
      onCleanup(() => log.push('a'));
      onCleanup(() => log.push('b'));
    });
    expect(log).toEqual([]);
    s.dispose();
    expect(log).toEqual(['b', 'a']);
  });

  it('dispose is idempotent', () => {
    const s = scope();
    const log: number[] = [];

    s.run(() => onCleanup(() => log.push(1)));
    s.dispose();
    s.dispose();
    expect(log).toEqual([1]);
  });

  it('run after dispose throws RippleError', () => {
    const s = scope();

    s.dispose();

    let caught: unknown;

    try {
      s.run(() => {});
    } catch (e) {
      caught = e;
    }

    expect(caught).toBeInstanceOf(RippleError);
    expect(caught).toBeInstanceOf(RippleDisposedScopeError);
  });

  it('scope.add() directs cleanup into scope, not enclosing effect', () => {
    const n = signal(0);
    const scopeLog: number[] = [];
    const effectLog: number[] = [];
    const s = scope();
    const stop = effect(() => {
      void n.value;
      s.add(() => scopeLog.push(1));
      onCleanup(() => effectLog.push(1));
    });

    n.value = 1;
    stop.dispose();
    expect(effectLog).toEqual([1, 1]);
    expect(scopeLog).toEqual([]);
    s.dispose();
    expect(scopeLog).toEqual([1, 1]);
  });

  it('scope.add() throws RippleDisposedScopeError on already-disposed scope', () => {
    const s = scope();

    s.dispose();
    expect(() => s.add(() => {})).toThrow(RippleDisposedScopeError);

    try {
      s.add(() => {});
    } catch (e) {
      expect(e).toBeInstanceOf(RippleDisposedScopeError);
      expect((e as RippleDisposedScopeError).name).toBe('RippleDisposedScopeError');
    }
  });

  it('supports using declaration via Symbol.dispose', () => {
    const log: string[] = [];

    {
      using s = scope();

      s.run(() => onCleanup(() => log.push('done')));
    }
    expect(log).toEqual(['done']);
  });

  it('disposalSignal aborts when scope is disposed', () => {
    const s = scope();

    expect(s.disposalSignal.aborted).toBe(false);
    s.dispose();
    expect(s.disposalSignal.aborted).toBe(true);
  });

  it('disposalSignal is already aborted on an already-disposed scope', () => {
    const s = scope();

    s.dispose();
    expect(s.disposalSignal.aborted).toBe(true);
  });

  it('returns the value produced by the fn callback', () => {
    const s = scope();
    const result = s.run(() => 42);

    expect(result).toBe(42);
    s.dispose();
  });

  it('returns undefined when fn returns void', () => {
    const s = scope();
    const result = s.run(() => {});

    expect(result).toBeUndefined();
    s.dispose();
  });

  it('cleanups registered before throw are still collected by scope', () => {
    const log: string[] = [];
    const s = scope();

    expect(() => {
      s.run(() => {
        onCleanup(() => log.push('cleanup-a'));
        throw new Error('run-failed');
      });
    }).toThrow('run-failed');
    s.dispose();
    expect(log).toEqual(['cleanup-a']);
  });

  it('scope remains usable after a thrown run', () => {
    const s = scope();

    expect(() => {
      s.run(() => {
        throw new Error('first-fail');
      });
    }).toThrow();

    const log: string[] = [];

    s.run(() => onCleanup(() => log.push('ok')));
    s.dispose();
    expect(log).toEqual(['ok']);
  });

  it('disposed is false before dispose()', () => {
    const s = scope();

    expect(s.disposed).toBe(false);
    s.dispose();
  });

  it('disposed is true after dispose()', () => {
    const s = scope();

    s.dispose();
    expect(s.disposed).toBe(true);
  });

  it('disposed is true after Symbol.dispose', () => {
    const s = scope(() => {});

    s[Symbol.dispose]();
    expect(s.disposed).toBe(true);
  });
});

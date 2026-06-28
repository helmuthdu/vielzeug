import { effect, isComputed, isReactive, resource, signal } from '../';

describe('resource', () => {
  it('starts with status=loading before resolving', () => {
    let resolvePromise!: () => void;
    const ac = resource(
      () =>
        new Promise<string>((resolve) => {
          resolvePromise = () => resolve('done');
        }),
    );

    expect(ac.value.status).toBe('loading');
    expect(ac.value.data).toBeUndefined();
    resolvePromise();
    ac.dispose();
  });

  it('emits status=ready after promise fulfills', async () => {
    const s = signal('hi');
    const ac = resource(() => Promise.resolve(s.value.toUpperCase()));

    await new Promise((r) => setTimeout(r, 0));
    expect(ac.value.status).toBe('ready');
    expect(ac.value.data).toBe('HI');
    ac.dispose();
  });

  it('emits status=error when factory rejects', async () => {
    const ac = resource(() => Promise.reject(new Error('oops')));

    await new Promise((r) => setTimeout(r, 0));
    expect(ac.value.status).toBe('error');
    expect((ac.value as { error: Error; status: 'error' }).error.message).toBe('oops');
    ac.dispose();
  });

  it('re-runs and updates state when reactive dependency changes', async () => {
    const n = signal(1);
    const calls: number[] = [];
    const ac = resource(async () => {
      const v = n.value;

      calls.push(v);

      return v * 2;
    });

    await new Promise((r) => setTimeout(r, 0));
    n.value = 2;
    await new Promise((r) => setTimeout(r, 0));
    expect(calls).toContain(1);
    expect(calls).toContain(2);
    expect(ac.value.status).toBe('ready');
    expect((ac.value as { data: number; status: 'ready' }).data).toBe(4);
    ac.dispose();
  });

  it('does not throw when disposed while a promise is in flight', async () => {
    let resolve!: (v: number) => void;
    const ac = resource(
      () =>
        new Promise<number>((r) => {
          resolve = r;
        }),
    );

    ac.dispose();
    resolve(42);
    await new Promise((r) => setTimeout(r, 0));
  });

  it('status transitions in the reactive graph as factory resolves', async () => {
    const statusLog: string[] = [];
    const ac = resource(async () => 10);
    const stop = effect(() => {
      statusLog.push(ac.value.status);
    });

    await new Promise((r) => setTimeout(r, 0));
    expect(statusLog).toContain('loading');
    expect(statusLog).toContain('ready');
    stop.dispose();
    ac.dispose();
  });

  it('AbortSignal is aborted when resource is disposed mid-flight', async () => {
    let capturedAbort: AbortSignal | undefined;
    let resolveFactory!: (v: number) => void;
    const ac = resource(
      (abortSig) =>
        new Promise<number>((resolve) => {
          capturedAbort = abortSig;
          resolveFactory = resolve;
        }),
    );

    await Promise.resolve();
    expect(capturedAbort?.aborted).toBe(false);
    ac.dispose();
    expect(capturedAbort?.aborted).toBe(true);
    resolveFactory(42);
    await new Promise((r) => setTimeout(r, 0));
  });

  it('disposed getter is false before dispose and true after', () => {
    const ac = resource(() => Promise.resolve(1));

    expect(ac.disposed).toBe(false);
    ac.dispose();
    expect(ac.disposed).toBe(true);
  });

  it('is branded as both reactive and computed', () => {
    const r = resource(() => Promise.resolve(1));

    expect(isReactive(r)).toBe(true);
    expect(isComputed(r)).toBe(true);
    r.dispose();
  });

  it('named resource exposes the name on the state signal', () => {
    const ac = resource(() => Promise.resolve(1), { name: 'user' });

    expect(ac.name).toBe('user');
    ac.dispose();
  });

  it('unnamed resource has no name on the state signal', () => {
    const ac = resource(() => Promise.resolve(1));

    expect(ac.name).toBeUndefined();
    ac.dispose();
  });
});

describe('resource with initialValue', () => {
  it('exposes initialValue as data while status=loading', () => {
    let resolve!: (v: number) => void;
    const ac = resource(
      () =>
        new Promise<number>((r) => {
          resolve = r;
        }),
      { initialValue: 42 },
    );

    expect(ac.value.status).toBe('loading');
    expect(ac.value.data).toBe(42);
    resolve(99);
    ac.dispose();
  });

  it('emits status=ready with fulfilled value after resolve', async () => {
    const ac = resource(() => Promise.resolve(7), { initialValue: 0 });

    await new Promise((r) => setTimeout(r, 0));
    expect(ac.value.status).toBe('ready');
    expect(ac.value.data).toBe(7);
    ac.dispose();
  });

  it('preserves initialValue as data in error state', async () => {
    const ac = resource(() => Promise.reject(new Error('oops')), { initialValue: 5 });

    await new Promise((r) => setTimeout(r, 0));
    expect(ac.value.status).toBe('error');
    expect((ac.value as { error: unknown; status: 'error' }).error).toBeInstanceOf(Error);
    expect(ac.value.data).toBe(5);
    ac.dispose();
  });
});

describe('resource — emits a ResourceState discriminated union signal', () => {
  it('emits a ResourceState discriminated union signal', async () => {
    const r = resource(() => Promise.resolve(42));

    expect(r.value.status).toBe('loading');
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(r.value.status).toBe('ready');
    expect(r.value.data).toBe(42);
    r.dispose();
  });
});

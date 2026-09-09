import { createRipple } from '../index';

describe('resource', () => {
  it('loads from a reactive source and preserves the previous value while pending', async () => {
    const ripple = createRipple();
    const id = ripple.signal('first');
    const pending = new Map<string, (value: string) => void>();
    const value = ripple.resource(
      () => id.value,
      (key) => new Promise((resolve) => pending.set(key, resolve)),
    );

    pending.get('first')?.('one');
    await Promise.resolve();
    expect(value.value).toEqual({ status: 'success', value: 'one' });

    id.value = 'second';
    expect(value.value).toEqual({ previous: 'one', status: 'pending' });
    pending.get('second')?.('two');
    await Promise.resolve();
    expect(value.value).toEqual({ status: 'success', value: 'two' });

    ripple.dispose();
  });

  it('ignores stale results and exposes loader errors as state', async () => {
    const ripple = createRipple();
    const id = ripple.signal('first');
    const pending = new Map<string, (value: string) => void>();
    const value = ripple.resource(
      () => id.value,
      (key) =>
        key === 'error' ? Promise.reject(new Error('offline')) : new Promise((resolve) => pending.set(key, resolve)),
    );

    id.value = 'second';
    pending.get('first')?.('stale');
    pending.get('second')?.('fresh');
    await Promise.resolve();
    expect(value.value).toEqual({ status: 'success', value: 'fresh' });

    id.value = 'error';
    await Promise.resolve();
    expect(value.value).toMatchObject({
      error: expect.objectContaining({ message: 'offline' }),
      previous: 'fresh',
      status: 'error',
    });

    ripple.dispose();
  });

  it('preserves a successful undefined value while reloading', async () => {
    const ripple = createRipple();
    const key = ripple.signal(0);
    const pending: Array<(value: undefined) => void> = [];
    const value = ripple.resource(
      () => key.value,
      () => new Promise((resolve) => pending.push(resolve)),
    );

    pending.shift()?.(undefined);
    await Promise.resolve();
    key.value = 1;

    expect(value.value).toEqual({ previous: undefined, status: 'pending' });
    expect('previous' in value.value).toBe(true);
    value.dispose();
    ripple.dispose();
  });

  it('rejects graph work after resource disposal', () => {
    const ripple = createRipple();
    const value = ripple.resource(
      () => 'value',
      async () => 'loaded',
    );
    value.dispose();

    expect(() => value.reload()).toThrow('disposed resource');
    expect(() => value.subscribe(() => undefined)).toThrow('disposed resource');
    ripple.dispose();
  });

  it('aborts active work on disposal', () => {
    const ripple = createRipple();
    let signal: AbortSignal | undefined;
    const value = ripple.resource(
      () => 'value',
      (_key, context) => {
        signal = context.signal;
        return new Promise(() => undefined);
      },
    );

    value.dispose();

    expect(signal?.aborted).toBe(true);
    expect(value.disposed).toBe(true);
    ripple.dispose();
  });
});

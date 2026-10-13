import { SourcererDisposedError } from '../errors';
import { createResource } from '../resourceSource';

describe('createResource', () => {
  it('loads during construction and publishes the value', async () => {
    const load = vi.fn(async ({ signal }: { signal: AbortSignal }) => {
      expect(signal).toBeInstanceOf(AbortSignal);

      return { id: 1 };
    });
    const resource = createResource({ load });

    expect(resource.state).toMatchObject({ data: undefined, error: null, loading: true });
    await vi.waitFor(() => expect(resource.state.loading).toBe(false));

    expect(resource.state.data).toEqual({ id: 1 });
    expect(load).toHaveBeenCalledOnce();
    resource.dispose();
  });

  it('stays idle until reload when start is false', async () => {
    const load = vi.fn(async () => 'value');
    const resource = createResource({ load, start: false });

    expect(load).not.toHaveBeenCalled();
    expect(resource.state).toMatchObject({ loading: false });

    await resource.reload();

    expect(resource.state.data).toBe('value');
    resource.dispose();
  });

  it('reports a failed initial load through state instead of rejecting', async () => {
    const resource = createResource<string>({ load: () => Promise.reject(new Error('offline')) });

    await vi.waitFor(() => expect(resource.state.loading).toBe(false));

    expect(resource.state.error).toMatchObject({ message: 'offline' });
    expect(resource.state.data).toBeUndefined();
    resource.dispose();
  });

  it('rejects a later reload so callers can await it', async () => {
    let fail = false;
    const resource = createResource<string>({
      load: () => (fail ? Promise.reject(new Error('boom')) : Promise.resolve('ok')),
    });
    await vi.waitFor(() => expect(resource.state.data).toBe('ok'));

    fail = true;
    await expect(resource.reload()).rejects.toThrow('boom');
    expect(resource.state.error).toMatchObject({ message: 'boom' });
    // The previous value survives a failed refresh.
    expect(resource.state.data).toBe('ok');
    resource.dispose();
  });

  it('abandons a superseded load without committing it', async () => {
    const resolvers: Array<(value: string) => void> = [];
    const resource = createResource<string>({ load: () => new Promise((resolve) => resolvers.push(resolve)) });
    resolvers[0]?.('first');
    await vi.waitFor(() => expect(resource.state.data).toBe('first'));

    const second = resource.reload();
    resolvers[1]?.('second');
    await second;

    expect(resource.state.data).toBe('second');
    resource.dispose();
  });

  it('aborts an in-flight load on disposal and leaves state untouched', async () => {
    let seenSignal: AbortSignal | undefined;
    const resource = createResource<string>({
      load: ({ signal }) => {
        seenSignal = signal;

        return new Promise(() => undefined);
      },
    });

    expect(seenSignal?.aborted).toBe(false);
    const before = resource.state;
    resource.dispose();

    expect(seenSignal?.aborted).toBe(true);
    // Disposal stops work; it never rewrites the last committed state.
    expect(resource.state).toBe(before);
  });

  it('aborts the previous load when a reload starts', async () => {
    const signals: AbortSignal[] = [];
    const resource = createResource<string>({
      load: ({ signal }) => {
        signals.push(signal);

        return new Promise(() => undefined);
      },
    });

    void resource.reload().catch(() => undefined);

    expect(signals).toHaveLength(2);
    expect(signals[0]?.aborted).toBe(true);
    expect(signals[1]?.aborted).toBe(false);
    resource.dispose();
  });

  it('notifies subscribers on each transition', async () => {
    const states: string[] = [];
    const resource = createResource({ load: async () => 'v' });
    const unsubscribe = resource.subscribe((state) => states.push(state.loading ? 'loading' : 'settled'));

    await vi.waitFor(() => expect(states).toContain('settled'));
    unsubscribe();
    await resource.reload();

    expect(states.filter((entry) => entry === 'settled')).toHaveLength(1);
    resource.dispose();
  });

  it('rejects reload after disposal and supports Symbol.dispose', async () => {
    const resource = createResource({ load: async () => 1, start: false });
    resource[Symbol.dispose]();

    expect(resource.disposed).toBe(true);
    await expect(resource.reload()).rejects.toBeInstanceOf(SourcererDisposedError);
  });
});

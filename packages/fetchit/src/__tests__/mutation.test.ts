import { createMutation, type MutationState } from '../index';

describe('Mutation', () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('executes the mutation function and returns the result', async () => {
    const addUser = createMutation(async (input: { name: string }) => ({
      id: 1,
      name: input.name,
    }));

    const result = await addUser.mutate({ name: 'Created' });

    expect(result).toEqual({ id: 1, name: 'Created' });
  });

  it('forwards the caller AbortSignal to the mutation function', async () => {
    let receivedSignal: AbortSignal | undefined;
    const mutation = createMutation(async (_input: void, signal: AbortSignal) => {
      receivedSignal = signal;

      return 'ok';
    });

    const ac = new AbortController();

    await mutation.mutate(undefined, { signal: ac.signal });

    expect(receivedSignal).toBeDefined();
    expect(receivedSignal?.aborted).toBe(false);
  });

  it('reports idle -> pending -> success state lifecycle', async () => {
    const addUser = createMutation(async () => ({ id: 1 }));

    const states: MutationState[] = [];
    const unsub = addUser.subscribe((s) => states.push({ ...s }));

    await addUser.mutate(undefined);
    unsub();

    expect(states.map((s) => s.status)).toEqual(['idle', 'pending', 'success']);
    expect(states[2].data).toEqual({ id: 1 });
  });

  it('reports idle -> pending -> error state lifecycle and rejects the caller', async () => {
    const fail = createMutation(async () => {
      throw new Error('Server error');
    });

    const states: MutationState[] = [];

    fail.subscribe((s) => states.push({ ...s }));

    await expect(fail.mutate(undefined)).rejects.toThrow('Server error');

    expect(states.map((s) => s.status)).toEqual(['idle', 'pending', 'error']);
    expect(states[2].error?.message).toContain('Server error');
  });

  it('uses the caller-provided abort signal', async () => {
    const ac = new AbortController();
    const slow = createMutation(
      (_input: void, signal: AbortSignal) =>
        new Promise<void>((resolve, reject) => {
          const id = setTimeout(resolve, 10_000);

          signal.addEventListener('abort', () => {
            clearTimeout(id);
            reject(new DOMException('Aborted', 'AbortError'));
          });
        }),
    );

    const promise = slow.mutate(undefined, { signal: ac.signal });

    ac.abort();
    await expect(promise).rejects.toThrow('Aborted');
    expect(slow.getState().status).toBe('idle');
  });

  it('supports cancellation via mutation.cancel()', async () => {
    const slow = createMutation(
      (_input: void, signal: AbortSignal) =>
        new Promise<void>((resolve, reject) => {
          const id = setTimeout(resolve, 10_000);

          signal.addEventListener('abort', () => {
            clearTimeout(id);
            reject(new DOMException('Aborted', 'AbortError'));
          });
        }),
    );

    const promise = slow.mutate(undefined);

    slow.cancel();
    await expect(promise).rejects.toThrow('Aborted');
    expect(slow.getState().status).toBe('idle');
  });

  it('allows concurrent calls and keeps state from the latest run', async () => {
    let resolveFirst!: (value: string) => void;
    let resolveSecond!: (value: string) => void;
    const mutation = createMutation(
      (input: string) =>
        new Promise<string>((resolve) => {
          if (input === 'first') {
            resolveFirst = resolve;
          } else {
            resolveSecond = resolve;
          }
        }),
    );

    const first = mutation.mutate('first');
    const second = mutation.mutate('second');

    resolveFirst('first-result');
    await expect(first).resolves.toBe('first-result');
    expect(mutation.getState().status).toBe('pending');

    resolveSecond('second-result');
    await expect(second).resolves.toBe('second-result');
    expect(mutation.getState()).toMatchObject({ data: 'second-result', status: 'success' });
  });

  it('reset() returns state to idle with no data or error', async () => {
    const mutation = createMutation(async () => ({ id: 1 }));

    await mutation.mutate(undefined);

    mutation.reset();
    expect(mutation.getState()).toMatchObject({ data: undefined, error: null, status: 'idle' });
  });
});

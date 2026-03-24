import { createMutation, type MutationState } from '../index';

describe('Mutation', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock as typeof fetch;
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('executes the mutationFn and returns the result', async () => {
    fetchMock.mockResolvedValue({
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ id: 1, name: 'Created' }),
      ok: true,
      status: 201,
    });

    const addUser = createMutation((data: { name: string }) =>
      fetch('/users', { body: JSON.stringify(data), method: 'POST' }).then((r) => r.json()),
    );

    const result = await addUser.mutate({ name: 'Created' });

    expect(result).toEqual({ id: 1, name: 'Created' });
  });

  it('reports idle -> pending -> success state lifecycle', async () => {
    fetchMock.mockResolvedValue({
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ id: 1 }),
      ok: true,
      status: 201,
    });

    const addUser = createMutation(() => fetch('/users', { method: 'POST' }).then((r) => r.json()));

    const states: MutationState[] = [];
    const unsub = addUser.subscribe((s) => states.push({ ...s }));

    await addUser.mutate(undefined);
    unsub();

    expect(states.map((s) => s.status)).toEqual(['idle', 'pending', 'success']);
    expect(states[2].data).toEqual({ id: 1 });
    expect(states[2].isSuccess).toBe(true);
    expect(states[2].updatedAt).toBeGreaterThan(0);
  });

  it('reports idle -> pending -> error state lifecycle and rejects the caller', async () => {
    fetchMock.mockRejectedValue(new Error('Server error'));

    const fail = createMutation(() => fetch('/fail', { method: 'POST' }).then((r) => r.json()));

    const states: MutationState[] = [];

    fail.subscribe((s) => states.push({ ...s }));

    await expect(fail.mutate(undefined)).rejects.toThrow('Server error');

    expect(states.map((s) => s.status)).toEqual(['idle', 'pending', 'error']);
    expect(states[2].isError).toBe(true);
    expect(states[2].error?.message).toContain('Server error');
  });

  it('reset() returns state to idle with no data or error', async () => {
    fetchMock.mockResolvedValue({
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ id: 1 }),
      ok: true,
      status: 200,
    });

    const mut = createMutation(() => fetch('/users', { method: 'POST' }).then((r) => r.json()));

    await mut.mutate(undefined);

    expect(mut.getState().status).toBe('success');
    mut.reset();
    expect(mut.getState()).toMatchObject({ data: undefined, error: null, status: 'idle' });
  });

  it('throws when mutate() is called while a previous mutation is already in flight', async () => {
    let resolve!: () => void;
    const slow = createMutation<void>(
      () =>
        new Promise<void>((r) => {
          resolve = r;
        }),
    );

    const first = slow.mutate(undefined);

    await expect(slow.mutate(undefined)).rejects.toThrow('mutation already in flight');
    resolve();
    await first;
  });

  it('per-call signal aborts the mutation', async () => {
    const ac = new AbortController();

    const slow = createMutation(
      () =>
        new Promise<void>((resolve, reject) => {
          const id = setTimeout(resolve, 10_000);

          ac.signal.addEventListener('abort', () => {
            clearTimeout(id);
            reject(new DOMException('Aborted', 'AbortError'));
          });
        }),
    );

    const promise = slow.mutate(undefined, { signal: ac.signal });

    ac.abort();
    await expect(promise).rejects.toThrow();
  });

  it('calls onSuccess callback with result and variables', async () => {
    fetchMock.mockResolvedValue({
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ id: 1 }),
      ok: true,
      status: 201,
    });

    const onSuccess = vi.fn();
    const addUser = createMutation((_name: string) => fetch('/users', { method: 'POST' }).then((r) => r.json()), {
      onSuccess,
    });

    await addUser.mutate('Alice');

    expect(onSuccess).toHaveBeenCalledWith({ id: 1 }, 'Alice');
  });

  it('calls onError and onSettled callbacks on failure', async () => {
    fetchMock.mockRejectedValue(new Error('boom'));

    const onError = vi.fn();
    const onSettled = vi.fn();
    const fail = createMutation(() => fetch('/fail', { method: 'POST' }).then((r) => r.json()), {
      onError,
      onSettled,
    });

    await expect(fail.mutate(undefined)).rejects.toThrow('boom');

    expect(onError).toHaveBeenCalledWith(expect.any(Error), undefined);
    expect(onSettled).toHaveBeenCalledWith(undefined, expect.any(Error), undefined);
  });
});

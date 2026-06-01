import { createMutation, type MutationState } from '../index';

describe('Mutation', () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  describe('Execution', () => {
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

    it('reports idle -> fetching -> success state lifecycle', async () => {
      const addUser = createMutation(async () => ({ id: 1 }));

      const states: MutationState[] = [];
      const unsub = addUser.subscribe((s) => states.push({ ...s }));

      await addUser.mutate(undefined);
      unsub();

      // subscribe() no longer fires immediately — first notification is 'pending'
      expect(states.map((s) => s.status)).toEqual(['pending', 'success']);
      expect(states[0].isFetching).toBe(true);
      expect(states[1].isFetching).toBe(false);
      expect(states[1].data).toEqual({ id: 1 });
    });

    it('reports idle -> fetching -> error state lifecycle and rejects the caller', async () => {
      const fail = createMutation(async () => {
        throw new Error('Server error');
      });

      const states: MutationState[] = [];

      fail.subscribe((s) => states.push({ ...s }));

      await expect(fail.mutate(undefined)).rejects.toThrow('Server error');

      // subscribe() no longer fires immediately — first notification is 'pending'
      expect(states.map((s) => s.status)).toEqual(['pending', 'error']);
      expect(states[0].isFetching).toBe(true);
      expect(states[1].isFetching).toBe(false);
      expect(states[1].error?.message).toContain('Server error');
    });
  });

  describe('Cancellation & Concurrency', () => {
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

      await slow.cancel();
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
      expect(mutation.getState().isFetching).toBe(true);

      resolveSecond('second-result');
      await expect(second).resolves.toBe('second-result');
      expect(mutation.getState()).toMatchObject({ data: 'second-result', status: 'success' });
    });

    it('reset() returns state to idle with no data or error', async () => {
      const mutation = createMutation(async () => ({ id: 1 }));

      await mutation.mutate(undefined);

      mutation.reset();
      expect(mutation.getState()).toMatchObject({ data: undefined, error: null, isFetching: false, status: 'idle' });
    });
  });

  describe('Lifecycle Callbacks', () => {
    it('onSuccess is called with the resolved data and variables', async () => {
      let receivedData: unknown;
      let receivedVars: unknown;
      const mutation = createMutation(async (name: string) => ({ id: 1, name }), {
        onSuccess: (data, variables) => {
          receivedData = data;
          receivedVars = variables;
        },
      });

      await mutation.mutate('Alice');
      expect(receivedData).toEqual({ id: 1, name: 'Alice' });
      expect(receivedVars).toBe('Alice');
    });

    it('onError is called with the rejection error and variables', async () => {
      let receivedErr: Error | undefined;
      let receivedVars: unknown;
      const mutation = createMutation(
        async (name: string) => {
          throw new Error(`boom:${name}`);
        },
        {
          onError: (err, variables) => {
            receivedErr = err;
            receivedVars = variables;
          },
        },
      );

      await mutation.mutate('Bob').catch(() => {});
      expect(receivedErr?.message).toBe('boom:Bob');
      expect(receivedVars).toBe('Bob');
    });

    it('onSettled is called after success with data, null error, and variables', async () => {
      const calls: Array<[unknown, Error | null, unknown]> = [];
      const mutation = createMutation(async (n: number) => ({ id: n }), {
        onSettled: (data, error, variables) => {
          calls.push([data, error, variables]);
        },
      });

      await mutation.mutate(42);
      expect(calls).toEqual([[{ id: 42 }, null, 42]]);
    });

    it('onSettled is called after failure with undefined data, error, and variables', async () => {
      const calls: Array<[unknown, Error | null, unknown]> = [];
      const mutation = createMutation(
        async (n: number) => {
          throw new Error(`fail:${n}`);
        },
        {
          onSettled: (data, error, variables) => {
            calls.push([data, error, variables]);
          },
        },
      );

      await mutation.mutate(7).catch(() => {});
      expect(calls[0]).toEqual([undefined, expect.objectContaining({ message: 'fail:7' }), 7]);
    });

    it('onSettled is called after abort with undefined data and null error', async () => {
      const calls: Array<[unknown, Error | null]> = [];
      const mutation = createMutation(
        (_input: void, signal: AbortSignal) =>
          new Promise<void>((_resolve, reject) => {
            signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
          }),
        {
          onSettled: (data, error) => {
            calls.push([data, error]);
          },
        },
      );

      const running = mutation.mutate(undefined);

      await mutation.cancel();

      await expect(running).rejects.toThrow('Aborted');
      expect(calls).toEqual([[undefined, null]]);
    });

    it('callback errors do not suppress the original result', async () => {
      const mutation = createMutation(async () => ({ id: 1 }), {
        onSuccess: () => {
          throw new Error('callback error');
        },
      });

      await expect(mutation.mutate(undefined)).resolves.toEqual({ id: 1 });
    });

    it('forwards lifecycle callback errors to onCallbackError', async () => {
      const seen: string[] = [];
      const mutation = createMutation(async () => ({ id: 1 }), {
        onCallbackError: (error) => {
          seen.push(error.message);
        },
        onSuccess: () => {
          throw new Error('boom-success');
        },
      });

      await mutation.mutate(undefined);

      expect(seen).toEqual(['boom-success']);
    });

    it('normalizes non-Error callback throws before forwarding', async () => {
      const seen: string[] = [];
      const mutation = createMutation(async () => ({ id: 1 }), {
        onCallbackError: (error) => {
          seen.push(error.message);
        },
        onSuccess: () => {
          throw 'string-failure';
        },
      });

      await mutation.mutate(undefined);

      expect(seen).toEqual(['string-failure']);
    });
  });

  describe('External Store (toStore)', () => {
    it('peek() returns idle state before subscribe()', () => {
      const mutation = createMutation(async () => ({ id: 1 }));
      const store = mutation.toStore();

      expect(store.peek()).toEqual({
        data: undefined,
        error: null,
        isFetching: false,
        status: 'idle',
        updatedAt: undefined,
      });
    });

    it('returns the same store instance across repeated toStore() calls', () => {
      const mutation = createMutation(async () => ({ id: 1 }));

      expect(mutation.toStore()).toBe(mutation.toStore());
    });

    it('subscribe() + peek() track mutation lifecycle', async () => {
      const mutation = createMutation(async () => ({ id: 1 }));
      const store = mutation.toStore();
      const snapshots: MutationState[] = [];

      const unsub = store.subscribe(() => {
        snapshots.push({ ...store.peek() });
      });

      await mutation.mutate(undefined);

      expect(snapshots.map((s) => s.status)).toEqual(['pending', 'success']);
      expect(snapshots[0].isFetching).toBe(true);
      expect(snapshots[1].isFetching).toBe(false);
      expect(store.peek()).toMatchObject({ data: { id: 1 }, status: 'success' });

      unsub();
    });

    it('unsubscribe() stops store notifications', async () => {
      const mutation = createMutation(async () => ({ id: 1 }));
      const store = mutation.toStore();
      let notifications = 0;

      const unsub = store.subscribe(() => {
        notifications++;
      });

      unsub();

      await mutation.mutate(undefined);

      expect(notifications).toBe(0);
    });
  });
});

import { createMutation, type MutationState, type SettledResult } from '../index';

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
      const unsub = addUser.subscribe(() => states.push({ ...addUser.peek() }));

      await addUser.mutate(undefined);
      unsub();

      // subscribe() fires on each state change — first notification is 'loading'
      expect(states.map((s) => s.status)).toEqual(['loading', 'success']);
      expect(states[0].isFetching).toBe(true);
      expect(states[1].isFetching).toBe(false);
      expect(states[1].data).toEqual({ id: 1 });
    });

    it('reports idle -> fetching -> error state lifecycle and rejects the caller', async () => {
      const fail = createMutation(async () => {
        throw new Error('Server error');
      });

      const states: MutationState[] = [];

      fail.subscribe(() => states.push({ ...fail.peek() }));

      await expect(fail.mutate(undefined)).rejects.toThrow('Server error');

      // subscribe() fires on each state change — first notification is 'loading'
      expect(states.map((s) => s.status)).toEqual(['loading', 'error']);
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
      expect(slow.peek().status).toBe('loading');
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
      expect(slow.peek().status).toBe('loading');
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
      expect(mutation.peek().status).toBe('loading');
      expect(mutation.peek().isFetching).toBe(true);

      resolveSecond('second-result');
      await expect(second).resolves.toBe('second-result');
      expect(mutation.peek()).toMatchObject({ data: 'second-result', status: 'success' });
    });

    it('reset() returns state to idle with no data or error', async () => {
      const mutation = createMutation(async () => ({ id: 1 }));

      await mutation.mutate(undefined);

      mutation.reset();
      expect(mutation.peek()).toMatchObject({ data: undefined, error: null, isFetching: false, status: 'loading' });
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

    it('onSettled is called after success with status success, data, and variables', async () => {
      const results: SettledResult<{ id: number }, number>[] = [];
      const mutation = createMutation(async (n: number) => ({ id: n }), {
        onSettled: (result) => {
          results.push(result);
        },
      });

      await mutation.mutate(42);
      expect(results).toHaveLength(1);
      expect(results[0].status).toBe('success');

      if (results[0].status === 'success') {
        expect(results[0].data).toEqual({ id: 42 });
        expect(results[0].variables).toBe(42);
      }
    });

    it('onSettled is called after failure with status error, error, and variables', async () => {
      const results: SettledResult<{ id: number }, number>[] = [];
      const mutation = createMutation(
        async (n: number) => {
          throw new Error(`fail:${n}`);
        },
        {
          onSettled: (result) => {
            results.push(result);
          },
        },
      );

      await mutation.mutate(7).catch(() => {});
      expect(results).toHaveLength(1);
      expect(results[0].status).toBe('error');

      if (results[0].status === 'error') {
        expect(results[0].error.message).toBe('fail:7');
        expect(results[0].variables).toBe(7);
      }
    });

    it('onSettled is called after abort with status aborted', async () => {
      const results: SettledResult<void, void>[] = [];
      const mutation = createMutation(
        (_input: void, signal: AbortSignal) =>
          new Promise<void>((_resolve, reject) => {
            signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
          }),
        {
          onSettled: (result) => {
            results.push(result);
          },
        },
      );

      const running = mutation.mutate(undefined);

      await mutation.cancel();

      await expect(running).rejects.toThrow('Aborted');
      expect(results).toHaveLength(1);
      expect(results[0].status).toBe('aborted');
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

  describe('External Store (peek / subscribe)', () => {
    it('peek() returns loading state before any mutate()', () => {
      const mutation = createMutation(async () => ({ id: 1 }));

      expect(mutation.peek()).toEqual({
        data: undefined,
        error: null,
        isFetching: false,
        isLoading: true,
        status: 'loading',
        updatedAt: undefined,
      });
    });

    it('store is a stable property reference', () => {
      const mutation = createMutation(async () => ({ id: 1 }));

      expect(mutation.store).toBe(mutation.store);
    });

    it('subscribe() + peek() track mutation lifecycle', async () => {
      const mutation = createMutation(async () => ({ id: 1 }));
      const snapshots: MutationState[] = [];

      const unsub = mutation.subscribe(() => {
        snapshots.push({ ...mutation.peek() });
      });

      await mutation.mutate(undefined);

      expect(snapshots.map((s) => s.status)).toEqual(['loading', 'success']);
      expect(snapshots[0].isFetching).toBe(true);
      expect(snapshots[1].isFetching).toBe(false);
      expect(mutation.peek()).toMatchObject({ data: { id: 1 }, status: 'success' });

      unsub();
    });

    it('unsubscribe() stops store notifications', async () => {
      const mutation = createMutation(async () => ({ id: 1 }));
      let notifications = 0;

      const unsub = mutation.subscribe(() => {
        notifications++;
      });

      unsub();

      await mutation.mutate(undefined);

      expect(notifications).toBe(0);
    });
  });

  describe('Lifecycle callbacks — abort behavior', () => {
    it('onSettled receives status aborted when mutation is cancelled', async () => {
      const results: SettledResult<string, void>[] = [];

      const mutation = createMutation(
        (_: void, signal: AbortSignal) =>
          new Promise<string>((_resolve, reject) => {
            signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
          }),
        {
          onSettled: (result) => {
            results.push(result);
          },
        },
      );

      const running = mutation.mutate(undefined);

      await mutation.cancel();
      await running.catch(() => {});

      expect(results).toHaveLength(1);
      expect(results[0].status).toBe('aborted');
    });

    it('onError is NOT called when mutation is cancelled', async () => {
      let errorCallCount = 0;

      const mutation = createMutation(
        (_: void, signal: AbortSignal) =>
          new Promise<string>((_resolve, reject) => {
            signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
          }),
        {
          onError: () => {
            errorCallCount++;
          },
        },
      );

      const running = mutation.mutate(undefined);

      await mutation.cancel();
      await running.catch(() => {});

      expect(errorCallCount).toBe(0);
    });
  });

  describe('activeRun lifecycle', () => {
    it('activeRun is null after a completed mutation (regression: synchronous race)', async () => {
      // Regression: activeRun was previously set AFTER the operation IIFE,
      // meaning a synchronously-resolving mutation could clear activeRun in its
      // finally block before it was ever assigned, leaving a stale reference.
      const mutation = createMutation(async () => 'result');

      // cancel() reads activeRun — it should be null after completion
      await mutation.mutate(undefined);

      // If activeRun is stale, cancel() would abort a finished controller —
      // this test verifies the promise settles without hanging.
      await expect(mutation.cancel()).resolves.toBeUndefined();
      expect(mutation.peek().status).toBe('success');
    });

    it('peek() is loading after cancel() clears an in-flight mutation', async () => {
      const mutation = createMutation(
        (_: void, signal: AbortSignal) =>
          new Promise<string>((_resolve, reject) => {
            signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
          }),
      );

      const running = mutation.mutate(undefined);

      await mutation.cancel();

      await running.catch(() => {});

      expect(mutation.peek().status).toBe('loading');
    });
  });

  describe('Lifecycle', () => {
    it('dispose() sets disposed to true and is idempotent', () => {
      const mutation = createMutation(async () => 'ok');

      expect(mutation.disposed).toBe(false);
      mutation.dispose();
      expect(mutation.disposed).toBe(true);
      expect(() => mutation.dispose()).not.toThrow();
    });

    it('[Symbol.dispose] delegates to dispose()', () => {
      const mutation = createMutation(async () => 'ok');

      mutation[Symbol.dispose]();

      expect(mutation.disposed).toBe(true);
    });

    it('dispose() aborts an in-flight mutation', async () => {
      let aborted = false;
      const mutation = createMutation(
        (_: void, signal: AbortSignal) =>
          new Promise<string>((_resolve, reject) => {
            signal.addEventListener('abort', () => {
              aborted = true;
              reject(new DOMException('Aborted', 'AbortError'));
            });
          }),
      );

      const running = mutation.mutate(undefined).catch(() => {});

      mutation.dispose();
      await running;

      expect(aborted).toBe(true);
    });

    it('mutate() throws CourierDisposedError after dispose()', async () => {
      let calls = 0;
      const mutation = createMutation(async () => {
        calls++;

        return 'ok';
      });

      mutation.dispose();

      await expect(mutation.mutate(undefined)).rejects.toThrow('[courier] Mutation disposed');
      expect(calls).toBe(0);
    });

    it('subscribe() after dispose returns a noop unsubscribe and does not notify', () => {
      const mutation = createMutation(async () => 'ok');
      const calls: string[] = [];

      mutation.dispose();

      const unsub = mutation.subscribe(() => calls.push('called'));

      expect(() => unsub()).not.toThrow();
      expect(calls).toEqual([]);
    });

    it('store.subscribe() after dispose returns a noop unsubscribe and does not notify', () => {
      const mutation = createMutation(async () => 'ok');
      const calls: string[] = [];

      mutation.dispose();

      const unsub = mutation.store.subscribe(() => calls.push('called'));

      expect(() => unsub()).not.toThrow();
      expect(calls).toEqual([]);
    });
  });
});

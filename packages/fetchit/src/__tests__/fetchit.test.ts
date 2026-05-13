import { createFetchit } from '../index';

describe('createFetchit', () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('applies shared mutation defaults to created mutations', async () => {
    const client = createFetchit({
      mutationDefaults: {
        attempts: 2,
      },
    });

    let calls = 0;
    const mutation = client.mutation(async () => {
      if (++calls < 2) {
        throw new Error('retry');
      }

      return 'ok';
    });

    await expect(mutation.mutate(undefined)).resolves.toBe('ok');
    expect(calls).toBe(2);
  });

  it('allows per-mutation options to override defaults', async () => {
    const client = createFetchit({
      mutationDefaults: {
        attempts: 3,
      },
    });

    let calls = 0;
    const mutation = client.mutation(
      async () => {
        calls++;
        throw new Error('fail');
      },
      {
        attempts: 1,
      },
    );

    await expect(mutation.mutate(undefined)).rejects.toThrow('fail');
    expect(calls).toBe(1);
  });
});

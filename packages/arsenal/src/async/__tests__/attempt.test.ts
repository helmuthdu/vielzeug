import { attempt } from '../retry';

describe('attempt', () => {
  it('returns { ok: true, value } on success', async () => {
    const result = await attempt(async () => 42);

    expect(result).toEqual({ ok: true, value: 42 });
  });

  it('returns { ok: false, error } on failure', async () => {
    const err = new Error('fail');
    const result = await attempt(async () => {
      throw err;
    });

    expect(result).toEqual({ error: err, ok: false });
  });

  it('never throws even when fn rejects', async () => {
    await expect(
      attempt(async () => {
        throw new Error('boom');
      }),
    ).resolves.toBeDefined();
  });

  it('works with resolved undefined', async () => {
    const result = await attempt(async () => undefined);

    expect(result).toEqual({ ok: true, value: undefined });
  });

  it('captures non-Error thrown values', async () => {
    const result = await attempt(async () => {
      throw 'string-error';
    });

    expect(result).toEqual({ error: 'string-error', ok: false });
  });
});

import { attempt, isFail, isOk } from '../attempt';

describe('attempt (sync)', () => {
  it('returns { ok: true, value } on success', () => {
    const result = attempt(() => 42);

    expect(result).toEqual({ ok: true, value: 42 });
  });

  it('returns { ok: false, error } on failure', () => {
    const err = new Error('fail');
    const result = attempt(() => {
      throw err;
    });

    expect(result).toEqual({ error: err, ok: false });
  });

  it('isOk narrows to success branch', () => {
    const result = attempt(() => 42);

    expect(isOk(result)).toBe(true);

    if (isOk(result)) expect(result.value).toBe(42);
  });

  it('isFail narrows to failure branch', () => {
    const err = new Error('x');
    const result = attempt(() => {
      throw err;
    });

    expect(isFail(result)).toBe(true);

    if (isFail(result)) expect(result.error).toBe(err);
  });
});

describe('attempt (async)', () => {
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

  it('infers Promise return when factory is async', async () => {
    const result = attempt(async () => 'hello');

    expect(result).toBeInstanceOf(Promise);
    await expect(result).resolves.toEqual({ ok: true, value: 'hello' });
  });
});

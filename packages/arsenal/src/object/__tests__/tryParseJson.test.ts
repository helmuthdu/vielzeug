import { tryParseJson } from '../tryParseJson';

describe('tryParseJson', () => {
  it('returns parsed unknown data', () => {
    expect(tryParseJson('{"id":1}')).toEqual({ ok: true, value: { id: 1 } });
  });

  it('returns syntax failures without hiding them behind a fallback', () => {
    const result = tryParseJson('{');

    expect(result.ok).toBe(false);

    if (!result.ok) expect(result.error).toBeInstanceOf(SyntaxError);
  });
});

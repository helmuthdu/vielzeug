import { clampPositiveInt, sanitizeForLog } from '../_utils';

describe('sanitizeForLog()', () => {
  it('passes plain text through unchanged', () => {
    expect(sanitizeForLog('hello world')).toBe('hello world');
  });

  it('replaces control characters (e.g. ANSI escape sequences) with "?"', () => {
    expect(sanitizeForLog('\u001b[31mred\u001b[0m')).toBe('?[31mred?[0m');
  });

  it('truncates to maxLength', () => {
    expect(sanitizeForLog('abcdefgh', 4)).toBe('abcd');
  });
});

describe('clampPositiveInt()', () => {
  it('passes through an already-valid positive integer without warning', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(clampPositiveInt(20, 'createRemoteSource', 'limit')).toBe(20);
    expect(warnSpy).not.toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  it('truncates a fractional positive value without warning — not a likely mistake', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(clampPositiveInt(3.7, 'createRemoteSource', 'limit')).toBe(3);
    expect(warnSpy).not.toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  it('clamps a negative value to 1 and warns, naming the API and field', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(clampPositiveInt(-5, 'createRemoteSource', 'limit')).toBe(1);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('createRemoteSource: limit -5 is invalid'));

    warnSpy.mockRestore();
  });

  it('clamps zero to 1 and warns', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(clampPositiveInt(0, 'source.patch', 'limit')).toBe(1);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('source.patch: limit 0 is invalid'));

    warnSpy.mockRestore();
  });

  it('clamps NaN and warns', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(clampPositiveInt(Number.NaN, 'source.goTo', 'target')).toBe(1);
    expect(warnSpy).toHaveBeenCalledTimes(1);

    warnSpy.mockRestore();
  });

  it('clamps Infinity to 1 and warns (independent call site from the NaN test above)', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(clampPositiveInt(Number.POSITIVE_INFINITY, 'source.goTo', 'anotherTarget')).toBe(1);
    expect(warnSpy).toHaveBeenCalledTimes(1);

    warnSpy.mockRestore();
  });

  it('warns only once per (apiLabel, fieldName) call site — avoids spamming a hot path like patch() bound to live UI input', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    clampPositiveInt(-1, 'source.patch', 'dedupTest');
    clampPositiveInt(-2, 'source.patch', 'dedupTest');
    clampPositiveInt(-3, 'source.patch', 'dedupTest');

    expect(warnSpy).toHaveBeenCalledTimes(1);

    warnSpy.mockRestore();
  });

  it('still warns for a different fieldName even after another field at the same apiLabel already warned', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    clampPositiveInt(-1, 'source.patch', 'dedupTestA');
    clampPositiveInt(-1, 'source.patch', 'dedupTestB');

    expect(warnSpy).toHaveBeenCalledTimes(2);

    warnSpy.mockRestore();
  });
});

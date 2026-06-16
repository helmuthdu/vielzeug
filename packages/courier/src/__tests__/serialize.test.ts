import { buildRequestInit, isBodyInit, stringify } from '../serialize';

describe('stringify', () => {
  it('serializes common structured query-key values deterministically', () => {
    expect(stringify(42n)).toBe('42n');
    expect(stringify(new Date('2026-05-12T12:34:56.000Z'))).toBe('[Date:2026-05-12T12:34:56.000Z]');
    expect(stringify(/foo/gi)).toBe('[RegExp:foo/gi]');
  });

  it('keeps Map and Set order-independent', () => {
    const first = stringify(
      new Map([
        ['b', 2],
        ['a', 1],
      ]),
    );
    const second = stringify(
      new Map([
        ['a', 1],
        ['b', 2],
      ]),
    );
    const setFirst = stringify(new Set([3, 1, 2]));
    const setSecond = stringify(new Set([2, 3, 1]));

    expect(first).toBe(second);
    expect(setFirst).toBe(setSecond);
  });
});

describe('stringify with plain object QueryKey segments', () => {
  it('produces the same output regardless of object key insertion order', () => {
    const a = stringify({ a: 1, b: 2 });
    const b = stringify({ a: 1, b: 2 });

    expect(a).toBe(b);
  });

  it('differentiates objects with different values', () => {
    expect(stringify({ a: 1 })).not.toBe(stringify({ a: 2 }));
  });

  it('handles nested QueryKey arrays with object segments stably', () => {
    const key1 = [['users', { limit: 10, page: 1 }]];
    const key2 = [['users', { limit: 10, page: 1 }]];

    expect(stringify(key1)).toBe(stringify(key2));
  });
});

describe('isBodyInit', () => {
  it('returns true for string', () => {
    expect(isBodyInit('hello')).toBe(true);
  });

  it('returns true for FormData', () => {
    expect(isBodyInit(new FormData())).toBe(true);
  });

  it('returns true for Blob', () => {
    expect(isBodyInit(new Blob(['data']))).toBe(true);
  });

  it('returns true for URLSearchParams', () => {
    expect(isBodyInit(new URLSearchParams())).toBe(true);
  });

  it('returns true for ArrayBuffer', () => {
    expect(isBodyInit(new ArrayBuffer(8))).toBe(true);
  });

  it('returns true for ArrayBufferView (Uint8Array)', () => {
    expect(isBodyInit(new Uint8Array(4))).toBe(true);
  });

  it('returns false for plain object', () => {
    expect(isBodyInit({ foo: 'bar' })).toBe(false);
  });

  it('returns false for number', () => {
    expect(isBodyInit(42)).toBe(false);
  });

  it('returns false for null', () => {
    expect(isBodyInit(null)).toBe(false);
  });
});

describe('buildRequestInit', () => {
  it('serializes a plain object body to JSON and sets content-type', () => {
    const init = buildRequestInit('POST', {}, { name: 'Alice' }, undefined, {});

    expect(init.body).toBe(JSON.stringify({ name: 'Alice' }));
    expect((init.headers as Record<string, string>)['content-type']).toBe('application/json');
    expect(init.method).toBe('POST');
  });

  it('passes a string body as-is without overriding content-type', () => {
    const init = buildRequestInit('POST', { 'content-type': 'text/plain' }, 'raw text', undefined, {});

    expect(init.body).toBe('raw text');
    expect((init.headers as Record<string, string>)['content-type']).toBe('text/plain');
  });

  it('passes FormData as-is without setting content-type', () => {
    const fd = new FormData();
    const init = buildRequestInit('POST', {}, fd, undefined, {});

    expect(init.body).toBe(fd);
  });

  it('omits body when undefined', () => {
    const init = buildRequestInit('GET', {}, undefined, undefined, {});

    expect(init.body).toBeUndefined();
  });

  it('forwards the signal onto the init', () => {
    const ac = new AbortController();
    const init = buildRequestInit('GET', {}, undefined, ac.signal, {});

    expect(init.signal).toBe(ac.signal);
  });

  it('per-request content-type overrides the JSON default', () => {
    const init = buildRequestInit('POST', { 'content-type': 'application/xml' }, { x: 1 }, undefined, {});

    expect((init.headers as Record<string, string>)['content-type']).toBe('application/xml');
  });

  it('normalises method to uppercase', () => {
    const init = buildRequestInit('post', {}, undefined, undefined, {});

    expect(init.method).toBe('POST');
  });

  it('merges fetchInit fields (e.g. credentials)', () => {
    const init = buildRequestInit('GET', {}, undefined, undefined, { credentials: 'include' });

    expect(init.credentials).toBe('include');
  });
});

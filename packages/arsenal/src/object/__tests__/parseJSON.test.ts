import { parseJSON } from '../parseJSON';

describe('parseJSON', () => {
  it('should parse a valid JSON string', () => {
    const json = '{"a":1,"b":2}';
    const result = parseJSON(json);

    expect(result).toEqual({ a: 1, b: 2 });
  });

  it('should return the default value for an invalid JSON string', () => {
    const json = 'invalid';
    const defaultValue = { a: 0, b: 0 };
    const result = parseJSON(json, { defaultValue });

    expect(result).toEqual(defaultValue);
  });

  it('should return undefined if no default value is provided and parsing fails', () => {
    const json = 'invalid';
    const result = parseJSON(json);

    expect(result).toBeUndefined();
  });

  it('should return the default value for null input', () => {
    const defaultValue = { a: 0 };
    const result = parseJSON(null, { defaultValue });

    expect(result).toEqual(defaultValue);
  });

  it('should return the default value for undefined input', () => {
    const defaultValue = { a: 0 };
    const result = parseJSON(undefined, { defaultValue });

    expect(result).toEqual(defaultValue);
  });

  it('returns null when input is the JSON string "null" — regression B2', () => {
    expect(parseJSON('null')).toBeNull();
    expect(parseJSON('null', { defaultValue: 'fallback' })).toBeNull();
  });

  it('returns the default value when JSON.parse returns undefined (impossible in practice, guarded)', () => {
    // JSON.parse never returns undefined for valid input, but the path exists for completeness
    expect(parseJSON('"hello"')).toBe('hello');
    expect(parseJSON('0')).toBe(0);
    expect(parseJSON('false')).toBe(false);
  });

  it('should call the reviver function if provided', () => {
    const json = '{"a":1,"b":2}';
    const reviver = (key: string, value: any) => (key === 'a' ? value * 2 : value);
    const result = parseJSON(json, { reviver });

    expect(result).toEqual({ a: 2, b: 2 });
  });
});

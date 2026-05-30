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

  it('should call onError when parsing fails', () => {
    const json = 'invalid';
    const onError = vi.fn();

    parseJSON(json, { onError });
    expect(onError).toHaveBeenCalledWith(expect.any(SyntaxError));
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

  it('should call the reviver function if provided', () => {
    const json = '{"a":1,"b":2}';
    const reviver = (key: string, value: any) => (key === 'a' ? value * 2 : value);
    const result = parseJSON(json, { reviver });

    expect(result).toEqual({ a: 2, b: 2 });
  });

  it('should validate the parsed value if a validator is provided', () => {
    const json = '{"a":1,"b":2}';
    const validator = (value: any) => typeof value.a === 'number' && typeof value.b === 'number';
    const result = parseJSON(json, { validator });

    expect(result).toEqual({ a: 1, b: 2 });
  });

  it('should return defaultValue when validator rejects the parsed result', () => {
    const json = '{"a":"not-a-number"}';
    const defaultValue = { a: 0 };
    const validator = (value: any) => typeof value.a === 'number';
    const result = parseJSON(json, { defaultValue, validator });

    expect(result).toEqual(defaultValue);
  });
});

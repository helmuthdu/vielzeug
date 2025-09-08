import { Logit } from '@vielzeug/logit';
import { parseJSON } from '../parseJSON';

vi.mock('@vielzeug/logit', () => ({
  Logit: {
    error: vi.fn(),
  },
}));

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
    expect(Logit.error).toHaveBeenCalledWith('parseJSON() -> failed to parse object', expect.any(SyntaxError));
  });

  it('should return the input if it is not a string', () => {
    const input = { a: 1, b: 2 };
    const result = parseJSON(input);
    expect(result).toEqual(input);
  });

  it('should return undefined if no default value is provided and parsing fails', () => {
    const json = 'invalid';
    const result = parseJSON(json);
    expect(result).toBeUndefined();
    expect(Logit.error).toHaveBeenCalledWith('parseJSON() -> failed to parse object', expect.any(SyntaxError));
  });

  it('should return the default value if the parsed value is null or undefined', () => {
    const json = null;
    const defaultValue = { a: 0 };
    const result = parseJSON(json, { defaultValue });
    expect(result).toEqual(defaultValue);
  });

  it('should call the reviver function if provided', () => {
    const json = '{"a":1,"b":2}';
    // biome-ignore lint/suspicious/noExplicitAny: -
    const reviver = (key: string, value: any) => (key === 'a' ? value * 2 : value);
    const result = parseJSON(json, { reviver });
    expect(result).toEqual({ a: 2, b: 2 });
  });

  it('should validate the parsed value if a validator is provided', () => {
    const json = '{"a":1,"b":2}';
    // biome-ignore lint/suspicious/noExplicitAny: -
    const validator = (value: any) => typeof value.a === 'number' && typeof value.b === 'number';
    const result = parseJSON(json, { validator });
    expect(result).toEqual({ a: 1, b: 2 });
  });
});

import { type ArgType, typeOf } from '../typeOf';

describe('typeOf', () => {
  it('returns "Null" for null', () => {
    expect(typeOf(null)).toBe<ArgType>('null');
  });

  it('returns "Undefined" for undefined', () => {
    expect(typeOf(undefined)).toBe<ArgType>('undefined');
  });

  it('returns "NaN" for NaN', () => {
    expect(typeOf(Number.NaN)).toBe<ArgType>('nan');
    expect(typeOf(Number('not-a-number'))).toBe<ArgType>('nan');
  });

  it('returns "Promise" for async functions', () => {
    expect(typeOf(async () => {})).toBe<ArgType>('promise');
    const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor;
    expect(typeOf(new AsyncFunction('return 1'))).toBe<ArgType>('promise');
  });

  it('returns "Number" for numbers', () => {
    expect(typeOf(0)).toBe<ArgType>('number');
    expect(typeOf(123)).toBe<ArgType>('number');
    expect(typeOf(-42)).toBe<ArgType>('number');
    expect(typeOf(Number.POSITIVE_INFINITY)).toBe<ArgType>('number');
  });

  it('returns "String" for strings', () => {
    expect(typeOf('abc')).toBe<ArgType>('string');
    expect(typeOf(String('def'))).toBe<ArgType>('string');
  });

  it('returns "Object" for plain objects', () => {
    expect(typeOf({})).toBe<ArgType>('object');
    expect(typeOf(Object.create(null))).toBe<ArgType>('object');
    class Test {}
    expect(typeOf(new Test())).toBe<ArgType>('object');
  });

  it('returns "Array" for arrays', () => {
    expect(typeOf([])).toBe<ArgType>('array');
    expect(typeOf([1, 2, 3])).toBe<ArgType>('array');
    expect(typeOf([])).toBe<ArgType>('array');
  });

  it('returns "Function" for functions', () => {
    expect(typeOf(() => {})).toBe<ArgType>('function');
    expect(typeOf(() => {})).toBe<ArgType>('function');
    expect(typeOf(new Function('return 1'))).toBe<ArgType>('function');
  });

  it('returns "Date" for Date objects', () => {
    expect(typeOf(new Date())).toBe<ArgType>('date');
  });

  it('returns "Error" for Error objects', () => {
    expect(typeOf(new Error())).toBe<ArgType>('error');
    expect(typeOf(new TypeError())).toBe<ArgType>('error');
  });

  it('returns "Map" for Map objects', () => {
    expect(typeOf(new Map())).toBe<ArgType>('map');
  });

  it('returns "Set" for Set objects', () => {
    expect(typeOf(new Set())).toBe<ArgType>('set');
  });

  it('returns "WeakMap" for WeakMap objects', () => {
    expect(typeOf(new WeakMap())).toBe<ArgType>('weakmap');
  });

  it('returns "WeakSet" for WeakSet objects', () => {
    expect(typeOf(new WeakSet())).toBe<ArgType>('weakset');
  });

  it('returns "RegExp" for RegExp objects', () => {
    expect(typeOf(/abc/)).toBe<ArgType>('regexp');
    // biome-ignore lint/complexity/useRegexLiterals: -
    expect(typeOf(new RegExp('abc'))).toBe<ArgType>('regexp');
  });

  it('returns "Boolean" for booleans', () => {
    expect(typeOf(true)).toBe<ArgType>('boolean');
    expect(typeOf(false)).toBe<ArgType>('boolean');
    expect(typeOf(Boolean(1))).toBe<ArgType>('boolean');
  });
});

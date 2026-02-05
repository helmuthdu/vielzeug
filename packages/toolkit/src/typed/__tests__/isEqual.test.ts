/** biome-ignore-all lint/suspicious/noExplicitAny: - */
import { isEqual } from '../isEqual';

describe('isEqual', () => {
  it('should return true for identical primitives', () => {
    expect(isEqual(1, 1)).toBe(true);
    expect(isEqual('test', 'test')).toBe(true);
    expect(isEqual(true, true)).toBe(true);
  });

  it('should return false for different primitives', () => {
    expect(isEqual(1, 2)).toBe(false);
    expect(isEqual('test', 'Test')).toBe(false);
    expect(isEqual(true, false)).toBe(false);
  });

  it('should return true for identical arrays', () => {
    expect(isEqual([1, 2, 3], [1, 2, 3])).toBe(true);
  });

  it('should return false for different arrays', () => {
    expect(isEqual([1, 2, 3], [1, 2])).toBe(false);
    expect(isEqual([1, 2, 3], [3, 2, 1])).toBe(false);
  });

  it('should return true for identical objects', () => {
    expect(isEqual({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true);
  });

  it('should return false for different objects', () => {
    expect(isEqual({ a: 1, b: 2 }, { a: 1, b: 3 })).toBe(false);
    expect(isEqual({ a: 1 }, { b: 1 })).toBe(false);
  });

  it('should return true for identical dates', () => {
    expect(isEqual(new Date('2023-01-01'), new Date('2023-01-01'))).toBe(true);
  });

  it('should return false for different dates', () => {
    expect(isEqual(new Date('2023-01-01'), new Date('2023-01-02'))).toBe(false);
  });

  it('should return true for identical maps', () => {
    const mapA = new Map([
      ['key1', 'value1'],
      ['key2', 'value2'],
    ]);
    const mapB = new Map([
      ['key1', 'value1'],
      ['key2', 'value2'],
    ]);

    expect(isEqual(mapA, mapB)).toBe(true);
  });

  it('should return true for identical sets', () => {
    const setA = new Set([1, 2, 3]);
    const setB = new Set([1, 2, 3]);

    expect(isEqual(setA, setB)).toBe(true);
  });

  it('should handle circular references in objects', () => {
    const objA: any = { a: 1 };
    objA.self = objA;
    const objB: any = { a: 1 };
    objB.self = objB;

    expect(isEqual(objA, objB)).toBe(true);

    const objC: any = { a: 1 };
    objC.self = objC;
    const objD: any = { a: 1 };
    objD.self = { a: 1 }; // Not circular

    expect(isEqual(objC, objD)).toBe(false);
  });

  it('should handle circular references in arrays', () => {
    const arrA: any[] = [1];
    arrA.push(arrA);
    const arrB: any[] = [1];
    arrB.push(arrB);

    expect(isEqual(arrA, arrB)).toBe(true);
  });
});

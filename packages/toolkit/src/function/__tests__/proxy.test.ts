import { proxy } from '../proxy';

describe('proxy', () => {
  it('should call set when a property is set', () => {
    const obj = { a: 1 };
    const set = vi.fn((_prop, val) => val);
    const proxied = proxy(obj, { set });

    proxied.a = 2;

    expect(set).toHaveBeenCalledWith('a', 2, 1, obj);
    expect(obj.a).toBe(2);
  });

  it('should call get when a property is accessed', () => {
    const obj = { a: 1 };
    const get = vi.fn((_prop, val) => val);
    const proxied = proxy(obj, { get });

    const value = proxied.a;

    expect(get).toHaveBeenCalledWith('a', 1, obj);
    expect(value).toBe(1);
  });

  it('should handle deep proxies when deep option is true', () => {
    const obj = { a: { b: 1 } };
    const set = vi.fn((_prop, val) => val);
    const proxied = proxy(obj, { deep: true, set });

    proxied.a.b = 2;

    expect(set).toHaveBeenCalledWith('b', 2, 1, obj.a);
    expect(obj.a.b).toBe(2);
  });

  it('should not proxy properties not in watch', () => {
    const obj = { a: 1, b: 2 };
    const set = vi.fn(() => 3);
    const proxied = proxy(obj, { set, watch: ['a'] });

    proxied.b = 3;

    expect(set).not.toHaveBeenCalled();
    expect(obj.b).toBe(3);
  });

  it('should return the modified value from set', () => {
    const obj = { a: 1 };
    const set = vi.fn((_prop, val) => val * 2);
    const proxied = proxy(obj, { set });

    proxied.a = 2;

    expect(obj.a).toBe(4);
  });

  it('should handle nested objects with deep option', () => {
    const obj = { a: { b: { c: 1 } } };
    const set = vi.fn((_prop, val) => val);
    const proxied = proxy(obj, { deep: true, set });

    proxied.a.b.c = 2;

    expect(set).toHaveBeenCalledWith('c', 2, 1, obj.a.b);
    expect(obj.a.b.c).toBe(2);
  });

  it('should not proxy non-object values', () => {
    const obj = { a: 1 };
    const set = vi.fn((_prop, val) => val);
    const proxied = proxy(obj, { deep: true, set });

    proxied.a = 2;

    expect(set).toHaveBeenCalledWith('a', 2, 1, obj);
    expect(obj.a).toBe(2);
  });

  it('should handle get modifying the returned value', () => {
    const obj = { a: 1 };
    const get = vi.fn((_prop, val) => val * 2);
    const proxied = proxy(obj, { get });

    const value = proxied.a;

    expect(get).toHaveBeenCalledWith('a', 1, obj);
    expect(value).toBe(2);
  });

  it('should not call set or get for unobserved properties', () => {
    const obj = { a: 1, b: 2 };
    const set = vi.fn((_prop, val) => val * 2);
    const get = vi.fn((_prop, val) => val / 2);
    const proxied = proxy(obj, { get, set, watch: ['a'] });

    proxied.b = 3;
    const value = proxied.b;

    expect(set).not.toHaveBeenCalled();
    expect(get).not.toHaveBeenCalled();
    expect(value).toBe(3);
  });
});

import { getOrCreate } from '../getOrCreate';

describe('getOrCreate', () => {
  it('creates a value on first access', () => {
    const map = new Map<string, number>();
    const build = vi.fn(() => 42);

    expect(getOrCreate(map, 'k', build)).toBe(42);
    expect(build).toHaveBeenCalledTimes(1);
  });

  it('returns cached value on subsequent accesses', () => {
    const map = new Map<string, number>();
    const build = vi.fn(() => 42);

    getOrCreate(map, 'k', build);
    getOrCreate(map, 'k', build);

    expect(build).toHaveBeenCalledTimes(1);
  });

  it('stores the created value in the map', () => {
    const map = new Map<string, number>();

    getOrCreate(map, 'k', () => 7);

    expect(map.get('k')).toBe(7);
  });

  it('caches undefined values (build called once)', () => {
    const map = new Map<string, undefined>();
    const build = vi.fn(() => undefined);

    getOrCreate(map, 'k', build);
    getOrCreate(map, 'k', build);

    expect(build).toHaveBeenCalledTimes(1);
  });

  it('handles different keys independently', () => {
    const map = new Map<string, string>();

    getOrCreate(map, 'x', () => 'X');
    getOrCreate(map, 'y', () => 'Y');

    expect(map.get('x')).toBe('X');
    expect(map.get('y')).toBe('Y');
  });
});

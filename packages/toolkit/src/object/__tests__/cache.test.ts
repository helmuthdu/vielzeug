import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cache } from '../cache';

describe('cache', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should store and retrieve values', () => {
    const c = cache<string>();
    c.set(['user', 1], 'Alice');
    expect(c.get(['user', 1])).toBe('Alice');
  });

  it('should return undefined for missing keys', () => {
    const c = cache<string>();
    expect(c.get(['missing'])).toBeUndefined();
  });

  it('should delete values', () => {
    const c = cache<number>();
    c.set(['count'], 42);
    expect(c.delete(['count'])).toBe(true);
    expect(c.get(['count'])).toBeUndefined();
  });

  it('should return false when deleting non-existent key', () => {
    const c = cache<string>();
    expect(c.delete(['nonexistent'])).toBe(false);
  });

  it('should clear all values', () => {
    const c = cache<string>();
    c.set(['a'], 'A');
    c.set(['b'], 'B');
    expect(c.size()).toBe(2);
    c.clear();
    expect(c.size()).toBe(0);
  });

  it('should track cache size', () => {
    const c = cache<number>();
    expect(c.size()).toBe(0);
    c.set(['one'], 1);
    c.set(['two'], 2);
    expect(c.size()).toBe(2);
  });

  it('should schedule garbage collection', () => {
    const c = cache<string>();
    c.set(['temp'], 'data');
    c.scheduleGc(['temp'], 1000);

    expect(c.get(['temp'])).toBe('data');
    vi.advanceTimersByTime(1000);
    expect(c.get(['temp'])).toBeUndefined();
  });

  it('should cancel previous GC when scheduling new one', () => {
    const c = cache<string>();
    c.set(['item'], 'value');

    c.scheduleGc(['item'], 500);
    vi.advanceTimersByTime(300);
    c.scheduleGc(['item'], 1000); // Reschedule

    vi.advanceTimersByTime(500);
    expect(c.get(['item'])).toBe('value'); // Still exists

    vi.advanceTimersByTime(500);
    expect(c.get(['item'])).toBeUndefined(); // Now deleted
  });

  it('should store and retrieve metadata', () => {
    const c = cache<string>();
    c.setMeta(['user', 1], { role: 'admin' });
    const meta = c.getMeta(['user', 1]);
    expect(meta).toHaveProperty('lastUsedAt');
    expect(meta).toHaveProperty('role', 'admin');
  });

  it('should clear GC timers on clear', () => {
    const c = cache<string>();
    c.set(['a'], 'A');
    c.scheduleGc(['a'], 5000);
    c.clear();
    vi.advanceTimersByTime(5000);
    expect(c.get(['a'])).toBeUndefined();
  });

  it('should handle complex keys', () => {
    const c = cache<string>();
    const key = ['user', { id: 1, role: 'admin' }, [1, 2, 3]];
    c.set(key, 'complex');
    expect(c.get(key)).toBe('complex');
  });
});

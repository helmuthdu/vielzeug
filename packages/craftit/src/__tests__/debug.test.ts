/**
 * Dev - Debug Utilities Tests
 * Tests for development debugging tools
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { signal } from '..';
import { createDebugLogger, debug } from '../dev/debug';
import { cleanup } from '../testing/render';

describe('Dev: Debug Utilities', () => {
  afterEach(() => {
    debug.clear();
    cleanup();
  });

  describe('debug.trace()', () => {
    it('should trace signal changes', async () => {
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const count = signal(0);

      debug.trace(count, 'count');
      count.value = 1;

      await new Promise((r) => setTimeout(r, 0));
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    it('should return cleanup function', () => {
      const count = signal(0);
      const cleanup = debug.trace(count);
      expect(typeof cleanup).toBe('function');
      cleanup();
    });
  });

  describe('debug.trackSignal()', () => {
    it('should track signal history', async () => {
      const count = signal(0);
      debug.trackSignal(count, 'count');

      count.value = 1;
      count.value = 2;

      await new Promise((r) => setTimeout(r, 10));
      const history = debug.getSignalHistory(count);
      expect(history).not.toBeNull();
      expect(history!.length).toBeGreaterThan(1);
    });
  });

  describe('debug.logRenders()', () => {
    it('should enable render tracking', () => {
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
      debug.logRenders('test-component');
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  describe('debug.inspectState()', () => {
    it('should inspect component state', () => {
      const spy = vi.spyOn(console, 'group').mockImplementation(() => {});
      const state = { count: signal(0), name: signal('test') };

      debug.inspectState(state, 'TestComponent');
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  describe('createDebugLogger()', () => {
    it('should create scoped logger', () => {
      const log = createDebugLogger('MyComponent');
      expect(log.trace).toBeDefined();
      expect(log.logRenders).toBeDefined();
      expect(log.inspectState).toBeDefined();
    });
  });

  describe('Performance Tracking', () => {
    it('should create performance marks', () => {
      if (typeof performance !== 'undefined') {
        debug.mark('test-start');
        debug.mark('test-end');
        debug.measure('test', 'test-start', 'test-end');

        const measures = performance.getEntriesByName('test');
        expect(measures.length).toBeGreaterThan(0);
      }
    });
  });
});

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { queryAllLiveRegions, queryLiveRegion, waitForLiveRegion, waitForLiveRegionCleared } from '../live-region';

describe('live-region helpers', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  describe('queryLiveRegion', () => {
    it('returns null when no live region exists', () => {
      expect(queryLiveRegion()).toBeNull();
    });

    it('finds a polite live region', () => {
      const el = document.createElement('div');

      el.setAttribute('aria-live', 'polite');
      el.setAttribute('role', 'status');
      container.appendChild(el);

      expect(queryLiveRegion()).toBe(el);
    });

    it('finds an assertive live region', () => {
      const el = document.createElement('div');

      el.setAttribute('aria-live', 'assertive');
      el.setAttribute('role', 'alert');
      container.appendChild(el);

      expect(queryLiveRegion({ politeness: 'assertive' })).toBe(el);
    });

    it('filters by role', () => {
      const status = document.createElement('div');

      status.setAttribute('aria-live', 'polite');
      status.setAttribute('role', 'status');
      container.appendChild(status);

      const alert = document.createElement('div');

      alert.setAttribute('aria-live', 'polite');
      alert.setAttribute('role', 'alert');
      container.appendChild(alert);

      expect(queryLiveRegion({ role: 'alert' })).toBe(alert);
      expect(queryLiveRegion({ role: 'status' })).toBe(status);
    });

    it('scopes to a custom root', () => {
      const inner = document.createElement('div');

      inner.setAttribute('aria-live', 'polite');
      container.appendChild(inner);

      expect(queryLiveRegion({ root: container })).toBe(inner);
      expect(queryLiveRegion({ root: document.createElement('div') })).toBeNull();
    });

    it('ignores aria-live="off"', () => {
      const el = document.createElement('div');

      el.setAttribute('aria-live', 'off');
      container.appendChild(el);

      expect(queryLiveRegion()).toBeNull();
    });

    it('finds implicit polite live region via role="status" (no explicit aria-live)', () => {
      const el = document.createElement('div');

      el.setAttribute('role', 'status');
      container.appendChild(el);

      expect(queryLiveRegion({ politeness: 'polite' })).toBe(el);
    });

    it('finds implicit assertive live region via role="alert" (no explicit aria-live)', () => {
      const el = document.createElement('div');

      el.setAttribute('role', 'alert');
      container.appendChild(el);

      expect(queryLiveRegion({ politeness: 'assertive' })).toBe(el);
    });

    it('explicit aria-live wins over implicit role politeness', () => {
      const el = document.createElement('div');

      el.setAttribute('role', 'status');
      el.setAttribute('aria-live', 'assertive');
      container.appendChild(el);

      expect(queryLiveRegion({ politeness: 'assertive' })).toBe(el);
      expect(queryLiveRegion({ politeness: 'polite' })).toBeNull();
    });
  });

  describe('queryAllLiveRegions', () => {
    it('returns all matching regions', () => {
      const a = document.createElement('div');

      a.setAttribute('aria-live', 'polite');
      container.appendChild(a);

      const b = document.createElement('div');

      b.setAttribute('aria-live', 'polite');
      container.appendChild(b);

      const c = document.createElement('div');

      c.setAttribute('aria-live', 'assertive');
      container.appendChild(c);

      expect(queryAllLiveRegions({ politeness: 'polite' })).toHaveLength(2);
      expect(queryAllLiveRegions({ politeness: 'assertive' })).toHaveLength(1);
    });
  });

  describe('waitForLiveRegion', () => {
    it('resolves immediately when the region already has the text', async () => {
      const el = document.createElement('div');

      el.setAttribute('aria-live', 'polite');
      el.textContent = '3 results found';
      container.appendChild(el);

      const result = await waitForLiveRegion('3 results found', { timeout: 100 });

      expect(result).toBe(el);
    });

    it('resolves after the text appears (clear-then-set pattern)', async () => {
      const el = document.createElement('div');

      el.setAttribute('aria-live', 'polite');
      el.textContent = '';
      container.appendChild(el);

      setTimeout(() => {
        el.textContent = 'Saved';
      }, 20);

      const result = await waitForLiveRegion('Saved', { interval: 10, timeout: 200 });

      expect(result).toBe(el);
    });

    it('throws on timeout when text never appears', async () => {
      const el = document.createElement('div');

      el.setAttribute('aria-live', 'polite');
      el.textContent = 'wrong';
      container.appendChild(el);

      await expect(waitForLiveRegion('expected', { interval: 10, timeout: 50 })).rejects.toThrow();
    });

    it('throws on timeout when no region exists', async () => {
      await expect(waitForLiveRegion('anything', { interval: 10, timeout: 50 })).rejects.toThrow();
    });

    it('matches assertive politeness', async () => {
      const el = document.createElement('div');

      el.setAttribute('aria-live', 'assertive');
      el.textContent = 'Error!';
      container.appendChild(el);

      const result = await waitForLiveRegion('Error!', { politeness: 'assertive', timeout: 100 });

      expect(result).toBe(el);
    });
  });

  describe('waitForLiveRegionCleared', () => {
    it('resolves when the region is empty', async () => {
      const el = document.createElement('div');

      el.setAttribute('aria-live', 'polite');
      el.textContent = 'message';
      container.appendChild(el);

      setTimeout(() => {
        el.textContent = '';
      }, 20);

      await waitForLiveRegionCleared({ interval: 10, timeout: 200 });
    });

    it('throws on timeout when region is not cleared', async () => {
      const el = document.createElement('div');

      el.setAttribute('aria-live', 'polite');
      el.textContent = 'persistent';
      container.appendChild(el);

      await expect(waitForLiveRegionCleared({ interval: 10, timeout: 50 })).rejects.toThrow();
    });
  });
});

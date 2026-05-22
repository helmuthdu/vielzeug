import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { announce } from '../announcer';

// ── Helpers ───────────────────────────────────────────────────────────────────

const getRegion = (politeness: 'assertive' | 'polite'): HTMLElement | null =>
  document.querySelector(`[data-buildit-announcer="${politeness}"]`);

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('announce()', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    // Remove all announcer regions so each test starts with a clean DOM.
    document.querySelectorAll('[data-buildit-announcer]').forEach((el) => el.remove());
    vi.useRealTimers();
  });

  describe('live region creation', () => {
    it('lazily creates a polite live region on first call', () => {
      expect(getRegion('polite')).toBeNull();

      announce('Hello');

      expect(getRegion('polite')).not.toBeNull();
    });

    it('creates an assertive live region when requested', () => {
      expect(getRegion('assertive')).toBeNull();

      announce('Error!', { politeness: 'assertive' });

      expect(getRegion('assertive')).not.toBeNull();
    });

    it('live region has correct aria-live attribute', () => {
      announce('test');
      announce('test', { politeness: 'assertive' });

      expect(getRegion('polite')?.getAttribute('aria-live')).toBe('polite');
      expect(getRegion('assertive')?.getAttribute('aria-live')).toBe('assertive');
    });

    it('live region has aria-atomic="true"', () => {
      announce('test');

      expect(getRegion('polite')?.getAttribute('aria-atomic')).toBe('true');
    });

    it('reuses the singleton region on subsequent calls', () => {
      announce('first');
      announce('second');

      expect(document.querySelectorAll('[data-buildit-announcer="polite"]')).toHaveLength(1);
    });
  });

  describe('clear-then-set pattern', () => {
    it('clears the region immediately and sets message after 50 ms', () => {
      announce('Hello');

      const region = getRegion('polite')!;

      // Immediately: region is cleared (empty).
      expect(region.textContent).toBe('');

      // After 50 ms delay: message is set.
      vi.advanceTimersByTime(50);
      expect(region.textContent).toBe('Hello');
    });

    it('sets polite message by default', () => {
      announce('Polite message');

      vi.advanceTimersByTime(50);

      expect(getRegion('polite')?.textContent).toBe('Polite message');
      expect(getRegion('assertive')).toBeNull();
    });

    it('sets assertive message when politeness is assertive', () => {
      announce('Assertive message', { politeness: 'assertive' });

      vi.advanceTimersByTime(50);

      expect(getRegion('assertive')?.textContent).toBe('Assertive message');
      expect(getRegion('polite')).toBeNull();
    });

    it('debounces rapid consecutive calls — only last message appears', () => {
      announce('first');
      vi.advanceTimersByTime(20);
      announce('second');
      vi.advanceTimersByTime(20);
      announce('third');

      vi.advanceTimersByTime(50);

      expect(getRegion('polite')?.textContent).toBe('third');
    });

    it('polite and assertive timers are independent — both messages appear', () => {
      announce('status update');
      announce('error!', { politeness: 'assertive' });

      vi.advanceTimersByTime(50);

      // Both regions should have their message; one does not clobber the other.
      expect(getRegion('polite')?.textContent).toBe('status update');
      expect(getRegion('assertive')?.textContent).toBe('error!');
    });

    it('can re-announce the same message by clearing first', () => {
      announce('repeat');
      vi.advanceTimersByTime(50);

      announce('repeat');

      // Region should be cleared before the delay fires.
      expect(getRegion('polite')?.textContent).toBe('');

      vi.advanceTimersByTime(50);

      expect(getRegion('polite')?.textContent).toBe('repeat');
    });
  });

  describe('region cleanup (DOM removal)', () => {
    it('removes polite live region from DOM when element is removed', () => {
      announce('test');

      expect(getRegion('polite')).not.toBeNull();

      document.querySelectorAll('[data-buildit-announcer]').forEach((el) => el.remove());

      expect(getRegion('polite')).toBeNull();
    });

    it('removes assertive live region from DOM when element is removed', () => {
      announce('test', { politeness: 'assertive' });

      expect(getRegion('assertive')).not.toBeNull();

      document.querySelectorAll('[data-buildit-announcer]').forEach((el) => el.remove());

      expect(getRegion('assertive')).toBeNull();
    });

    it('creating fresh regions after cleanup works', () => {
      announce('first round');
      vi.advanceTimersByTime(50);

      document.querySelectorAll('[data-buildit-announcer]').forEach((el) => el.remove());

      announce('second round');
      vi.advanceTimersByTime(50);

      expect(getRegion('polite')?.textContent).toBe('second round');
    });
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { announce } from '../announcer';

// ── Helpers ───────────────────────────────────────────────────────────────────

const getRegion = (politeness: 'assertive' | 'polite', doc: Document = document): HTMLElement | null =>
  doc.querySelector(`[data-block-announcer="${politeness}"]`);

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('announce()', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    // Remove all announcer regions so each test starts with a clean DOM.
    document.querySelectorAll('[data-block-announcer]').forEach((el) => {
      el.remove();
    });
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

      expect(document.querySelectorAll('[data-block-announcer="polite"]')).toHaveLength(1);
    });
  });

  describe('latest-value replacement (debounce)', () => {
    it('clears the region immediately and sets message after a short delay', () => {
      announce('Hello');

      const region = getRegion('polite')!;

      // Immediately: region is cleared (empty).
      expect(region.textContent).toBe('');

      // After delay: message is set.
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

    it('rapid consecutive calls — only last message survives', () => {
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

  describe('document-scoped regions', () => {
    it('creates regions in the specified document, not the global one', () => {
      const iframe = document.createElement('iframe');

      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentDocument!;

      announce('iframe message', { document: iframeDoc });

      vi.advanceTimersByTime(50);

      expect(iframeDoc.querySelector('[data-block-announcer="polite"]')).not.toBeNull();
      expect(getRegion('polite')).toBeNull();

      iframe.remove();
    });

    it('default uses the global document', () => {
      announce('global message');

      expect(getRegion('polite')).not.toBeNull();
    });

    it('separate documents maintain independent regions', () => {
      const iframe = document.createElement('iframe');

      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentDocument!;

      announce('global', { politeness: 'polite' });
      announce('iframe', { document: iframeDoc, politeness: 'polite' });

      vi.advanceTimersByTime(50);

      expect(getRegion('polite')?.textContent).toBe('global');
      expect(iframeDoc.querySelector('[data-block-announcer="polite"]')?.textContent).toBe('iframe');

      iframe.remove();
    });
  });

  describe('region cleanup (DOM removal)', () => {
    it('removes polite live region from DOM when element is removed', () => {
      announce('test');

      expect(getRegion('polite')).not.toBeNull();

      document.querySelectorAll('[data-block-announcer]').forEach((el) => {
        el.remove();
      });

      expect(getRegion('polite')).toBeNull();
    });

    it('removes assertive live region from DOM when element is removed', () => {
      announce('test', { politeness: 'assertive' });

      expect(getRegion('assertive')).not.toBeNull();

      document.querySelectorAll('[data-block-announcer]').forEach((el) => {
        el.remove();
      });

      expect(getRegion('assertive')).toBeNull();
    });

    it('creating fresh regions after cleanup works', () => {
      announce('first round');
      vi.advanceTimersByTime(50);

      document.querySelectorAll('[data-block-announcer]').forEach((el) => {
        el.remove();
      });

      announce('second round');
      vi.advanceTimersByTime(50);

      expect(getRegion('polite')?.textContent).toBe('second round');
    });
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createFocusManager } from '../focus';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeHost(): HTMLElement {
  return document.createElement('div');
}

function makeOptions(
  overrides: Partial<Parameters<typeof createFocusManager>[0]> = {},
): Parameters<typeof createFocusManager>[0] {
  const host = makeHost();

  return {
    getInitialFocusSelector: () => undefined,
    getReturnFocus: () => true,
    host,
    ...overrides,
  };
}

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('createFocusManager', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('captureReturnFocus + restoreFocus', () => {
    it('restores focus to the element that was focused at capture time', () => {
      const trigger = document.createElement('button');

      document.body.appendChild(trigger);
      trigger.focus();

      const manager = createFocusManager(makeOptions());

      manager.captureReturnFocus();

      // Move focus away
      const other = document.createElement('button');

      document.body.appendChild(other);
      other.focus();

      expect(document.activeElement).toBe(other);

      manager.restoreFocus();

      expect(document.activeElement).toBe(trigger);

      document.body.removeChild(trigger);
      document.body.removeChild(other);
    });

    it('does not restore focus when getReturnFocus returns false', () => {
      const trigger = document.createElement('button');

      document.body.appendChild(trigger);
      trigger.focus();

      const manager = createFocusManager(makeOptions({ getReturnFocus: () => false }));

      manager.captureReturnFocus();

      const other = document.createElement('button');

      document.body.appendChild(other);
      other.focus();

      manager.restoreFocus();

      // Focus should remain on `other`, not restored to `trigger`
      expect(document.activeElement).toBe(other);

      document.body.removeChild(trigger);
      document.body.removeChild(other);
    });

    it('is a no-op when captureReturnFocus was never called', () => {
      const manager = createFocusManager(makeOptions());

      // Should not throw
      expect(() => manager.restoreFocus()).not.toThrow();
    });
  });

  describe('applyInitialFocus', () => {
    it('focuses the element matching getInitialFocusSelector after a frame', async () => {
      const host = makeHost();
      const target = document.createElement('button');

      target.setAttribute('data-testid', 'initial');
      host.appendChild(target);
      document.body.appendChild(host);

      const manager = createFocusManager({
        getInitialFocusSelector: () => '[data-testid="initial"]',
        getReturnFocus: () => true,
        host,
      });

      manager.applyInitialFocus();

      // Focus is deferred via requestAnimationFrame
      await vi.runAllTimersAsync();

      expect(document.activeElement).toBe(target);

      document.body.removeChild(host);
    });

    it('does nothing when selector matches no element', async () => {
      const host = makeHost();
      const manager = createFocusManager({
        getInitialFocusSelector: () => '[data-nonexistent]',
        getReturnFocus: () => true,
        host,
      });

      manager.applyInitialFocus();
      await vi.runAllTimersAsync();

      // No throw, no focus change
      expect(document.activeElement).toBe(document.body);
    });

    it('does nothing when selector is undefined', async () => {
      const manager = createFocusManager(makeOptions({ getInitialFocusSelector: () => undefined }));

      manager.applyInitialFocus();
      await vi.runAllTimersAsync();

      expect(document.activeElement).toBe(document.body);
    });
  });
});

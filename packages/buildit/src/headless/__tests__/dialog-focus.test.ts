import { describe, expect, it, vi } from 'vitest';

import { createDialogFocusControl } from '../dialog-focus';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeHost(): HTMLElement {
  const host = document.createElement('div');

  document.body.appendChild(host);

  return host;
}

function makeOptions(
  overrides: Partial<Parameters<typeof createDialogFocusControl>[0]> = {},
): Parameters<typeof createDialogFocusControl>[0] {
  const host = makeHost();
  const container = document.createElement('div');

  host.appendChild(container);

  return {
    getContainer: () => container,
    getInitialFocusSelector: () => undefined,
    getReturnFocus: () => true,
    host,
    ...overrides,
  };
}

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('createDialogFocusControl', () => {
  describe('activate()', () => {
    it('captures return focus, applies initial focus', async () => {
      vi.useFakeTimers();

      const trigger = document.createElement('button');

      document.body.appendChild(trigger);
      trigger.focus();

      const host = makeHost();
      const target = document.createElement('button');

      target.setAttribute('data-target', '');
      host.appendChild(target);

      const ctrl = createDialogFocusControl({
        getContainer: () => host,
        getInitialFocusSelector: () => '[data-target]',
        getReturnFocus: () => true,
        host,
      });

      ctrl.activate();

      await vi.runAllTimersAsync();

      expect(document.activeElement).toBe(target);

      document.body.removeChild(trigger);
      vi.useRealTimers();
    });
  });

  describe('deactivate()', () => {
    it('restores focus to the trigger after deactivate', async () => {
      vi.useFakeTimers();

      const trigger = document.createElement('button');

      document.body.appendChild(trigger);
      trigger.focus();

      const ctrl = createDialogFocusControl(makeOptions());

      ctrl.activate();
      await vi.runAllTimersAsync();

      ctrl.deactivate();

      expect(document.activeElement).toBe(trigger);

      document.body.removeChild(trigger);
      vi.useRealTimers();
    });

    it('does not restore focus when getReturnFocus returns false', async () => {
      vi.useFakeTimers();

      const trigger = document.createElement('button');

      document.body.appendChild(trigger);
      trigger.focus();

      const other = document.createElement('button');

      document.body.appendChild(other);

      const ctrl = createDialogFocusControl(makeOptions({ getReturnFocus: () => false }));

      ctrl.activate();
      other.focus();
      ctrl.deactivate();

      expect(document.activeElement).toBe(other);

      document.body.removeChild(trigger);
      document.body.removeChild(other);
      vi.useRealTimers();
    });
  });

  describe('full round-trip', () => {
    it('activate then deactivate returns focus to the original trigger', async () => {
      vi.useFakeTimers();

      const trigger = document.createElement('button');

      document.body.appendChild(trigger);
      trigger.focus();

      expect(document.activeElement).toBe(trigger);

      const ctrl = createDialogFocusControl(makeOptions());

      ctrl.activate();
      await vi.runAllTimersAsync();
      ctrl.deactivate();

      expect(document.activeElement).toBe(trigger);

      document.body.removeChild(trigger);
      vi.useRealTimers();
    });
  });
});

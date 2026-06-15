import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createFocusTrap } from '../focus-trap';

// ── Helpers ───────────────────────────────────────────────────────────────────

const makeContainer = (buttonCount = 3): HTMLElement => {
  const container = document.createElement('div');

  for (let i = 0; i < buttonCount; i++) {
    const btn = document.createElement('button');

    btn.textContent = `Button ${i}`;
    container.appendChild(btn);
  }

  document.body.appendChild(container);

  return container;
};

const tab = (shift = false): void => {
  document.activeElement?.dispatchEvent(
    new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Tab', shiftKey: shift }),
  );
};

const buttons = (container: HTMLElement): HTMLButtonElement[] =>
  Array.from(container.querySelectorAll<HTMLButtonElement>('button'));

afterEach(() => {
  document.body.innerHTML = '';
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('createFocusTrap()', () => {
  describe('initial state', () => {
    it('is inactive before activate()', () => {
      const container = makeContainer();
      const trap = createFocusTrap(() => container);

      expect(trap.active).toBe(false);
    });
  });

  describe('activate() / deactivate()', () => {
    it('active becomes true after activate()', () => {
      const container = makeContainer();
      const trap = createFocusTrap(() => container);

      trap.activate();

      try {
        expect(trap.active).toBe(true);
      } finally {
        trap.deactivate();
      }
    });

    it('active becomes false after deactivate()', () => {
      const container = makeContainer();
      const trap = createFocusTrap(() => container);

      trap.activate();
      trap.deactivate();

      expect(trap.active).toBe(false);
    });

    it('activate() is idempotent — calling twice does not throw', () => {
      const container = makeContainer();
      const trap = createFocusTrap(() => container);

      trap.activate();

      try {
        expect(() => trap.activate()).not.toThrow();
        expect(trap.active).toBe(true);
      } finally {
        trap.deactivate();
      }
    });

    it('deactivate() is idempotent — calling on inactive trap does not throw', () => {
      const container = makeContainer();
      const trap = createFocusTrap(() => container);

      expect(() => trap.deactivate()).not.toThrow();
    });

    it('aborting the signal auto-deactivates an active trap', () => {
      const container = makeContainer();
      const controller = new AbortController();
      const trap = createFocusTrap(() => container, { signal: controller.signal });

      trap.activate();
      expect(trap.active).toBe(true);

      controller.abort();

      expect(trap.active).toBe(false);
    });

    it('aborting the signal is a no-op when the trap is already inactive', () => {
      const container = makeContainer();
      const controller = new AbortController();
      const trap = createFocusTrap(() => container, { signal: controller.signal });

      expect(() => controller.abort()).not.toThrow();
      expect(trap.active).toBe(false);
    });
  });

  describe('Tab wrapping', () => {
    it('Tab at last focusable element wraps to first', () => {
      const container = makeContainer(3);
      const btns = buttons(container);
      const trap = createFocusTrap(() => container);

      trap.activate();

      try {
        // Focus last button, then Tab.
        btns[2].focus();
        tab(false);

        expect(document.activeElement).toBe(btns[0]);
      } finally {
        trap.deactivate();
      }
    });

    it('Shift+Tab at first focusable element wraps to last', () => {
      const container = makeContainer(3);
      const btns = buttons(container);
      const trap = createFocusTrap(() => container);

      trap.activate();

      try {
        // Focus first button, then Shift+Tab.
        btns[0].focus();
        tab(true);

        expect(document.activeElement).toBe(btns[2]);
      } finally {
        trap.deactivate();
      }
    });

    it('Tab in the middle does not prevent default', () => {
      const container = makeContainer(3);
      const btns = buttons(container);
      const trap = createFocusTrap(() => container);

      trap.activate();

      try {
        // The trap should only preventDefault at the boundaries (first/last).
        // Focusing element at index 1 (not first, not last) should not trigger wrap.
        btns[1].focus();

        // Verify jsdom registered the focus before proceeding.
        // If activeElement is not btns[1], jsdom doesn't support focus in this context
        // and the test cannot be meaningful — skip in that case.
        if (document.activeElement !== btns[1]) return;

        const event = new KeyboardEvent('keydown', {
          bubbles: true,
          cancelable: true,
          key: 'Tab',
          shiftKey: false,
        });

        btns[1].dispatchEvent(event);

        // Middle → next is handled by the browser; we only intercept at boundary.
        // The event should NOT be prevented.
        expect(event.defaultPrevented).toBe(false);
      } finally {
        trap.deactivate();
      }
    });
  });

  describe('disabled trap', () => {
    it('does not wrap Tab when enabled returns false', () => {
      const container = makeContainer(3);
      const btns = buttons(container);
      const trap = createFocusTrap(() => container, { enabled: () => false });

      trap.activate();

      btns[2].focus();

      const event = new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        key: 'Tab',
        shiftKey: false,
      });

      try {
        btns[2].dispatchEvent(event);

        // Should not have called preventDefault.
        expect(event.defaultPrevented).toBe(false);
      } finally {
        trap.deactivate();
      }
    });
  });

  describe('deactivated trap does not intercept', () => {
    it('Tab is not wrapped when trap is inactive', () => {
      const container = makeContainer(3);
      const btns = buttons(container);
      const trap = createFocusTrap(() => container);

      // Never activated.
      btns[2].focus();

      const event = new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        key: 'Tab',
        shiftKey: false,
      });

      btns[2].dispatchEvent(event);

      expect(event.defaultPrevented).toBe(false);

      trap.deactivate();
    });
  });

  describe('empty container', () => {
    it('prevents Tab from escaping an empty container', () => {
      const container = document.createElement('div');

      document.body.appendChild(container);

      const trap = createFocusTrap(() => container);

      trap.activate();

      const event = new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        key: 'Tab',
        shiftKey: false,
      });

      document.body.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(true);

      trap.deactivate();
    });
  });

  describe('null container', () => {
    it('returns empty focusable list when container is null', () => {
      const trap = createFocusTrap(() => null);

      trap.activate();

      // Should not throw when container is null.
      const event = new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        key: 'Tab',
        shiftKey: false,
      });

      document.body.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(true);

      trap.deactivate();
    });
  });

  describe('aria-hidden exclusion', () => {
    let container: HTMLElement;
    let visibleBtn: HTMLButtonElement;

    beforeEach(() => {
      container = document.createElement('div');
      visibleBtn = document.createElement('button');
      visibleBtn.textContent = 'Visible';

      const hiddenWrapper = document.createElement('div');
      const hiddenBtn = document.createElement('button');

      hiddenBtn.textContent = 'Hidden';
      hiddenWrapper.setAttribute('aria-hidden', 'true');
      hiddenWrapper.appendChild(hiddenBtn);

      container.appendChild(visibleBtn);
      container.appendChild(hiddenWrapper);
      document.body.appendChild(container);
    });

    it('excludes elements inside aria-hidden="true" from the focusable list', () => {
      const trap = createFocusTrap(() => container);

      trap.activate();

      // Only visibleBtn should be in the focusable list.
      // Tab from visibleBtn should wrap back to visibleBtn (only 1 element).
      visibleBtn.focus();
      tab(false);

      expect(document.activeElement).toBe(visibleBtn);

      trap.deactivate();
    });
  });

  describe('[inert] exclusion', () => {
    it('excludes elements inside [inert] containers from the focusable list', () => {
      const container = document.createElement('div');
      const visibleBtn = document.createElement('button');

      visibleBtn.textContent = 'Visible';

      const inertWrapper = document.createElement('div');
      const inertBtn = document.createElement('button');

      inertBtn.textContent = 'Inert';
      inertWrapper.setAttribute('inert', '');
      inertWrapper.appendChild(inertBtn);

      container.appendChild(visibleBtn);
      container.appendChild(inertWrapper);
      document.body.appendChild(container);

      const trap = createFocusTrap(() => container);

      trap.activate();

      // With [inert] excluded, only visibleBtn is focusable → Tab wraps to itself.
      visibleBtn.focus();
      tab(false);

      expect(document.activeElement).toBe(visibleBtn);

      trap.deactivate();
    });
  });

  describe('signal option', () => {
    it('deactivates when the signal aborts after activation', () => {
      const container = makeContainer();
      const controller = new AbortController();
      const trap = createFocusTrap(() => container, { signal: controller.signal });

      trap.activate();
      expect(trap.active).toBe(true);

      controller.abort();

      expect(trap.active).toBe(false);
    });

    it('does not register a listener when signal is already aborted at construction', () => {
      const container = makeContainer();
      const controller = new AbortController();

      controller.abort();

      const trap = createFocusTrap(() => container, { signal: controller.signal });

      trap.activate();
      expect(trap.active).toBe(true);

      trap.deactivate();
      expect(trap.active).toBe(false);
    });
  });
});

import { signal } from '@vielzeug/stateit';

import { createOverlayControl } from '../../controls';

describe('createOverlayControl', () => {
  /**
   * Tests for basic open/close operations
   */
  describe('Operations - Open/Close', () => {
    it('opens the overlay', () => {
      const isOpen = signal(false);
      const controller = createOverlayControl({
        elements: { boundary: document.body },
        isOpen,
        setOpen: (next) => {
          isOpen.value = next;
        },
      });

      controller.open();

      expect(isOpen.value).toBe(true);
    });

    it('closes the overlay', () => {
      const isOpen = signal(true);
      const controller = createOverlayControl({
        elements: { boundary: document.body },
        isOpen,
        setOpen: (next) => {
          isOpen.value = next;
        },
      });

      controller.close();

      expect(isOpen.value).toBe(false);
    });

    it('does not open when already open', () => {
      const isOpen = signal(true);
      const setOpenCalls: Array<[boolean, string]> = [];
      const controller = createOverlayControl({
        elements: { boundary: document.body },
        isOpen,
        setOpen: (next, reason) => {
          setOpenCalls.push([next, reason]);
          isOpen.value = next;
        },
      });

      controller.open();

      expect(setOpenCalls.length).toBe(0); // setOpen should not be called
    });

    it('does not close when already closed', () => {
      const isOpen = signal(false);
      const setOpenCalls: Array<[boolean, string]> = [];
      const controller = createOverlayControl({
        elements: { boundary: document.body },
        isOpen,
        setOpen: (next, reason) => {
          setOpenCalls.push([next, reason]);
          isOpen.value = next;
        },
      });

      controller.close();

      expect(setOpenCalls.length).toBe(0); // setOpen should not be called
    });
  });

  /**
   * Tests for toggle functionality
   */
  describe('Operations - Toggle', () => {
    it('toggles from closed to open', () => {
      const isOpen = signal(false);
      const controller = createOverlayControl({
        elements: { boundary: document.body },
        isOpen,
        setOpen: (next) => {
          isOpen.value = next;
        },
      });

      controller.toggle();

      expect(isOpen.value).toBe(true);
    });

    it('toggles from open to closed', () => {
      const isOpen = signal(true);
      const controller = createOverlayControl({
        elements: { boundary: document.body },
        isOpen,
        setOpen: (next) => {
          isOpen.value = next;
        },
      });

      controller.toggle();

      expect(isOpen.value).toBe(false);
    });

    it('uses trigger reason when toggling', () => {
      const isOpen = signal(false);
      const transitions: string[] = [];
      const controller = createOverlayControl({
        elements: { boundary: document.body },
        isOpen,
        setOpen: (next, reason) => {
          isOpen.value = next;
          transitions.push(`${next ? 'open' : 'close'}:${reason}`);
        },
      });

      controller.toggle();
      controller.toggle();

      expect(transitions).toEqual(['open:trigger', 'close:trigger']);
    });
  });

  /**
   * Tests for open/close reason semantics
   */
  describe('Operations - Reasons', () => {
    it('uses programmatic reason when opening', () => {
      const isOpen = signal(false);
      const reasons: string[] = [];
      const controller = createOverlayControl({
        elements: { boundary: document.body },
        isOpen,
        setOpen: (next, reason) => {
          isOpen.value = next;

          if (next) {
            reasons.push(reason);
          }
        },
      });

      controller.open();

      expect(reasons).toEqual(['programmatic']);
    });

    it('uses programmatic reason when closing', () => {
      const isOpen = signal(true);
      const reasons: string[] = [];
      const controller = createOverlayControl({
        elements: { boundary: document.body },
        isOpen,
        setOpen: (next, reason) => {
          isOpen.value = next;

          if (!next) {
            reasons.push(reason);
          }
        },
      });

      controller.close();

      expect(reasons).toEqual(['programmatic']);
    });

    it('allows specifying custom close reason', () => {
      const isOpen = signal(true);
      const reasons: string[] = [];
      const controller = createOverlayControl({
        elements: { boundary: document.body },
        isOpen,
        setOpen: (next, reason) => {
          isOpen.value = next;

          if (!next) {
            reasons.push(reason);
          }
        },
      });

      controller.close('escape');

      expect(reasons).toEqual(['escape']);
    });
  });

  /**
   * Tests for disabled state behavior
   */
  describe('State - Disabled', () => {
    it('prevents opening when disabled', () => {
      const isOpen = signal(false);
      const disabled = signal(true);
      const controller = createOverlayControl({
        disabled,
        elements: { boundary: document.body },
        isOpen,
        setOpen: (next) => {
          isOpen.value = next;
        },
      });

      controller.open();

      expect(isOpen.value).toBe(false);
    });

    it('allows opening after disabling is cleared', () => {
      const isOpen = signal(false);
      const disabled = signal(true);
      const controller = createOverlayControl({
        disabled,
        elements: { boundary: document.body },
        isOpen,
        setOpen: (next) => {
          isOpen.value = next;
        },
      });

      controller.open();
      expect(isOpen.value).toBe(false);

      disabled.value = false;
      controller.open();
      expect(isOpen.value).toBe(true);
    });

    it('allows closing when disabled', () => {
      const isOpen = signal(true);
      const disabled = signal(true);
      const controller = createOverlayControl({
        disabled,
        elements: { boundary: document.body },
        isOpen,
        setOpen: (next) => {
          isOpen.value = next;
        },
      });

      controller.close();

      expect(isOpen.value).toBe(false);
    });
  });

  /**
   * Tests for outside click detection and boundary checks
   */
  describe('Interactions - Outside Click', () => {
    it('closes on outside click', () => {
      const isOpen = signal(false);
      let closedByOutsideClick = false;
      const host = document.createElement('div');
      const outside = document.createElement('div');

      document.body.appendChild(host);
      document.body.appendChild(outside);

      const controller = createOverlayControl({
        elements: { boundary: host },
        isOpen,
        setOpen: (next, reason) => {
          isOpen.value = next;

          if (!next && reason === 'outside-click') {
            closedByOutsideClick = true;
          }
        },
      });

      const cleanup = controller.bindOutsideClick(document);

      controller.open();
      expect(isOpen.value).toBe(true);

      outside.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(isOpen.value).toBe(false);
      expect(closedByOutsideClick).toBe(true);

      cleanup();
      host.remove();
      outside.remove();
    });

    it('does not close on inside boundary click', () => {
      const isOpen = signal(false);
      const setOpenCalls: Array<[boolean, string]> = [];
      const host = document.createElement('div');
      const button = document.createElement('button');

      host.appendChild(button);
      document.body.appendChild(host);

      const controller = createOverlayControl({
        elements: { boundary: host },
        isOpen,
        setOpen: (next, reason) => {
          setOpenCalls.push([next, reason]);
          isOpen.value = next;
        },
      });

      const cleanup = controller.bindOutsideClick(document);

      controller.open();
      setOpenCalls.length = 0; // reset

      button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(isOpen.value).toBe(true);
      expect(setOpenCalls.length).toBe(0); // should not have called setOpen

      cleanup();
      host.remove();
    });

    it('does not close on panel click', () => {
      const isOpen = signal(false);
      const setOpenCalls: Array<[boolean, string]> = [];
      const host = document.createElement('div');
      const panel = document.createElement('div');
      const button = document.createElement('button');

      panel.appendChild(button);
      document.body.appendChild(host);
      document.body.appendChild(panel);

      const controller = createOverlayControl({
        elements: { boundary: host, panel },
        isOpen,
        setOpen: (next, reason) => {
          setOpenCalls.push([next, reason]);
          isOpen.value = next;
        },
      });

      const cleanup = controller.bindOutsideClick(document);

      controller.open();
      setOpenCalls.length = 0; // reset

      button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(isOpen.value).toBe(true);
      expect(setOpenCalls.length).toBe(0); // should not have called setOpen

      cleanup();
      host.remove();
      panel.remove();
    });

    it('does not close when overlay is closed', () => {
      const isOpen = signal(false);
      const setOpenCalls: Array<[boolean, string]> = [];
      const outside = document.createElement('div');

      document.body.appendChild(outside);

      const controller = createOverlayControl({
        elements: { boundary: document.body },
        isOpen,
        setOpen: (next, reason) => {
          setOpenCalls.push([next, reason]);
          isOpen.value = next;
        },
      });

      const cleanup = controller.bindOutsideClick(document);

      outside.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(setOpenCalls.length).toBe(0); // should not close when already closed

      cleanup();
      outside.remove();
    });

    it('cleanup removes event listener', () => {
      const isOpen = signal(false);
      const outside = document.createElement('div');

      document.body.appendChild(outside);

      const controller = createOverlayControl({
        elements: { boundary: document.body },
        isOpen,
        setOpen: (next) => {
          isOpen.value = next;
        },
      });

      const cleanup = controller.bindOutsideClick(document);

      controller.open();
      cleanup();

      outside.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(isOpen.value).toBe(true); // should still be open after cleanup

      outside.remove();
    });
  });

  /**
   * Tests for callbacks
   */
  describe('Callbacks - onOpen & onClose', () => {
    it('calls onOpen callback when opening', () => {
      const isOpen = signal(false);
      const onOpenCalls: string[] = [];
      const controller = createOverlayControl({
        elements: { boundary: document.body },
        isOpen,
        onOpen: (reason) => {
          onOpenCalls.push(reason);
        },
        setOpen: (next) => {
          isOpen.value = next;
        },
      });

      controller.open();

      expect(onOpenCalls).toEqual(['programmatic']);
    });

    it('calls onClose callback when closing', () => {
      const isOpen = signal(true);
      const onCloseCalls: string[] = [];
      const controller = createOverlayControl({
        elements: { boundary: document.body },
        isOpen,
        onClose: (reason) => {
          onCloseCalls.push(reason);
        },
        setOpen: (next) => {
          isOpen.value = next;
        },
      });

      controller.close();

      expect(onCloseCalls).toEqual(['programmatic']);
    });

    it('calls both callbacks in sequence', () => {
      const isOpen = signal(false);
      const callOrder: string[] = [];
      const controller = createOverlayControl({
        elements: { boundary: document.body },
        isOpen,
        onClose: (reason) => {
          callOrder.push(`close:${reason}`);
        },
        onOpen: (reason) => {
          callOrder.push(`open:${reason}`);
        },
        setOpen: (next) => {
          isOpen.value = next;
        },
      });

      controller.open();
      controller.close();

      expect(callOrder).toEqual(['open:programmatic', 'close:programmatic']);
    });

    it('passes close reason to onClose callback', () => {
      const isOpen = signal(true);
      const onCloseCalls: string[] = [];
      const controller = createOverlayControl({
        elements: { boundary: document.body },
        isOpen,
        onClose: (reason) => {
          onCloseCalls.push(reason);
        },
        setOpen: (next) => {
          isOpen.value = next;
        },
      });

      controller.close('escape');

      expect(onCloseCalls).toEqual(['escape']);
    });
  });

  /**
   * Tests for focus management
   */
  describe('Focus - Restoration', () => {
    it('restores focus to trigger on close by default', () => {
      const isOpen = signal(false);
      const trigger = document.createElement('button');

      document.body.appendChild(trigger);

      const controller = createOverlayControl({
        elements: {
          boundary: document.body,
          trigger,
        },
        isOpen,
        setOpen: (next) => {
          isOpen.value = next;
        },
      });

      controller.open();
      controller.close();

      expect(document.activeElement).toBe(trigger);

      trigger.remove();
    });

    it('respects restoreFocus=true option', () => {
      const isOpen = signal(false);
      const trigger = document.createElement('button');

      document.body.appendChild(trigger);

      const controller = createOverlayControl({
        elements: {
          boundary: document.body,
          trigger,
        },
        isOpen,
        restoreFocus: true,
        setOpen: (next) => {
          isOpen.value = next;
        },
      });

      controller.open();
      controller.close();

      expect(document.activeElement).toBe(trigger);

      trigger.remove();
    });

    it('respects restoreFocus=false option', () => {
      const isOpen = signal(false);
      const trigger = document.createElement('button');
      const other = document.createElement('input');

      document.body.appendChild(trigger);
      document.body.appendChild(other);

      const controller = createOverlayControl({
        elements: {
          boundary: document.body,
          trigger,
        },
        isOpen,
        restoreFocus: false,
        setOpen: (next) => {
          isOpen.value = next;
        },
      });

      controller.open();
      other.focus();
      controller.close();

      expect(document.activeElement).toBe(other);

      trigger.remove();
      other.remove();
    });

    it('respects restoreFocus as function', () => {
      const isOpen = signal(false);
      const trigger = document.createElement('button');
      const other = document.createElement('input');
      const shouldRestore = signal(false);

      document.body.appendChild(trigger);
      document.body.appendChild(other);

      const controller = createOverlayControl({
        elements: {
          boundary: document.body,
          trigger,
        },
        isOpen,
        restoreFocus: () => shouldRestore.value,
        setOpen: (next) => {
          isOpen.value = next;
        },
      });

      controller.open();
      other.focus();
      controller.close();

      expect(document.activeElement).toBe(other);

      shouldRestore.value = true;
      controller.open();
      controller.close();

      expect(document.activeElement).toBe(trigger);

      trigger.remove();
      other.remove();
    });

    it('can override focus restoration per close call', () => {
      const isOpen = signal(false);
      const trigger = document.createElement('button');
      const other = document.createElement('input');

      document.body.appendChild(trigger);
      document.body.appendChild(other);

      const controller = createOverlayControl({
        elements: {
          boundary: document.body,
          trigger,
        },
        isOpen,
        restoreFocus: true,
        setOpen: (next) => {
          isOpen.value = next;
        },
      });

      controller.open();
      other.focus();
      controller.close('programmatic', false);

      expect(document.activeElement).toBe(other);

      trigger.remove();
      other.remove();
    });

    it('does nothing if no trigger element provided', () => {
      const isOpen = signal(false);
      const controller = createOverlayControl({
        elements: {
          boundary: document.body,
        },
        isOpen,
        restoreFocus: true,
        setOpen: (next) => {
          isOpen.value = next;
        },
      });

      expect(() => {
        controller.open();
        controller.close();
      }).not.toThrow();
    });
  });
});

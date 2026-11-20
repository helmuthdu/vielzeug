import { afterEach, describe, expect, it, vi } from 'vitest';

import { FocusConfigError } from '../errors.js';
import { createDismissal } from '../index';

// ── Helpers ───────────────────────────────────────────────────────────────────

const pointerDown = (target: EventTarget): void => {
  target.dispatchEvent(new Event('pointerdown', { bubbles: true, cancelable: true }));
};

const pressEscape = (doc: Document = document, options: { preventDefault?: boolean } = {}): KeyboardEvent => {
  const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Escape' });

  if (options.preventDefault) event.preventDefault();

  doc.dispatchEvent(event);

  return event;
};

// jsdom lacks PointerEvent; a plain Event still flows through the capture-phase
// listener, which only inspects composedPath() and target.
const fireOutside = (): void => {
  pointerDown(document.body);
};

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('createDismissal', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('validation', () => {
    it('throws FocusConfigError without getTargets', () => {
      const options = { isActive: () => true, onDismiss: () => {} } as never;

      expect(() => createDismissal(options)).toThrow(FocusConfigError);
    });

    it('throws FocusConfigError without isActive', () => {
      const options = { getTargets: () => [], onDismiss: () => {} } as never;

      expect(() => createDismissal(options)).toThrow(FocusConfigError);
    });

    it('throws FocusConfigError without onDismiss', () => {
      const options = { getTargets: () => [], isActive: () => true } as never;

      expect(() => createDismissal(options)).toThrow(FocusConfigError);
    });
  });

  describe('outside pointer', () => {
    it('dismisses with outsidePointer when a pointer begins outside all targets', () => {
      const panel = document.createElement('div');

      document.body.appendChild(panel);

      const onDismiss = vi.fn();
      const dismissal = createDismissal({ getTargets: () => [panel], isActive: () => true, onDismiss });

      fireOutside();

      expect(onDismiss).toHaveBeenCalledOnce();
      expect(onDismiss).toHaveBeenCalledWith('outsidePointer');

      dismissal.dispose();
    });

    it('does not dismiss when the pointer begins inside a target', () => {
      const panel = document.createElement('div');
      const inner = document.createElement('span');

      panel.appendChild(inner);
      document.body.appendChild(panel);

      const onDismiss = vi.fn();
      const dismissal = createDismissal({ getTargets: () => [panel], isActive: () => true, onDismiss });

      pointerDown(inner);

      expect(onDismiss).not.toHaveBeenCalled();

      dismissal.dispose();
    });

    it('does not dismiss when the pointer begins inside a shadow root of a target', () => {
      const host = document.createElement('div');
      const shadow = host.attachShadow({ mode: 'open' });
      const inside = document.createElement('button');

      shadow.appendChild(inside);
      document.body.appendChild(host);

      const onDismiss = vi.fn();
      const dismissal = createDismissal({ getTargets: () => [host], isActive: () => true, onDismiss });

      pointerDown(inside);

      expect(onDismiss).not.toHaveBeenCalled();

      dismissal.dispose();
    });

    it('ignores null and undefined targets', () => {
      const onDismiss = vi.fn();
      const dismissal = createDismissal({
        getTargets: () => [null, undefined],
        isActive: () => true,
        onDismiss,
      });

      fireOutside();

      expect(onDismiss).toHaveBeenCalledWith('outsidePointer');

      dismissal.dispose();
    });

    it('does nothing while inactive', () => {
      const onDismiss = vi.fn();
      const dismissal = createDismissal({ getTargets: () => [], isActive: () => false, onDismiss });

      fireOutside();

      expect(onDismiss).not.toHaveBeenCalled();

      dismissal.dispose();
    });
  });

  describe('escape', () => {
    it('does not listen for Escape unless enabled', () => {
      const onDismiss = vi.fn();
      const dismissal = createDismissal({ getTargets: () => [], isActive: () => true, onDismiss });

      pressEscape();

      expect(onDismiss).not.toHaveBeenCalled();

      dismissal.dispose();
    });

    it('dismisses with escape when enabled and active', () => {
      const onDismiss = vi.fn();
      const dismissal = createDismissal({
        escape: true,
        getTargets: () => [],
        isActive: () => true,
        onDismiss,
      });

      const event = pressEscape();

      expect(onDismiss).toHaveBeenCalledWith('escape');
      expect(event.defaultPrevented).toBe(true);

      dismissal.dispose();
    });

    it('does nothing on Escape while inactive', () => {
      const onDismiss = vi.fn();
      const dismissal = createDismissal({
        escape: true,
        getTargets: () => [],
        isActive: () => false,
        onDismiss,
      });

      pressEscape();

      expect(onDismiss).not.toHaveBeenCalled();

      dismissal.dispose();
    });

    it('ignores an Escape another handler already prevented', () => {
      const onDismiss = vi.fn();
      const dismissal = createDismissal({
        escape: true,
        getTargets: () => [],
        isActive: () => true,
        onDismiss,
      });

      pressEscape(undefined, { preventDefault: true });

      expect(onDismiss).not.toHaveBeenCalled();

      dismissal.dispose();
    });

    it('only the newest of two stacked dismissals fires per Escape', () => {
      const first = vi.fn();
      const second = vi.fn();
      const a = createDismissal({ escape: true, getTargets: () => [], isActive: () => true, onDismiss: first });
      const b = createDismissal({ escape: true, getTargets: () => [], isActive: () => true, onDismiss: second });

      pressEscape();

      expect(second).toHaveBeenCalledOnce();
      expect(first).not.toHaveBeenCalled();

      a.dispose();
      b.dispose();
    });

    it('Escape unwinds stacked surfaces newest-first', () => {
      const first = vi.fn();
      const second = vi.fn();
      let bottomOpen = true;
      let topOpen = true;
      const a = createDismissal({
        escape: true,
        getTargets: () => [],
        isActive: () => bottomOpen,
        onDismiss: (reason) => {
          first(reason);
          bottomOpen = false;
        },
      });
      const b = createDismissal({
        escape: true,
        getTargets: () => [],
        isActive: () => topOpen,
        onDismiss: (reason) => {
          second(reason);
          topOpen = false;
        },
      });

      pressEscape();
      pressEscape();

      expect(second).toHaveBeenCalledOnce();
      expect(first).toHaveBeenCalledOnce();

      a.dispose();
      b.dispose();
    });

    it('ignores other keys', () => {
      const onDismiss = vi.fn();
      const dismissal = createDismissal({
        escape: true,
        getTargets: () => [],
        isActive: () => true,
        onDismiss,
      });

      document.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Enter' }));

      expect(onDismiss).not.toHaveBeenCalled();

      dismissal.dispose();
    });
  });

  describe('disposal', () => {
    it('stops dismissing after dispose', () => {
      const onDismiss = vi.fn();
      const dismissal = createDismissal({
        escape: true,
        getTargets: () => [],
        isActive: () => true,
        onDismiss,
      });

      dismissal.dispose();

      fireOutside();
      pressEscape();

      expect(onDismiss).not.toHaveBeenCalled();
      expect(dismissal.disposed).toBe(true);
    });

    it('dispose is idempotent', () => {
      const dismissal = createDismissal({ getTargets: () => [], isActive: () => true, onDismiss: () => {} });

      dismissal.dispose();

      expect(() => dismissal.dispose()).not.toThrow();
    });

    it('supports Symbol.dispose', () => {
      const onDismiss = vi.fn();
      const dismissal = createDismissal({ getTargets: () => [], isActive: () => true, onDismiss });

      {
        using _d = dismissal;
      }

      fireOutside();

      expect(onDismiss).not.toHaveBeenCalled();
    });

    it('aborts through the signal', () => {
      const controller = new AbortController();
      const onDismiss = vi.fn();

      createDismissal({ getTargets: () => [], isActive: () => true, onDismiss, signal: controller.signal });

      controller.abort();

      fireOutside();

      expect(onDismiss).not.toHaveBeenCalled();
    });

    it('starts disposed when the signal is already aborted', () => {
      const controller = new AbortController();

      controller.abort();

      const onDismiss = vi.fn();
      const dismissal = createDismissal({
        escape: true,
        getTargets: () => [],
        isActive: () => true,
        onDismiss,
        signal: controller.signal,
      });

      fireOutside();
      pressEscape();

      expect(onDismiss).not.toHaveBeenCalled();
      expect(dismissal.disposed).toBe(true);
    });
  });

  describe('ownerDocument', () => {
    it('listens on the provided document only', () => {
      const frame = document.createElement('iframe');

      document.body.appendChild(frame);

      const frameDoc = frame.contentDocument;
      if (!frameDoc) throw new Error('Expected iframe content document');

      const onDismiss = vi.fn();
      const dismissal = createDismissal({
        getTargets: () => [],
        isActive: () => true,
        onDismiss,
        ownerDocument: frameDoc,
      });

      fireOutside();

      expect(onDismiss).not.toHaveBeenCalled();

      frameDoc.dispatchEvent(new Event('pointerdown', { bubbles: true }));

      expect(onDismiss).toHaveBeenCalledWith('outsidePointer');

      dismissal.dispose();
      frame.remove();
    });
  });
});

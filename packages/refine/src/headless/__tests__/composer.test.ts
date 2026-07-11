import { signal } from '@vielzeug/ripple';

import { createComposerControl } from '../composer';

const makeKeydown = (init: KeyboardEventInit = {}): KeyboardEvent =>
  new KeyboardEvent('keydown', { cancelable: true, key: 'Enter', ...init });

describe('createComposerControl', () => {
  describe('canSend', () => {
    it('is false when the value is blank', () => {
      const control = createComposerControl({ onSend: vi.fn(), value: signal('') });

      expect(control.canSend.value).toBe(false);
    });

    it('is false when the value is whitespace-only', () => {
      const control = createComposerControl({ onSend: vi.fn(), value: signal('   \n ') });

      expect(control.canSend.value).toBe(false);
    });

    it('is true once the value is non-blank', () => {
      const control = createComposerControl({ onSend: vi.fn(), value: signal('hi') });

      expect(control.canSend.value).toBe(true);
    });

    it('is false while disabled', () => {
      const control = createComposerControl({ disabled: signal(true), onSend: vi.fn(), value: signal('hi') });

      expect(control.canSend.value).toBe(false);
    });

    it('is false while loading', () => {
      const control = createComposerControl({ loading: signal(true), onSend: vi.fn(), value: signal('hi') });

      expect(control.canSend.value).toBe(false);
    });
  });

  describe('send()', () => {
    it('calls onSend when canSend is true', () => {
      const onSend = vi.fn();
      const control = createComposerControl({ onSend, value: signal('hi') });
      const event = makeKeydown();

      control.send(event);

      expect(onSend).toHaveBeenCalledWith(event);
    });

    it('no-ops when canSend is false', () => {
      const onSend = vi.fn();
      const control = createComposerControl({ onSend, value: signal('') });

      control.send(makeKeydown());

      expect(onSend).not.toHaveBeenCalled();
    });
  });

  describe('handleKeydown() — "enter" mode (default)', () => {
    it('sends and prevents default on plain Enter', () => {
      const onSend = vi.fn();
      const control = createComposerControl({ onSend, value: signal('hi') });
      const event = makeKeydown();

      control.handleKeydown(event);

      expect(onSend).toHaveBeenCalledWith(event);
      expect(event.defaultPrevented).toBe(true);
    });

    it('does not send on Shift+Enter, leaving the default newline insertion', () => {
      const onSend = vi.fn();
      const control = createComposerControl({ onSend, value: signal('hi') });
      const event = makeKeydown({ shiftKey: true });

      control.handleKeydown(event);

      expect(onSend).not.toHaveBeenCalled();
      expect(event.defaultPrevented).toBe(false);
    });

    it('ignores non-Enter keys', () => {
      const onSend = vi.fn();
      const control = createComposerControl({ onSend, value: signal('hi') });

      control.handleKeydown(makeKeydown({ key: 'a' }));

      expect(onSend).not.toHaveBeenCalled();
    });

    it('never sends while an IME composition is in progress', () => {
      const onSend = vi.fn();
      const control = createComposerControl({ onSend, value: signal('hi') });
      const event = makeKeydown({ isComposing: true });

      control.handleKeydown(event);

      expect(onSend).not.toHaveBeenCalled();
      expect(event.defaultPrevented).toBe(false);
    });

    it('still prevents default on plain Enter when canSend is false, so it never falls through to a newline', () => {
      const onSend = vi.fn();
      const control = createComposerControl({ onSend, value: signal('') });
      const event = makeKeydown();

      control.handleKeydown(event);

      expect(onSend).not.toHaveBeenCalled();
      expect(event.defaultPrevented).toBe(true);
    });
  });

  describe('handleKeydown() — "mod+enter" mode', () => {
    it('does not send on plain Enter, leaving the default newline insertion', () => {
      const onSend = vi.fn();
      const control = createComposerControl({ onSend, sendShortcut: signal('mod+enter'), value: signal('hi') });
      const event = makeKeydown();

      control.handleKeydown(event);

      expect(onSend).not.toHaveBeenCalled();
      expect(event.defaultPrevented).toBe(false);
    });

    it('sends on Ctrl+Enter', () => {
      const onSend = vi.fn();
      const control = createComposerControl({ onSend, sendShortcut: signal('mod+enter'), value: signal('hi') });
      const event = makeKeydown({ ctrlKey: true });

      control.handleKeydown(event);

      expect(onSend).toHaveBeenCalledWith(event);
      expect(event.defaultPrevented).toBe(true);
    });

    it('sends on Meta+Enter', () => {
      const onSend = vi.fn();
      const control = createComposerControl({ onSend, sendShortcut: signal('mod+enter'), value: signal('hi') });
      const event = makeKeydown({ metaKey: true });

      control.handleKeydown(event);

      expect(onSend).toHaveBeenCalledWith(event);
    });
  });

  describe('keyShortcutsHint', () => {
    it('is "Enter" in the default mode', () => {
      const control = createComposerControl({ onSend: vi.fn(), value: signal('') });

      expect(control.keyShortcutsHint.value).toBe('Enter');
    });

    it('reflects "mod+enter" mode', () => {
      const control = createComposerControl({ onSend: vi.fn(), sendShortcut: signal('mod+enter'), value: signal('') });

      expect(control.keyShortcutsHint.value).toBe('Control+Enter Meta+Enter');
    });
  });
});

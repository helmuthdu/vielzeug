import { signal } from '@vielzeug/ripple';

import { createInteraction, dispatchKeyboardAction } from '../keyboard';

describe('dispatchKeyboardAction()', () => {
  it('calls the matching keymap handler and returns true', () => {
    const handler = vi.fn();
    const event = new KeyboardEvent('keydown', { key: 'Enter' });
    const handled = dispatchKeyboardAction(event, { keymap: { Enter: handler } });

    expect(handled).toBe(true);
    expect(handler).toHaveBeenCalledWith(event);
  });

  it('returns false when no matching key is found', () => {
    const handled = dispatchKeyboardAction(new KeyboardEvent('keydown', { key: 'Tab' }), { keymap: {} });

    expect(handled).toBe(false);
  });

  it('returns false when disabled', () => {
    const handler = vi.fn();
    const handled = dispatchKeyboardAction(new KeyboardEvent('keydown', { key: 'Enter' }), {
      disabled: signal(true),
      keymap: { Enter: handler },
    });

    expect(handled).toBe(false);
    expect(handler).not.toHaveBeenCalled();
  });

  it('preventDefault before dispatch by default', () => {
    const event = new KeyboardEvent('keydown', { cancelable: true, key: 'ArrowDown' });
    const preventDefault = vi.spyOn(event, 'preventDefault');

    dispatchKeyboardAction(event, { keymap: { ArrowDown: vi.fn() } });

    expect(preventDefault).toHaveBeenCalled();
  });

  it('does not preventDefault when mode is false', () => {
    const event = new KeyboardEvent('keydown', { cancelable: true, key: 'ArrowDown' });
    const preventDefault = vi.spyOn(event, 'preventDefault');

    dispatchKeyboardAction(event, { keymap: { ArrowDown: vi.fn() }, preventDefault: false });

    expect(preventDefault).not.toHaveBeenCalled();
  });

  it('handler returning false suppresses preventDefault in "after" mode', () => {
    const event = new KeyboardEvent('keydown', { cancelable: true, key: 'ArrowDown' });
    const preventDefault = vi.spyOn(event, 'preventDefault');

    dispatchKeyboardAction(event, { keymap: { ArrowDown: () => false }, preventDefault: 'after' });

    expect(preventDefault).not.toHaveBeenCalled();
  });

  it('ignores inherited Object.prototype members for crafted key names', () => {
    // A synthetic event can carry any string as `key` — `keymap['__proto__']` or
    // `keymap['constructor']` must never resolve to an inherited prototype member.
    const handled1 = dispatchKeyboardAction(new KeyboardEvent('keydown', { key: '__proto__' }), {
      keymap: { Enter: vi.fn() },
    });
    const handled2 = dispatchKeyboardAction(new KeyboardEvent('keydown', { key: 'constructor' }), {
      keymap: { Enter: vi.fn() },
    });
    const handled3 = dispatchKeyboardAction(new KeyboardEvent('keydown', { key: 'toString' }), {
      keymap: { Enter: vi.fn() },
    });

    expect(handled1).toBe(false);
    expect(handled2).toBe(false);
    expect(handled3).toBe(false);
  });
});

describe('createInteraction', () => {
  it('handles pointer presses when enabled', () => {
    const onPress = vi.fn();
    const control = createInteraction({ onPress });

    const handled = control.handleClick(new MouseEvent('click'));

    expect(handled).toBe(true);
    expect(onPress).toHaveBeenCalledWith(expect.any(MouseEvent), 'pointer');
  });

  it('handles Enter and Space keyboard presses', () => {
    const onPress = vi.fn();
    const control = createInteraction({ onPress });

    expect(control.handleKeydown(new KeyboardEvent('keydown', { key: 'Enter' }))).toBe(true);
    expect(control.handleKeydown(new KeyboardEvent('keydown', { key: ' ' }))).toBe(true);
    expect(onPress).toHaveBeenCalledTimes(2);
    expect(onPress.mock.calls[0][1]).toBe('keyboard');
  });

  it('ignores unsupported keys and disabled state', () => {
    const onPress = vi.fn();
    const disabled = createInteraction({
      disabled: signal(true),
      onPress,
    });

    expect(disabled.handleClick(new MouseEvent('click'))).toBe(false);
    expect(disabled.handleKeydown(new KeyboardEvent('keydown', { key: 'Enter' }))).toBe(false);

    const enabled = createInteraction({ onPress });

    expect(enabled.handleKeydown(new KeyboardEvent('keydown', { key: 'Escape' }))).toBe(false);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('supports custom keyboard key mappings', () => {
    const onPress = vi.fn();
    const control = createInteraction({
      keys: ['Enter'],
      onPress,
    });

    expect(control.handleKeydown(new KeyboardEvent('keydown', { key: 'Enter' }))).toBe(true);
    expect(control.handleKeydown(new KeyboardEvent('keydown', { key: ' ' }))).toBe(false);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('calls onFocus when enabled and suppresses it when disabled', () => {
    const onFocus = vi.fn();
    const enabled = createInteraction({ onFocus });
    const disabled = createInteraction({ disabled: signal(true), onFocus });

    enabled.handleFocus(new FocusEvent('focus'));
    expect(onFocus).toHaveBeenCalledTimes(1);

    disabled.handleFocus(new FocusEvent('focus'));
    expect(onFocus).toHaveBeenCalledTimes(1);
  });

  it('calls onBlur when enabled and suppresses it when disabled', () => {
    const onBlur = vi.fn();
    const enabled = createInteraction({ onBlur });
    const disabled = createInteraction({ disabled: signal(true), onBlur });

    enabled.handleBlur(new FocusEvent('blur'));
    expect(onBlur).toHaveBeenCalledTimes(1);

    disabled.handleBlur(new FocusEvent('blur'));
    expect(onBlur).toHaveBeenCalledTimes(1);
  });
});

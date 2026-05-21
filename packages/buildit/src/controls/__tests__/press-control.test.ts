import { createPressControl } from '../press-control';

describe('createPressControl', () => {
  it('handles pointer presses when enabled', () => {
    const onPress = vi.fn();
    const control = createPressControl({ onPress });

    const handled = control.handleClick(new MouseEvent('click'));

    expect(handled).toBe(true);
    expect(onPress).toHaveBeenCalledWith(expect.any(MouseEvent), 'pointer');
  });

  it('handles Enter and Space keyboard presses', () => {
    const onPress = vi.fn();
    const control = createPressControl({ onPress });

    expect(control.handleKeydown(new KeyboardEvent('keydown', { key: 'Enter' }))).toBe(true);
    expect(control.handleKeydown(new KeyboardEvent('keydown', { key: ' ' }))).toBe(true);
    expect(onPress).toHaveBeenCalledTimes(2);
    expect(onPress.mock.calls[0][1]).toBe('keyboard');
  });

  it('ignores unsupported keys and disabled state', () => {
    const onPress = vi.fn();
    const disabled = createPressControl({
      disabled: () => true,
      onPress,
    });

    expect(disabled.handleClick(new MouseEvent('click'))).toBe(false);
    expect(disabled.handleKeydown(new KeyboardEvent('keydown', { key: 'Enter' }))).toBe(false);

    const enabled = createPressControl({ onPress });

    expect(enabled.handleKeydown(new KeyboardEvent('keydown', { key: 'Escape' }))).toBe(false);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('supports custom keyboard key mappings', () => {
    const onPress = vi.fn();
    const control = createPressControl({
      keys: ['Enter'],
      onPress,
    });

    expect(control.handleKeydown(new KeyboardEvent('keydown', { key: 'Enter' }))).toBe(true);
    expect(control.handleKeydown(new KeyboardEvent('keydown', { key: ' ' }))).toBe(false);
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

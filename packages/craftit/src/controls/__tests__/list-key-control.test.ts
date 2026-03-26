import { createListKeyControl } from '../list-key-control';

describe('createListKeyControl', () => {
  it('handles default Arrow/Home/End keys', () => {
    const control = {
      first: vi.fn(),
      last: vi.fn(),
      next: vi.fn(),
      prev: vi.fn(),
    };

    const keyControl = createListKeyControl({ control });

    const down = new KeyboardEvent('keydown', { cancelable: true, key: 'ArrowDown' });
    const up = new KeyboardEvent('keydown', { cancelable: true, key: 'ArrowUp' });
    const home = new KeyboardEvent('keydown', { cancelable: true, key: 'Home' });
    const end = new KeyboardEvent('keydown', { cancelable: true, key: 'End' });

    expect(keyControl.handleKeydown(down)).toBe(true);
    expect(down.defaultPrevented).toBe(true);
    expect(keyControl.handleKeydown(up)).toBe(true);
    expect(keyControl.handleKeydown(home)).toBe(true);
    expect(keyControl.handleKeydown(end)).toBe(true);

    expect(control.next).toHaveBeenCalledTimes(1);
    expect(control.prev).toHaveBeenCalledTimes(1);
    expect(control.first).toHaveBeenCalledTimes(1);
    expect(control.last).toHaveBeenCalledTimes(1);
  });

  it('supports custom key mappings', () => {
    const control = {
      first: vi.fn(),
      last: vi.fn(),
      next: vi.fn(),
      prev: vi.fn(),
    };

    const keyControl = createListKeyControl({
      control,
      keys: {
        next: ['j'],
        prev: ['k'],
      },
    });

    expect(keyControl.handleKeydown(new KeyboardEvent('keydown', { key: 'j' }))).toBe(true);
    expect(keyControl.handleKeydown(new KeyboardEvent('keydown', { key: 'k' }))).toBe(true);
    expect(keyControl.handleKeydown(new KeyboardEvent('keydown', { key: 'ArrowDown' }))).toBe(false);
    expect(control.next).toHaveBeenCalledTimes(1);
    expect(control.prev).toHaveBeenCalledTimes(1);
  });

  it('supports dynamic key mappings via function', () => {
    const control = {
      first: vi.fn(),
      last: vi.fn(),
      next: vi.fn(),
      prev: vi.fn(),
    };
    let vertical = false;

    const keyControl = createListKeyControl({
      control,
      keys: () =>
        vertical
          ? {
              next: ['ArrowDown'],
              prev: ['ArrowUp'],
            }
          : {
              next: ['ArrowRight'],
              prev: ['ArrowLeft'],
            },
    });

    expect(keyControl.handleKeydown(new KeyboardEvent('keydown', { key: 'ArrowRight' }))).toBe(true);
    expect(keyControl.handleKeydown(new KeyboardEvent('keydown', { key: 'ArrowDown' }))).toBe(false);

    vertical = true;

    expect(keyControl.handleKeydown(new KeyboardEvent('keydown', { key: 'ArrowDown' }))).toBe(true);
    expect(keyControl.handleKeydown(new KeyboardEvent('keydown', { key: 'ArrowRight' }))).toBe(false);
    expect(control.next).toHaveBeenCalledTimes(2);
  });

  it('ignores keys when disabled', () => {
    const control = {
      first: vi.fn(),
      last: vi.fn(),
      next: vi.fn(),
      prev: vi.fn(),
    };

    const keyControl = createListKeyControl({
      control,
      disabled: () => true,
    });

    expect(keyControl.handleKeydown(new KeyboardEvent('keydown', { key: 'ArrowDown' }))).toBe(false);
    expect(control.next).not.toHaveBeenCalled();
  });

  it('invokes onInvoke with action and control result', () => {
    const control = {
      first: vi.fn(() => ({ index: 0, moved: true })),
      last: vi.fn(() => ({ index: 2, moved: true })),
      next: vi.fn(() => ({ index: 1, moved: true })),
      prev: vi.fn(() => ({ index: 0, moved: true })),
    };
    const onInvoke = vi.fn();

    const keyControl = createListKeyControl({
      control,
      onInvoke,
    });

    expect(keyControl.handleKeydown(new KeyboardEvent('keydown', { key: 'ArrowDown' }))).toBe(true);
    expect(keyControl.handleKeydown(new KeyboardEvent('keydown', { key: 'ArrowUp' }))).toBe(true);
    expect(keyControl.handleKeydown(new KeyboardEvent('keydown', { key: 'Home' }))).toBe(true);
    expect(keyControl.handleKeydown(new KeyboardEvent('keydown', { key: 'End' }))).toBe(true);

    expect(onInvoke).toHaveBeenNthCalledWith(1, 'next', { index: 1, moved: true }, expect.any(KeyboardEvent));
    expect(onInvoke).toHaveBeenNthCalledWith(2, 'prev', { index: 0, moved: true }, expect.any(KeyboardEvent));
    expect(onInvoke).toHaveBeenNthCalledWith(3, 'first', { index: 0, moved: true }, expect.any(KeyboardEvent));
    expect(onInvoke).toHaveBeenNthCalledWith(4, 'last', { index: 2, moved: true }, expect.any(KeyboardEvent));
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createListControl } from '../index';

describe('createListControl', () => {
  it('moves to first and last enabled items', () => {
    const items = [{ disabled: true }, { disabled: false }, { disabled: false }];
    let activeIndex = -1;
    const nav = createListControl({
      getIndex: () => activeIndex,
      getItems: () => items,
      setIndex: (index) => {
        activeIndex = index;
      },
    });

    expect(nav.first()).toBe(1);
    expect(nav.last()).toBe(2);
  });

  it('next/prev skip disabled items', () => {
    const items = [{ disabled: false }, { disabled: true }, { disabled: false }];
    let activeIndex = 0;
    const nav = createListControl({
      getIndex: () => activeIndex,
      getItems: () => items,
      setIndex: (index) => {
        activeIndex = index;
      },
    });

    expect(nav.next()).toBe(2);
    expect(nav.prev()).toBe(0);
  });

  it('marks wrapped navigation when loop=true', () => {
    const items = [{ disabled: false }, { disabled: false }, { disabled: false }];
    let activeIndex = 2;
    const nav = createListControl({
      getIndex: () => activeIndex,
      getItems: () => items,
      loop: true,
      setIndex: (index) => {
        activeIndex = index;
      },
    });

    expect(nav.next()).toBe(0);
    expect(nav.prev()).toBe(2);
  });

  it('stays unchanged at boundaries when loop=false', () => {
    const items = [{ disabled: false }, { disabled: false }];
    let activeIndex = 1;
    const nav = createListControl({
      getIndex: () => activeIndex,
      getItems: () => items,
      loop: false,
      setIndex: (index) => {
        activeIndex = index;
      },
    });

    expect(nav.next()).toBe(1);
    activeIndex = 0;
    expect(nav.prev()).toBe(0);
  });

  it('returns no-enabled-item when list has no enabled entries', () => {
    const items = [{ disabled: true }, { disabled: true }];
    let activeIndex = -1;
    const nav = createListControl({
      getIndex: () => activeIndex,
      getItems: () => items,
      setIndex: (index) => {
        activeIndex = index;
      },
    });

    expect(nav.first()).toBe(-1);
    expect(nav.last()).toBe(-1);
  });

  it('returns empty reason for empty lists', () => {
    const items: Array<{ disabled: boolean }> = [];
    let activeIndex = -1;
    const nav = createListControl({
      getIndex: () => activeIndex,
      getItems: () => items,
      setIndex: (index) => {
        activeIndex = index;
      },
    });

    expect(nav.first()).toBe(-1);
    expect(nav.last()).toBe(-1);
    expect(nav.next()).toBe(-1);
    expect(nav.prev()).toBe(-1);
  });

  it('set clamps into range and returns no-enabled-item when clamped index is disabled', () => {
    const items = [{ disabled: false }, { disabled: true }, { disabled: false }];
    let activeIndex = 0;
    const nav = createListControl({
      getIndex: () => activeIndex,
      getItems: () => items,
      setIndex: (index) => {
        activeIndex = index;
      },
    });

    expect(nav.set(99)).toBe(2);
    expect(nav.set(1)).toBe(2);
  });

  it('supports custom isItemDisabled predicate', () => {
    const items = [{ status: 'enabled' }, { status: 'hidden' }, { status: 'enabled' }];
    let activeIndex = 0;
    const nav = createListControl({
      getIndex: () => activeIndex,
      getItems: () => items,
      isItemDisabled: (item) => item.status === 'hidden',
      setIndex: (index) => {
        activeIndex = index;
      },
    });

    expect(nav.next()).toBe(2);
  });

  it('getActiveItem and reset work as expected', () => {
    const items = [
      { disabled: false, id: 'a' },
      { disabled: false, id: 'b' },
    ];
    let activeIndex = 0;
    const nav = createListControl({
      getIndex: () => activeIndex,
      getItems: () => items,
      setIndex: (index) => {
        activeIndex = index;
      },
    });

    expect(nav.getActiveItem()).toEqual({ disabled: false, id: 'a' });

    nav.reset();

    expect(activeIndex).toBe(-1);
    expect(nav.getActiveItem()).toBeUndefined();
  });
});

describe('createListControl typeahead', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  type LabelItem = { disabled: boolean; label: string };

  function makeNav(items: LabelItem[], startIndex = -1) {
    let activeIndex = startIndex;
    const nav = createListControl({
      getIndex: () => activeIndex,
      getItemLabel: (item) => item.label,
      getItems: () => items,
      isItemDisabled: (item) => item.disabled,
      setIndex: (index) => {
        activeIndex = index;
      },
    });

    const key = (char: string) =>
      nav.handleKeydown(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: char }));

    return { activeIndex: () => activeIndex, key, nav };
  }

  it('jumps to the first item matching the typed character', () => {
    const items = [
      { disabled: false, label: 'Apple' },
      { disabled: false, label: 'Banana' },
      { disabled: false, label: 'Cherry' },
    ];
    const { activeIndex, key } = makeNav(items);

    key('b');
    expect(activeIndex()).toBe(1);
  });

  it('is case-insensitive', () => {
    const items = [
      { disabled: false, label: 'Apple' },
      { disabled: false, label: 'Banana' },
    ];
    const { activeIndex, key } = makeNav(items);

    key('A');
    expect(activeIndex()).toBe(0);

    // Reset the buffer before the next independent key press.
    vi.advanceTimersByTime(500);

    key('B');
    expect(activeIndex()).toBe(1);
  });

  it('cycles past current item to the next match on repeated same-character press', () => {
    const items = [
      { disabled: false, label: 'Apple' },
      { disabled: false, label: 'Avocado' },
      { disabled: false, label: 'Banana' },
    ];
    const { activeIndex, key } = makeNav(items, 0);

    // Buffer resets between separate key sequences (reset after 500ms).
    // Typing 'a' from index 0: starts search from index 1 → finds 'Avocado' at 1.
    key('a');
    expect(activeIndex()).toBe(1);

    // Advance time to reset the buffer.
    vi.advanceTimersByTime(500);

    // Now typing 'a' again from index 1: search from 2 → wraps → finds 'Apple' at 0.
    key('a');
    expect(activeIndex()).toBe(0);
  });

  it('multi-character buffer narrows the match', () => {
    const items = [
      { disabled: false, label: 'Apple' },
      { disabled: false, label: 'Avocado' },
      { disabled: false, label: 'Banana' },
    ];
    const { activeIndex, key } = makeNav(items);

    key('a');
    expect(activeIndex()).toBe(0); // 'Apple'

    key('v');
    // Buffer is now 'av' → matches 'Avocado'
    expect(activeIndex()).toBe(1);
  });

  it('buffer resets after 500 ms of inactivity', () => {
    const items = [
      { disabled: false, label: 'Apple' },
      { disabled: false, label: 'Avocado' },
    ];
    const { activeIndex, key } = makeNav(items);

    key('a');
    expect(activeIndex()).toBe(0);

    vi.advanceTimersByTime(500); // buffer resets

    key('a');
    // Starts from after current (0) → finds 'Avocado' at 1.
    expect(activeIndex()).toBe(1);
  });

  it('skips disabled items during typeahead', () => {
    const items = [
      { disabled: false, label: 'Apple' },
      { disabled: true, label: 'Avocado' },
      { disabled: false, label: 'Acorn' },
    ];
    const { activeIndex, key } = makeNav(items);

    key('a');
    // 'Apple' first, not 'Avocado' (disabled).
    expect(activeIndex()).toBe(0);

    vi.advanceTimersByTime(500);

    key('a');
    // Next 'a' from index 1 → skips disabled 'Avocado' → finds 'Acorn' at 2.
    expect(activeIndex()).toBe(2);
  });

  it('returns false when no item matches', () => {
    const items = [{ disabled: false, label: 'Apple' }];
    const { activeIndex, key } = makeNav(items);

    const handled = key('z');

    expect(handled).toBe(false);
    expect(activeIndex()).toBe(-1);
  });

  it('returns false when getItemLabel is not provided', () => {
    let activeIndex = -1;
    const nav = createListControl({
      getIndex: () => activeIndex,
      getItems: () => [{ disabled: false }],
      setIndex: (i) => {
        activeIndex = i;
      },
    });

    const handled = nav.handleKeydown(new KeyboardEvent('keydown', { key: 'a' }));

    expect(handled).toBe(false);
  });

  it('ignores modifier-key combinations (Ctrl+A, Alt+B)', () => {
    const items = [
      { disabled: false, label: 'Apple' },
      { disabled: false, label: 'Banana' },
    ];
    const { activeIndex, nav } = makeNav(items);

    nav.handleKeydown(new KeyboardEvent('keydown', { ctrlKey: true, key: 'a' }));
    expect(activeIndex()).toBe(-1);

    nav.handleKeydown(new KeyboardEvent('keydown', { altKey: true, key: 'b' }));
    expect(activeIndex()).toBe(-1);
  });

  it('does not trigger typeahead when list is disabled', () => {
    let activeIndex = -1;
    const nav = createListControl({
      disabled: () => true,
      getIndex: () => activeIndex,
      getItemLabel: (item: { label: string }) => item.label,
      getItems: () => [{ label: 'Apple' }],
      setIndex: (i) => {
        activeIndex = i;
      },
    });

    nav.handleKeydown(new KeyboardEvent('keydown', { key: 'a' }));
    expect(activeIndex).toBe(-1);
  });
});

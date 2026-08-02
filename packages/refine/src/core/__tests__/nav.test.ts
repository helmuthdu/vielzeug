import { signal } from '@vielzeug/ripple';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createListControl } from '../nav';

describe('createListControl', () => {
  it('navigate(first/last) moves to the first/last enabled items', () => {
    const items = [{ disabled: true }, { disabled: false }, { disabled: false }];
    const nav = createListControl({ getItems: () => items });

    expect(nav.navigate('first')).toBe(1);
    expect(nav.navigate('last')).toBe(2);
  });

  it('navigate(next/prev) skips disabled items', () => {
    const items = [{ disabled: false }, { disabled: true }, { disabled: false }];
    const nav = createListControl({ getItems: () => items });

    nav.set(0);
    expect(nav.navigate('next')).toBe(2);
    expect(nav.navigate('prev')).toBe(0);
  });

  it('navigate wraps when loop=true', () => {
    const items = [{ disabled: false }, { disabled: false }, { disabled: false }];
    const nav = createListControl({ getItems: () => items, loop: true });

    nav.set(2);
    expect(nav.navigate('next')).toBe(0);
    nav.set(0);
    expect(nav.navigate('prev')).toBe(2);
  });

  it('navigate stays unchanged at boundaries when loop=false', () => {
    const items = [{ disabled: false }, { disabled: false }];
    const nav = createListControl({ getItems: () => items, loop: false });

    nav.set(1);
    expect(nav.navigate('next')).toBe(1);
    nav.set(0);
    expect(nav.navigate('prev')).toBe(0);
  });

  it('returns -1 when list has no enabled entries', () => {
    const items = [{ disabled: true }, { disabled: true }];
    const nav = createListControl({ getItems: () => items });

    expect(nav.navigate('first')).toBe(-1);
    expect(nav.navigate('last')).toBe(-1);
  });

  it('returns -1 for all navigate actions on empty lists', () => {
    const items: Array<{ disabled: boolean }> = [];
    const nav = createListControl({ getItems: () => items });

    expect(nav.navigate('first')).toBe(-1);
    expect(nav.navigate('last')).toBe(-1);
    expect(nav.navigate('next')).toBe(-1);
    expect(nav.navigate('prev')).toBe(-1);
  });

  it('set(-1) clears focus (same as reset) and returns -1', () => {
    const items = [{ disabled: false }, { disabled: false }];
    const nav = createListControl({ getItems: () => items });

    nav.set(1);
    expect(nav.focusedIndex.value).toBe(1);

    const result = nav.set(-1);

    expect(result).toBe(-1);
    expect(nav.focusedIndex.value).toBe(-1);
  });

  it('set clamps out-of-bounds index to the last enabled item', () => {
    const items = [{ disabled: false }, { disabled: true }, { disabled: false }];
    const nav = createListControl({ getItems: () => items });

    expect(nav.set(99)).toBe(2);
    expect(nav.focusedIndex.value).toBe(2);
  });

  it('set returns -1 when the target index is a disabled item', () => {
    const items = [{ disabled: false }, { disabled: true }, { disabled: false }];
    const nav = createListControl({ getItems: () => items });

    nav.set(0);

    const result = nav.set(1);

    expect(result).toBe(-1);
    expect(nav.focusedIndex.value).toBe(0);
  });

  it('supports custom isItemDisabled predicate', () => {
    const items = [{ status: 'enabled' }, { status: 'hidden' }, { status: 'enabled' }];
    const nav = createListControl({
      getItems: () => items,
      isItemDisabled: (item) => item.status === 'hidden',
    });

    nav.set(0);
    expect(nav.navigate('next')).toBe(2);
  });

  it('getActiveItem and reset work as expected', () => {
    const items = [
      { disabled: false, id: 'a' },
      { disabled: false, id: 'b' },
    ];
    const nav = createListControl({ getItems: () => items });

    nav.set(0);
    expect(nav.getActiveItem()).toEqual({ disabled: false, id: 'a' });

    nav.reset();

    expect(nav.focusedIndex.value).toBe(-1);
    expect(nav.getActiveItem()).toBeUndefined();
  });

  it('focusedIndex is a reactive signal', () => {
    const items = [{ disabled: false }, { disabled: false }, { disabled: false }];
    const nav = createListControl({ getItems: () => items });

    expect(nav.focusedIndex.value).toBe(-1);
    nav.set(2);
    expect(nav.focusedIndex.value).toBe(2);
    nav.reset();
    expect(nav.focusedIndex.value).toBe(-1);
  });

  it('onNavigate is called with action, index, and event on keyboard moves', () => {
    const items = [{ disabled: false }, { disabled: false }, { disabled: false }];
    const navigated: Array<{ action: string; index: number }> = [];
    const nav = createListControl({
      getItems: () => items,
      onNavigate: (action, index) => navigated.push({ action, index }),
    });

    nav.set(0);
    nav.handleKeydown(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    nav.handleKeydown(new KeyboardEvent('keydown', { key: 'ArrowUp' }));

    expect(navigated).toEqual([
      { action: 'next', index: 1 },
      { action: 'prev', index: 0 },
    ]);
  });

  it('dispose() and disposed conform to the monorepo disposal convention', () => {
    const items = [{ disabled: false }, { disabled: false }];
    const nav = createListControl({ getItems: () => items });

    expect(nav.disposed).toBe(false);
    nav.dispose();
    expect(nav.disposed).toBe(true);

    // Idempotent — calling again does not throw.
    nav.dispose();
    expect(nav.disposed).toBe(true);
  });

  it('[Symbol.dispose] is an alias for dispose()', () => {
    const items = [{ disabled: false }];
    const nav = createListControl({ getItems: () => items });

    nav[Symbol.dispose]();
    expect(nav.disposed).toBe(true);
  });
});

describe('createListControl direction (RTL mirroring)', () => {
  it('horizontal orientation: RTL swaps ArrowLeft/ArrowRight meaning', () => {
    const items = [{ disabled: false }, { disabled: false }, { disabled: false }];
    const nav = createListControl({ direction: 'rtl', getItems: () => items, orientation: 'horizontal' });

    nav.set(0);
    nav.handleKeydown(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    expect(nav.focusedIndex.value).toBe(1); // ArrowLeft is "next" in RTL

    nav.handleKeydown(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    expect(nav.focusedIndex.value).toBe(0); // ArrowRight is "prev" in RTL
  });

  it("'both' orientation: RTL mirrors only the horizontal arrows, not vertical", () => {
    const items = [{ disabled: false }, { disabled: false }, { disabled: false }];
    const nav = createListControl({ direction: 'rtl', getItems: () => items, orientation: 'both' });

    nav.set(0);
    nav.handleKeydown(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    expect(nav.focusedIndex.value).toBe(1); // vertical arrows unaffected by direction

    nav.handleKeydown(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    expect(nav.focusedIndex.value).toBe(2); // ArrowLeft is "next" in RTL
  });

  it('LTR (default) keeps the standard ArrowRight=next / ArrowLeft=prev mapping', () => {
    const items = [{ disabled: false }, { disabled: false }];
    const nav = createListControl({ getItems: () => items, orientation: 'horizontal' });

    nav.set(0);
    nav.handleKeydown(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    expect(nav.focusedIndex.value).toBe(1);
  });

  it('a getter direction is re-resolved on every keydown', () => {
    const items = [{ disabled: false }, { disabled: false }];
    let dir: 'ltr' | 'rtl' = 'ltr';
    const nav = createListControl({ direction: () => dir, getItems: () => items, orientation: 'horizontal' });

    nav.set(0);
    nav.handleKeydown(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    expect(nav.focusedIndex.value).toBe(1);

    dir = 'rtl';
    nav.handleKeydown(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    expect(nav.focusedIndex.value).toBe(0); // now "prev" under RTL
  });

  it('an explicit keys override takes precedence over direction mirroring', () => {
    const items = [{ disabled: false }, { disabled: false }];
    const nav = createListControl({
      direction: 'rtl',
      getItems: () => items,
      keys: { next: ['ArrowRight'], prev: ['ArrowLeft'] },
      orientation: 'horizontal',
    });

    nav.set(0);
    nav.handleKeydown(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    expect(nav.focusedIndex.value).toBe(1);
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
    const nav = createListControl({
      getItemLabel: (item) => item.label,
      getItems: () => items,
      isItemDisabled: (item) => item.disabled,
    });

    if (startIndex >= 0) nav.set(startIndex);

    const key = (char: string) =>
      nav.handleKeydown(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: char }));

    return { activeIndex: () => nav.focusedIndex.value, key, nav };
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
    const nav = createListControl({
      getItems: () => [{ disabled: false }],
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
    const nav = createListControl({
      disabled: signal(true),
      getItemLabel: (item: { label: string }) => item.label,
      getItems: () => [{ label: 'Apple' }],
    });

    nav.handleKeydown(new KeyboardEvent('keydown', { key: 'a' }));
    expect(nav.focusedIndex.value).toBe(-1);
  });

  it('[Symbol.dispose]() resets the type buffer — subsequent keystrokes start a fresh search', () => {
    const { activeIndex, nav } = makeNav([
      { disabled: false, label: 'Apple' },
      { disabled: false, label: 'Avocado' },
      { disabled: false, label: 'Banana' },
    ]);

    // Type 'av' — should land on 'Avocado' (index 1).
    nav.handleKeydown(new KeyboardEvent('keydown', { key: 'a' }));
    nav.handleKeydown(new KeyboardEvent('keydown', { key: 'v' }));
    expect(activeIndex()).toBe(1);

    // [Symbol.dispose]() resets the buffer without waiting for the 500 ms timeout.
    nav[Symbol.dispose]();

    // Now type 'a' again — buffer is cleared so it's a fresh 'a' search from index 2 → wraps → 'Apple' at 0.
    nav.handleKeydown(new KeyboardEvent('keydown', { key: 'a' }));
    expect(activeIndex()).toBe(0);
  });
});

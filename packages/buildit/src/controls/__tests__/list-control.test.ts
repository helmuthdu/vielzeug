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

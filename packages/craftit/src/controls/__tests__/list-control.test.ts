import { createListControl } from '../../controls';

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

    expect(nav.first()).toEqual({ index: 1, moved: true });
    expect(nav.last()).toEqual({ index: 2, moved: true });
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

    expect(nav.next()).toEqual({ index: 2, moved: true });
    expect(nav.prev()).toEqual({ index: 0, moved: true });
  });

  it('wraps when loop=true', () => {
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

    expect(nav.next()).toEqual({ index: 0, moved: true });
    expect(nav.prev()).toEqual({ index: 2, moved: true });
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

    expect(nav.next()).toEqual({ index: 1, moved: false });
    activeIndex = 0;
    expect(nav.prev()).toEqual({ index: 0, moved: false });
  });

  it('returns -1 when list has no enabled items', () => {
    const items = [{ disabled: true }, { disabled: true }];
    let activeIndex = -1;
    const nav = createListControl({
      getIndex: () => activeIndex,
      getItems: () => items,
      setIndex: (index) => {
        activeIndex = index;
      },
    });

    expect(nav.first()).toEqual({ index: -1, moved: false });
    expect(nav.last()).toEqual({ index: -1, moved: false });
  });

  it('handles empty lists', () => {
    const items: Array<{ disabled: boolean }> = [];
    let activeIndex = -1;
    const nav = createListControl({
      getIndex: () => activeIndex,
      getItems: () => items,
      setIndex: (index) => {
        activeIndex = index;
      },
    });

    expect(nav.first()).toEqual({ index: -1, moved: false });
    expect(nav.last()).toEqual({ index: -1, moved: false });
    expect(nav.next()).toEqual({ index: -1, moved: false });
    expect(nav.prev()).toEqual({ index: -1, moved: false });
  });

  it('supports custom isItemDisabled', () => {
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

    expect(nav.next()).toEqual({ index: 2, moved: true });
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

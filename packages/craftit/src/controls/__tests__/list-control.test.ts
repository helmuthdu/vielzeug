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

    expect(nav.first()).toEqual({ index: 1, moved: true, reason: 'moved', wrapped: false });
    expect(nav.last()).toEqual({ index: 2, moved: true, reason: 'moved', wrapped: false });
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

    expect(nav.next()).toEqual({ index: 2, moved: true, reason: 'moved', wrapped: false });
    expect(nav.prev()).toEqual({ index: 0, moved: true, reason: 'moved', wrapped: false });
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

    expect(nav.next()).toEqual({ index: 0, moved: true, reason: 'moved', wrapped: true });
    expect(nav.prev()).toEqual({ index: 2, moved: true, reason: 'moved', wrapped: true });
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

    expect(nav.next()).toEqual({ index: 1, moved: false, reason: 'unchanged', wrapped: false });
    activeIndex = 0;
    expect(nav.prev()).toEqual({ index: 0, moved: false, reason: 'unchanged', wrapped: false });
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

    expect(nav.first()).toEqual({ index: -1, moved: false, reason: 'no-enabled-item', wrapped: false });
    expect(nav.last()).toEqual({ index: -1, moved: false, reason: 'no-enabled-item', wrapped: false });
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

    expect(nav.first()).toEqual({ index: -1, moved: false, reason: 'empty', wrapped: false });
    expect(nav.last()).toEqual({ index: -1, moved: false, reason: 'empty', wrapped: false });
    expect(nav.next()).toEqual({ index: -1, moved: false, reason: 'empty', wrapped: false });
    expect(nav.prev()).toEqual({ index: -1, moved: false, reason: 'empty', wrapped: false });
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

    expect(nav.set(99)).toEqual({ index: 2, moved: true, reason: 'moved', wrapped: false });
    expect(nav.set(1)).toEqual({ index: 1, moved: false, reason: 'no-enabled-item', wrapped: false });
  });

  it('getEnabledIndex returns the next enabled index from the requested start', () => {
    const items = [{ disabled: true }, { disabled: true }, { disabled: false }];
    let activeIndex = -1;
    const nav = createListControl({
      getIndex: () => activeIndex,
      getItems: () => items,
      setIndex: (index) => {
        activeIndex = index;
      },
    });

    expect(nav.getEnabledIndex(0)).toEqual({ index: 2, moved: true, reason: 'moved', wrapped: false });
    expect(activeIndex).toBe(2);
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

    expect(nav.next()).toEqual({ index: 2, moved: true, reason: 'moved', wrapped: false });
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

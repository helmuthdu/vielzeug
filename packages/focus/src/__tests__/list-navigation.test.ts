import { createListNavigation, type ListNavigationOptions } from '../index';

type Item = { disabled?: boolean; label?: string };

const createNavigation = (items: Item[], options: Partial<ListNavigationOptions<Item>> = {}) =>
  createListNavigation({
    getItems: () => items,
    isItemDisabled: (item) => Boolean(item.disabled),
    ...options,
  });

describe('createListNavigation', () => {
  it('navigates first and last while skipping disabled items', () => {
    const nav = createNavigation([{ disabled: true }, {}, {}]);

    expect(nav.navigate('first')).toBe(1);
    expect(nav.navigate('last')).toBe(2);
  });

  it('moves next and previous from the current index', () => {
    const nav = createNavigation([{}, { disabled: true }, {}]);

    nav.set(0);
    expect(nav.navigate('next')).toBe(2);
    expect(nav.navigate('prev')).toBe(0);
  });

  it('wraps only when loop is enabled', () => {
    const looping = createNavigation([{}, {}], { loop: true });
    const bounded = createNavigation([{}, {}]);

    looping.set(1);
    expect(looping.navigate('next')).toBe(0);

    bounded.set(1);
    expect(bounded.navigate('next')).toBe(1);
  });

  it('passes the selected item and the operation snapshot to onNavigate', () => {
    const first = { label: 'first' };
    const second = { label: 'second' };
    let items = [first, second];
    const getItems = vi.fn(() => items);
    const onNavigate = vi.fn(() => {
      items = [second, first];
    });
    const nav = createListNavigation({ getItems, onNavigate });

    nav.set(0);
    getItems.mockClear();

    expect(nav.navigate('next')).toBe(1);
    expect(getItems).toHaveBeenCalledOnce();
    expect(onNavigate).toHaveBeenCalledWith({
      action: 'next',
      event: undefined,
      index: 1,
      item: second,
    });
  });

  it('does not infer disabled state from an item property', () => {
    const nav = createListNavigation({ getItems: () => [{ disabled: true }, { disabled: false }] });

    expect(nav.navigate('first')).toBe(0);
  });

  it('supports rtl key mirroring and dynamic direction', () => {
    let direction: 'ltr' | 'rtl' = 'ltr';
    const nav = createNavigation([{}, {}], {
      direction: () => direction,
      orientation: 'horizontal',
    });

    nav.set(0);
    nav.handleKeydown(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    expect(nav.getIndex()).toBe(1);

    direction = 'rtl';
    nav.handleKeydown(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    expect(nav.getIndex()).toBe(0);
  });

  it('supports custom key bindings', () => {
    const nav = createNavigation([{}, {}], {
      keys: { next: ['j'], prev: ['k'] },
    });

    nav.set(0);
    expect(nav.handleKeydown(new KeyboardEvent('keydown', { key: 'j' }))).toBe(true);
    expect(nav.getIndex()).toBe(1);
  });

  it('prevents default for recognized navigation keys', () => {
    const nav = createNavigation([{}]);
    const event = new KeyboardEvent('keydown', { cancelable: true, key: 'ArrowDown' });

    expect(nav.handleKeydown(event)).toBe(true);
    expect(event.defaultPrevented).toBe(true);
  });

  it('returns false for keydown when disabled', () => {
    const nav = createNavigation([{}, {}], { disabled: true });

    expect(nav.handleKeydown(new KeyboardEvent('keydown', { key: 'ArrowDown' }))).toBe(false);
    expect(nav.getIndex()).toBe(-1);
  });

  it('normalizes a stale index when items shrink', () => {
    const items: Item[] = [{}, {}, {}];
    const nav = createNavigation(items);

    nav.set(2);
    items.splice(1);

    expect(nav.getIndex()).toBe(-1);
    expect(nav.getActiveItem()).toBeUndefined();
  });

  it('resets when the requested index is disabled', () => {
    const nav = createNavigation([{}, { disabled: true }]);

    nav.set(0);
    expect(nav.set(1)).toBe(-1);
    expect(nav.getIndex()).toBe(-1);
  });

  it('supports multi-character typeahead without moving past the current match', () => {
    const items = [{ label: 'Apple' }, { label: 'Apricot' }, { label: 'Banana' }];
    const nav = createNavigation(items, {
      typeahead: { getLabel: (item) => item.label ?? '' },
    });

    expect(nav.handleKeydown(new KeyboardEvent('keydown', { key: 'a' }))).toBe(true);
    expect(nav.getIndex()).toBe(0);
    expect(nav.handleKeydown(new KeyboardEvent('keydown', { key: 'p' }))).toBe(true);
    expect(nav.getIndex()).toBe(0);
  });

  it('cycles repeated typeahead characters without waiting for timeout', () => {
    const items = [{ label: 'Apple' }, { label: 'Avocado' }, { label: 'Banana' }];
    const nav = createNavigation(items, {
      typeahead: { getLabel: (item) => item.label ?? '' },
    });

    nav.handleKeydown(new KeyboardEvent('keydown', { key: 'a' }));
    expect(nav.getIndex()).toBe(0);
    nav.handleKeydown(new KeyboardEvent('keydown', { key: 'a' }));
    expect(nav.getIndex()).toBe(1);
    nav.handleKeydown(new KeyboardEvent('keydown', { key: 'a' }));
    expect(nav.getIndex()).toBe(0);
  });

  it('starts a new typeahead sequence after the configured delay', () => {
    vi.useFakeTimers();

    const items = [{ label: 'Apple' }, { label: 'Avocado' }];
    const nav = createNavigation(items, {
      typeahead: { delayMs: 100, getLabel: (item) => item.label ?? '' },
    });

    nav.handleKeydown(new KeyboardEvent('keydown', { key: 'a' }));
    expect(nav.getIndex()).toBe(0);

    vi.advanceTimersByTime(101);
    nav.handleKeydown(new KeyboardEvent('keydown', { key: 'a' }));
    expect(nav.getIndex()).toBe(1);

    vi.useRealTimers();
  });

  it('falls back to a fresh character when a multi-character search has no match', () => {
    const items = [{ label: 'Apple' }, { label: 'Banana' }];
    const nav = createNavigation(items, {
      typeahead: { getLabel: (item) => item.label ?? '' },
    });

    nav.handleKeydown(new KeyboardEvent('keydown', { key: 'z' }));
    expect(nav.handleKeydown(new KeyboardEvent('keydown', { key: 'b' }))).toBe(true);
    expect(nav.getIndex()).toBe(1);
  });

  it('skips disabled items during typeahead', () => {
    const items = [{ disabled: true, label: 'Banana' }, { label: 'Blueberry' }];
    const nav = createNavigation(items, {
      typeahead: { getLabel: (item) => item.label ?? '' },
    });

    expect(nav.handleKeydown(new KeyboardEvent('keydown', { key: 'b' }))).toBe(true);
    expect(nav.getIndex()).toBe(1);
  });

  it('ignores typeahead modifier keys and non-character keys', () => {
    const nav = createNavigation([{ label: 'Alpha' }], {
      typeahead: { getLabel: (item) => item.label ?? '' },
    });

    expect(nav.handleKeydown(new KeyboardEvent('keydown', { ctrlKey: true, key: 'a' }))).toBe(false);
    expect(nav.handleKeydown(new KeyboardEvent('keydown', { key: 'Enter' }))).toBe(false);
  });

  it('resets typeahead after directional navigation', () => {
    const items = [{ label: 'Apple' }, { label: 'Apricot' }, { label: 'Banana' }];
    const nav = createNavigation(items, {
      typeahead: { getLabel: (item) => item.label ?? '' },
    });

    nav.handleKeydown(new KeyboardEvent('keydown', { key: 'a' }));
    nav.handleKeydown(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    nav.handleKeydown(new KeyboardEvent('keydown', { key: 'a' }));

    expect(nav.getIndex()).toBe(0);
  });

  it('becomes terminal when disposed', () => {
    const onNavigate = vi.fn();
    const nav = createNavigation([{}, {}], { onNavigate });

    nav.set(0);
    nav.dispose();

    expect(nav.disposed).toBe(true);
    expect(nav.disposalSignal.aborted).toBe(true);
    expect(nav.getIndex()).toBe(-1);
    expect(nav.getActiveItem()).toBeUndefined();
    expect(nav.set(1)).toBe(-1);
    expect(nav.navigate('next')).toBe(-1);
    expect(nav.handleKeydown(new KeyboardEvent('keydown', { key: 'ArrowDown' }))).toBe(false);
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('starts disposed when given an already-aborted signal', () => {
    const controller = new AbortController();
    controller.abort();

    const nav = createNavigation([{}], { signal: controller.signal });

    expect(nav.disposed).toBe(true);
    expect(nav.disposalSignal.aborted).toBe(true);
  });

  it('disposes when its external signal aborts', () => {
    const controller = new AbortController();
    const nav = createNavigation([{}], { signal: controller.signal });

    controller.abort();

    expect(nav.disposed).toBe(true);
  });
});

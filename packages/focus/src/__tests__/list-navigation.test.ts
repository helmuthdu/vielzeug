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

    expect(nav.navigate('first')?.index).toBe(1);
    expect(nav.navigate('last')?.index).toBe(2);
  });

  it('moves next and previous from the current index', () => {
    const nav = createNavigation([{}, { disabled: true }, {}]);

    nav.set(0);
    expect(nav.navigate('next')?.index).toBe(2);
    expect(nav.navigate('prev')?.index).toBe(0);
  });

  it('wraps only when loop is enabled', () => {
    const looping = createNavigation([{}, {}], { loop: true });
    const bounded = createNavigation([{}, {}]);

    looping.set(1);
    expect(looping.navigate('next')?.index).toBe(0);

    bounded.set(1);
    expect(bounded.navigate('next')).toBeNull();
  });

  it('returns the selected item and the operation snapshot from navigate', () => {
    const first = { label: 'first' };
    const second = { label: 'second' };
    const nav = createNavigation([first, second]);

    nav.set(0);

    const change = nav.navigate('next');

    expect(change).toEqual({
      action: 'next',
      event: undefined,
      index: 1,
      item: second,
    });
  });

  it('does not infer disabled state from an item property', () => {
    const nav = createListNavigation({ getItems: () => [{ disabled: true }, { disabled: false }] });

    expect(nav.navigate('first')?.index).toBe(0);
  });

  it('supports rtl key mirroring with dynamic direction', () => {
    let dir: 'ltr' | 'rtl' = 'ltr';
    const nav = createNavigation([{}, {}], {
      direction: () => dir,
      orientation: () => 'horizontal',
    });

    nav.set(0);
    nav.handleKeydown(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    expect(nav.getIndex()).toBe(1);

    dir = 'rtl';
    nav.handleKeydown(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    expect(nav.getIndex()).toBe(0);
  });

  it('supports custom key bindings', () => {
    const nav = createNavigation([{}, {}], {
      keys: { next: ['j'], prev: ['k'] },
    });

    nav.set(0);
    expect(nav.handleKeydown(new KeyboardEvent('keydown', { key: 'j' }))).not.toBeNull();
    expect(nav.getIndex()).toBe(1);
  });

  it('prevents default for recognized navigation keys', () => {
    const nav = createNavigation([{}]);
    const event = new KeyboardEvent('keydown', { cancelable: true, key: 'ArrowDown' });

    nav.handleKeydown(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it('returns null for keydown when disabled', () => {
    const nav = createNavigation([{}, {}], { disabled: () => true });

    expect(nav.handleKeydown(new KeyboardEvent('keydown', { key: 'ArrowDown' }))).toBeNull();
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

    expect(nav.handleKeydown(new KeyboardEvent('keydown', { key: 'a' }))).not.toBeNull();
    expect(nav.getIndex()).toBe(0);
    expect(nav.handleKeydown(new KeyboardEvent('keydown', { key: 'p' }))).not.toBeNull();
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
    expect(nav.handleKeydown(new KeyboardEvent('keydown', { key: 'b' }))).not.toBeNull();
    expect(nav.getIndex()).toBe(1);
  });

  it('skips disabled items during typeahead', () => {
    const items = [{ disabled: true, label: 'Banana' }, { label: 'Blueberry' }];
    const nav = createNavigation(items, {
      typeahead: { getLabel: (item) => item.label ?? '' },
    });

    expect(nav.handleKeydown(new KeyboardEvent('keydown', { key: 'b' }))).not.toBeNull();
    expect(nav.getIndex()).toBe(1);
  });

  it('ignores typeahead modifier keys and non-character keys', () => {
    const nav = createNavigation([{ label: 'Alpha' }], {
      typeahead: { getLabel: (item) => item.label ?? '' },
    });

    expect(nav.handleKeydown(new KeyboardEvent('keydown', { ctrlKey: true, key: 'a' }))).toBeNull();
    expect(nav.handleKeydown(new KeyboardEvent('keydown', { key: 'Enter' }))).toBeNull();
  });

  it('distinguishes handled boundary keys from index changes', () => {
    const nav = createNavigation([{}]);
    nav.set(0);
    const event = new KeyboardEvent('keydown', { cancelable: true, key: 'ArrowDown' });

    const result = nav.handleKeydown(event);

    expect(result).toEqual({ change: null, handled: true });
    expect(event.defaultPrevented).toBe(true);
  });

  it('optionally prevents default for successful typeahead', () => {
    const nav = createNavigation([{ label: 'Alpha' }], {
      typeahead: { getLabel: (item) => item.label ?? '', preventDefault: true },
    });
    const event = new KeyboardEvent('keydown', { cancelable: true, key: 'a' });

    expect(nav.handleKeydown(event)?.change?.index).toBe(0);
    expect(event.defaultPrevented).toBe(true);
  });

  it('ignores already handled and composing events', () => {
    const nav = createNavigation([{ label: 'Alpha' }], { typeahead: { getLabel: (item) => item.label ?? '' } });
    const handled = new KeyboardEvent('keydown', { cancelable: true, key: 'ArrowDown' });
    handled.preventDefault();
    const composing = new KeyboardEvent('keydown', { key: 'a' });
    Object.defineProperty(composing, 'isComposing', { value: true });

    expect(nav.handleKeydown(handled)).toBeNull();
    expect(nav.handleKeydown(composing)).toBeNull();
    expect(nav.getIndex()).toBe(-1);
  });

  it('rejects conflicting keys and invalid typeahead delays', () => {
    expect(() => createNavigation([{}], { keys: { next: ['j'], prev: ['j'] } })).toThrow(/assigned/);
    expect(() =>
      createNavigation([{ label: 'Alpha' }], { typeahead: { delayMs: 0, getLabel: (item) => item.label ?? '' } }),
    ).toThrow(/delay/);
  });

  it('rejects fractional indexes without corrupting active state', () => {
    const nav = createNavigation([{}, {}]);
    nav.set(0);

    expect(nav.set(0.5)).toBe(-1);
    expect(nav.getIndex()).toBe(-1);
    expect(nav.getActiveItem()).toBeUndefined();
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
});

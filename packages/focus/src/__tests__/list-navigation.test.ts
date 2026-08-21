import { createListNavigation } from '../list-navigation';

type Item = { disabled?: boolean; label?: string };

describe('createListNavigation', () => {
  it('navigates first/last while skipping disabled items', () => {
    const items: Item[] = [{ disabled: true }, {}, {}];
    const nav = createListNavigation({ getItems: () => items });

    expect(nav.navigate('first')).toBe(1);
    expect(nav.navigate('last')).toBe(2);
  });

  it('moves next/prev from current index', () => {
    const items: Item[] = [{}, { disabled: true }, {}];
    const nav = createListNavigation({ getItems: () => items });

    nav.set(0);
    expect(nav.navigate('next')).toBe(2);
    expect(nav.navigate('prev')).toBe(0);
  });

  it('wraps when loop is enabled', () => {
    const items: Item[] = [{}, {}, {}];
    const nav = createListNavigation({ getItems: () => items, loop: true });

    nav.set(2);
    expect(nav.navigate('next')).toBe(0);
    nav.set(0);
    expect(nav.navigate('prev')).toBe(2);
  });

  it('does not wrap when loop is disabled', () => {
    const items: Item[] = [{}, {}];
    const nav = createListNavigation({ getItems: () => items, loop: false });

    nav.set(1);
    expect(nav.navigate('next')).toBe(1);
    nav.set(0);
    expect(nav.navigate('prev')).toBe(0);
  });

  it('supports rtl key mirroring', () => {
    const items: Item[] = [{}, {}];
    const nav = createListNavigation({ direction: 'rtl', getItems: () => items, orientation: 'horizontal' });

    nav.set(0);

    expect(nav.handleKeydown(new KeyboardEvent('keydown', { key: 'ArrowLeft' }))).toBe(true);
    expect(nav.getIndex()).toBe(1);
    expect(nav.handleKeydown(new KeyboardEvent('keydown', { key: 'ArrowRight' }))).toBe(true);
    expect(nav.getIndex()).toBe(0);
  });

  it('supports typeahead', () => {
    const items = [{ label: 'alpha' }, { label: 'beta' }, { label: 'gamma' }];
    const nav = createListNavigation({
      getItemLabel: (item) => item.label,
      getItems: () => items,
    });

    expect(nav.handleKeydown(new KeyboardEvent('keydown', { key: 'b' }))).toBe(true);
    expect(nav.getIndex()).toBe(1);
  });

  it('typeahead matches case-insensitively', () => {
    const items = [{ label: 'Apple' }, { label: 'Banana' }];
    const nav = createListNavigation({ getItemLabel: (item) => item.label, getItems: () => items });

    expect(nav.handleKeydown(new KeyboardEvent('keydown', { key: 'B' }))).toBe(true);
    expect(nav.getIndex()).toBe(1);
  });

  it('typeahead returns false when no match exists', () => {
    const items = [{ label: 'alpha' }];
    const nav = createListNavigation({ getItemLabel: (item) => item.label, getItems: () => items });

    expect(nav.handleKeydown(new KeyboardEvent('keydown', { key: 'z' }))).toBe(false);
  });

  it('typeahead accumulates characters for multi-character prefix matching', () => {
    const items = [{ label: 'Apple' }, { label: 'Avocado' }, { label: 'Apricot' }];
    const nav = createListNavigation({ getItemLabel: (item) => item.label, getItems: () => items });

    nav.handleKeydown(new KeyboardEvent('keydown', { key: 'a' }));
    expect(nav.getIndex()).toBe(0);
    nav.handleKeydown(new KeyboardEvent('keydown', { key: 'p' }));
    // buffer is now 'ap' — searches forward from 0+1=1, matches Apricot at index 2
    expect(nav.getIndex()).toBe(2);
  });

  it('typeahead searches forward from current and wraps around', () => {
    vi.useFakeTimers();

    const items = [{ label: 'Apple' }, { label: 'Avocado' }, { label: 'Apricot' }];
    const nav = createListNavigation({ getItemLabel: (item) => item.label, getItems: () => items });

    nav.handleKeydown(new KeyboardEvent('keydown', { key: 'a' }));
    expect(nav.getIndex()).toBe(0);

    // Let the buffer reset timer expire so the next 'a' starts a fresh search
    vi.advanceTimersByTime(600);
    nav.handleKeydown(new KeyboardEvent('keydown', { key: 'a' }));
    expect(nav.getIndex()).toBe(1);

    vi.advanceTimersByTime(600);
    nav.handleKeydown(new KeyboardEvent('keydown', { key: 'a' }));
    expect(nav.getIndex()).toBe(2);

    vi.useRealTimers();
  });

  it('typeahead skips disabled items', () => {
    const items = [{ disabled: true, label: 'Banana' }, { label: 'Blueberry' }];
    const nav = createListNavigation({ getItemLabel: (item) => item.label, getItems: () => items });

    expect(nav.handleKeydown(new KeyboardEvent('keydown', { key: 'b' }))).toBe(true);
    expect(nav.getIndex()).toBe(1);
  });

  it('typeahead ignores modifier keys', () => {
    const items = [{ label: 'alpha' }];
    const nav = createListNavigation({ getItemLabel: (item) => item.label, getItems: () => items });

    expect(nav.handleKeydown(new KeyboardEvent('keydown', { ctrlKey: true, key: 'a' }))).toBe(false);
    expect(nav.handleKeydown(new KeyboardEvent('keydown', { altKey: true, key: 'a' }))).toBe(false);
    expect(nav.handleKeydown(new KeyboardEvent('keydown', { key: 'a', metaKey: true }))).toBe(false);
  });

  it('typeahead ignores multi-character keys not in the keymap', () => {
    const items = [{ label: 'alpha' }];
    const nav = createListNavigation({ getItemLabel: (item) => item.label, getItems: () => items });

    // 'Enter' is multi-character and not a navigation key — typeahead must reject it
    expect(nav.handleKeydown(new KeyboardEvent('keydown', { key: 'Enter' }))).toBe(false);
  });

  it('typeahead buffer expires after the reset window', () => {
    vi.useFakeTimers();

    const items = [{ label: 'alpha' }, { label: 'avocado' }];
    const nav = createListNavigation({ getItemLabel: (item) => item.label, getItems: () => items });

    nav.handleKeydown(new KeyboardEvent('keydown', { key: 'a' }));
    expect(nav.getIndex()).toBe(0);

    // Buffer expires — next 'a' searches forward from 0+1=1, matching avocado
    vi.advanceTimersByTime(600);
    nav.handleKeydown(new KeyboardEvent('keydown', { key: 'a' }));
    expect(nav.getIndex()).toBe(1);

    vi.useRealTimers();
  });

  it('typeahead clears pending reset timer when signal aborts', () => {
    vi.useFakeTimers();

    const controller = new AbortController();
    const items = [{ label: 'alpha' }, { label: 'avocado' }];
    const nav = createListNavigation({
      getItemLabel: (item) => item.label,
      getItems: () => items,
      signal: controller.signal,
    });

    nav.handleKeydown(new KeyboardEvent('keydown', { key: 'a' }));
    expect(nav.getIndex()).toBe(0);

    controller.abort();
    vi.advanceTimersByTime(1000);

    nav.handleKeydown(new KeyboardEvent('keydown', { key: 'a' }));
    expect(nav.getIndex()).toBe(1);

    vi.useRealTimers();
  });

  it('returns false for keydown when disabled', () => {
    const items: Item[] = [{}, {}];
    const nav = createListNavigation({ disabled: true, getItems: () => items });

    expect(nav.handleKeydown(new KeyboardEvent('keydown', { key: 'ArrowDown' }))).toBe(false);
    expect(nav.getIndex()).toBe(-1);
  });

  it('disposes and aborts its disposal signal', () => {
    const nav = createListNavigation({ getItems: () => [] });

    nav.dispose();

    expect(nav.disposed).toBe(true);
    expect(nav.disposalSignal.aborted).toBe(true);
  });

  it('normalizes stale index when items shrink', () => {
    const items: Item[] = [{}, {}, {}];
    const nav = createListNavigation({ getItems: () => items });

    nav.set(2);
    items.pop();
    items.pop();

    expect(nav.getIndex()).toBe(-1);
    expect(nav.getActiveItem()).toBeUndefined();
  });

  it('resets index when navigating first on all-disabled list', () => {
    const items: Item[] = [{}, { disabled: true }, { disabled: true }];
    const nav = createListNavigation({ getItems: () => items });

    nav.set(0);
    expect(nav.navigate('first')).toBe(0);

    items[0]!.disabled = true;
    expect(nav.navigate('first')).toBe(-1);
    expect(nav.getIndex()).toBe(-1);
  });

  it('supports overriding typeahead delay', () => {
    vi.useFakeTimers();

    const items = [{ label: 'alpha' }, { label: 'alpine' }, { label: 'beta' }];
    const nav = createListNavigation({
      getItemLabel: (item) => item.label,
      getItems: () => items,
      typeaheadDelayMs: 100,
    });

    nav.handleKeydown(new KeyboardEvent('keydown', { key: 'a' }));
    expect(nav.getIndex()).toBe(0);
    vi.advanceTimersByTime(150);

    nav.handleKeydown(new KeyboardEvent('keydown', { key: 'a' }));
    expect(nav.getIndex()).toBe(1);

    vi.useRealTimers();
  });

  it('falls back to default typeahead delay when an invalid delay is provided', () => {
    vi.useFakeTimers();

    const items = [{ label: 'alpha' }, { label: 'alpine' }, { label: 'beta' }];
    const nav = createListNavigation({
      getItemLabel: (item) => item.label,
      getItems: () => items,
      typeaheadDelayMs: 0,
    });

    nav.handleKeydown(new KeyboardEvent('keydown', { key: 'a' }));
    expect(nav.getIndex()).toBe(0);
    vi.advanceTimersByTime(150);

    nav.handleKeydown(new KeyboardEvent('keydown', { key: 'a' }));
    expect(nav.getIndex()).toBe(0);

    vi.advanceTimersByTime(500);
    nav.handleKeydown(new KeyboardEvent('keydown', { key: 'a' }));
    expect(nav.getIndex()).toBe(1);

    vi.useRealTimers();
  });
});

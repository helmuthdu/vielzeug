import { createGridNavigation, type GridNavigationOptions } from '../index';

type Item = { id: string };

const items: Item[] = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }, { id: 'e' }, { id: 'f' }];

const createGrid = (options: Partial<GridNavigationOptions<Item>> = {}) =>
  createGridNavigation({ columns: 3, getItems: () => items, ...options });

describe('createGridNavigation', () => {
  it('moves one item horizontally with next and prev', () => {
    const nav = createGrid();

    nav.set(0);
    expect(nav.navigate('next')?.index).toBe(1);
    expect(nav.navigate('prev')?.index).toBe(0);
  });

  it('moves one row vertically by the resolved column count', () => {
    const nav = createGrid();

    nav.set(0);
    expect(nav.navigate('nextRow')?.index).toBe(3);
    expect(nav.navigate('prevRow')?.index).toBe(0);
  });

  it('resolves columns through a getter on every navigation', () => {
    let columns = 3;
    const nav = createGrid({ columns: () => columns });

    nav.set(0);
    expect(nav.navigate('nextRow')?.index).toBe(3);

    columns = 2;
    expect(nav.navigate('prevRow')?.index).toBe(1);
  });

  it('clamps at the grid edges by default', () => {
    const nav = createGrid();

    nav.set(5);
    expect(nav.navigate('next')).toBeNull();
    expect(nav.navigate('nextRow')).toBeNull();
    expect(nav.getIndex()).toBe(5);

    nav.set(0);
    expect(nav.navigate('prev')).toBeNull();
    expect(nav.navigate('prevRow')).toBeNull();
    expect(nav.getIndex()).toBe(0);
  });

  it('wraps around the grid edges by flat index when loop is enabled', () => {
    const nav = createGrid({ loop: true });

    nav.set(5);
    expect(nav.navigate('next')?.index).toBe(0);
    expect(nav.navigate('nextRow')?.index).toBe(3);

    nav.set(0);
    expect(nav.navigate('prev')?.index).toBe(5);
    expect(nav.navigate('prevRow')?.index).toBe(2);
  });

  it('jumps to the first and last item', () => {
    const nav = createGrid();

    expect(nav.navigate('last')?.index).toBe(5);
    expect(nav.navigate('first')?.index).toBe(0);
  });

  it('reads the active index from getActiveIndex instead of internal state', () => {
    let active = 1;
    const nav = createGrid({ getActiveIndex: () => active });

    nav.set(4);
    expect(nav.handleKeydown(new KeyboardEvent('keydown', { key: 'ArrowDown' }))?.change?.index).toBe(4);

    active = 4;
    expect(nav.getIndex()).toBe(4);
    expect(nav.navigate('next')?.index).toBe(5);
  });

  it('treats an out-of-range active index as none', () => {
    const nav = createGrid({ getActiveIndex: () => 99 });

    expect(nav.getIndex()).toBe(-1);
    expect(nav.getActiveItem()).toBeUndefined();
  });

  it('starts on the first item for forward moves and the last for backward moves from none', () => {
    const forward = createGrid();
    const backward = createGrid();

    expect(forward.navigate('next')?.index).toBe(0);
    expect(backward.navigate('prev')?.index).toBe(5);
  });

  it('focus keys map through handleKeydown and prevent default', () => {
    const nav = createGrid();
    const event = new KeyboardEvent('keydown', { cancelable: true, key: 'ArrowDown' });

    nav.set(0);
    const result = nav.handleKeydown(event);

    expect(result?.change?.index).toBe(3);
    expect(event.defaultPrevented).toBe(true);
  });

  it('prevents default at the edges even when no move happens', () => {
    const nav = createGrid();
    const event = new KeyboardEvent('keydown', { cancelable: true, key: 'ArrowDown' });

    nav.set(5);
    const result = nav.handleKeydown(event);

    expect(result?.change).toBeNull();
    expect(result?.handled).toBe(true);
    expect(event.defaultPrevented).toBe(true);
  });

  it('returns null for non-navigation keys', () => {
    const nav = createGrid();

    nav.set(0);
    expect(nav.handleKeydown(new KeyboardEvent('keydown', { key: 'a' }))).toBeNull();
    expect(nav.getIndex()).toBe(0);
  });

  it('returns null for keydown when disabled', () => {
    const nav = createGrid({ disabled: () => true });

    expect(nav.handleKeydown(new KeyboardEvent('keydown', { key: 'ArrowDown' }))).toBeNull();
  });

  it('mirrors horizontal keys in rtl direction', () => {
    const nav = createGrid({ direction: 'rtl' });

    nav.set(1);
    nav.handleKeydown(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    expect(nav.getIndex()).toBe(0);
  });

  it('supports custom key bindings and rejects double assignment', () => {
    const nav = createGrid({ keys: { next: ['l'], prevRow: ['k'] } });

    nav.set(3);
    nav.handleKeydown(new KeyboardEvent('keydown', { key: 'l' }));
    expect(nav.getIndex()).toBe(4);

    nav.handleKeydown(new KeyboardEvent('keydown', { key: 'k' }));
    expect(nav.getIndex()).toBe(1);

    expect(() => createGrid({ keys: { next: ['l'], prev: ['l'] } })).toThrowError(/assigned to both/);
  });

  it('returns the operation snapshot from navigate', () => {
    const nav = createGrid();

    nav.set(0);
    expect(nav.navigate('nextRow')).toEqual({
      action: 'nextRow',
      event: undefined,
      index: 3,
      item: items[3],
    });
  });

  it('returns null for navigation over an empty grid', () => {
    const nav = createGrid({ getItems: () => [] });

    expect(nav.navigate('first')).toBeNull();
    expect(nav.handleKeydown(new KeyboardEvent('keydown', { key: 'Home' }))?.change).toBeNull();
    expect(nav.getIndex()).toBe(-1);
  });

  it('throws a config error when columns resolves below one', () => {
    const nav = createGrid({ columns: () => 0 });

    nav.set(0);
    expect(() => nav.navigate('nextRow')).toThrowError(/positive integer/);
  });
});

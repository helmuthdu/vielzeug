import { createQuickLookGrid, type QuickLookGridOptions } from '../quick-look-grid';

type Tile = { item: HTMLElement; label: string };

const createTiles = (count: number): Tile[] => {
  const tiles: Tile[] = [];
  for (let index = 0; index < count; index += 1) {
    const item = document.createElement('button');
    item.textContent = `tile-${index}`;
    document.body.appendChild(item);
    tiles.push({ item, label: `tile-${index}` });
  }
  return tiles;
};

const key = (target: HTMLElement, init: KeyboardEventInit = {}): KeyboardEvent => {
  const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init });
  target.dispatchEvent(event);
  return event;
};

describe('createQuickLookGrid', () => {
  let tiles: Tile[] = [];
  let listener: ((event: KeyboardEvent) => void) | null = null;

  afterEach(() => {
    if (listener) document.body.removeEventListener('keydown', listener);
    listener = null;
    for (const { item } of tiles) item.remove();
    tiles = [];
  });

  const createGrid = (options: Partial<QuickLookGridOptions> = {}) => {
    tiles = createTiles(6);
    const inspected: Array<[string, number]> = [];
    const grid = createQuickLookGrid({
      columns: 3,
      getItems: () => tiles.map(({ item }) => item),
      onInspect: (item, index) => inspected.push([item.textContent ?? '', index]),
      ...options,
    });
    listener = (event) => grid.handleKeydown(event);
    document.body.addEventListener('keydown', listener);
    return { inspected, tiles };
  };

  it('moves focus with the arrow keys', () => {
    const { tiles: items } = createGrid();

    items[0]?.item.focus();
    key(items[0].item, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(items[1]?.item);

    key(items[1].item, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(items[4]?.item);

    key(items[4].item, { key: 'End' });
    expect(document.activeElement).toBe(items[5]?.item);
  });

  it('opens the Quick Look for the focused item on Space', () => {
    const { inspected, tiles: items } = createGrid();

    items[2]?.item.focus();
    const event = key(items[2].item, { key: ' ' });

    expect(inspected).toEqual([['tile-2', 2]]);
    expect(event.defaultPrevented).toBe(true);
  });

  it('opens the Quick Look for the item under the event, not the active item', () => {
    const { inspected, tiles: items } = createGrid();

    items[0]?.item.focus();
    key(items[3].item, { key: ' ' });

    expect(inspected).toEqual([['tile-3', 3]]);
    expect(document.activeElement).toBe(items[0]?.item);
  });

  it('resolves the item through a wrapper element', () => {
    const { inspected, tiles: items } = createGrid();

    const inner = document.createElement('span');
    items[1]?.item.appendChild(inner);

    key(inner, { key: ' ' });
    expect(inspected).toEqual([['tile-1', 1]]);

    inner.remove();
  });

  it('falls back to the active index when the target is outside the items', () => {
    const wrapper = document.createElement('div');
    document.body.appendChild(wrapper);
    const { inspected } = createGrid({ getActiveIndex: () => 4 });

    key(wrapper, { key: ' ' });
    expect(inspected).toEqual([['tile-4', 4]]);

    wrapper.remove();
  });

  it('ignores Space when no item resolves', () => {
    const { inspected } = createGrid({ getActiveIndex: () => -1 });

    const event = key(document.body, { key: ' ' });
    expect(inspected).toEqual([]);
    expect(event.defaultPrevented).toBe(false);
  });

  it('stops an inspected key from bubbling past the grid', () => {
    const { tiles: items } = createGrid();
    const reached: string[] = [];
    const guard = (event: Event): void => reached.push(event.key);
    document.documentElement.addEventListener('keydown', guard);

    items[1]?.item.focus();
    key(items[1].item, { key: ' ' });
    expect(reached).toEqual([]);

    key(items[1].item, { key: 'ArrowRight' });
    expect(reached).toEqual(['ArrowRight']);

    document.documentElement.removeEventListener('keydown', guard);
  });

  it('honours a custom inspect key', () => {
    const { inspected, tiles: items } = createGrid({ inspectKey: 'p' });

    items[0]?.item.focus();
    key(items[0].item, { key: 'p' });
    expect(inspected).toEqual([['tile-0', 0]]);

    key(items[0].item, { key: ' ' });
    expect(inspected).toHaveLength(1);
  });

  it('passes modifier chords through untouched', () => {
    const { inspected, tiles: items } = createGrid();

    items[0]?.item.focus();
    const event = key(items[0].item, { key: ' ', metaKey: true });
    expect(inspected).toEqual([]);
    expect(event.defaultPrevented).toBe(false);
  });

  it('does nothing while disabled', () => {
    const { inspected, tiles: items } = createGrid({ disabled: true });

    items[0]?.item.focus();
    key(items[0].item, { key: ' ' });
    key(items[0].item, { key: 'ArrowRight' });

    expect(inspected).toEqual([]);
    expect(document.activeElement).toBe(items[0]?.item);
  });

  it('measures the row length at the active item when columns is omitted', () => {
    tiles = createTiles(6);
    const inspected: string[] = [];
    const grid = createQuickLookGrid({
      getItems: () => tiles.map(({ item }) => item),
      onInspect: (item) => inspected.push(item.textContent ?? ''),
    });
    listener = (event) => grid.handleKeydown(event);
    document.body.addEventListener('keydown', listener);

    // jsdom reports every rect at top 0, so every tile shares the active tile's row:
    // a vertical step moves by the full row length (the item count).
    tiles[0]?.item.focus();
    key(tiles[0].item, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(tiles[5]?.item);
  });

  it('wraps around the grid when loop is set', () => {
    const { tiles: items } = createGrid({ loop: true });

    items[5]?.item.focus();
    key(items[5].item, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(items[0]?.item);
  });

  it('clamps at the grid edges without loop', () => {
    const { tiles: items } = createGrid();

    items[0]?.item.focus();
    key(items[0].item, { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(items[0]?.item);
  });
});

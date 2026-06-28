import { batch, effect, signal, store, storeWithHistory } from '../';

describe('storeWithHistory', () => {
  it('records and replays history via explicit push()+undo/redo', () => {
    const h = storeWithHistory({ count: 0 });

    h.store.patch({ count: 1 });
    h.push();
    h.store.patch({ count: 2 });
    h.push();
    expect(h.store.peek().count).toBe(2);
    expect(h.historyLength).toBe(3);
    h.undo();
    expect(h.store.peek().count).toBe(1);
    h.redo();
    expect(h.store.peek().count).toBe(2);
  });

  it('historyAt returns snapshot at index', () => {
    const h = storeWithHistory({ x: 'a' });

    h.store.patch({ x: 'b' });
    h.push();
    expect(h.historyAt(0)!.state.x).toBe('a');
    expect(h.historyAt(1)!.state.x).toBe('b');
  });

  it('undo does nothing at oldest state', () => {
    const h = storeWithHistory({ n: 0 });

    h.undo();
    expect(h.store.peek().n).toBe(0);
  });

  it('redo does nothing at newest state', () => {
    const h = storeWithHistory({ n: 0 });

    h.store.patch({ n: 1 });
    h.redo();
    expect(h.store.peek().n).toBe(1);
  });

  it('caps history at maxHistory', () => {
    const h = storeWithHistory({ n: 0 }, { maxHistory: 3 });

    h.store.patch({ n: 1 });
    h.push();
    h.store.patch({ n: 2 });
    h.push();
    h.store.patch({ n: 3 });
    h.push();
    h.store.patch({ n: 4 });
    h.push();
    expect(h.historyLength).toBe(3);
  });

  it('push() after lens write saves an explicit snapshot', () => {
    const h = storeWithHistory({ name: 'Alice', score: 0 });
    const scoreLens = h.store.lens('score');

    scoreLens.value = 10;
    h.push();
    expect(h.store.peek().score).toBe(10);
    expect(h.historyLength).toBe(2);
    h.undo();
    expect(h.store.peek().score).toBe(0);
  });

  it('multiple mutations before push() save a single checkpoint', () => {
    const h = storeWithHistory({ count: 0 });

    h.store.patch({ count: 1 });
    h.push();
    h.store.patch({ count: 2 });
    h.push();
    expect(h.historyLength).toBe(3);
    expect(h.store.peek().count).toBe(2);
    h.undo();
    expect(h.store.peek().count).toBe(1);
    h.undo();
    expect(h.store.peek().count).toBe(0);
  });

  it('reset() restores initial state; push() saves checkpoint', () => {
    const h = storeWithHistory({ count: 5 });

    h.store.patch({ count: 10 });
    h.push();
    h.store.reset();
    h.push();
    expect(h.store.peek().count).toBe(5);
    expect(h.historyLength).toBe(3);
  });

  it('reset() followed by push() is undoable', () => {
    const h = storeWithHistory({ count: 5 });

    h.store.patch({ count: 10 });
    h.push();
    h.store.reset();
    h.push();
    h.undo();
    expect(h.store.peek().count).toBe(10);
  });

  it('historyAt(-1) returns undefined', () => {
    const h = storeWithHistory({ n: 0 });

    expect(h.historyAt(-1)).toBeUndefined();
  });

  it('historyAt(index >= historyLength) returns undefined', () => {
    const h = storeWithHistory({ n: 0 });

    h.store.patch({ n: 1 });
    h.push();
    expect(h.historyAt(2)).toBeUndefined();
    expect(h.historyAt(999)).toBeUndefined();
  });
});

describe('storeWithHistory — wrap existing store', () => {
  it('wraps an externally created store without owning it', () => {
    const s = store({ x: 0 });
    const h = storeWithHistory(s);

    s.patch({ x: 1 });
    h.push();
    expect(h.historyLength).toBe(2);
    expect(h.store).toBe(s);
  });

  it('dispose() of the adapter does NOT dispose the externally owned store', () => {
    const s = store({ x: 0 });
    const h = storeWithHistory(s);

    h.dispose();
    expect(s.disposed).toBe(false);
    void s.value;
    s.dispose();
  });
});

describe('storeWithHistory — canUndo / canRedo', () => {
  it('canUndo is false at initial state, true after push()', () => {
    const h = storeWithHistory({ n: 0 });

    expect(h.canUndo).toBe(false);
    h.store.patch({ n: 1 });
    h.push();
    expect(h.canUndo).toBe(true);
  });

  it('canRedo is false at newest state, true after undo', () => {
    const h = storeWithHistory({ n: 0 });

    h.store.patch({ n: 1 });
    h.push();
    expect(h.canRedo).toBe(false);
    h.undo();
    expect(h.canRedo).toBe(true);
  });

  it('canUndo becomes false after undoing all the way to initial state', () => {
    const h = storeWithHistory({ n: 0 });

    h.store.patch({ n: 1 });
    h.push();
    h.store.patch({ n: 2 });
    h.push();
    h.undo();
    h.undo();
    expect(h.canUndo).toBe(false);
    expect(h.store.peek().n).toBe(0);
  });

  it('canRedo becomes false after redoing all the way to newest state', () => {
    const h = storeWithHistory({ n: 0 });

    h.store.patch({ n: 1 });
    h.push();
    h.undo();
    expect(h.canRedo).toBe(true);
    h.redo();
    expect(h.canRedo).toBe(false);
  });

  it('canRedo becomes false after a new push() (redo history truncated)', () => {
    const h = storeWithHistory({ n: 0 });

    h.store.patch({ n: 1 });
    h.push();
    h.undo();
    expect(h.canRedo).toBe(true);
    h.store.patch({ n: 2 });
    h.push();
    expect(h.canRedo).toBe(false);
  });

  it('canUndo / canRedo are reactive — effect re-runs when cursor changes', () => {
    const h = storeWithHistory({ n: 0 });
    const undoLog: boolean[] = [];
    const redoLog: boolean[] = [];
    const stop = effect(() => {
      undoLog.push(h.canUndo);
      redoLog.push(h.canRedo);
    });

    expect(undoLog).toEqual([false]);
    expect(redoLog).toEqual([false]);
    h.store.patch({ n: 1 });
    h.push();
    expect(undoLog).toEqual([false, true]);
    expect(redoLog).toEqual([false, false]);
    h.undo();
    expect(undoLog).toEqual([false, true, false]);
    expect(redoLog).toEqual([false, false, true]);
    stop.dispose();
  });
});

describe('storeWithHistory — replace() + push()', () => {
  it('replace() followed by push() saves a snapshot', () => {
    const h = storeWithHistory({ count: 0 });

    h.store.replace((s) => ({ ...s, count: 99 }));
    h.push();
    expect(h.store.peek().count).toBe(99);
    expect(h.historyLength).toBe(2);
  });

  it('replace() followed by push() is undoable', () => {
    const h = storeWithHistory({ count: 0 });

    h.store.replace((s) => ({ ...s, count: 99 }));
    h.push();
    h.undo();
    expect(h.store.peek().count).toBe(0);
  });
});

describe('storeWithHistory — historyAt() after maxHistory trim', () => {
  it('returns undefined for out-of-bounds index after eviction', () => {
    const h = storeWithHistory({ count: 0 }, { maxHistory: 3 });

    h.store.patch({ count: 1 });
    h.push();
    h.store.patch({ count: 2 });
    h.push();
    h.store.patch({ count: 3 });
    h.push();
    expect(h.historyLength).toBe(3);
    expect(h.historyAt(-1)).toBeUndefined();
    expect(h.historyAt(3)).toBeUndefined();
  });

  it('oldest snapshot is the evicted one after maxHistory exceeded', () => {
    const h = storeWithHistory({ count: 0 }, { maxHistory: 2 });

    h.store.patch({ count: 1 });
    h.push();
    h.store.patch({ count: 2 });
    h.push();
    expect(h.historyAt(0)?.state).toEqual({ count: 1 });
    expect(h.historyAt(1)?.state).toEqual({ count: 2 });
  });
});

describe('storeWithHistory — batch() interaction', () => {
  it('batch() followed by push() saves a single checkpoint for all mutations', () => {
    const h = storeWithHistory({ a: 0, b: 0 });
    const aLens = h.store.lens('a');
    const bLens = h.store.lens('b');

    batch(() => {
      aLens.value = 1;
      bLens.value = 2;
    });
    h.push();
    expect(h.store.peek()).toEqual({ a: 1, b: 2 });
    expect(h.historyLength).toBe(2);
  });

  it('multiple patch() calls followed by one push() saves a single checkpoint', () => {
    const h = storeWithHistory({ x: 0 });

    batch(() => {
      h.store.patch({ x: 1 });
      h.store.patch({ x: 2 });
    });
    h.push();
    expect(h.store.peek().x).toBe(2);
    expect(h.historyLength).toBe(2);
  });
});

describe('storeWithHistory — dispose()', () => {
  it('dispose() is idempotent', () => {
    const h = storeWithHistory({ count: 0 });

    expect(() => {
      h.dispose();
      h.dispose();
    }).not.toThrow();
  });

  it('push() while disposed is a silent no-op — historyLength unchanged', () => {
    const h = storeWithHistory({ count: 0 });

    h.store.patch({ count: 1 });
    h.push();

    const lenBefore = h.historyLength;

    h.dispose();
    expect(() => h.push()).not.toThrow();
    expect(h.historyLength).toBe(lenBefore);
  });

  it('pushNamed() while disposed is a silent no-op', () => {
    const h = storeWithHistory({ count: 0 });

    h.store.patch({ count: 1 });
    h.push();

    const lenBefore = h.historyLength;

    h.dispose();
    expect(() => h.pushNamed('after-dispose')).not.toThrow();
    expect(h.historyLength).toBe(lenBefore);
  });

  it('undo() while disposed is a silent no-op', () => {
    const base = store({ count: 0 });
    const h = storeWithHistory(base);

    base.patch({ count: 1 });
    h.push();
    h.dispose();
    expect(() => h.undo()).not.toThrow();
    expect(base.peek().count).toBe(1);
  });

  it('redo() while disposed is a silent no-op', () => {
    const base = store({ count: 0 });
    const h = storeWithHistory(base);

    base.patch({ count: 1 });
    h.push();
    h.undo();

    const countBefore = base.peek().count;

    h.dispose();
    expect(() => h.redo()).not.toThrow();
    expect(base.peek().count).toBe(countBefore);
  });
});

describe('storeWithHistory — [Symbol.dispose]', () => {
  it('[Symbol.dispose] disposes the history adapter', () => {
    const h = storeWithHistory({ n: 0 });

    h.patch({ n: 1 });
    h.push();
    expect(h.canUndo).toBe(true);
    h[Symbol.dispose]();
    expect(h.canUndo).toBe(true);
  });

  it('[Symbol.dispose] is idempotent', () => {
    const h = storeWithHistory({ n: 0 });

    expect(() => {
      h[Symbol.dispose]();
      h[Symbol.dispose]();
    }).not.toThrow();
  });
});

import { batch, store, watch } from '../';

// ─── batch ────────────────────────────────────────────────────────────────────

describe('batch', () => {
  it('defers all notifications until the batch returns, then flushes once', () => {
    const s = store({ count: 0, name: 'Alice' });
    const listener = vi.fn();

    watch(s, listener);
    batch(() => {
      s.patch({ count: 1 });
      expect(listener).not.toHaveBeenCalled(); // mid-batch: silent
      s.patch({ name: 'Bob' });
    });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith({ count: 1, name: 'Bob' }, { count: 0, name: 'Alice' });
  });

  it('nested batches merge into the outermost; a single flush follows', () => {
    const s = store({ count: 0 });
    const listener = vi.fn();
    const count$ = s.select((st) => st.count);

    watch(count$, listener);
    batch(() => {
      s.patch({ count: 1 });
      batch(() => s.patch({ count: 2 }));
      s.patch({ count: 3 });
    });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(s.value.count).toBe(3);
    count$.dispose();
  });

  it('reads inside a batch see the latest in-batch value immediately', () => {
    const s = store({ count: 0 });

    batch(() => {
      s.patch({ count: 1 });
      expect(s.value.count).toBe(1);
      s.patch({ count: 2 });
      expect(s.value.count).toBe(2);
    });
  });

  it('returns the callback return value', () => {
    expect(batch(() => 'done')).toBe('done');
  });

  it('flushes pending notifications even when the callback throws', () => {
    const s = store({ count: 0 });
    const listener = vi.fn();
    const count$ = s.select((st) => st.count);

    watch(count$, listener);
    expect(() =>
      batch(() => {
        s.patch({ count: 1 });
        throw new Error('boom');
      }),
    ).toThrow('boom');
    expect(listener).toHaveBeenCalledTimes(1);
    expect(s.value.count).toBe(1);
    count$.dispose();
  });

  it('a selector-based watcher receives one notification with the final value', () => {
    const s = store({ count: 0, name: 'Alice' });
    const listener = vi.fn();
    const count$ = s.select((st) => st.count);

    watch(count$, listener);
    batch(() => {
      s.patch({ count: 1 });
      s.patch({ count: 2 });
      s.patch({ name: 'Bob' }); // unrelated key — no extra notification
    });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(2, 0);
    count$.dispose();
  });

  it('all flush subscribers are notified even when one throws', () => {
    const s = store({ count: 0 });
    const second = vi.fn();
    const count$ = s.select((st) => st.count);

    watch(count$, () => {
      throw new Error('flush-boom');
    });
    watch(count$, second);
    expect(() =>
      batch(() => {
        s.patch({ count: 1 });
      }),
    ).toThrow('flush-boom');
    expect(second).toHaveBeenCalledTimes(1);
    count$.dispose();
  });
});

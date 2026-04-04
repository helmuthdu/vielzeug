import { batch, computed, effect, onCleanup, signal, store, watch } from '../';

describe('stateit', () => {
  it('supports direct singleton primitives', () => {
    const count = signal(0);
    const seen: number[] = [];

    const stop = effect(() => {
      seen.push(count.value);
    });

    count.value = 1;
    expect(seen).toEqual([0, 1]);

    stop();
  });

  it('supports signal + computed + effect', () => {
    const n = signal(2);
    const doubled = computed(() => n.value * 2);
    const seen: number[] = [];

    const stop = effect(() => {
      seen.push(doubled.value);
    });

    n.value = 4;
    expect(seen).toEqual([4, 8]);

    stop();
    doubled.dispose();
  });

  it('computed throws when read after dispose', () => {
    const n = signal(1);
    const c = computed(() => n.value + 1);

    c.dispose();

    expect(() => c.value).toThrow(/disposed/);
  });

  it('effect teardown runs all disposers even when one throws', () => {
    const n = signal(0);
    const cleanA = vi.fn(() => {
      throw new Error('cleanA');
    });
    const cleanB = vi.fn();

    const stop = effect(() => {
      void n.value;
      onCleanup(cleanA);
      onCleanup(cleanB);
    });

    expect(() => {
      n.value = 1;
    }).toThrow(/cleanA/);
    expect(cleanA).toHaveBeenCalledTimes(1);
    expect(cleanB).toHaveBeenCalledTimes(1);

    stop();
    expect(cleanA).toHaveBeenCalledTimes(1);
    expect(cleanB).toHaveBeenCalledTimes(1);
  });

  it('onCleanup throws outside active effect', () => {
    expect(() => onCleanup(() => {})).toThrow(/inside an active effect/);
  });

  it('watch supports selector overload and auto-disposes internal computed', () => {
    const cart = store({ count: 0, label: 'x' });
    const listener = vi.fn();

    const stop = watch(
      cart,
      (state) => state.count,
      (next, prev) => {
        listener(next, prev);
      },
    );

    cart.patch({ label: 'y' });
    expect(listener).not.toHaveBeenCalled();

    cart.patch({ count: 2 });
    expect(listener).toHaveBeenCalledWith(2, 0);

    stop();
    cart.patch({ count: 3 });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('batch coalesces notifications', () => {
    const n = signal(0);
    const listener = vi.fn();

    watch(n, listener);

    batch(() => {
      n.value = 1;
      n.value = 2;
    });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(2, 0);
  });

  it('store is a small recipe with patch, update, and reset', () => {
    const user = store({ count: 0, profile: { name: 'Ada' } });

    user.patch({ count: 1 });
    expect(user.value.count).toBe(1);

    user.update((state) => ({ ...state, count: state.count + 1 }));
    expect(user.value.count).toBe(2);

    const external = user.value;

    external.profile.name = 'Grace';
    user.reset();

    expect(user.value).toEqual({ count: 0, profile: { name: 'Ada' } });
  });

  it('store throws when misused with non-object values', () => {
    expect(() => store(42 as unknown as { count: number })).toThrow(/plain object/);

    const ok = store({ count: 0 });

    expect(() => {
      ok.patch(null as unknown as Partial<{ count: number }>);
    }).toThrow(/plain object partial/);

    expect(() => {
      ok.update(() => 1 as unknown as { count: number });
    }).toThrow(/must return a plain object/);
  });
});

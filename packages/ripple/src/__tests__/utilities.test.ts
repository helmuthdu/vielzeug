import { computed, isComputed, isReactive, isSignal, isStore, readonly, signal, store } from '../';

describe('type guards', () => {
  it('isReactive returns true for signals, computed, stores, and readonly wrappers', () => {
    const c = computed(() => 1);

    expect(isReactive(signal(0))).toBe(true);
    expect(isReactive(c)).toBe(true);
    expect(isReactive(store({ x: 0 }))).toBe(true);
    expect(isReactive(readonly(signal(0)))).toBe(true);
    expect(isReactive({})).toBe(false);
    expect(isReactive(null)).toBe(false);
    c.dispose();
  });

  it('isSignal returns true for plain signals and readonly wrappers (not computed, not store)', () => {
    const c = computed(() => 1);
    const s = store({ x: 0 });
    const n = signal(0);

    expect(isSignal(n)).toBe(true);
    expect(isSignal(c)).toBe(false);
    expect(isSignal(s)).toBe(false);
    // readonly wraps a signal — has IS_SIGNAL, no IS_COMPUTED, no IS_STORE
    expect(isSignal(readonly(n))).toBe(true);
    expect(isSignal({})).toBe(false);
    expect(isSignal(null)).toBe(false);
    c.dispose();
  });

  it('isComputed returns true only for computed signals', () => {
    const c = computed(() => 1);

    expect(isComputed(c)).toBe(true);
    expect(isComputed(signal(0))).toBe(false);
    expect(isComputed(store({ x: 0 }))).toBe(false);
    expect(isComputed({})).toBe(false);
    expect(isComputed(readonly(signal(0)))).toBe(false);
    c.dispose();
  });

  it('isStore returns true only for stores', () => {
    const s = store({ x: 0 });

    expect(isStore(s)).toBe(true);
    expect(isStore(signal(0))).toBe(false);
    expect(isStore(computed(() => 1))).toBe(false);
    expect(isStore({})).toBe(false);
  });

  it('readonly() is recognized by isReactive and isSignal but NOT by isComputed', () => {
    const n = signal(0);

    expect(isReactive(readonly(n))).toBe(true);
    expect(isComputed(readonly(n))).toBe(false);
    // readonly has IS_SIGNAL brand but not IS_COMPUTED or IS_STORE
    expect(isSignal(readonly(n))).toBe(true);
  });
});

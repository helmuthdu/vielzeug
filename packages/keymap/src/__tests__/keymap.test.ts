import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createKeymap } from '../keymap';
import { FakeTarget, makeEvent } from './_fixtures';

describe('createKeymap', () => {
  let target: FakeTarget;

  beforeEach(() => {
    target = new FakeTarget();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('fires handler on matching keydown', () => {
    const handler = vi.fn();
    const map = createKeymap({ 'ctrl+k': handler });
    const unmount = map.mount(target);

    target.dispatch(makeEvent('k', { ctrlKey: true }));
    expect(handler).toHaveBeenCalledOnce();

    unmount();
  });

  it('does not fire on non-matching key', () => {
    const handler = vi.fn();
    const map = createKeymap({ 'ctrl+k': handler });
    const unmount = map.mount(target);

    target.dispatch(makeEvent('j', { ctrlKey: true }));
    expect(handler).not.toHaveBeenCalled();

    unmount();
  });

  it('calls preventDefault by default', () => {
    const handler = vi.fn();
    const map = createKeymap({ 'ctrl+k': handler });
    const unmount = map.mount(target);
    const event = makeEvent('k', { ctrlKey: true });

    target.dispatch(event);
    expect(event.preventDefault).toHaveBeenCalledOnce();

    unmount();
  });

  it('skips preventDefault when disabled', () => {
    const handler = vi.fn();
    const map = createKeymap({ 'ctrl+k': handler }, { preventDefault: false });
    const unmount = map.mount(target);
    const event = makeEvent('k', { ctrlKey: true });

    target.dispatch(event);
    expect(event.preventDefault).not.toHaveBeenCalled();

    unmount();
  });

  it('calls stopPropagation when enabled', () => {
    const handler = vi.fn();
    const map = createKeymap({ 'ctrl+k': handler }, { stopPropagation: true });
    const unmount = map.mount(target);
    const event = makeEvent('k', { ctrlKey: true });

    target.dispatch(event);
    expect(event.stopPropagation).toHaveBeenCalledOnce();

    unmount();
  });

  it('respects global when() guard', () => {
    const handler = vi.fn();
    let active = false;
    const map = createKeymap({ 'ctrl+k': handler }, { when: () => active });
    const unmount = map.mount(target);

    target.dispatch(makeEvent('k', { ctrlKey: true }));
    expect(handler).not.toHaveBeenCalled();

    active = true;
    target.dispatch(makeEvent('k', { ctrlKey: true }));
    expect(handler).toHaveBeenCalledOnce();

    unmount();
  });

  it('unmount removes listener', () => {
    const handler = vi.fn();
    const map = createKeymap({ 'ctrl+k': handler });
    const unmount = map.mount(target);

    unmount();
    target.dispatch(makeEvent('k', { ctrlKey: true }));
    expect(handler).not.toHaveBeenCalled();
  });

  it('dispose removes all listeners', () => {
    const handler = vi.fn();
    const map = createKeymap({ 'ctrl+k': handler });

    map.mount(target);
    map.dispose();
    target.dispatch(makeEvent('k', { ctrlKey: true }));
    expect(handler).not.toHaveBeenCalled();
  });

  it('dispose() is idempotent', () => {
    const map = createKeymap({ 'ctrl+k': vi.fn() });

    map.mount(target);
    map.dispose();
    expect(() => map.dispose()).not.toThrow();
  });

  it('disposed reflects lifecycle state', () => {
    const map = createKeymap();

    expect(map.disposed).toBe(false);
    map.dispose();
    expect(map.disposed).toBe(true);
  });

  it('disposalSignal aborts on dispose() and stays the same signal across calls', () => {
    const map = createKeymap();
    const { disposalSignal } = map;

    expect(disposalSignal.aborted).toBe(false);
    map.dispose();
    expect(disposalSignal.aborted).toBe(true);
    expect(map.disposalSignal).toBe(disposalSignal);
  });

  it('supports Symbol.dispose', () => {
    const handler = vi.fn();
    const map = createKeymap({ 'ctrl+k': handler });

    map.mount(target);
    map[Symbol.dispose]();
    target.dispatch(makeEvent('k', { ctrlKey: true }));
    expect(handler).not.toHaveBeenCalled();
  });

  it('can mount to multiple targets', () => {
    const handler = vi.fn();
    const map = createKeymap({ 'ctrl+k': handler });
    const t2 = new FakeTarget();
    const u1 = map.mount(target);
    const u2 = map.mount(t2);

    target.dispatch(makeEvent('k', { ctrlKey: true }));
    t2.dispatch(makeEvent('k', { ctrlKey: true }));
    expect(handler).toHaveBeenCalledTimes(2);

    u1();
    u2();
  });

  it('throws on invalid shortcut at construction', () => {
    expect(() => createKeymap({ ctrl: vi.fn() })).toThrow('Invalid shortcut step: "ctrl"');
  });

  it('throws on ambiguous shortcut at construction', () => {
    expect(() => createKeymap({ 'ctrl+k+j': vi.fn() })).toThrow('Ambiguous shortcut step');
  });

  it('throws on invalid shortcut passed to bind()', () => {
    const map = createKeymap({});

    expect(() => map.bind('ctrl', vi.fn())).toThrow('Invalid shortcut step: "ctrl"');
  });

  it('creates an empty keymap with no arguments', () => {
    const map = createKeymap();
    const unmount = map.mount(target);

    target.dispatch(makeEvent('k', { ctrlKey: true }));
    unmount();
  });

  describe('modKey option', () => {
    it('resolves mod+k as ctrl+k when modKey is ctrl', () => {
      const handler = vi.fn();
      const map = createKeymap({ 'mod+k': handler }, { modKey: 'ctrl' });
      const unmount = map.mount(target);

      target.dispatch(makeEvent('k', { ctrlKey: true }));
      expect(handler).toHaveBeenCalledOnce();

      unmount();
    });

    it('resolves mod+k as meta+k when modKey is meta', () => {
      const handler = vi.fn();
      const map = createKeymap({ 'mod+k': handler }, { modKey: 'meta' });
      const unmount = map.mount(target);

      target.dispatch(makeEvent('k', { metaKey: true }));
      expect(handler).toHaveBeenCalledOnce();

      unmount();
    });

    it('does not fire mod+k (meta) on ctrl event when modKey is meta', () => {
      const handler = vi.fn();
      const map = createKeymap({ 'mod+k': handler }, { modKey: 'meta' });
      const unmount = map.mount(target);

      target.dispatch(makeEvent('k', { ctrlKey: true }));
      expect(handler).not.toHaveBeenCalled();

      unmount();
    });
  });

  describe('per-binding when guard (BindingOptions syntax)', () => {
    it('fires handler when per-binding guard passes', () => {
      const handler = vi.fn();
      const map = createKeymap({ 'ctrl+k': { handler, when: () => true } });
      const unmount = map.mount(target);

      target.dispatch(makeEvent('k', { ctrlKey: true }));
      expect(handler).toHaveBeenCalledOnce();

      unmount();
    });

    it('suppresses handler when per-binding guard fails', () => {
      const handler = vi.fn();
      const map = createKeymap({ 'ctrl+k': { handler, when: () => false } });
      const unmount = map.mount(target);

      target.dispatch(makeEvent('k', { ctrlKey: true }));
      expect(handler).not.toHaveBeenCalled();

      unmount();
    });

    it('allows different when guards on different bindings', () => {
      const h1 = vi.fn();
      const h2 = vi.fn();
      const map = createKeymap({
        'ctrl+j': { handler: h2, when: () => true },
        'ctrl+k': { handler: h1, when: () => false },
      });
      const unmount = map.mount(target);

      target.dispatch(makeEvent('k', { ctrlKey: true }));
      target.dispatch(makeEvent('j', { ctrlKey: true }));
      expect(h1).not.toHaveBeenCalled();
      expect(h2).toHaveBeenCalledOnce();

      unmount();
    });

    it('global when() blocks even when per-binding guard passes', () => {
      const handler = vi.fn();
      const map = createKeymap({ 'ctrl+k': { handler, when: () => true } }, { when: () => false });
      const unmount = map.mount(target);

      target.dispatch(makeEvent('k', { ctrlKey: true }));
      expect(handler).not.toHaveBeenCalled();

      unmount();
    });

    it('chord completion with failing per-binding guard resets chord state', () => {
      let panelOpen = false;
      const handler = vi.fn();
      const map = createKeymap({ 'g g': { handler, when: () => panelOpen } });
      const unmount = map.mount(target);

      target.dispatch(makeEvent('g'));
      target.dispatch(makeEvent('g'));
      expect(handler).not.toHaveBeenCalled();

      panelOpen = true;
      target.dispatch(makeEvent('g'));
      target.dispatch(makeEvent('g'));
      expect(handler).toHaveBeenCalledOnce();

      unmount();
    });
  });

  describe('priority', () => {
    it('bind() with higher priority overwrites lower priority for same shortcut', () => {
      const h1 = vi.fn();
      const h2 = vi.fn();
      const map = createKeymap({ 'ctrl+k': { handler: h1, priority: 0 } });
      const unmount = map.mount(target);

      map.bind('ctrl+k', { handler: h2, priority: 10 });
      target.dispatch(makeEvent('k', { ctrlKey: true }));
      expect(h2).toHaveBeenCalledOnce();
      expect(h1).not.toHaveBeenCalled();

      unmount();
    });
  });

  describe('trigger option', () => {
    it('fires on keyup when trigger is keyup', () => {
      const handler = vi.fn();
      const map = createKeymap({ space: { handler, trigger: 'keyup' } });
      const unmount = map.mount(target);

      target.dispatch(makeEvent(' ', { type: 'keydown' }));
      expect(handler).not.toHaveBeenCalled();

      target.dispatch(makeEvent(' ', { type: 'keyup' }));
      expect(handler).toHaveBeenCalledOnce();

      unmount();
    });

    it('does not fire keydown binding on keyup event', () => {
      const handler = vi.fn();
      const map = createKeymap({ 'ctrl+k': handler });
      const unmount = map.mount(target);

      target.dispatch(makeEvent('k', { ctrlKey: true, type: 'keyup' }));
      expect(handler).not.toHaveBeenCalled();

      unmount();
    });
  });

  describe('bind() and unbind()', () => {
    it('bind() adds a new shortcut dynamically', () => {
      const handler = vi.fn();
      const map = createKeymap({});
      const unmount = map.mount(target);

      map.bind('ctrl+k', handler);
      target.dispatch(makeEvent('k', { ctrlKey: true }));
      expect(handler).toHaveBeenCalledOnce();

      unmount();
    });

    it('bind() returns an unbind function', () => {
      const handler = vi.fn();
      const map = createKeymap({});
      const unmount = map.mount(target);

      const unbind = map.bind('ctrl+k', handler);

      unbind();
      target.dispatch(makeEvent('k', { ctrlKey: true }));
      expect(handler).not.toHaveBeenCalled();

      unmount();
    });

    it('unbind() removes the shortcut', () => {
      const handler = vi.fn();
      const map = createKeymap({ 'ctrl+k': handler });
      const unmount = map.mount(target);

      map.unbind('ctrl+k');
      target.dispatch(makeEvent('k', { ctrlKey: true }));
      expect(handler).not.toHaveBeenCalled();

      unmount();
    });

    it('bind() overwrites an existing shortcut for the same key', () => {
      const h1 = vi.fn();
      const h2 = vi.fn();
      const map = createKeymap({ 'ctrl+k': h1 });
      const unmount = map.mount(target);

      map.bind('ctrl+k', h2);
      target.dispatch(makeEvent('k', { ctrlKey: true }));
      expect(h1).not.toHaveBeenCalled();
      expect(h2).toHaveBeenCalledOnce();

      unmount();
    });

    it('bind() supports BindingOptions with when guard', () => {
      const handler = vi.fn();
      const map = createKeymap({});
      const unmount = map.mount(target);

      map.bind('ctrl+k', { handler, when: () => false });
      target.dispatch(makeEvent('k', { ctrlKey: true }));
      expect(handler).not.toHaveBeenCalled();

      unmount();
    });

    it('unbind() on unknown shortcut does not throw and emits a dev warning with exact message', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const map = createKeymap({});

      expect(() => map.unbind('ctrl+z')).not.toThrow();
      expect(warnSpy).toHaveBeenCalledOnce();
      expect(warnSpy).toHaveBeenCalledWith('[@vielzeug/keymap] unbind() called for unknown shortcut: "ctrl+z"');

      warnSpy.mockRestore();
    });

    it('bind() unbind closure removes the correct canonical slot (alias)', () => {
      const handler = vi.fn();
      const map = createKeymap({});
      const unmount = map.mount(target);
      const unbind = map.bind('cmd+k', handler);

      unbind();
      target.dispatch(makeEvent('k', { metaKey: true }));
      expect(handler).not.toHaveBeenCalled();

      unmount();
    });

    it('unbind() via alias resolves to the same canonical binding', () => {
      const handler = vi.fn();
      const map = createKeymap({ 'cmd+k': handler });
      const unmount = map.mount(target);

      map.unbind('meta+k');
      target.dispatch(makeEvent('k', { metaKey: true }));
      expect(handler).not.toHaveBeenCalled();

      unmount();
    });

    it('bind() with alias overwrites the same canonical slot as the original', () => {
      const h1 = vi.fn();
      const h2 = vi.fn();
      const map = createKeymap({ 'cmd+k': h1 });
      const unmount = map.mount(target);

      map.bind('meta+k', h2);
      target.dispatch(makeEvent('k', { metaKey: true }));
      expect(h1).not.toHaveBeenCalled();
      expect(h2).toHaveBeenCalledOnce();

      unmount();
    });
  });

  describe('special key support', () => {
    it('fires on Escape via "escape"', () => {
      const handler = vi.fn();
      const map = createKeymap({ escape: handler });
      const unmount = map.mount(target);

      target.dispatch(makeEvent('Escape'));
      expect(handler).toHaveBeenCalledOnce();

      unmount();
    });

    it('fires on Escape via "esc" alias', () => {
      const handler = vi.fn();
      const map = createKeymap({ esc: handler });
      const unmount = map.mount(target);

      target.dispatch(makeEvent('Escape'));
      expect(handler).toHaveBeenCalledOnce();

      unmount();
    });

    it('fires on Space via "space" alias', () => {
      const handler = vi.fn();
      const map = createKeymap({ space: handler });
      const unmount = map.mount(target);

      target.dispatch(makeEvent(' '));
      expect(handler).toHaveBeenCalledOnce();

      unmount();
    });

    it('fires on ArrowUp via "up" alias', () => {
      const handler = vi.fn();
      const map = createKeymap({ up: handler });
      const unmount = map.mount(target);

      target.dispatch(makeEvent('ArrowUp'));
      expect(handler).toHaveBeenCalledOnce();

      unmount();
    });

    it('fires on Delete via "del" alias', () => {
      const handler = vi.fn();
      const map = createKeymap({ del: handler });
      const unmount = map.mount(target);

      target.dispatch(makeEvent('Delete'));
      expect(handler).toHaveBeenCalledOnce();

      unmount();
    });

    it('fires on ctrl+space', () => {
      const handler = vi.fn();
      const map = createKeymap({ 'ctrl+space': handler });
      const unmount = map.mount(target);

      target.dispatch(makeEvent(' ', { ctrlKey: true }));
      expect(handler).toHaveBeenCalledOnce();

      unmount();
    });
  });

  describe('dispose + remount lifecycle', () => {
    it('handler fires after dispose() then mount() again', () => {
      const handler = vi.fn();
      const map = createKeymap({ 'ctrl+k': handler });
      const unmount = map.mount(target);

      unmount();
      map.dispose();

      const unmount2 = map.mount(target);

      target.dispatch(makeEvent('k', { ctrlKey: true }));
      expect(handler).toHaveBeenCalledOnce();

      unmount2();
    });

    it('dispose() removes all mounts; further events do not fire', () => {
      const handler = vi.fn();
      const map = createKeymap({ 'ctrl+k': handler });

      map.mount(target);
      map.dispose();
      target.dispatch(makeEvent('k', { ctrlKey: true }));
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('listBindings()', () => {
    it('returns empty array when no bindings', () => {
      const map = createKeymap({});

      expect(map.listBindings()).toEqual([]);
    });

    it('returns one entry per registered binding', () => {
      const map = createKeymap({ 'ctrl+k': vi.fn(), 'ctrl+s': vi.fn() });

      expect(map.listBindings()).toHaveLength(2);
    });

    it('entry contains shortcut, trigger, and priority', () => {
      const map = createKeymap({
        'ctrl+k': { handler: vi.fn(), priority: 5, trigger: 'keyup' },
      });
      const [entry] = map.listBindings();

      expect(entry.trigger).toBe('keyup');
      expect(entry.priority).toBe(5);
      expect(entry.shortcut).toHaveLength(1);
      expect(entry.shortcut[0]).toEqual({ key: 'k', modifiers: new Set(['ctrl']) });
    });

    it('defaults trigger to keydown and priority to 0', () => {
      const map = createKeymap({ 'ctrl+k': vi.fn() });
      const [entry] = map.listBindings();

      expect(entry.trigger).toBe('keydown');
      expect(entry.priority).toBe(0);
    });

    it('reflects bind() and unbind() changes', () => {
      const map = createKeymap({});

      map.bind('ctrl+k', vi.fn());
      expect(map.listBindings()).toHaveLength(1);

      map.unbind('ctrl+k');
      expect(map.listBindings()).toHaveLength(0);
    });

    it('aliases resolve to one entry (not duplicates)', () => {
      const map = createKeymap({ 'cmd+k': vi.fn() });

      map.bind('meta+k', vi.fn());
      expect(map.listBindings()).toHaveLength(1);
    });

    it('bind() unbind closure also removes the entry from listBindings', () => {
      const map = createKeymap({});
      const unbind = map.bind('ctrl+k', vi.fn());

      expect(map.listBindings()).toHaveLength(1);
      unbind();
      expect(map.listBindings()).toHaveLength(0);
    });

    it('returns a real snapshot — mutating a returned entry does not affect live matching', () => {
      const handler = vi.fn();
      const map = createKeymap({ 'ctrl+k': handler });
      const unmount = map.mount(target);

      map.listBindings()[0]!.shortcut[0]!.modifiers.add('shift');

      target.dispatch(makeEvent('k', { ctrlKey: true }));
      expect(handler).toHaveBeenCalledOnce();

      unmount();
    });

    it('returns distinct modifiers Set instances across calls', () => {
      const map = createKeymap({ 'ctrl+k': vi.fn() });

      const setA = map.listBindings()[0]!.shortcut[0]!.modifiers;
      const setB = map.listBindings()[0]!.shortcut[0]!.modifiers;

      expect(setA).not.toBe(setB);
      expect(setA).toEqual(setB);
    });
  });

  describe('mount() duplicate-target warning', () => {
    it('warns when the same target is mounted twice', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const map = createKeymap({});

      const u1 = map.mount(target);
      const u2 = map.mount(target);

      expect(warnSpy).toHaveBeenCalledWith(
        '[@vielzeug/keymap] mount() called for a target that is already mounted — this registers a duplicate listener',
      );

      u1();
      u2();
      warnSpy.mockRestore();
    });

    it('does not warn for a fresh mount after a full unmount', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const map = createKeymap({});

      map.mount(target)();
      map.mount(target)();

      expect(warnSpy).not.toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('does not warn when mounting different targets', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const map = createKeymap({});
      const t2 = new FakeTarget();

      const u1 = map.mount(target);
      const u2 = map.mount(t2);

      expect(warnSpy).not.toHaveBeenCalled();
      u1();
      u2();
      warnSpy.mockRestore();
    });
  });

  describe('numeric option validation', () => {
    it('clamps a non-positive chordTimeout to the default and warns', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      createKeymap({}, { chordTimeout: -5 });

      expect(warnSpy).toHaveBeenCalledWith(
        '[@vielzeug/keymap] chordTimeout must be a positive finite number; received -5. Using default of 1000ms.',
      );
      warnSpy.mockRestore();
    });

    it('clamps a non-finite chordTimeout to the default and warns', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      createKeymap({}, { chordTimeout: NaN });

      expect(warnSpy).toHaveBeenCalledOnce();
      warnSpy.mockRestore();
    });

    it('does not warn for a valid chordTimeout', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      createKeymap({}, { chordTimeout: 250 });

      expect(warnSpy).not.toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('falls back a non-finite priority to 0 and warns', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const map = createKeymap({ 'ctrl+k': { handler: vi.fn(), priority: NaN } });

      expect(warnSpy).toHaveBeenCalledWith(
        '[@vielzeug/keymap] binding priority must be a finite number; received NaN. Using 0.',
      );
      expect(map.listBindings()[0]!.priority).toBe(0);
      warnSpy.mockRestore();
    });
  });
});

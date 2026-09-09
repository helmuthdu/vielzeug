import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createKeymap } from '../keymap';
import type { KeymapEvent } from '../types';
import { FakeTarget, makeEvent, mockHandler } from './_fixtures';

describe('createKeymap', () => {
  let target: FakeTarget;

  beforeEach(() => {
    target = new FakeTarget();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('fires handler on matching keydown', () => {
    const handler = mockHandler();
    const map = createKeymap([{ handler, id: 'save', shortcut: 'ctrl+k' }]);
    const unmount = map.mount(target);

    target.dispatch(makeEvent('k', { ctrlKey: true }));
    expect(handler).toHaveBeenCalledOnce();

    unmount();
  });

  it('does not fire on non-matching key', () => {
    const handler = mockHandler();
    const map = createKeymap([{ handler, id: 'save', shortcut: 'ctrl+k' }]);
    const unmount = map.mount(target);

    target.dispatch(makeEvent('j', { ctrlKey: true }));
    expect(handler).not.toHaveBeenCalled();

    unmount();
  });

  it('calls preventDefault by default', () => {
    const handler = mockHandler();
    const map = createKeymap([{ handler, id: 'save', shortcut: 'ctrl+k' }]);
    const unmount = map.mount(target);
    const event = makeEvent('k', { ctrlKey: true });

    target.dispatch(event);
    expect(event.preventDefault).toHaveBeenCalledOnce();

    unmount();
  });

  it('skips preventDefault when disabled per-binding', () => {
    const handler = mockHandler();
    const map = createKeymap([{ handler, id: 'save', preventDefault: false, shortcut: 'ctrl+k' }]);
    const unmount = map.mount(target);
    const event = makeEvent('k', { ctrlKey: true });

    target.dispatch(event);
    expect(event.preventDefault).not.toHaveBeenCalled();

    unmount();
  });

  it('calls stopPropagation when enabled per-binding', () => {
    const handler = mockHandler();
    const map = createKeymap([{ handler, id: 'save', shortcut: 'ctrl+k', stopPropagation: true }]);
    const unmount = map.mount(target);
    const event = makeEvent('k', { ctrlKey: true });

    target.dispatch(event);
    expect(event.stopPropagation).toHaveBeenCalledOnce();

    unmount();
  });

  it('does not call stopPropagation by default', () => {
    const handler = mockHandler();
    const map = createKeymap([{ handler, id: 'save', shortcut: 'ctrl+k' }]);
    const unmount = map.mount(target);
    const event = makeEvent('k', { ctrlKey: true });

    target.dispatch(event);
    expect(event.stopPropagation).not.toHaveBeenCalled();

    unmount();
  });

  it('passes dispatched event to global when() guard', () => {
    const handler = mockHandler();
    const guard = vi.fn(() => true);
    const map = createKeymap([{ handler, id: 'save', shortcut: 'ctrl+k' }], { when: guard });
    const unmount = map.mount(target);
    const event = makeEvent('k', { ctrlKey: true });

    target.dispatch(event);

    expect(guard).toHaveBeenCalledWith(event);
    expect(handler).toHaveBeenCalledOnce();
    unmount();
  });

  it('unmount removes listener', () => {
    const handler = mockHandler();
    const map = createKeymap([{ handler, id: 'save', shortcut: 'ctrl+k' }]);
    const unmount = map.mount(target);

    unmount();
    target.dispatch(makeEvent('k', { ctrlKey: true }));
    expect(handler).not.toHaveBeenCalled();
  });

  it('dispose removes all listeners', () => {
    const handler = mockHandler();
    const map = createKeymap([{ handler, id: 'save', shortcut: 'ctrl+k' }]);

    map.mount(target);
    map.dispose();
    target.dispatch(makeEvent('k', { ctrlKey: true }));
    expect(handler).not.toHaveBeenCalled();
  });

  it('dispose() is idempotent', () => {
    const map = createKeymap([{ handler: mockHandler(), id: 'save', shortcut: 'ctrl+k' }]);

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
    const handler = mockHandler();
    const map = createKeymap([{ handler, id: 'save', shortcut: 'ctrl+k' }]);

    map.mount(target);
    map[Symbol.dispose]();
    target.dispatch(makeEvent('k', { ctrlKey: true }));
    expect(handler).not.toHaveBeenCalled();
  });

  it('can mount to multiple targets', () => {
    const handler = mockHandler();
    const map = createKeymap([{ handler, id: 'save', shortcut: 'ctrl+k' }]);
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
    expect(() => createKeymap([{ handler: mockHandler(), id: 'bad', shortcut: 'ctrl' }])).toThrow(
      'Invalid shortcut step: "ctrl"',
    );
  });

  it('throws on ambiguous shortcut at construction', () => {
    expect(() => createKeymap([{ handler: mockHandler(), id: 'bad', shortcut: 'ctrl+k+j' }])).toThrow(
      'Ambiguous shortcut step',
    );
  });

  it('throws on invalid shortcut passed to bind()', () => {
    const map = createKeymap();

    expect(() => map.bind({ handler: mockHandler(), id: 'bad', shortcut: 'ctrl' })).toThrow(
      'Invalid shortcut step: "ctrl"',
    );
  });

  it('creates an empty keymap with no arguments', () => {
    const map = createKeymap();
    const unmount = map.mount(target);

    target.dispatch(makeEvent('k', { ctrlKey: true }));
    unmount();
  });

  describe('modKey option', () => {
    it('resolves mod+k as ctrl+k when modKey is ctrl', () => {
      const handler = mockHandler();
      const map = createKeymap([{ handler, id: 'save', shortcut: 'mod+k' }], { modKey: 'ctrl' });
      const unmount = map.mount(target);

      target.dispatch(makeEvent('k', { ctrlKey: true }));
      expect(handler).toHaveBeenCalledOnce();

      unmount();
    });

    it('resolves mod+k as meta+k when modKey is meta', () => {
      const handler = mockHandler();
      const map = createKeymap([{ handler, id: 'save', shortcut: 'mod+k' }], { modKey: 'meta' });
      const unmount = map.mount(target);

      target.dispatch(makeEvent('k', { metaKey: true }));
      expect(handler).toHaveBeenCalledOnce();

      unmount();
    });

    it('does not fire mod+k (meta) on ctrl event when modKey is meta', () => {
      const handler = mockHandler();
      const map = createKeymap([{ handler, id: 'save', shortcut: 'mod+k' }], { modKey: 'meta' });
      const unmount = map.mount(target);

      target.dispatch(makeEvent('k', { ctrlKey: true }));
      expect(handler).not.toHaveBeenCalled();

      unmount();
    });
  });

  describe('per-binding when guard', () => {
    it('passes dispatched event to per-binding guard', () => {
      const handler = mockHandler();
      const guard = vi.fn(() => true);
      const map = createKeymap([{ handler, id: 'save', shortcut: 'ctrl+k', when: guard }]);
      const unmount = map.mount(target);
      const event = makeEvent('k', { ctrlKey: true });

      target.dispatch(event);

      expect(guard).toHaveBeenCalledWith(event);
      expect(handler).toHaveBeenCalledOnce();
      unmount();
    });

    it('suppresses handler when per-binding guard fails', () => {
      const handler = mockHandler();
      const map = createKeymap([{ handler, id: 'save', shortcut: 'ctrl+k', when: () => false }]);
      const unmount = map.mount(target);

      target.dispatch(makeEvent('k', { ctrlKey: true }));
      expect(handler).not.toHaveBeenCalled();

      unmount();
    });

    it('allows different when guards on different bindings', () => {
      const h1 = mockHandler();
      const h2 = mockHandler();
      const map = createKeymap([
        { handler: h2, id: 'j', shortcut: 'ctrl+j', when: () => true },
        { handler: h1, id: 'k', shortcut: 'ctrl+k', when: () => false },
      ]);
      const unmount = map.mount(target);

      target.dispatch(makeEvent('k', { ctrlKey: true }));
      target.dispatch(makeEvent('j', { ctrlKey: true }));
      expect(h1).not.toHaveBeenCalled();
      expect(h2).toHaveBeenCalledOnce();

      unmount();
    });

    it('global when() blocks even when per-binding guard passes', () => {
      const handler = mockHandler();
      const map = createKeymap([{ handler, id: 'save', shortcut: 'ctrl+k', when: () => true }], { when: () => false });
      const unmount = map.mount(target);

      target.dispatch(makeEvent('k', { ctrlKey: true }));
      expect(handler).not.toHaveBeenCalled();

      unmount();
    });

    it('chord completion with failing per-binding guard resets chord state', () => {
      let panelOpen = false;
      const handler = mockHandler();
      const map = createKeymap([{ handler, id: 'top', shortcut: 'g g', when: () => panelOpen }]);
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

  describe('trigger option', () => {
    it('fires on keyup when trigger is keyup', () => {
      const handler = mockHandler();
      const map = createKeymap([{ handler, id: 'play', shortcut: 'space', trigger: 'keyup' }]);
      const unmount = map.mount(target);

      target.dispatch(makeEvent(' ', { type: 'keydown' }));
      expect(handler).not.toHaveBeenCalled();

      target.dispatch(makeEvent(' ', { type: 'keyup' }));
      expect(handler).toHaveBeenCalledOnce();

      unmount();
    });

    it('does not fire keydown binding on keyup event', () => {
      const handler = mockHandler();
      const map = createKeymap([{ handler, id: 'save', shortcut: 'ctrl+k' }]);
      const unmount = map.mount(target);

      target.dispatch(makeEvent('k', { ctrlKey: true, type: 'keyup' }));
      expect(handler).not.toHaveBeenCalled();

      unmount();
    });
  });

  describe('bind() and unbind()', () => {
    it('bind() adds a new shortcut dynamically', () => {
      const handler = mockHandler();
      const map = createKeymap();
      const unmount = map.mount(target);

      map.bind({ handler, id: 'save', shortcut: 'ctrl+k' });
      target.dispatch(makeEvent('k', { ctrlKey: true }));
      expect(handler).toHaveBeenCalledOnce();

      unmount();
    });

    it('bind() returns an unbind function', () => {
      const handler = mockHandler();
      const map = createKeymap();
      const unmount = map.mount(target);

      const unbind = map.bind({ handler, id: 'save', shortcut: 'ctrl+k' });

      unbind();
      target.dispatch(makeEvent('k', { ctrlKey: true }));
      expect(handler).not.toHaveBeenCalled();

      unmount();
    });

    it('unbind() removes the binding by id', () => {
      const handler = mockHandler();
      const map = createKeymap([{ handler, id: 'save', shortcut: 'ctrl+k' }]);
      const unmount = map.mount(target);

      map.unbind('save');
      target.dispatch(makeEvent('k', { ctrlKey: true }));
      expect(handler).not.toHaveBeenCalled();

      unmount();
    });

    it('bind() with the same id overwrites an existing binding', () => {
      const h1 = mockHandler();
      const h2 = mockHandler();
      const map = createKeymap([{ handler: h1, id: 'save', shortcut: 'ctrl+k' }]);
      const unmount = map.mount(target);

      map.bind({ handler: h2, id: 'save', shortcut: 'ctrl+k' });
      target.dispatch(makeEvent('k', { ctrlKey: true }));
      expect(h1).not.toHaveBeenCalled();
      expect(h2).toHaveBeenCalledOnce();

      unmount();
    });

    it('stale bind() removal does not remove a replacement with the same id', () => {
      const first = mockHandler();
      const replacement = mockHandler();
      const map = createKeymap();
      const unmount = map.mount(target);
      const staleRemove = map.bind({ handler: first, id: 'save', shortcut: 'ctrl+k' });

      map.bind({ handler: replacement, id: 'save', shortcut: 'ctrl+s' });
      staleRemove();
      target.dispatch(makeEvent('s', { ctrlKey: true }));

      expect(first).not.toHaveBeenCalled();
      expect(replacement).toHaveBeenCalledOnce();
      unmount();
    });

    it('bind() supports when guard', () => {
      const handler = mockHandler();
      const map = createKeymap();
      const unmount = map.mount(target);

      map.bind({ handler, id: 'save', shortcut: 'ctrl+k', when: () => false });
      target.dispatch(makeEvent('k', { ctrlKey: true }));
      expect(handler).not.toHaveBeenCalled();

      unmount();
    });

    it('unbind() on unknown id does not throw and emits a dev warning with exact message', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const map = createKeymap();

      expect(() => map.unbind('unknown')).not.toThrow();
      expect(warnSpy).toHaveBeenCalledOnce();
      expect(warnSpy).toHaveBeenCalledWith('[@vielzeug/keymap] unbind() called for unknown id: "unknown"');

      warnSpy.mockRestore();
    });

    it('bind() unbind closure removes the correct binding by id', () => {
      const handler = mockHandler();
      const map = createKeymap();
      const unmount = map.mount(target);
      const unbind = map.bind({ handler, id: 'save', shortcut: 'cmd+k' });

      unbind();
      target.dispatch(makeEvent('k', { metaKey: true }));
      expect(handler).not.toHaveBeenCalled();

      unmount();
    });

    it('allows duplicate shortcuts with different ids (first binding wins deterministically)', () => {
      const h1 = mockHandler();
      const h2 = mockHandler();
      const map = createKeymap([
        { handler: h1, id: 'one', shortcut: 'ctrl+k' },
        { handler: h2, id: 'two', shortcut: 'ctrl+k' },
      ]);
      const unmount = map.mount(target);

      target.dispatch(makeEvent('k', { ctrlKey: true }));
      // Deterministic: first binding in insertion order wins
      expect(h1).toHaveBeenCalledOnce();
      expect(h2).not.toHaveBeenCalled();

      unmount();
    });

    it('unbind() removes only the binding with the matching id (duplicate shortcuts)', () => {
      const h1 = mockHandler();
      const h2 = mockHandler();
      const map = createKeymap([
        { handler: h1, id: 'one', shortcut: 'ctrl+k' },
        { handler: h2, id: 'two', shortcut: 'ctrl+k' },
      ]);
      const unmount = map.mount(target);

      map.unbind('one');
      target.dispatch(makeEvent('k', { ctrlKey: true }));
      expect(h1).not.toHaveBeenCalled();
      expect(h2).toHaveBeenCalledOnce();

      unmount();
    });
  });

  describe('tap()', () => {
    it('reports chord progression and matches', () => {
      const events: KeymapEvent[] = [];
      const map = createKeymap([{ handler: mockHandler(), id: 'sequence', shortcut: 'g g g' }]);
      const unmount = map.mount(target);

      map.tap((event) => events.push(event));
      target.dispatch(makeEvent('g'));
      target.dispatch(makeEvent('g'));
      target.dispatch(makeEvent('g'));

      expect(events.map((event) => event.type)).toEqual(['chord-start', 'chord-progress', 'match']);
      expect(events[0]).toMatchObject({ step: { key: 'g' }, target, trigger: 'keydown' });
      expect(events[2]).toMatchObject({ binding: { id: 'sequence' }, target, trigger: 'keydown' });
      unmount();
    });

    it('reports chord timeout', () => {
      vi.useFakeTimers();

      const events: KeymapEvent[] = [];
      const map = createKeymap([{ handler: mockHandler(), id: 'top', shortcut: 'g g' }], { chordTimeout: 100 });

      map.mount(target);
      map.tap((event) => events.push(event));
      target.dispatch(makeEvent('g'));
      vi.advanceTimersByTime(101);

      expect(events.map((event) => event.type)).toEqual(['chord-start', 'chord-timeout']);
      map.dispose();
    });

    it('reports cancellation when a pending chord resets', () => {
      const events: KeymapEvent[] = [];
      const map = createKeymap([{ handler: mockHandler(), id: 'top', shortcut: 'g g' }]);

      map.mount(target);
      map.tap((event) => events.push(event));
      target.dispatch(makeEvent('g'));
      target.dispatch(makeEvent('x'));

      expect(events.map((event) => event.type)).toEqual(['chord-start', 'chord-cancel']);
      map.dispose();
    });

    it('isolates handlers and reports disposal', () => {
      const events: KeymapEvent[] = [];
      const map = createKeymap();

      map.tap(() => {
        throw new Error('tap failed');
      });
      map.tap((event) => events.push(event));

      expect(() => map.dispose()).not.toThrow();
      expect(events).toContainEqual({ type: 'dispose' });
    });

    it('detaches when its signal aborts', () => {
      const events: KeymapEvent[] = [];
      const controller = new AbortController();
      const map = createKeymap([{ handler: mockHandler(), id: 'save', shortcut: 'ctrl+s' }]);

      map.mount(target);
      map.tap((event) => events.push(event), { signal: controller.signal });
      controller.abort();
      target.dispatch(makeEvent('s', { ctrlKey: true }));

      expect(events).toEqual([]);
      map.dispose();
    });
  });

  describe('special key support', () => {
    it('fires on Escape via "escape"', () => {
      const handler = mockHandler();
      const map = createKeymap([{ handler, id: 'close', shortcut: 'escape' }]);
      const unmount = map.mount(target);

      target.dispatch(makeEvent('Escape'));
      expect(handler).toHaveBeenCalledOnce();

      unmount();
    });

    it('fires on Escape via "esc" alias', () => {
      const handler = mockHandler();
      const map = createKeymap([{ handler, id: 'close', shortcut: 'esc' }]);
      const unmount = map.mount(target);

      target.dispatch(makeEvent('Escape'));
      expect(handler).toHaveBeenCalledOnce();

      unmount();
    });

    it('fires on Space via "space" alias', () => {
      const handler = mockHandler();
      const map = createKeymap([{ handler, id: 'space', shortcut: 'space' }]);
      const unmount = map.mount(target);

      target.dispatch(makeEvent(' '));
      expect(handler).toHaveBeenCalledOnce();

      unmount();
    });

    it('fires on ArrowUp via "up" alias', () => {
      const handler = mockHandler();
      const map = createKeymap([{ handler, id: 'up', shortcut: 'up' }]);
      const unmount = map.mount(target);

      target.dispatch(makeEvent('ArrowUp'));
      expect(handler).toHaveBeenCalledOnce();

      unmount();
    });

    it('fires on Delete via "del" alias', () => {
      const handler = mockHandler();
      const map = createKeymap([{ handler, id: 'del', shortcut: 'del' }]);
      const unmount = map.mount(target);

      target.dispatch(makeEvent('Delete'));
      expect(handler).toHaveBeenCalledOnce();

      unmount();
    });

    it('fires on ctrl+space', () => {
      const handler = mockHandler();
      const map = createKeymap([{ handler, id: 'ctrl-space', shortcut: 'ctrl+space' }]);
      const unmount = map.mount(target);

      target.dispatch(makeEvent(' ', { ctrlKey: true }));
      expect(handler).toHaveBeenCalledOnce();

      unmount();
    });
  });

  describe('dispose lifecycle', () => {
    it('rejects remounting after disposal', () => {
      const map = createKeymap([{ handler: mockHandler(), id: 'save', shortcut: 'ctrl+k' }]);

      map.dispose();

      expect(() => map.mount(target)).toThrow('Keymap is disposed');
    });

    it('dispose() removes all mounts; further events do not fire', () => {
      const handler = mockHandler();
      const map = createKeymap([{ handler, id: 'save', shortcut: 'ctrl+k' }]);

      map.mount(target);
      map.dispose();
      target.dispatch(makeEvent('k', { ctrlKey: true }));
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('listBindings()', () => {
    it('returns empty array when no bindings', () => {
      const map = createKeymap();

      expect(map.listBindings()).toEqual([]);
    });

    it('returns one entry per registered binding', () => {
      const map = createKeymap([
        { handler: mockHandler(), id: 'save', shortcut: 'ctrl+k' },
        { handler: mockHandler(), id: 'open', shortcut: 'ctrl+s' },
      ]);

      expect(map.listBindings()).toHaveLength(2);
    });

    it('entry contains id, shortcut, trigger, preventDefault, and stopPropagation', () => {
      const map = createKeymap([
        { handler: mockHandler(), id: 'save', shortcut: 'ctrl+k', stopPropagation: true, trigger: 'keyup' },
      ]);
      const [entry] = map.listBindings();

      expect(entry.id).toBe('save');
      expect(entry.trigger).toBe('keyup');
      expect(entry.preventDefault).toBe(true);
      expect(entry.stopPropagation).toBe(true);
      expect(entry.shortcut).toHaveLength(1);
      expect(entry.shortcut[0]).toEqual({ key: 'k', modifiers: new Set(['ctrl']) });
    });

    it('defaults trigger to keydown', () => {
      const map = createKeymap([{ handler: mockHandler(), id: 'save', shortcut: 'ctrl+k' }]);

      expect(map.listBindings()[0]?.trigger).toBe('keydown');
    });

    it('defaults preventDefault to true and stopPropagation to false', () => {
      const map = createKeymap([{ handler: mockHandler(), id: 'save', shortcut: 'ctrl+k' }]);

      expect(map.listBindings()[0]?.preventDefault).toBe(true);
      expect(map.listBindings()[0]?.stopPropagation).toBe(false);
    });

    it('reflects bind() and unbind() changes', () => {
      const map = createKeymap();

      map.bind({ handler: mockHandler(), id: 'save', shortcut: 'ctrl+k' });
      expect(map.listBindings()).toHaveLength(1);

      map.unbind('save');
      expect(map.listBindings()).toHaveLength(0);
    });

    it('bind() unbind closure also removes the entry from listBindings', () => {
      const map = createKeymap();
      const unbind = map.bind({ handler: mockHandler(), id: 'save', shortcut: 'ctrl+k' });

      expect(map.listBindings()).toHaveLength(1);
      unbind();
      expect(map.listBindings()).toHaveLength(0);
    });

    it('returns a real snapshot — mutating a returned entry does not affect live matching', () => {
      const handler = mockHandler();
      const map = createKeymap([{ handler, id: 'save', shortcut: 'ctrl+k' }]);
      const unmount = map.mount(target);

      map.listBindings()[0]?.shortcut[0]?.modifiers.add('shift');

      target.dispatch(makeEvent('k', { ctrlKey: true }));
      expect(handler).toHaveBeenCalledOnce();

      unmount();
    });

    it('returns distinct modifiers Set instances across calls', () => {
      const map = createKeymap([{ handler: mockHandler(), id: 'save', shortcut: 'ctrl+k' }]);

      const setA = map.listBindings()[0]?.shortcut[0]?.modifiers;
      const setB = map.listBindings()[0]?.shortcut[0]?.modifiers;

      expect(setA).not.toBe(setB);
      expect(setA).toEqual(setB);
    });
  });

  describe('numeric option validation', () => {
    it('clamps a non-positive chordTimeout to the default and warns', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      createKeymap([], { chordTimeout: -5 });

      expect(warnSpy).toHaveBeenCalledWith(
        '[@vielzeug/keymap] chordTimeout must be a positive finite number; received -5. Using default of 1000ms.',
      );
      warnSpy.mockRestore();
    });

    it('clamps a non-finite chordTimeout to the default and warns', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      createKeymap([], { chordTimeout: NaN });

      expect(warnSpy).toHaveBeenCalledOnce();
      warnSpy.mockRestore();
    });

    it('does not warn for a valid chordTimeout', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      createKeymap([], { chordTimeout: 250 });

      expect(warnSpy).not.toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createKeymap } from '../keymap';
import { FakeTarget, makeEvent } from './_fixtures';

describe('chord sequences', () => {
  let target: FakeTarget;

  beforeEach(() => {
    target = new FakeTarget();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('fires handler after completing a two-step chord', () => {
    const handler = vi.fn();
    const map = createKeymap({ 'ctrl+k ctrl+s': handler });
    const unmount = map.mount(target);

    target.dispatch(makeEvent('k', { ctrlKey: true }));
    expect(handler).not.toHaveBeenCalled();

    target.dispatch(makeEvent('s', { ctrlKey: true }));
    expect(handler).toHaveBeenCalledOnce();

    unmount();
  });

  it('does not fire after only the first step', () => {
    const handler = vi.fn();
    const map = createKeymap({ 'ctrl+k ctrl+s': handler });
    const unmount = map.mount(target);

    target.dispatch(makeEvent('k', { ctrlKey: true }));
    expect(handler).not.toHaveBeenCalled();

    unmount();
  });

  it('resets on wrong second key', () => {
    const handler = vi.fn();
    const map = createKeymap({ 'g g': handler });
    const unmount = map.mount(target);

    target.dispatch(makeEvent('g'));
    target.dispatch(makeEvent('x'));
    target.dispatch(makeEvent('g'));
    expect(handler).not.toHaveBeenCalled();

    unmount();
  });

  it('retries from root when wrong key is itself the first step', () => {
    const handler = vi.fn();
    const map = createKeymap({ 'g g': handler });
    const unmount = map.mount(target);

    target.dispatch(makeEvent('g'));
    target.dispatch(makeEvent('g'));
    expect(handler).toHaveBeenCalledOnce();

    unmount();
  });

  it('resets chord after timeout', () => {
    const handler = vi.fn();
    const map = createKeymap({ 'g g': handler }, { chordTimeout: 500 });
    const unmount = map.mount(target);

    target.dispatch(makeEvent('g'));
    vi.advanceTimersByTime(600);
    target.dispatch(makeEvent('g'));
    expect(handler).not.toHaveBeenCalled();

    unmount();
  });

  it('fires within timeout window', () => {
    const handler = vi.fn();
    const map = createKeymap({ 'g g': handler }, { chordTimeout: 500 });
    const unmount = map.mount(target);

    target.dispatch(makeEvent('g'));
    vi.advanceTimersByTime(300);
    target.dispatch(makeEvent('g'));
    expect(handler).toHaveBeenCalledOnce();

    unmount();
  });

  it('fires the first completed binding when two shortcuts share the same first step', () => {
    const h1 = vi.fn();
    const h2 = vi.fn();
    const map = createKeymap({ 'ctrl+k': h1, 'ctrl+k ctrl+s': h2 });
    const unmount = map.mount(target);

    target.dispatch(makeEvent('k', { ctrlKey: true }));
    expect(h1).toHaveBeenCalledOnce();
    expect(h2).not.toHaveBeenCalled();

    unmount();
  });

  it('supports three-step chords', () => {
    const handler = vi.fn();
    const map = createKeymap({ 'a b c': handler });
    const unmount = map.mount(target);

    target.dispatch(makeEvent('a'));
    target.dispatch(makeEvent('b'));
    target.dispatch(makeEvent('c'));
    expect(handler).toHaveBeenCalledOnce();

    unmount();
  });

  it('keyup chord resets after timeout independently from keydown chord', () => {
    const handler = vi.fn();
    const map = createKeymap({ 'g g': { handler, trigger: 'keyup' } }, { chordTimeout: 500 });
    const unmount = map.mount(target);

    target.dispatch(makeEvent('g', { type: 'keyup' }));
    vi.advanceTimersByTime(600);
    target.dispatch(makeEvent('g', { type: 'keyup' }));
    expect(handler).not.toHaveBeenCalled();

    unmount();
  });

  it('globalWhen() blocks retry-path bindings (failed chord resets then retries)', () => {
    let allowed = false;
    const h1 = vi.fn();
    const h2 = vi.fn();
    const map = createKeymap({ 'g g': h1, x: h2 }, { when: () => allowed });
    const unmount = map.mount(target);

    target.dispatch(makeEvent('g'));
    target.dispatch(makeEvent('x'));
    expect(h2).not.toHaveBeenCalled();

    allowed = true;
    target.dispatch(makeEvent('g'));
    target.dispatch(makeEvent('x'));
    expect(h2).toHaveBeenCalledOnce();

    unmount();
  });

  it('does not fire a second chord whose earlier step never matched (cross-binding leakage)', () => {
    const gx = vi.fn();
    const hy = vi.fn();
    const map = createKeymap({ 'g x': gx, 'h y': hy });
    const unmount = map.mount(target);

    target.dispatch(makeEvent('g'));
    target.dispatch(makeEvent('y'));
    expect(hy).not.toHaveBeenCalled();
    expect(gx).not.toHaveBeenCalled();

    unmount();
  });

  it('still fires the correct chord when candidates are narrowed correctly', () => {
    const gx = vi.fn();
    const hy = vi.fn();
    const map = createKeymap({ 'g x': gx, 'h y': hy });
    const unmount = map.mount(target);

    target.dispatch(makeEvent('g'));
    target.dispatch(makeEvent('x'));
    expect(gx).toHaveBeenCalledOnce();
    expect(hy).not.toHaveBeenCalled();

    unmount();
  });

  describe('priority and prefix chords', () => {
    it('a shorter binding always wins over a longer chord sharing its prefix, regardless of priority', () => {
      const short = vi.fn();
      const long = vi.fn();
      // `'g g'` has a higher priority than `'g'`, but can never be reached: the bindings map is
      // keyed by canonical shortcut, so two live bindings can never tie at the same completion
      // step — `priority` has nothing to resolve here. Documents the current, honest contract.
      const map = createKeymap({ g: { handler: short, priority: 0 }, 'g g': { handler: long, priority: 10 } });
      const unmount = map.mount(target);

      target.dispatch(makeEvent('g'));
      expect(short).toHaveBeenCalledOnce();
      expect(long).not.toHaveBeenCalled();

      unmount();
    });
  });

  it('keyup and keydown chord trackers are independent', () => {
    const upHandler = vi.fn();
    const downHandler = vi.fn();
    const map = createKeymap({
      'g g': downHandler,
      'h h': { handler: upHandler, trigger: 'keyup' },
    });
    const unmount = map.mount(target);

    target.dispatch(makeEvent('g'));
    target.dispatch(makeEvent('g'));
    expect(downHandler).toHaveBeenCalledOnce();
    expect(upHandler).not.toHaveBeenCalled();

    target.dispatch(makeEvent('h', { type: 'keyup' }));
    target.dispatch(makeEvent('h', { type: 'keyup' }));
    expect(upHandler).toHaveBeenCalledOnce();
    expect(downHandler).toHaveBeenCalledOnce();

    unmount();
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createKeymap } from '../keymap';
import { FakeTarget, makeEvent, mockHandler } from './_fixtures';

describe('chord state callback', () => {
  let target: FakeTarget;

  beforeEach(() => {
    target = new FakeTarget();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('emits started when first step of chord is pressed', () => {
    const onChordState = vi.fn();
    const map = createKeymap({ 'g g': () => {} }, { onChordState });
    const unmount = map.mount(target);

    target.dispatch(makeEvent('g'));

    expect(onChordState).toHaveBeenCalledOnce();
    const change = onChordState.mock.calls[0]![0]!;
    expect(change.type).toBe('started');
    expect(change.target).toBe(target);
    expect(change.step.key).toBe('g');
    expect(change.trigger).toBe('keydown');

    unmount();
  });

  it('emits progressed when second step of chord is pressed', () => {
    const onChordState = vi.fn();
    const map = createKeymap({ 'ctrl+k ctrl+s': () => {} }, { onChordState });
    const unmount = map.mount(target);

    onChordState.mockReset();

    target.dispatch(makeEvent('k', { ctrlKey: true }));
    expect(onChordState).toHaveBeenCalledOnce();
    const started = onChordState.mock.calls[0]![0]!;
    expect(started.type).toBe('started');
    expect(started.step.key).toBe('k');

    onChordState.mockReset();
    target.dispatch(makeEvent('s', { ctrlKey: true }));

    // When the chord completes, no additional event is emitted before the handler fires
    expect(onChordState).not.toHaveBeenCalled();

    unmount();
  });

  it('emits completed when chord fully matches', () => {
    const onChordState = vi.fn();
    const handler = mockHandler();
    const map = createKeymap({ 'g g': handler }, { onChordState });
    const unmount = map.mount(target);

    onChordState.mockReset();

    target.dispatch(makeEvent('g'));
    expect(onChordState).toHaveBeenCalledOnce();
    expect(onChordState.mock.calls[0]![0]!.type).toBe('started');

    onChordState.mockReset();
    target.dispatch(makeEvent('g'));

    expect(handler).toHaveBeenCalledOnce();
    // No chord state event when chord completes (handler fires immediately)
    expect(onChordState).not.toHaveBeenCalled();

    unmount();
  });

  it('emits timeout when chord does not complete in time', () => {
    const onChordState = vi.fn();
    const map = createKeymap({ 'g g': () => {} }, { chordTimeout: 500, onChordState });
    const unmount = map.mount(target);

    target.dispatch(makeEvent('g'));
    onChordState.mockReset();

    vi.advanceTimersByTime(600);

    expect(onChordState).toHaveBeenCalledOnce();
    const timeout = onChordState.mock.calls[0]![0]!;
    expect(timeout.type).toBe('timeout');
    expect(timeout.target).toBe(target);
    expect(timeout.trigger).toBe('keydown');

    unmount();
  });

  it('emits events independently for keydown and keyup chords', () => {
    const onChordState = vi.fn();
    const map = createKeymap(
      {
        'a a': { handler: () => {}, trigger: 'keydown' },
        'b b': { handler: () => {}, trigger: 'keyup' },
      },
      { onChordState },
    );
    const unmount = map.mount(target);

    onChordState.mockReset();

    target.dispatch(makeEvent('a', { type: 'keydown' }));
    expect(onChordState).toHaveBeenCalledOnce();
    const started1 = onChordState.mock.calls[0]![0]!;
    expect(started1.trigger).toBe('keydown');

    onChordState.mockReset();

    target.dispatch(makeEvent('b', { type: 'keyup' }));
    expect(onChordState).toHaveBeenCalledOnce();
    const started2 = onChordState.mock.calls[0]![0]!;
    expect(started2.trigger).toBe('keyup');

    unmount();
  });

  it('catches and logs callback errors without breaking binding execution', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const handler = mockHandler();
    const onChordState = vi.fn(() => {
      throw new Error('test error');
    });

    const map = createKeymap({ 'a a': handler }, { onChordState });
    const unmount = map.mount(target);

    target.dispatch(makeEvent('a'));

    // Handler should not be called (chord not yet complete)
    expect(handler).not.toHaveBeenCalled();
    // But callback error should be logged
    expect(warnSpy).toHaveBeenCalled();

    warnSpy.mockRestore();
    unmount();
  });

  it('emits events for each target independently', () => {
    const onChordState = vi.fn();
    const map = createKeymap({ 'g g': () => {} }, { onChordState });
    const target2 = new FakeTarget();

    const unmount1 = map.mount(target);
    const unmount2 = map.mount(target2);

    onChordState.mockReset();

    target.dispatch(makeEvent('g'));
    expect(onChordState).toHaveBeenCalledOnce();
    expect(onChordState.mock.calls[0]![0]!.target).toBe(target);

    onChordState.mockReset();

    target2.dispatch(makeEvent('g'));
    expect(onChordState).toHaveBeenCalledOnce();
    expect(onChordState.mock.calls[0]![0]!.target).toBe(target2);

    unmount1();
    unmount2();
  });

  it('does not emit events when no callback provided', () => {
    const map = createKeymap({ 'g g': () => {} });
    const unmount = map.mount(target);

    // Should not throw
    target.dispatch(makeEvent('g'));
    target.dispatch(makeEvent('g'));

    unmount();
  });

  it('emits timeout event with correct target and trigger', () => {
    const onChordState = vi.fn();
    const map = createKeymap({ 'g g': () => {} }, { chordTimeout: 500, onChordState });
    const unmount = map.mount(target);

    target.dispatch(makeEvent('g'));
    onChordState.mockReset();

    vi.advanceTimersByTime(600);

    const timeout = onChordState.mock.calls[0]![0]!;
    expect(timeout).toEqual({
      target,
      trigger: 'keydown',
      type: 'timeout',
    });

    unmount();
  });

  it('supports three-step chord progression events', () => {
    const onChordState = vi.fn();
    const map = createKeymap({ 'a b c': () => {} }, { onChordState });
    const unmount = map.mount(target);

    onChordState.mockReset();

    target.dispatch(makeEvent('a'));
    expect(onChordState).toHaveBeenCalledOnce();
    expect(onChordState.mock.calls[0]![0]!.type).toBe('started');

    onChordState.mockReset();
    target.dispatch(makeEvent('b'));
    expect(onChordState).toHaveBeenCalledOnce();
    expect(onChordState.mock.calls[0]![0]!.type).toBe('progressed');
    expect(onChordState.mock.calls[0]![0]!.steps).toHaveLength(2);

    onChordState.mockReset();
    target.dispatch(makeEvent('c'));
    // When final step completes, no additional event before handler fires
    expect(onChordState).not.toHaveBeenCalled();

    unmount();
  });

  it('resets chord state and does not emit timeout when unrelated key pressed mid-chord', () => {
    const onChordState = vi.fn();
    const map = createKeymap({ 'g g': () => {} }, { onChordState });
    const unmount = map.mount(target);

    onChordState.mockReset();

    target.dispatch(makeEvent('g'));
    expect(onChordState).toHaveBeenCalledOnce();

    onChordState.mockReset();
    target.dispatch(makeEvent('x'));
    // Unrelated key pressed; chord resets but no timeout event (that only fires on timer)
    expect(onChordState).not.toHaveBeenCalled();

    unmount();
  });

  it('supports guard exclusion of bindings without affecting chord state events', () => {
    let allow = false;
    const onChordState = vi.fn();
    const handler = mockHandler();
    const map = createKeymap({ 'a a': { handler, when: () => allow } }, { onChordState });
    const unmount = map.mount(target);

    onChordState.mockReset();

    target.dispatch(makeEvent('a'));

    // Chord state is still emitted even if guard fails
    expect(onChordState).toHaveBeenCalledOnce();
    expect(onChordState.mock.calls[0]![0]!.type).toBe('started');
    expect(handler).not.toHaveBeenCalled();

    onChordState.mockReset();
    allow = true;
    target.dispatch(makeEvent('a'));
    expect(handler).toHaveBeenCalledOnce();

    unmount();
  });
});

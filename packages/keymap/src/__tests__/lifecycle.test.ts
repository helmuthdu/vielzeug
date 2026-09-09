import { describe, expect, it } from 'vitest';

import { KeymapError } from '../errors';
import { createKeymap } from '../keymap';
import { FakeTarget, makeEvent, mockHandler } from './_fixtures';

describe('mount ownership and lifecycle', () => {
  it('keeps chord state local to each target', () => {
    const handler = mockHandler();
    const first = new FakeTarget();
    const second = new FakeTarget();
    const map = createKeymap([{ handler, id: 'top', shortcut: 'g g' }]);

    map.mount(first);
    map.mount(second);

    first.dispatch(makeEvent('g'));
    second.dispatch(makeEvent('g'));

    expect(handler).not.toHaveBeenCalled();
  });

  it('reference-counts repeated mounts of the same target', () => {
    const handler = mockHandler();
    const target = new FakeTarget();
    const map = createKeymap([{ handler, id: 'save', shortcut: 'ctrl+k' }]);
    const firstUnmount = map.mount(target);
    const secondUnmount = map.mount(target);

    firstUnmount();
    target.dispatch(makeEvent('k', { ctrlKey: true }));

    expect(handler).toHaveBeenCalledOnce();

    secondUnmount();
    target.dispatch(makeEvent('k', { ctrlKey: true }));

    expect(handler).toHaveBeenCalledOnce();
  });

  it('handles each bubbled event once across nested mounted targets', () => {
    const handler = mockHandler();
    const parent = document.createElement('div');
    const child = document.createElement('button');
    const map = createKeymap([{ handler, id: 'top', shortcut: 'g g' }]);

    parent.append(child);
    map.mount(parent);
    map.mount(child);

    child.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'g' }));
    child.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'g' }));

    expect(handler).toHaveBeenCalledOnce();
    map.dispose();
  });

  it('handles each dispatch of a reused event object', () => {
    const handler = mockHandler();
    const target = document.createElement('button');
    const map = createKeymap([{ handler, id: 'k', shortcut: 'k' }]);
    const event = new KeyboardEvent('keydown', { key: 'k' });

    map.mount(target);
    target.dispatchEvent(event);
    target.dispatchEvent(event);

    expect(handler).toHaveBeenCalledTimes(2);
    map.dispose();
  });

  it('rejects new operations after disposal', () => {
    const map = createKeymap([{ handler: mockHandler(), id: 'save', shortcut: 'ctrl+k' }]);

    map.dispose();

    expect(() => map.bind({ handler: mockHandler(), id: 'open', shortcut: 'ctrl+s' })).toThrow(KeymapError);
    expect(() => map.unbind('save')).toThrow(KeymapError);
    expect(() => map.mount(new FakeTarget())).toThrow(KeymapError);
  });
});

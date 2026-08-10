import { afterEach, describe, expect, it, vi } from 'vitest';

import { captureLayout, NecromancerConfigError } from '../index';
import { createRect, installFakeAnimations } from '../testing';

describe('layout animation', () => {
  let restoreWaapi: (() => void) | undefined;

  afterEach(() => {
    restoreWaapi?.();
    restoreWaapi = undefined;
    document.body.replaceChildren();
    vi.restoreAllMocks();
  });

  it('animates the positional delta with additive translate composition', () => {
    const { calls, restore } = installFakeAnimations();

    restoreWaapi = restore;

    const element = document.createElement('div');

    element.style.transform = 'rotate(12deg)';
    document.body.append(element);

    let x = 10;
    let y = 20;

    vi.spyOn(element, 'getBoundingClientRect').mockImplementation(() => createRect(x, y));

    const transition = captureLayout([element]);

    x = 40;
    y = 65;

    const group = transition.animate({ duration: 160, motion: 'full' });

    expect(calls[0]?.keyframes).toEqual([
      { composite: 'add', scale: '1 1', translate: '-30px -45px' },
      { composite: 'add', scale: '1 1', translate: '0px 0px' },
    ]);
    expect(calls[0]?.keyframes).not.toHaveProperty('transform');
    expect(element.style.transform).toBe('rotate(12deg)');
    group.dispose();
  });

  it('animates size changes with additive scale composition', () => {
    const { calls, restore } = installFakeAnimations();

    restoreWaapi = restore;

    const element = document.createElement('div');

    document.body.append(element);
    vi.spyOn(element, 'getBoundingClientRect').mockReturnValue(createRect(0, 0));

    // Scale is measured via `offsetWidth`/`offsetHeight`, not `getBoundingClientRect()`'s
    // width/height — the latter is the rotated bounding box and would distort the ratio
    // under any transform. jsdom's own `offsetWidth`/`offsetHeight` are always `0`, so tests
    // that exercise scale mock them directly instead of relying on real layout.
    let width = 100;

    Object.defineProperty(element, 'offsetHeight', { configurable: true, get: () => 50 });
    Object.defineProperty(element, 'offsetWidth', {
      configurable: true,
      get: () => width,
    });

    const transition = captureLayout([element]);

    width = 200;

    const group = transition.animate({ duration: 160, motion: 'full' });

    expect(calls[0]?.keyframes).toEqual([
      { composite: 'add', scale: '0.5 1', translate: '0px 0px' },
      { composite: 'add', scale: '1 1', translate: '0px 0px' },
    ]);
    group.dispose();
  });

  it('treats a collapsed dimension as unscaled instead of producing a non-finite ratio', () => {
    const { calls, restore } = installFakeAnimations();

    restoreWaapi = restore;

    const element = document.createElement('div');

    document.body.append(element);

    let x = 10;

    vi.spyOn(element, 'getBoundingClientRect').mockImplementation(() => createRect(x, 10));
    Object.defineProperty(element, 'offsetHeight', { configurable: true, get: () => 20 });

    let width = 100;

    Object.defineProperty(element, 'offsetWidth', {
      configurable: true,
      get: () => width,
    });

    const transition = captureLayout([element]);

    x = 40;
    width = 0;

    const group = transition.animate({ duration: 160, motion: 'full' });

    expect(calls[0]?.keyframes).toEqual([
      { composite: 'add', scale: '1 1', translate: '-30px 0px' },
      { composite: 'add', scale: '1 1', translate: '0px 0px' },
    ]);
    group.dispose();
  });

  it('consumes a transition after one animation attempt', () => {
    const { restore } = installFakeAnimations();

    restoreWaapi = restore;

    const element = document.createElement('div');

    document.body.append(element);
    vi.spyOn(element, 'getBoundingClientRect').mockReturnValue(createRect(10, 10));

    const transition = captureLayout([element]);

    transition.animate();

    expect(() => transition.animate()).toThrow(NecromancerConfigError);
  });

  it('omits unchanged, disconnected, and duplicate elements', () => {
    const { calls, restore } = installFakeAnimations();

    restoreWaapi = restore;

    const unchanged = document.createElement('div');
    const removed = document.createElement('div');

    document.body.append(unchanged, removed);
    vi.spyOn(unchanged, 'getBoundingClientRect').mockReturnValue(createRect(10, 10));
    vi.spyOn(removed, 'getBoundingClientRect').mockReturnValue(createRect(20, 20));

    const transition = captureLayout([unchanged, unchanged, removed]);

    removed.remove();

    const group = transition.animate();

    expect(group.handles).toEqual([]);
    expect(calls).toEqual([]);
  });

  it('matches replacement elements by key in their committed order', () => {
    const { calls, restore } = installFakeAnimations();

    restoreWaapi = restore;

    const first = document.createElement('div');
    const second = document.createElement('div');

    first.dataset.id = 'first';
    second.dataset.id = 'second';
    document.body.append(first, second);
    vi.spyOn(first, 'getBoundingClientRect').mockReturnValue(createRect(0, 0));
    vi.spyOn(second, 'getBoundingClientRect').mockReturnValue(createRect(0, 20));

    const transition = captureLayout([first, second], { getKey: (element) => element.dataset.id! });
    const nextSecond = document.createElement('div');
    const nextFirst = document.createElement('div');

    nextSecond.dataset.id = 'second';
    nextFirst.dataset.id = 'first';
    first.replaceWith(nextSecond);
    second.replaceWith(nextFirst);
    vi.spyOn(nextSecond, 'getBoundingClientRect').mockReturnValue(createRect(0, 0));
    vi.spyOn(nextFirst, 'getBoundingClientRect').mockReturnValue(createRect(0, 20));

    const group = transition.animate({ elements: [nextSecond, nextFirst], motion: 'full' });

    expect(group.handles).toHaveLength(2);
    expect(calls.map((call) => call.keyframes)).toEqual([
      [
        { composite: 'add', scale: '1 1', translate: '0px 20px' },
        { composite: 'add', scale: '1 1', translate: '0px 0px' },
      ],
      [
        { composite: 'add', scale: '1 1', translate: '0px -20px' },
        { composite: 'add', scale: '1 1', translate: '0px 0px' },
      ],
    ]);
    group.dispose();
  });

  it('does not match replacement elements without getKey', () => {
    const { calls, restore } = installFakeAnimations();

    restoreWaapi = restore;

    const captured = document.createElement('div');
    const replacement = document.createElement('div');

    document.body.append(captured);
    vi.spyOn(captured, 'getBoundingClientRect').mockReturnValue(createRect(0, 0));

    const transition = captureLayout([captured]);

    captured.replaceWith(replacement);
    vi.spyOn(replacement, 'getBoundingClientRect').mockReturnValue(createRect(0, 20));

    const group = transition.animate({ elements: [replacement] });

    expect(group.handles).toEqual([]);
    expect(calls).toEqual([]);
  });

  it('rejects empty and duplicate keys before consuming the transition', () => {
    const { calls, restore } = installFakeAnimations();

    restoreWaapi = restore;

    const captured = document.createElement('div');
    const replacement = document.createElement('div');

    captured.dataset.id = 'task';
    document.body.append(captured);
    vi.spyOn(captured, 'getBoundingClientRect').mockReturnValue(createRect(0, 0));

    const transition = captureLayout([captured], { getKey: (element) => element.dataset.id! });

    captured.replaceWith(replacement);
    vi.spyOn(replacement, 'getBoundingClientRect').mockReturnValue(createRect(0, 20));

    expect(() => transition.animate({ elements: [replacement] })).toThrow(NecromancerConfigError);

    replacement.dataset.id = 'task';

    const group = transition.animate({ elements: [replacement], motion: 'full' });

    expect(calls).toHaveLength(1);
    group.dispose();

    const duplicate = document.createElement('div');

    duplicate.dataset.id = 'task';
    document.body.append(duplicate);

    expect(() => captureLayout([replacement, duplicate], { getKey: (element) => element.dataset.id! })).toThrow(
      NecromancerConfigError,
    );
  });

  it('rejects duplicate committed keys before consuming the transition', () => {
    const { calls, restore } = installFakeAnimations();

    restoreWaapi = restore;

    const first = document.createElement('div');
    const second = document.createElement('div');

    first.dataset.id = 'first';
    second.dataset.id = 'second';
    document.body.append(first, second);
    vi.spyOn(first, 'getBoundingClientRect').mockReturnValue(createRect(0, 0));
    vi.spyOn(second, 'getBoundingClientRect').mockReturnValue(createRect(0, 20));

    const transition = captureLayout([first, second], { getKey: (element) => element.dataset.id! });
    const nextFirst = document.createElement('div');
    const nextSecond = document.createElement('div');

    nextFirst.dataset.id = 'first';
    nextSecond.dataset.id = 'first';
    first.replaceWith(nextFirst);
    second.replaceWith(nextSecond);
    vi.spyOn(nextFirst, 'getBoundingClientRect').mockReturnValue(createRect(0, 20));
    vi.spyOn(nextSecond, 'getBoundingClientRect').mockReturnValue(createRect(0, 0));

    expect(() => transition.animate({ elements: [nextFirst, nextSecond] })).toThrow(NecromancerConfigError);

    nextSecond.dataset.id = 'second';

    const group = transition.animate({ elements: [nextFirst, nextSecond], motion: 'full' });

    expect(calls).toHaveLength(2);
    group.dispose();
  });
});

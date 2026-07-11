import { signal } from '@vielzeug/ripple';

import { createAutoResize } from '../auto-resize';

const makeTextarea = (): HTMLTextAreaElement => document.createElement('textarea');

describe('createAutoResize', () => {
  // jsdom never computes real layout, so `scrollHeight` is always 0 — these assertions check
  // that height was actively recomputed (landing on "0px", jsdom's `scrollHeight`), not left
  // untouched, since the real pixel value can only be verified in a real browser.

  it('grows height on wire when enabled is omitted', async () => {
    const autoResize = createAutoResize();
    const el = makeTextarea();

    autoResize.wire(el);

    // The initial recompute is deferred a frame (see wire()'s doc comment) — a synchronous
    // scrollHeight read right after mount can be stale before the browser lays anything out.
    expect(el.style.height).toBe('');

    await new Promise((resolve) => requestAnimationFrame(resolve));

    expect(el.style.height).toBe('0px');
  });

  it('recomputes height on every input event', () => {
    const autoResize = createAutoResize();
    const el = makeTextarea();

    autoResize.wire(el);
    el.style.height = '10px';
    el.dispatchEvent(new Event('input'));

    expect(el.style.height).toBe('0px');
  });

  it('does not touch height when enabled is false', () => {
    const autoResize = createAutoResize({ enabled: signal(false) });
    const el = makeTextarea();

    autoResize.wire(el);

    expect(el.style.height).toBe('');
  });

  it('starts recomputing once enabled flips to true', () => {
    const enabled = signal(false);
    const autoResize = createAutoResize({ enabled });
    const el = makeTextarea();

    autoResize.wire(el);
    expect(el.style.height).toBe('');

    enabled.value = true;
    autoResize.recompute();

    expect(el.style.height).toBe('0px');
  });

  it('recompute() is a no-op before anything is wired', () => {
    const autoResize = createAutoResize();

    expect(() => autoResize.recompute()).not.toThrow();
  });

  it('stops recomputing after the detach function runs', () => {
    const autoResize = createAutoResize();
    const el = makeTextarea();

    const detach = autoResize.wire(el);

    detach();
    el.style.height = '10px';
    el.dispatchEvent(new Event('input'));

    expect(el.style.height).toBe('10px');
  });

  it('rewiring a second element stops growing the first', () => {
    const autoResize = createAutoResize();
    const first = makeTextarea();
    const second = makeTextarea();

    autoResize.wire(first);
    autoResize.wire(second);

    first.style.height = '10px';
    first.dispatchEvent(new Event('input'));

    expect(first.style.height).toBe('10px');
  });
});

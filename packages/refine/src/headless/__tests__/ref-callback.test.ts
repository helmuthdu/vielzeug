import { signal } from '@vielzeug/ripple';

import { bindRefCallback } from '../ref-callback';

describe('bindRefCallback', () => {
  it('fires the current callback immediately with the element', () => {
    const cb = vi.fn();
    const el = document.createElement('input');

    bindRefCallback(signal(cb), el);

    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledWith(el);
  });

  it('does nothing on bind when the ref is null', () => {
    const cb = vi.fn();
    const el = document.createElement('input');

    bindRefCallback(signal(null), el);

    expect(cb).not.toHaveBeenCalled();
  });

  it('forwards the element to a new callback set after mount', () => {
    const first = vi.fn();
    const second = vi.fn();
    const el = document.createElement('input');
    const ref = signal<((el: HTMLInputElement | null) => void) | null>(first);

    bindRefCallback(ref, el);
    ref.value = second;

    expect(second).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledWith(el);
  });

  it('calls the current callback with null on unbind', () => {
    const cb = vi.fn();
    const el = document.createElement('input');

    const unbind = bindRefCallback(signal(cb), el);

    cb.mockClear();
    unbind();

    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledWith(null);
  });

  it('stops forwarding to the ref once unbound', () => {
    const cb = vi.fn();
    const el = document.createElement('input');
    const ref = signal<((el: HTMLInputElement | null) => void) | null>(cb);

    const unbind = bindRefCallback(ref, el);

    unbind();
    cb.mockClear();
    ref.value = vi.fn();

    expect(cb).not.toHaveBeenCalled();
  });
});

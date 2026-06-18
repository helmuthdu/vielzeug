import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { bindRefetch } from '../focus';

describe('bindRefetch', () => {
  let refetchStale: ReturnType<typeof vi.fn<() => void>>;
  let qc: { refetchStale(): void };

  beforeEach(() => {
    refetchStale = vi.fn();
    qc = { refetchStale };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls refetchStale when document becomes visible', () => {
    const unbind = bindRefetch(qc);

    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    document.dispatchEvent(new Event('visibilitychange'));

    expect(refetchStale).toHaveBeenCalledTimes(1);

    unbind();
  });

  it('does not call refetchStale when document is hidden', () => {
    const unbind = bindRefetch(qc);

    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));

    expect(refetchStale).not.toHaveBeenCalled();

    unbind();
  });

  it('calls refetchStale on window online event', () => {
    const unbind = bindRefetch(qc);

    window.dispatchEvent(new Event('online'));

    expect(refetchStale).toHaveBeenCalledTimes(1);

    unbind();
  });

  it('removes listeners after unbind()', () => {
    const unbind = bindRefetch(qc);

    unbind();

    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    document.dispatchEvent(new Event('visibilitychange'));
    window.dispatchEvent(new Event('online'));

    expect(refetchStale).not.toHaveBeenCalled();
  });

  it('unbind() is safe to call multiple times', () => {
    const unbind = bindRefetch(qc);

    expect(() => {
      unbind();
      unbind();
    }).not.toThrow();
  });

  it('removes listeners when the provided signal aborts', () => {
    const ac = new AbortController();

    bindRefetch(qc, { signal: ac.signal });

    ac.abort();

    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    document.dispatchEvent(new Event('visibilitychange'));
    window.dispatchEvent(new Event('online'));

    expect(refetchStale).not.toHaveBeenCalled();
  });

  it('works without the signal option (backward-compatible)', () => {
    const unbind = bindRefetch(qc);

    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    document.dispatchEvent(new Event('visibilitychange'));

    expect(refetchStale).toHaveBeenCalledTimes(1);

    unbind();
  });
});

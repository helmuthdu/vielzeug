import { mediaObserver } from '..';
// noinspection HtmlUnknownAttribute
import { html, onMount } from '../../index';
import { mount } from '../../testing';

describe('mediaObserver()', () => {
  it('initialises the signal to the current match state of the query', async () => {
    let capturedMatches!: ReturnType<typeof mediaObserver>;
    const mockMql = { addEventListener: vi.fn(), matches: true, removeEventListener: vi.fn() };
    const origMatchMedia = window.matchMedia;

    window.matchMedia = vi.fn().mockReturnValue(mockMql);

    try {
      await mount(() => {
        onMount(() => {
          capturedMatches = mediaObserver('(prefers-color-scheme: dark)');
        });

        return html`<div></div>`;
      });

      expect(capturedMatches.value).toBe(true);
    } finally {
      window.matchMedia = origMatchMedia;
    }
  });

  it('updates the signal when the media query match state changes', async () => {
    let capturedMatches!: ReturnType<typeof mediaObserver>;
    let capturedHandler: ((e: MediaQueryListEvent) => void) | undefined;

    const mockMql = {
      addEventListener: vi.fn((_: string, cb: (e: MediaQueryListEvent) => void) => {
        capturedHandler = cb;
      }),
      matches: false,
      removeEventListener: vi.fn(),
    };
    const origMatchMedia = window.matchMedia;

    window.matchMedia = vi.fn().mockReturnValue(mockMql);

    try {
      await mount(() => {
        onMount(() => {
          capturedMatches = mediaObserver('(max-width: 768px)');
        });

        return html`<div></div>`;
      });

      expect(capturedMatches.value).toBe(false);

      if (!capturedHandler) throw new Error('MediaQueryList change handler not captured');

      capturedHandler({ matches: true } as MediaQueryListEvent);

      expect(capturedMatches.value).toBe(true);
    } finally {
      window.matchMedia = origMatchMedia;
    }
  });

  it('removes the change listener when the component unmounts', async () => {
    const removeEventListenerSpy = vi.fn();
    const mockMql = {
      addEventListener: vi.fn(),
      matches: false,
      removeEventListener: removeEventListenerSpy,
    };
    const origMatchMedia = window.matchMedia;

    window.matchMedia = vi.fn().mockReturnValue(mockMql);

    try {
      const { destroy } = await mount(() => {
        onMount(() => {
          mediaObserver('(prefers-reduced-motion: reduce)');
        });

        return html`<div></div>`;
      });

      expect(removeEventListenerSpy).not.toHaveBeenCalled();
      destroy();
      expect(removeEventListenerSpy).toHaveBeenCalledOnce();
    } finally {
      window.matchMedia = origMatchMedia;
    }
  });
});

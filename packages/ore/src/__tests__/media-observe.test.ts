import { html, onMounted } from '../index';
import { mediaObserver } from '../observers';
import { mount } from '../testing';

describe('mediaObserver()', () => {
  it('initialises the signal to the current match state of the query', async () => {
    let capturedMatches!: ReturnType<typeof mediaObserver>;
    const mockMql = { addEventListener: vi.fn(), matches: true, removeEventListener: vi.fn() };
    const origMatchMedia = window.matchMedia;

    window.matchMedia = vi.fn().mockReturnValue(mockMql);

    try {
      await mount((_props) => {
        onMounted(() => {
          capturedMatches = mediaObserver('(prefers-color-scheme: dark)');
        });

        return html``;
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
      await mount((_props) => {
        onMounted(() => {
          capturedMatches = mediaObserver('(max-width: 768px)');
        });

        return html``;
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
      const { dispose } = await mount((_props) => {
        onMounted(() => {
          mediaObserver('(prefers-reduced-motion: reduce)');
        });

        return html``;
      });

      expect(removeEventListenerSpy).not.toHaveBeenCalled();
      dispose();
      expect(removeEventListenerSpy).toHaveBeenCalledOnce();
    } finally {
      window.matchMedia = origMatchMedia;
    }
  });
});

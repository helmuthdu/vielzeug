import { intersectionObserver } from '..';
// noinspection HtmlUnknownAttribute
import { html, ref } from '../../index';
import { mount } from '../../testing';

describe('intersectionObserver()', () => {
  it('initialises the signal to null', async () => {
    let capturedEntry!: ReturnType<typeof intersectionObserver>;

    await mount((_props, ctx) => {
      const divRef = ref<HTMLDivElement>();

      ctx.onMounted(() => {
        capturedEntry = intersectionObserver(divRef.value!);
      });

      return html`<div ref=${divRef}></div>`;
    });

    expect(capturedEntry.value).toBeNull();
  });

  it('updates the signal when the IntersectionObserver callback fires', async () => {
    let capturedCb: IntersectionObserverCallback | undefined;
    const origIO = globalThis.IntersectionObserver;

    globalThis.IntersectionObserver = class {
      observe = vi.fn();
      disconnect = vi.fn();
      constructor(cb: IntersectionObserverCallback) {
        capturedCb = cb;
      }
    } as unknown as typeof IntersectionObserver;

    try {
      let capturedEntry!: ReturnType<typeof intersectionObserver>;

      await mount((_props, ctx) => {
        const divRef = ref<HTMLDivElement>();

        ctx.onMounted(() => {
          capturedEntry = intersectionObserver(divRef.value!);
        });

        return html`<div ref=${divRef}></div>`;
      });

      const fakeEntry = { intersectionRatio: 1, isIntersecting: true } as IntersectionObserverEntry;

      if (!capturedCb) throw new Error('IntersectionObserver callback not captured');

      capturedCb([fakeEntry], {} as IntersectionObserver);

      expect(capturedEntry.value).toBe(fakeEntry);
      expect(capturedEntry.value?.isIntersecting).toBe(true);
    } finally {
      globalThis.IntersectionObserver = origIO;
    }
  });

  it('disconnects the IntersectionObserver when the component unmounts', async () => {
    const disconnectSpy = vi.fn();
    const origIO = globalThis.IntersectionObserver;

    globalThis.IntersectionObserver = class {
      observe = vi.fn();
      disconnect = disconnectSpy;
      constructor(_cb: IntersectionObserverCallback) {}
    } as unknown as typeof IntersectionObserver;

    try {
      const { dispose } = await mount((_props, ctx) => {
        const divRef = ref<HTMLDivElement>();

        ctx.onMounted(() => {
          intersectionObserver(divRef.value!);
        });

        return html`<div ref=${divRef}></div>`;
      });

      expect(disconnectSpy).not.toHaveBeenCalled();
      dispose();
      expect(disconnectSpy).toHaveBeenCalledOnce();
    } finally {
      globalThis.IntersectionObserver = origIO;
    }
  });
});

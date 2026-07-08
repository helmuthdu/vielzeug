// noinspection HtmlUnknownAttribute
import { html, ref, onMounted } from '../index';
import { intersectionObserver } from '../observers';
import { mount } from '../testing';

describe('intersectionObserver()', () => {
  it('initialises the signal to null', async () => {
    let capturedEntry!: ReturnType<typeof intersectionObserver>;

    await mount((_props) => {
      const divRef = ref<HTMLDivElement>();

      onMounted(() => {
        capturedEntry = intersectionObserver(divRef.value!);
      });

      return html`<div ref=${divRef}></div>`;
    });

    expect(capturedEntry.value).toBeNull();
  });

  it('observes the target element', async () => {
    const observeSpy = vi.fn();
    const origIO = globalThis.IntersectionObserver;

    globalThis.IntersectionObserver = class {
      observe = observeSpy;
      disconnect = vi.fn();
      constructor(_cb: IntersectionObserverCallback) {}
    } as unknown as typeof IntersectionObserver;

    try {
      await mount((_props) => {
        const divRef = ref<HTMLDivElement>();

        onMounted(() => {
          intersectionObserver(divRef.value!);
        });

        return html`<div ref=${divRef}></div>`;
      });

      expect(observeSpy).toHaveBeenCalledWith(expect.any(HTMLDivElement));
    } finally {
      globalThis.IntersectionObserver = origIO;
    }
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

      await mount((_props) => {
        const divRef = ref<HTMLDivElement>();

        onMounted(() => {
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
      const { dispose } = await mount((_props) => {
        const divRef = ref<HTMLDivElement>();

        onMounted(() => {
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

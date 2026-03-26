import { resizeObserver } from '..';
// noinspection HtmlUnknownAttribute
import { html, onMount, ref } from '../../index';
import { mount } from '../../testing';

describe('resizeObserver()', () => {
  it('initialises the signal to { height: 0, width: 0 }', async () => {
    let capturedSize!: ReturnType<typeof resizeObserver>;

    await mount(() => {
      const divRef = ref<HTMLDivElement>();

      onMount(() => {
        capturedSize = resizeObserver(divRef.value!);
      });

      return html`<div ref=${divRef}></div>`;
    });

    expect(capturedSize.value).toEqual({ height: 0, width: 0 });
  });

  it('updates the signal when the ResizeObserver callback fires', async () => {
    let capturedCb: ResizeObserverCallback | undefined;
    const origRO = globalThis.ResizeObserver;

    globalThis.ResizeObserver = class {
      observe = vi.fn();
      disconnect = vi.fn();
      constructor(cb: ResizeObserverCallback) {
        capturedCb = cb;
      }
    } as unknown as typeof ResizeObserver;

    try {
      let capturedSize!: ReturnType<typeof resizeObserver>;

      await mount(() => {
        const divRef = ref<HTMLDivElement>();

        onMount(() => {
          capturedSize = resizeObserver(divRef.value!);
        });

        return html`<div ref=${divRef}></div>`;
      });

      if (!capturedCb) throw new Error('ResizeObserver callback not captured');

      capturedCb(
        [{ contentBoxSize: [{ blockSize: 42, inlineSize: 100 }] }] as unknown as ResizeObserverEntry[],
        {} as ResizeObserver,
      );

      expect(capturedSize.value).toEqual({ height: 42, width: 100 });
    } finally {
      globalThis.ResizeObserver = origRO;
    }
  });

  it('disconnects the ResizeObserver when the component unmounts', async () => {
    const disconnectSpy = vi.fn();
    const origRO = globalThis.ResizeObserver;

    globalThis.ResizeObserver = class {
      observe = vi.fn();
      disconnect = disconnectSpy;
      constructor(_cb: ResizeObserverCallback) {}
    } as unknown as typeof ResizeObserver;

    try {
      const { destroy } = await mount(() => {
        const divRef = ref<HTMLDivElement>();

        onMount(() => {
          resizeObserver(divRef.value!);
        });

        return html`<div ref=${divRef}></div>`;
      });

      expect(disconnectSpy).not.toHaveBeenCalled();
      destroy();
      expect(disconnectSpy).toHaveBeenCalledOnce();
    } finally {
      globalThis.ResizeObserver = origRO;
    }
  });
});

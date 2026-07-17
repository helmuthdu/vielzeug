// noinspection HtmlUnknownAttribute
import { html, ref, onMounted } from '../index';
import { resizeObserver } from '../observers';
import { mount } from '../testing';

describe('resizeObserver()', () => {
  it('initialises the signal to { height: 0, width: 0 }', async () => {
    let capturedSize!: ReturnType<typeof resizeObserver>;

    await mount((_props) => {
      const divRef = ref<HTMLDivElement>();

      onMounted(() => {
        capturedSize = resizeObserver(divRef.value!);
      });

      return html`<div ref=${divRef}></div>`;
    });

    expect(capturedSize.value).toEqual({ height: 0, width: 0 });
  });

  it('observes the target element', async () => {
    const observeSpy = vi.fn();
    const origRO = globalThis.ResizeObserver;

    globalThis.ResizeObserver = class {
      observe = observeSpy;
      disconnect = vi.fn();
      constructor(_cb: ResizeObserverCallback) {}
    } as unknown as typeof ResizeObserver;

    try {
      await mount((_props) => {
        const divRef = ref<HTMLDivElement>();

        onMounted(() => {
          resizeObserver(divRef.value!);
        });

        return html`<div ref=${divRef}></div>`;
      });

      expect(observeSpy).toHaveBeenCalledWith(expect.any(HTMLDivElement));
    } finally {
      globalThis.ResizeObserver = origRO;
    }
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

      await mount((_props) => {
        const divRef = ref<HTMLDivElement>();

        onMounted(() => {
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
      const { dispose } = await mount((_props) => {
        const divRef = ref<HTMLDivElement>();

        onMounted(() => {
          resizeObserver(divRef.value!);
        });

        return html`<div ref=${divRef}></div>`;
      });

      expect(disconnectSpy).not.toHaveBeenCalled();
      dispose();
      expect(disconnectSpy).toHaveBeenCalledOnce();
    } finally {
      globalThis.ResizeObserver = origRO;
    }
  });

  it('disconnects exactly once even if the fixture is disposed twice (idempotent teardown)', async () => {
    const disconnectSpy = vi.fn();
    const origRO = globalThis.ResizeObserver;

    globalThis.ResizeObserver = class {
      observe = vi.fn();
      disconnect = disconnectSpy;
      constructor(_cb: ResizeObserverCallback) {}
    } as unknown as typeof ResizeObserver;

    try {
      const { dispose } = await mount((_props) => {
        const divRef = ref<HTMLDivElement>();

        onMounted(() => {
          resizeObserver(divRef.value!);
        });

        return html`<div ref=${divRef}></div>`;
      });

      dispose();
      dispose();
      expect(disconnectSpy).toHaveBeenCalledOnce();
    } finally {
      globalThis.ResizeObserver = origRO;
    }
  });
});

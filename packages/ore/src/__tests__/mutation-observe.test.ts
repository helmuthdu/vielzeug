import { html, ref, onMounted } from '../index';
import { mutationObserver } from '../observers';
import { mount } from '../testing';

describe('mutationObserver()', () => {
  it('captures child-list mutations', async () => {
    let observed!: ReturnType<typeof mutationObserver>;

    const { flush, query } = await mount((_props) => {
      const hostRef = ref<HTMLDivElement>();

      onMounted(() => {
        if (!hostRef.value) throw new Error('Expected host ref');

        observed = mutationObserver(hostRef.value, { childList: true });
      });

      return html`<div class="root" ref=${hostRef}></div>`;
    });

    const root = query<HTMLElement>('.root');

    if (!root) throw new Error('Expected root element');

    root.appendChild(document.createElement('span'));
    await flush();

    expect(observed.value.entries.length).toBeGreaterThan(0);
    expect(observed.value.latest?.type).toBe('childList');
  });

  it('disconnects observer on unmount', async () => {
    const disconnect = vi.fn();
    const OriginalMutationObserver = globalThis.MutationObserver;

    class MockMutationObserver {
      observe() {}

      disconnect() {
        disconnect();
      }
    }

    // @ts-expect-error - testing override
    globalThis.MutationObserver = MockMutationObserver;

    try {
      const { dispose } = await mount((_props) => {
        const hostRef = ref<HTMLDivElement>();

        onMounted(() => {
          if (!hostRef.value) throw new Error('Expected host ref');

          mutationObserver(hostRef.value);
        });

        return html`<div ref=${hostRef}></div>`;
      });

      expect(disconnect).not.toHaveBeenCalled();

      dispose();

      expect(disconnect).toHaveBeenCalled();
    } finally {
      globalThis.MutationObserver = OriginalMutationObserver;
    }
  });
});

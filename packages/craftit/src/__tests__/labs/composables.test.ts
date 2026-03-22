/**
 * Labs composables tests aligned with the craftit/labs entrypoint.
 */
import { html, onMount, ref, signal } from '../..';
import { createCheckableControl, observeIntersection, observeMedia, observeResize, useA11yControl } from '../../labs';
import { mount } from '../../test';

describe('@vielzeug/craftit/labs', () => {
  // ─────────────────────────────────────────────────────────────────────────────
  // labs/observers.ts
  // ─────────────────────────────────────────────────────────────────────────────

  describe('observers', () => {
    describe('observeResize()', () => {
      it('initialises the signal to { height: 0, width: 0 }', async () => {
        let capturedSize!: ReturnType<typeof observeResize>;

        await mount(() => {
          const divRef = ref<HTMLDivElement>();

          onMount(() => {
            capturedSize = observeResize(divRef.value!);
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
          let capturedSize!: ReturnType<typeof observeResize>;

          await mount(() => {
            const divRef = ref<HTMLDivElement>();

            onMount(() => {
              capturedSize = observeResize(divRef.value!);
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
              observeResize(divRef.value!);
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

    describe('observeIntersection()', () => {
      it('initialises the signal to null', async () => {
        let capturedEntry!: ReturnType<typeof observeIntersection>;

        await mount(() => {
          const divRef = ref<HTMLDivElement>();

          onMount(() => {
            capturedEntry = observeIntersection(divRef.value!);
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
          let capturedEntry!: ReturnType<typeof observeIntersection>;

          await mount(() => {
            const divRef = ref<HTMLDivElement>();

            onMount(() => {
              capturedEntry = observeIntersection(divRef.value!);
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
          const { destroy } = await mount(() => {
            const divRef = ref<HTMLDivElement>();

            onMount(() => {
              observeIntersection(divRef.value!);
            });

            return html`<div ref=${divRef}></div>`;
          });

          expect(disconnectSpy).not.toHaveBeenCalled();
          destroy();
          expect(disconnectSpy).toHaveBeenCalledOnce();
        } finally {
          globalThis.IntersectionObserver = origIO;
        }
      });
    });

    // ─────────────────────────────────────────────────────────────────────────────
    // 12. observeMedia() — matchMedia Composable
    // ─────────────────────────────────────────────────────────────────────────────

    describe('observeMedia()', () => {
      it('initialises the signal to the current match state of the query', async () => {
        let capturedMatches!: ReturnType<typeof observeMedia>;
        const mockMql = { addEventListener: vi.fn(), matches: true, removeEventListener: vi.fn() };
        const origMatchMedia = window.matchMedia;

        window.matchMedia = vi.fn().mockReturnValue(mockMql);

        try {
          await mount(() => {
            onMount(() => {
              capturedMatches = observeMedia('(prefers-color-scheme: dark)');
            });

            return html`<div></div>`;
          });

          expect(capturedMatches.value).toBe(true);
        } finally {
          window.matchMedia = origMatchMedia;
        }
      });

      it('updates the signal when the media query match state changes', async () => {
        let capturedMatches!: ReturnType<typeof observeMedia>;
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
              capturedMatches = observeMedia('(max-width: 768px)');
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
              observeMedia('(prefers-reduced-motion: reduce)');
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
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // labs/a11y-control.ts
  // ─────────────────────────────────────────────────────────────────────────────

  describe('a11y-control', () => {
    describe('useA11yControl() (labs)', () => {
      it('sets the ARIA role on the host element during setup', async () => {
        const { element } = await mount(({ host }) => {
          useA11yControl(host, { role: 'checkbox' });

          return html`<div></div>`;
        });

        expect(element.getAttribute('role')).toBe('checkbox');
      });

      it('returns the configured labelId and helperId as stable strings', async () => {
        let handle!: ReturnType<typeof useA11yControl>;

        await mount(({ host }) => {
          handle = useA11yControl(host, {
            helperId: 'my-helper',
            labelId: 'my-label',
            role: 'switch',
          });

          return html`<div></div>`;
        });

        expect(handle.labelId).toBe('my-label');
        expect(handle.helperId).toBe('my-helper');
      });

      it('auto-generates unique labelId and helperId when none are configured', async () => {
        let handleA!: ReturnType<typeof useA11yControl>;
        let handleB!: ReturnType<typeof useA11yControl>;

        await mount(({ host }) => {
          handleA = useA11yControl(host, { role: 'radio' });

          return html`<div></div>`;
        });
        await mount(({ host }) => {
          handleB = useA11yControl(host, { role: 'radio' });

          return html`<div></div>`;
        });

        expect(handleA.labelId).not.toBe(handleB.labelId);
        expect(handleA.helperId).not.toBe(handleB.helperId);
      });

      it('sets aria-checked reactively via the checked getter', async () => {
        const checked = signal<'true' | 'false'>('false');

        const { act, element } = await mount(({ host }) => {
          useA11yControl(host, { checked: () => checked.value, role: 'checkbox' });

          return html`<div></div>`;
        });

        expect(element.getAttribute('aria-checked')).toBe('false');

        await act(() => {
          checked.value = 'true';
        });

        expect(element.getAttribute('aria-checked')).toBe('true');
      });

      it('sets aria-invalid reactively via the invalid getter', async () => {
        const invalid = signal(false);

        const { act, element } = await mount(({ host }) => {
          useA11yControl(host, { invalid: () => invalid.value, role: 'textbox' });

          return html`<div></div>`;
        });

        expect(element.getAttribute('aria-invalid')).toBe('false');

        await act(() => {
          invalid.value = true;
        });

        expect(element.getAttribute('aria-invalid')).toBe('true');
      });

      it('adds aria-describedby and populates the helper live-region when helper text is set', async () => {
        const helperMsg = signal<string | undefined>(undefined);

        const { act, element } = await mount(({ host }) => {
          useA11yControl(host, {
            helperId: 'desc-test',
            helperText: () => helperMsg.value,
            role: 'textbox',
          });

          // The composable queries [data-a11y-helper] from the shadow root
          return html`<div data-a11y-helper hidden></div>`;
        });

        // Before helper text is set, no aria-describedby
        expect(element.hasAttribute('aria-describedby')).toBe(false);

        await act(() => {
          helperMsg.value = 'Enter a valid email address';
        });

        expect(element.getAttribute('aria-describedby')).toBe('desc-test');
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // labs/create-checkable-control.ts
  // ─────────────────────────────────────────────────────────────────────────────

  describe('create-checkable-control', () => {
    describe('createCheckableControl() (labs)', () => {
      it('toggles the checked signal on each invocation', () => {
        const checked = signal(false);
        const ctrl = createCheckableControl({
          checked,
          disabled: signal(false),
          value: signal('opt-1'),
        });

        ctrl.toggle(new Event('click'));
        expect(checked.value).toBe(true);

        ctrl.toggle(new Event('click'));
        expect(checked.value).toBe(false);
      });

      it('does not toggle when the disabled signal is true', () => {
        const checked = signal(false);
        const ctrl = createCheckableControl({
          checked,
          disabled: signal(true),
          value: signal('opt-1'),
        });

        ctrl.toggle(new Event('click'));

        expect(checked.value).toBe(false);
      });

      it('clears indeterminate on the first toggle without changing checked when clearIndeterminateFirst is set', () => {
        const checked = signal(false);
        const indeterminate = signal(true);
        const ctrl = createCheckableControl({
          checked,
          clearIndeterminateFirst: true,
          disabled: signal(false),
          indeterminate,
          value: signal('opt-1'),
        });

        // First toggle: clears indeterminate, leaves checked unchanged
        ctrl.toggle(new Event('click'));
        expect(indeterminate.value).toBe(false);
        expect(checked.value).toBe(false);

        // Second toggle: normal toggle behaviour
        ctrl.toggle(new Event('click'));
        expect(checked.value).toBe(true);
      });

      it('changePayload returns the current checked state, field value, and original event', () => {
        const checked = signal(true);
        const ctrl = createCheckableControl({
          checked,
          disabled: signal(false),
          value: signal('my-val'),
        });

        const event = new Event('change');
        const payload = ctrl.changePayload(event);

        expect(payload).toMatchObject({
          checked: true,
          fieldValue: 'my-val',
          originalEvent: event,
          value: true,
        });
      });
    });
  });
});

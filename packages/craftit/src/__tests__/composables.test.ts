/**
 * Composables - Ref, Props, Context Tests
 * Comprehensive tests for composable utilities
 */

import {
  createContext,
  createId,
  defineComponent,
  defineField,
  guard,
  html,
  inject,
  onMount,
  prop,
  provide,
  ref,
  signal,
  type ReadonlySignal,
  type InjectionKey,
} from '..';
import { observeIntersection, observeMedia, observeResize } from '../labs';
import { mount, waitForEvent } from '../test';

const register = (
  tag: string,
  setup: Parameters<typeof defineComponent>[0]['setup'],
  options: Omit<Parameters<typeof defineComponent>[0], 'setup' | 'tag'> = {},
) => defineComponent({ setup, tag, ...options });

describe('Composables', () => {
  describe('ref()', () => {
    it('should create element reference', async () => {
      const { query } = await mount(() => {
        const btnRef = ref<HTMLButtonElement>();

        return html`<button ref=${btnRef}>Click</button>`;
      });

      expect(query('button')).not.toBeNull();
    });

    it('should update ref value when element mounts', async () => {
      let divRef!: ReturnType<typeof ref<HTMLDivElement>>;

      await mount(() => {
        divRef = ref<HTMLDivElement>();

        return html`<div ref=${divRef}>Test</div>`;
      });
      expect(divRef.value).not.toBeNull();
    });
  });

  describe('prop()', () => {
    it('should create reactive prop', async () => {
      const { query } = await mount(() => {
        const nameProp = prop('name', 'Guest');

        return html`<div>Hello ${nameProp}</div>`;
      });

      expect(query('div')?.textContent).toContain('Guest');
    });

    it('should update from attribute', async () => {
      const { query } = await mount(
        () => {
          const nameProp = prop('name', 'Guest');

          return html`<div>${nameProp}</div>`;
        },
        { attrs: { name: 'Alice' } },
      );

      expect(query('div')?.textContent).toBe('Alice');
    });

    it('should treat boolean prop as false when attribute is the string "false"', async () => {
      let loadingProp!: ReturnType<typeof prop<boolean>>;

      await mount(
        () => {
          loadingProp = prop('loading', false);

          return html`<div>${() => String(loadingProp.value)}</div>`;
        },
        { attrs: { loading: 'false' } },
      );

      expect(loadingProp.value).toBe(false);
    });

    it('should treat boolean prop as true when attribute is the string "true"', async () => {
      let loadingProp!: ReturnType<typeof prop<boolean>>;

      await mount(
        () => {
          loadingProp = prop('loading', false);

          return html`<div>${() => String(loadingProp.value)}</div>`;
        },
        { attrs: { loading: 'true' } },
      );

      expect(loadingProp.value).toBe(true);
    });
  });

  describe('Context (provide/inject)', () => {
    it('should provide and inject values', async () => {
      const ThemeKey = Symbol('theme') as InjectionKey<string>;

      await mount(() => {
        provide(ThemeKey, 'dark');

        return html`<div>${inject(ThemeKey) ?? ''}</div>`;
      });
    });

    it('should use default value when not provided', async () => {
      const Key = Symbol('test') as InjectionKey<string>;
      const { query } = await mount(() => {
        const value = inject(Key, 'default');

        return html`<div>${value}</div>`;
      });

      expect(query('div')?.textContent).toBe('default');
    });

    it('should provide type-safe context', async () => {
      const UserContext = createContext<{ name: string; role: string }>();
      const childTag = `test-user-consumer-${Math.random().toString(36).slice(2)}`;

      register(childTag, () => {
        const user = inject(UserContext);

        return html`<div class="user-info">${user?.name} (${user?.role})</div>`;
      });

      const { element, flush } = await mount(() => {
        provide(UserContext, { name: 'Alice', role: 'admin' });

        return html`<${childTag}></${childTag}>`;
      });

      await flush();

      const childEl = element.shadowRoot?.querySelector(childTag);
      const userDiv = childEl?.shadowRoot?.querySelector('.user-info');

      expect(userDiv?.textContent).toBe('Alice (admin)');
    });
  });

  describe('defineField()', () => {
    it('should create form field with validation methods', async () => {
      let formField!: ReturnType<typeof defineField>;

      await mount({
        formAssociated: true,
        setup: () => {
          formField = defineField({ value: signal('test') });

          return html`<div></div>`;
        },
      });
      expect(formField).toHaveProperty('setValidity');
      expect(formField).toHaveProperty('reportValidity');
      formField.setValidity({ valueMissing: true }, 'Required');
      expect(typeof formField.reportValidity()).toBe('boolean');
    });

    it('should handle custom toFormValue transformation', async () => {
      let transformCalled = false;

      await mount({
        formAssociated: true,
        setup: () => {
          defineField({
            toFormValue: (v) => {
              transformCalled = true;

              return `number:${v}`;
            },
            value: signal(42),
          });

          return html`<div></div>`;
        },
      });
      expect(transformCalled).toBe(true);
    });

    it('should sync disabled state', async () => {
      await mount({
        formAssociated: true,
        setup: () => {
          const value = signal('test');
          const disabled = signal(false);

          defineField({ disabled, value });

          return html`<input :value=${value} ?disabled=${disabled} />`;
        },
      });
    });
  });

  describe('createId()', () => {
    it('should generate unique IDs', () => {
      const id1 = createId();
      const id2 = createId();

      expect(id1).not.toBe(id2);
    });

    it('should use prefix when provided', () => {
      const id = createId('label');

      expect(id).toMatch(/^label-/);
    });

    it('should use default prefix when none provided', () => {
      const id = createId();

      expect(id).toMatch(/^cft-/);
    });
  });

  describe('guard()', () => {
    it('should call handler when condition is true', () => {
      const handler = vi.fn();
      const guarded = guard(() => true, handler);
      const fakeEvent = new Event('click');

      guarded(fakeEvent);
      expect(handler).toHaveBeenCalledWith(fakeEvent);
    });

    it('should not call handler when condition is false', () => {
      const handler = vi.fn();
      const guarded = guard(() => false, handler);

      guarded(new Event('click'));
      expect(handler).not.toHaveBeenCalled();
    });

    it('should re-evaluate condition on each call', () => {
      const handler = vi.fn();
      let enabled = false;
      const guarded = guard(() => enabled, handler);

      guarded(new Event('click'));
      expect(handler).toHaveBeenCalledTimes(0);
      enabled = true;
      guarded(new Event('click'));
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('setup slots', () => {
    it('should detect whether a named slot has assigned nodes', async () => {
      let headerAssigned!: ReadonlySignal<boolean>;
      let defaultAssigned!: ReadonlySignal<boolean>;

      const { flush } = await mount(
        ({ slots }) => {
          headerAssigned = slots.has('header');
          defaultAssigned = slots.has('default');

          return html`<slot name="header"></slot><slot></slot>`;
        },
        { html: '<span slot="header">Title</span>' },
      );

      await flush();
      expect(headerAssigned.value).toBe(true);
      expect(defaultAssigned.value).toBe(false);
    });
  });

  describe('setup emit', () => {
    it('should emit type-safe custom events', async () => {
      const { element } = await mount((({ emit }: { emit: (event: 'value', detail: { value: string }) => void }) => {
        setTimeout(() => emit('value', { value: 'test-value' }), 50);

        return html`<div>Emitter Component</div>`;
      }) as Parameters<typeof defineComponent>[0]['setup']);

      const event = await waitForEvent<CustomEvent>(element, 'value');

      expect(event.detail.value).toBe('test-value');
    });
  });

  describe('Platform Observer Composables', () => {
    describe('observeResize()', () => {
      it('should return a signal initialised to { height: 0, width: 0 }', async () => {
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

      it('should update the signal when ResizeObserver fires', async () => {
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
    });

    describe('observeIntersection()', () => {
      it('should return a signal initialised to null', async () => {
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

      it('should update the signal when IntersectionObserver fires', async () => {
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
    });

    describe('observeMedia()', () => {
      it('should return a signal reflecting the initial match state', async () => {
        let capturedMatches!: ReturnType<typeof observeMedia>;
        const mockMql = { addEventListener: vi.fn(), matches: true, removeEventListener: vi.fn() };
        const origMatchMedia = window.matchMedia;

        window.matchMedia = vi.fn().mockReturnValue(mockMql);

        await mount(() => {
          onMount(() => {
            capturedMatches = observeMedia('(prefers-color-scheme: dark)');
          });

          return html`<div></div>`;
        });

        expect(capturedMatches.value).toBe(true);

        window.matchMedia = origMatchMedia;
      });

      it('should update the signal when the media query changes', async () => {
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

        window.matchMedia = origMatchMedia;
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle multiple refs in same component', async () => {
      const { query } = await mount(() => {
        const ref1 = ref<HTMLDivElement>();
        const ref2 = ref<HTMLSpanElement>();

        return html`<div ref=${ref1}>Div</div>
          <span ref=${ref2}>Span</span>`;
      });

      expect(query('div')).not.toBeNull();
      expect(query('span')).not.toBeNull();
    });

    it('should handle nested provides', async () => {
      const Key = Symbol('value') as InjectionKey<number>;
      let receivedValue: number | undefined;

      register('test-nested-consumer-4', () => {
        receivedValue = inject(Key);

        return html`<div class="result">${receivedValue}</div>`;
      });

      register('test-nested-inner-4', () => {
        provide(Key, 2);

        return html`<test-nested-consumer-4></test-nested-consumer-4>`;
      });

      register('test-nested-outer-4', () => {
        provide(Key, 1);

        return html`<test-nested-inner-4></test-nested-inner-4>`;
      });

      const { element, flush } = await mount('test-nested-outer-4');

      await flush();

      const innerEl = element.shadowRoot?.querySelector('test-nested-inner-4');
      const consumerEl = innerEl?.shadowRoot?.querySelector('test-nested-consumer-4');
      const resultDiv = consumerEl?.shadowRoot?.querySelector('div.result');

      expect(receivedValue).toBe(2);
      expect(resultDiv?.textContent).toBe('2');
    });
  });
});

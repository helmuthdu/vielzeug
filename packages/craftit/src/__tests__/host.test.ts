import {
  createContext,
  define,
  effect,
  html,
  inject,
  onMount,
  provide,
  signal,
  syncContextProps,
  type ComponentDefinition,
  type InjectionKey,
  type ReadonlySignal,
} from '../index';
import { currentRuntime } from '../runtime-core';
import { mount } from '../testing';

const register = (tag: string, setup: ComponentDefinition['setup'], options: Omit<ComponentDefinition, 'setup'> = {}) =>
  define(tag, { setup, ...options });

describe('core/host.ts', () => {
  describe('Context API', () => {
    describe('inject()', () => {
      it('returns the value provided by an ancestor', async () => {
        const ThemeKey = Symbol('theme') as InjectionKey<string>;
        let received: string | undefined;

        await mount(() => {
          provide(ThemeKey, 'dark');
          received = inject(ThemeKey);

          return html`<div></div>`;
        });

        expect(received).toBe('dark');
      });

      it('returns the supplied fallback when the key has never been provided', async () => {
        const AbsentKey = Symbol('absent') as InjectionKey<string>;
        const { query } = await mount(() => {
          const value = inject(AbsentKey, 'fallback');

          return html`<div>${value}</div>`;
        });

        expect(query('div')?.textContent).toBe('fallback');
      });

      it('returns undefined when the key is absent and no fallback is given', async () => {
        const MissingKey = Symbol('missing') as InjectionKey<string>;
        let received: string | undefined = 'sentinel';

        await mount(() => {
          received = inject(MissingKey);

          return html`<div></div>`;
        });

        expect(received).toBeUndefined();
      });

      it('reads the nearest ancestor value when context is re-provided at a closer scope', async () => {
        const CountKey = Symbol('count') as InjectionKey<number>;
        let consumerValue: number | undefined;

        const consumerTag = `test-nc-consumer-${Math.random().toString(36).slice(2)}`;
        const innerTag = `test-nc-inner-${Math.random().toString(36).slice(2)}`;
        const outerTag = `test-nc-outer-${Math.random().toString(36).slice(2)}`;

        register(consumerTag, () => {
          consumerValue = inject(CountKey);

          return html`<div class="v">${consumerValue}</div>`;
        });
        register(innerTag, () => {
          provide(CountKey, 2);

          return html`<${consumerTag}></${consumerTag}>`;
        });
        register(outerTag, () => {
          provide(CountKey, 1);

          return html`<${innerTag}></${innerTag}>`;
        });

        const { element, flush } = await mount(outerTag);

        await flush();

        const innerEl = element.shadowRoot?.querySelector(innerTag);
        const consumerEl = innerEl?.shadowRoot?.querySelector(consumerTag);

        expect(consumerValue).toBe(2);
        expect(consumerEl?.shadowRoot?.querySelector('.v')?.textContent).toBe('2');
      });
    });

    describe('createContext()', () => {
      it('creates a unique injection key for each call', () => {
        const KeyA = createContext<string>('ctx-a');
        const KeyB = createContext<string>('ctx-b');

        expect(KeyA).not.toBe(KeyB);
      });

      it('enables type-safe context sharing between parent and child components', async () => {
        const UserCtx = createContext<{ name: string; role: string }>();
        const childTag = `test-ctx-child-${Math.random().toString(36).slice(2)}`;

        register(childTag, () => {
          const user = inject(UserCtx);

          return html`<div class="info">${user?.name} (${user?.role})</div>`;
        });

        const { element, flush } = await mount(() => {
          provide(UserCtx, { name: 'Alice', role: 'admin' });

          return html`<${childTag}></${childTag}>`;
        });

        await flush();

        const childEl = element.shadowRoot?.querySelector(childTag);
        const info = childEl?.shadowRoot?.querySelector('.info');

        expect(info?.textContent).toBe('Alice (admin)');
      });
    });

    describe('syncContextProps()', () => {
      it('writes context signal values into matching local prop signals on mount', async () => {
        const GroupCtx = createContext<{ size: ReadonlySignal<string> }>();
        const consumerTag = `test-scp-${Math.random().toString(36).slice(2)}`;

        register(consumerTag, () => {
          const size = signal('small');
          const ctx = inject(GroupCtx);

          syncContextProps(ctx, { size }, ['size']);

          return html`<span class="size">${size}</span>`;
        });

        const { element, flush } = await mount(() => {
          const groupSize = signal('large');

          provide(GroupCtx, { size: groupSize });

          return html`<${consumerTag}></${consumerTag}>`;
        });

        await flush();

        const child = element.shadowRoot?.querySelector(consumerTag);

        expect(child?.shadowRoot?.querySelector('.size')?.textContent).toBe('large');
      });

      it('is a no-op when the context value is undefined (key not provided by any ancestor)', async () => {
        const MissingCtx = createContext<{ size: ReadonlySignal<string> }>();
        let consumerSize!: ReturnType<typeof signal<string>>;

        await mount(() => {
          consumerSize = signal('medium');

          const ctx = inject(MissingCtx);

          syncContextProps(ctx, { size: consumerSize }, ['size']);

          return html`<div></div>`;
        });

        expect(consumerSize.value).toBe('medium');
      });
    });
  });

  describe('Slots API', () => {
    it('tracks default and named slot presence from setup context', async () => {
      let headerAssigned!: ReadonlySignal<boolean>;
      let defaultAssigned!: ReadonlySignal<boolean>;

      const { flush } = await mount(
        ({ slots }) => {
          headerAssigned = slots.has('header');
          defaultAssigned = slots.has();

          return html`<slot name="header"></slot><slot></slot>`;
        },
        { html: '<span slot="header">Title</span><span>Default content</span>' },
      );

      await flush();

      expect(headerAssigned.value).toBe(true);
      expect(defaultAssigned.value).toBe(true);
    });

    it('exposes named assigned elements from setup context', async () => {
      let triggerElements!: ReadonlySignal<Element[]>;

      const { flush } = await mount(
        ({ slots }) => {
          triggerElements = slots.elements('trigger');

          return html`<slot name="trigger"></slot>`;
        },
        { html: '<button slot="trigger">Open</button>' },
      );

      await flush();

      expect(triggerElements.value).toHaveLength(1);
      expect((triggerElements.value[0] as HTMLElement).tagName).toBe('BUTTON');
    });

    it('supports reactive side effects from namedElements without accidental dependency loops', async () => {
      const callback = vi.fn();

      const { flush } = await mount(({ slots }) => {
        effect(() => {
          callback(slots.elements('nonexistent').value);
        });

        return html`<div>No slots here</div>`;
      });

      await flush();

      expect(callback).toHaveBeenCalledWith([]);
    });
  });
});

describe('onMount slot timing', () => {
  it('onMount callbacks run after slot assignment', async () => {
    const onMountFn = vi.fn();

    register('test-slot-timing-element', () => {
      const host = currentRuntime().el;

      onMount(() => {
        onMountFn();

        // During onMount, slots should be assignable and accessible
        const slot = host.shadowRoot?.querySelector('slot');
        const assigned = slot?.assignedElements();

        expect(assigned).toBeDefined();
        expect(assigned?.length).toBeGreaterThanOrEqual(1);
      });

      return '<slot></slot>';
    });

    const el = document.createElement('test-slot-timing-element');
    const child = document.createElement('div');

    child.textContent = 'slotted';
    el.appendChild(child);
    document.body.appendChild(el);

    // onMount now runs on the next frame to ensure slot assignment has settled.
    await new Promise<void>((resolve) =>
      typeof requestAnimationFrame !== 'undefined' ? requestAnimationFrame(() => resolve()) : setTimeout(resolve, 0),
    );

    expect(onMountFn).toHaveBeenCalled();
    el.remove();
  });

  it('slot signals receive assigned elements by onMount time', async () => {
    const slotFn = vi.fn();

    register('test-slot-change-element', ({ slots }) => {
      onMount(() => {
        slotFn(slots.elements().value.length);
      });

      return '<slot></slot>';
    });

    const el = document.createElement('test-slot-change-element');
    const child = document.createElement('div');

    el.appendChild(child);
    document.body.appendChild(el);

    // onMount now runs on the next frame to ensure slot assignment has settled.
    await new Promise<void>((resolve) =>
      typeof requestAnimationFrame !== 'undefined' ? requestAnimationFrame(() => resolve()) : setTimeout(resolve, 0),
    );

    expect(slotFn).toHaveBeenCalledWith(1);
    el.remove();
  });
});

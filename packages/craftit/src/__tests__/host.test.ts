import {
  createContext,
  define,
  effect,
  html,
  inject,
  injectStrict,
  onMounted,
  provide,
  signal,
  type ComponentDefinition,
  type InjectionKey,
  type ReadonlySignal,
} from '../index';
import { currentElementOrThrow } from '../runtime';
import { mount, type MountSetup } from '../testing';

const register = (tag: string, setup: MountSetup, options: Omit<ComponentDefinition, 'setup'> = {}) =>
  define(tag, {
    ...options,
    setup: (props, ctx) => {
      const result = setup(props, ctx);

      if (typeof result === 'function') {
        return result;
      }

      return () => result;
    },
  });

describe('core/host.ts', () => {
  describe('Host bind API', () => {
    it('applies host attrs and classes from object-style config', async () => {
      const { element, flush } = await mount((_props, { host }) => {
        const open = signal(false);

        host.bind({
          attr: {
            'aria-expanded': () => String(open.value),
            role: 'button',
          },
          class: () => ({ 'is-open': open.value }),
          on: {
            click: () => {
              open.value = true;
            },
          },
        });

        return () => html`<button>Open</button>`;
      });

      expect(element.getAttribute('role')).toBe('button');
      expect(element.getAttribute('aria-expanded')).toBe('false');
      expect(element.classList.contains('is-open')).toBe(false);

      element.click();
      await flush();

      expect(element.getAttribute('aria-expanded')).toBe('true');
      expect(element.classList.contains('is-open')).toBe(true);
    });

    it('applies class records with static and reactive values', async () => {
      const { element, flush } = await mount((_props, { host }) => {
        const open = signal(false);
        const active = signal(true);

        host.bind({
          class: {
            active,
            open: () => open.value,
            ready: true,
          },
        });

        open.value = true;
        active.value = false;

        return () => html`<div></div>`;
      });

      await flush();

      expect(element.classList.contains('ready')).toBe(true);
      expect(element.classList.contains('open')).toBe(true);
      expect(element.classList.contains('active')).toBe(false);
    });

    it('prop binding exposes reactive get/set on the host element', async () => {
      const { element, flush } = await mount((_props, { host }) => {
        const internalValue = signal('initial');

        host.bind({
          prop: {
            value: {
              get: () => internalValue.value,
              set: (v: unknown) => {
                internalValue.value = String(v);
              },
            },
          },
        });

        return () => html`<div>${internalValue}</div>`;
      });

      expect((element as HTMLElement & { value: string }).value).toBe('initial');

      (element as HTMLElement & { value: string }).value = 'updated';
      await flush();

      expect((element as HTMLElement & { value: string }).value).toBe('updated');
    });

    it('supports style and prop bindings via host.bind', async () => {
      const { element, flush } = await mount((_props, { host }) => {
        const color = signal('rgb(255, 0, 0)');

        host.bind({
          prop: {
            value: {
              get: () => color.value,
              set: (next: unknown) => {
                color.value = String(next);
              },
            },
          },
          style: { color },
        });

        return () => html`<div></div>`;
      });

      expect((element as HTMLElement & { value: string }).value).toBe('rgb(255, 0, 0)');
      expect(element.style.getPropertyValue('color')).toContain('255');

      (element as HTMLElement & { value: string }).value = 'rgb(0, 128, 0)';
      await flush();

      expect(element.style.getPropertyValue('color')).toContain('128');
    });

    it('prop binding is cleaned up on component destroy', async () => {
      const { destroy, element } = await mount((_props, { host }) => {
        host.bind({
          prop: {
            value: {
              get: () => 'alive',
            },
          },
        });

        return () => html`<div></div>`;
      });

      expect((element as HTMLElement & { value?: string }).value).toBe('alive');

      destroy();

      expect((element as HTMLElement & { value?: string }).value).toBeUndefined();
    });

    it('keeps the latest prop binding active when overlapping bindings target the same property', async () => {
      const tag = `test-host-bind-overlap-${Math.random().toString(36).slice(2)}`;

      register(tag, (_props, { host }) => {
        const baseCleanup = host.bind({
          prop: {
            value: {
              get: () => 'base',
            },
          },
        });

        host.bind({
          prop: {
            value: {
              get: () => 'override',
            },
          },
        });

        baseCleanup();

        return html`<div>ok</div>`;
      });

      const { destroy, element } = await mount(tag);

      expect((element as HTMLElement & { value?: string }).value).toBe('override');

      destroy();

      expect((element as HTMLElement & { value?: string }).value).toBeUndefined();
    });

    it('supports listener options for host event bindings', async () => {
      let clicks = 0;

      const { element } = await mount((_props, { host }) => {
        host.bind(
          {
            on: {
              click: () => {
                clicks++;
              },
            },
          },
          { once: true },
        );

        return () => html`<div>Host listener</div>`;
      });

      element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      element.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      expect(clicks).toBe(1);
    });
  });

  describe('Context API', () => {
    describe('inject()', () => {
      it('returns the value provided by an ancestor', async () => {
        const ThemeKey = Symbol('theme') as InjectionKey<string>;
        let received: string | undefined;

        await mount(() => {
          provide(ThemeKey, 'dark');
          received = inject(ThemeKey);

          return () => html`<div></div>`;
        });

        expect(received).toBe('dark');
      });

      it('returns the supplied fallback when the key has never been provided', async () => {
        const AbsentKey = Symbol('absent') as InjectionKey<string>;

        const { query } = await mount(() => {
          const value = inject(AbsentKey, 'fallback');

          return () => html`<div>${value}</div>`;
        });

        expect(query('div')?.textContent).toBe('fallback');
      });

      it('returns undefined when the key is absent and no fallback is given', async () => {
        const MissingKey = Symbol('missing') as InjectionKey<string>;
        let received: string | undefined = 'sentinel';

        await mount(() => {
          received = inject(MissingKey);

          return () => html`<div></div>`;
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

    describe('injectStrict()', () => {
      it('returns the provided value when context exists', async () => {
        const ThemeKey = Symbol('theme') as InjectionKey<string>;
        let received!: string;

        await mount(() => {
          provide(ThemeKey, 'dark');
          received = injectStrict(ThemeKey);

          return () => html`<div></div>`;
        });

        expect(received).toBe('dark');
      });

      it('throws when context is missing', async () => {
        const MissingKey = Symbol('missing') as InjectionKey<string>;
        let captured: unknown;

        await mount(() => {
          try {
            injectStrict(MissingKey);
          } catch (err) {
            captured = err;
          }

          return () => html`<div></div>`;
        });

        expect(captured).toBeInstanceOf(Error);
        expect((captured as Error).message).toContain('injectStrict()');
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

          return () => html`<${childTag}></${childTag}>`;
        });

        await flush();

        const childEl = element.shadowRoot?.querySelector(childTag);
        const info = childEl?.shadowRoot?.querySelector('.info');

        expect(info?.textContent).toBe('Alice (admin)');
      });
    });
  });

  describe('Slots API', () => {
    it('tracks default and named slot presence from setup context', async () => {
      let headerAssigned!: ReadonlySignal<boolean>;
      let defaultAssigned!: ReadonlySignal<boolean>;

      const { flush } = await mount(
        (_props, { slots }) => {
          headerAssigned = slots.has('header');
          defaultAssigned = slots.has();

          return () => html`<slot name="header"></slot><slot></slot>`;
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
        (_props, { slots }) => {
          triggerElements = slots.elements('trigger');

          return () => html`<slot name="trigger"></slot>`;
        },
        { html: '<button slot="trigger">Open</button>' },
      );

      await flush();

      expect(triggerElements.value).toHaveLength(1);
      expect((triggerElements.value[0] as HTMLElement).tagName).toBe('BUTTON');
    });

    it('supports reactive side effects from namedElements without accidental dependency loops', async () => {
      const callback = vi.fn();

      const { flush } = await mount((_props, { slots }) => {
        effect(() => {
          callback(slots.elements('nonexistent').value);
        });

        return () => html`<div>No slots here</div>`;
      });

      await flush();

      expect(callback).toHaveBeenCalledWith([]);
    });

    it('updates slot signals when assigned light-DOM content changes', async () => {
      let defaultElements!: ReadonlySignal<Element[]>;

      const { element, flush } = await mount((_props, { slots }) => {
        defaultElements = slots.elements();

        return () => html`<slot></slot>`;
      });

      await flush();
      expect(defaultElements.value).toHaveLength(0);

      const child = document.createElement('span');

      child.textContent = 'added';
      element.appendChild(child);
      await flush();

      expect(defaultElements.value).toHaveLength(1);
      expect(defaultElements.value[0]).toBe(child);

      child.remove();
      await flush();

      expect(defaultElements.value).toHaveLength(0);
    });
  });
});

describe('mount slot timing', () => {
  it('mount callbacks run after slot assignment', async () => {
    const mountFn = vi.fn();

    register('test-slot-timing-element', () => {
      const host = currentElementOrThrow();

      onMounted(() => {
        mountFn();

        const slot = host.shadowRoot?.querySelector('slot');
        const assigned = slot?.assignedElements();

        expect(assigned).toBeDefined();
        expect(assigned?.length).toBeGreaterThanOrEqual(1);
      });

      return () => html`<slot></slot>`;
    });

    const el = document.createElement('test-slot-timing-element');
    const child = document.createElement('div');

    child.textContent = 'slotted';
    el.appendChild(child);
    document.body.appendChild(el);

    await new Promise<void>((resolve) =>
      typeof requestAnimationFrame !== 'undefined' ? requestAnimationFrame(() => resolve()) : setTimeout(resolve, 0),
    );

    expect(mountFn).toHaveBeenCalled();
    el.remove();
  });

  it('slot signals receive assigned elements by mount time', async () => {
    const slotFn = vi.fn();

    register('test-slot-change-element', (_props, { slots }) => {
      onMounted(() => {
        slotFn(slots.elements().value.length);
      });

      return () => html`<slot></slot>`;
    });

    const el = document.createElement('test-slot-change-element');
    const child = document.createElement('div');

    el.appendChild(child);
    document.body.appendChild(el);

    await new Promise<void>((resolve) =>
      typeof requestAnimationFrame !== 'undefined' ? requestAnimationFrame(() => resolve()) : setTimeout(resolve, 0),
    );

    expect(slotFn).toHaveBeenCalledWith(1);
    el.remove();
  });
});

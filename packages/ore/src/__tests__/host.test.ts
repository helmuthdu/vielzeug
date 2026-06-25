import { effect, type Readable, signal } from '@vielzeug/ripple';

import { createContext, html, inject, type InjectionKey, injectStrict } from '../index';
import { mount } from '../testing';
import { register } from './test-utils';

describe('core/host.ts', () => {
  describe('Host bind API', () => {
    it('applies host attrs and classes from object-style config', async () => {
      const { element, flush } = await mount((_props, { bind, el: _el }) => {
        const open = signal(false);

        bind({
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

        return html`<button>Open</button>`;
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
      const { element, flush } = await mount((_props, { bind, el: _el }) => {
        const open = signal(false);
        const active = signal(true);

        bind({
          class: {
            active,
            open: () => open.value,
            ready: true,
          },
        });

        open.value = true;
        active.value = false;

        return html`<div></div>`;
      });

      await flush();

      expect(element.classList.contains('ready')).toBe(true);
      expect(element.classList.contains('open')).toBe(true);
      expect(element.classList.contains('active')).toBe(false);
    });

    it('auto-registers cleanup so reactive bindings stop after disconnect', async () => {
      let clickCount = 0;
      const { destroy, element, flush } = await mount((_props, { bind }) => {
        bind({
          on: { click: () => clickCount++ },
        });

        return html`<div></div>`;
      });

      element.dispatchEvent(new MouseEvent('click'));
      await flush();
      expect(clickCount).toBe(1);

      destroy();

      element.dispatchEvent(new MouseEvent('click'));
      expect(clickCount).toBe(1);
    });

    it('supports listener options for host event bindings', async () => {
      let clicks = 0;

      const { element } = await mount((_props, { bind, el: _el }) => {
        bind(
          {
            on: {
              click: () => {
                clicks++;
              },
            },
          },
          { once: true },
        );

        return html`<div>Host listener</div>`;
      });

      element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      element.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      expect(clicks).toBe(1);
    });

    it('applies static host style bindings', async () => {
      const { element } = await mount((_props, { bind }) => {
        bind({ style: { color: 'red', fontSize: '14px' } });

        return html`<div></div>`;
      });

      expect(element.style.getPropertyValue('color')).toBe('red');
      expect(element.style.getPropertyValue('font-size')).toBe('14px');
    });

    it('applies reactive host style bindings and updates on signal change', async () => {
      const color = signal('blue');
      const { element, flush } = await mount((_props, { bind }) => {
        bind({ style: { color } });

        return html`<div></div>`;
      });

      expect(element.style.getPropertyValue('color')).toBe('blue');

      color.value = 'green';
      await flush();

      expect(element.style.getPropertyValue('color')).toBe('green');
    });

    it('sets CSS custom properties (--var) on the host via style binding', async () => {
      const { element } = await mount((_props, { bind }) => {
        bind({ style: { '--theme-color': '#ff0000' } });

        return html`<div></div>`;
      });

      expect(element.style.getPropertyValue('--theme-color')).toBe('#ff0000');
    });

    it('removes the style property when value becomes null/undefined', async () => {
      const color = signal<string | null>('red');
      const { element, flush } = await mount((_props, { bind }) => {
        bind({ style: { color } });

        return html`<div></div>`;
      });

      expect(element.style.getPropertyValue('color')).toBe('red');

      color.value = null;
      await flush();

      expect(element.style.getPropertyValue('color')).toBe('');
    });

    it('strips semicolons from style values to prevent CSS injection', async () => {
      const { element } = await mount((_props, { bind }) => {
        bind({ style: { color: 'red; display:none' } });

        return html`<div></div>`;
      });

      expect(element.style.getPropertyValue('display')).toBe('');
    });

    it('strips braces from style values', async () => {
      const { element } = await mount((_props, { bind }) => {
        bind({ style: { color: 'red} body{display:none' } });

        return html`<div></div>`;
      });

      const colorVal = element.style.getPropertyValue('color');

      expect(colorVal).not.toContain('{');
      expect(colorVal).not.toContain('}');
    });

    it('skips style property when name reduces to empty after sanitization', async () => {
      const { element } = await mount((_props, { bind }) => {
        bind({ style: { ';{}': 'red' } });

        return html`<div></div>`;
      });

      expect(element.getAttribute('style') ?? '').toBe('');
    });

    it('bind() with target option binds attrs reactively to an off-host element', async () => {
      const visible = signal(false);
      const externalEl = document.createElement('button');

      document.body.appendChild(externalEl);

      await mount((_props, { bind, onCleanup }) => {
        onCleanup(() => externalEl.remove());
        bind({ attr: { 'aria-pressed': () => String(visible.value) } }, { target: externalEl });

        return html`<div></div>`;
      });

      expect(externalEl.getAttribute('aria-pressed')).toBe('false');

      visible.value = true;
      await new Promise<void>((r) => setTimeout(r, 0));

      expect(externalEl.getAttribute('aria-pressed')).toBe('true');
    });
  });

  describe('ctx.aria()', () => {
    it('applies static ARIA attributes to a target element', async () => {
      const externalEl = document.createElement('div');

      document.body.appendChild(externalEl);

      await mount((_props, { aria, onCleanup }) => {
        onCleanup(() => externalEl.remove());
        aria(externalEl, { label: 'Close dialog', role: 'dialog' });

        return html`<div></div>`;
      });

      expect(externalEl.getAttribute('aria-label')).toBe('Close dialog');
      expect(externalEl.getAttribute('role')).toBe('dialog');
    });

    it('applies reactive ARIA attributes and updates on signal change', async () => {
      const expanded = signal<string>('false');
      const externalEl = document.createElement('div');

      document.body.appendChild(externalEl);

      await mount((_props, { aria, onCleanup }) => {
        onCleanup(() => externalEl.remove());
        aria(externalEl, { expanded: () => expanded.value });

        return html`<div></div>`;
      });

      expect(externalEl.getAttribute('aria-expanded')).toBe('false');

      expanded.value = 'true';
      await new Promise<void>((r) => setTimeout(r, 0));

      expect(externalEl.getAttribute('aria-expanded')).toBe('true');
    });

    it('removes ARIA attribute when reactive value becomes null', async () => {
      const label = signal<string | null>('Open');
      const externalEl = document.createElement('div');

      document.body.appendChild(externalEl);

      await mount((_props, { aria, onCleanup }) => {
        onCleanup(() => externalEl.remove());
        aria(externalEl, { label: () => label.value });

        return html`<div></div>`;
      });

      expect(externalEl.hasAttribute('aria-label')).toBe(true);

      label.value = null;
      await new Promise<void>((r) => setTimeout(r, 0));

      expect(externalEl.hasAttribute('aria-label')).toBe(false);
    });

    it('normalizes shorthand keys: "expanded" → "aria-expanded"', async () => {
      const externalEl = document.createElement('div');

      document.body.appendChild(externalEl);

      await mount((_props, { aria, onCleanup }) => {
        onCleanup(() => externalEl.remove());
        aria(externalEl, { expanded: 'true' });

        return html`<div></div>`;
      });

      expect(externalEl.getAttribute('aria-expanded')).toBe('true');
    });

    it('accepts fully-qualified keys: "aria-label" passes through unchanged', async () => {
      const externalEl = document.createElement('div');

      document.body.appendChild(externalEl);

      await mount((_props, { aria, onCleanup }) => {
        onCleanup(() => externalEl.remove());
        aria(externalEl, { 'aria-label': 'Fully qualified' });

        return html`<div></div>`;
      });

      expect(externalEl.getAttribute('aria-label')).toBe('Fully qualified');
    });

    it('cleanup from returned fn stops reactive ARIA updates', async () => {
      const expanded = signal<string>('false');
      const externalEl = document.createElement('div');

      document.body.appendChild(externalEl);

      let cleanup!: () => void;

      await mount((_props, { aria, onCleanup }) => {
        onCleanup(() => externalEl.remove());
        cleanup = aria(externalEl, { expanded: () => expanded.value });

        return html`<div></div>`;
      });

      expect(externalEl.getAttribute('aria-expanded')).toBe('false');

      cleanup();

      expanded.value = 'true';
      await new Promise<void>((r) => setTimeout(r, 0));

      expect(externalEl.getAttribute('aria-expanded')).toBe('false');
    });
  });

  describe('Context API', () => {
    describe('inject()', () => {
      it('returns the value provided by an ancestor', async () => {
        const ThemeKey = Symbol('theme') as InjectionKey<string>;
        let received: string | undefined;

        await mount((_p, ctx) => {
          ctx.provide(ThemeKey, 'dark');
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
        register(innerTag, (_p, c) => {
          c.provide(CountKey, 2);

          return html`<${consumerTag}></${consumerTag}>`;
        });
        register(outerTag, (_p, c) => {
          c.provide(CountKey, 1);

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

        await mount((_p, ctx) => {
          ctx.provide(ThemeKey, 'dark');
          received = injectStrict(ThemeKey);

          return html`<div></div>`;
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

          return html`<div></div>`;
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

        const { element, flush } = await mount((_p, ctx) => {
          ctx.provide(UserCtx, { name: 'Alice', role: 'admin' });

          return html`<${childTag}></${childTag}>`;
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
      let headerAssigned!: Readable<boolean>;
      let defaultAssigned!: Readable<boolean>;

      const { flush } = await mount(
        (_props, { slots }) => {
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
      let triggerElements!: Readable<Element[]>;

      const { flush } = await mount(
        (_props, { slots }) => {
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

      const { flush } = await mount((_props, { slots }) => {
        effect(() => {
          callback(slots.elements('nonexistent').value);
        });

        return html`<div>No slots here</div>`;
      });

      await flush();

      expect(callback).toHaveBeenCalledWith([]);
    });

    it('updates slot signals when assigned light-DOM content changes', async () => {
      let defaultElements!: Readable<Element[]>;

      const { element, flush } = await mount((_props, { slots }) => {
        defaultElements = slots.elements();

        return html`<slot></slot>`;
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

    register('test-slot-timing-element', (_props, ctx) => {
      const host = el;

      ctx.onMounted(() => {
        mountFn();

        const slot = host.shadowRoot?.querySelector('slot');
        const assigned = slot?.assignedElements();

        expect(assigned).toBeDefined();
        expect(assigned?.length).toBeGreaterThanOrEqual(1);
      });

      return html`<slot></slot>`;
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

    register('test-slot-change-element', (_props, ctx) => {
      ctx.onMounted(() => {
        slotFn(ctx.slots.elements().value.length);
      });

      return html`<slot></slot>`;
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

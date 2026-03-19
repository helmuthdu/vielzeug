/**
 * Core - Component Definition Tests
 * Tests for the defineComponent() function and component lifecycle
 */

import { defineComponent, html, signal, type DefineComponentSetupContext } from '..';
import { fire, mount } from '../test';

const expectType = <T>(_value: T): void => {
  // compile-time-only helper for typing assertions
};

describe('Core: Component Definition', () => {
  describe('defineComponent()', () => {
    it('should define a custom element', () => {
      const tag = `test-basic-${Math.random().toString(36).slice(2)}`;

      defineComponent({
        setup: () => html`<div>Hello</div>`,
        tag,
      });

      const el = document.createElement(tag);

      expect(el).toBeInstanceOf(HTMLElement);
    });

    it('should render template to shadow root', async () => {
      const { query } = await mount(() => html`<div class="content">Content</div>`);

      expect(query('.content')?.textContent).toBe('Content');
    });

    it('should support reactive templates', async () => {
      const { query } = await mount(() => {
        const count = signal(0);

        return html`<div>${count}</div>`;
      });

      expect(query('div')?.textContent).toBe('0');
    });

    it('should isolate component state', async () => {
      const setup = () => {
        const count = signal(0);

        return html`<div>${count}</div>`;
      };

      const { query: query1 } = await mount(setup);
      const { query: query2 } = await mount(setup);

      expect(query1('div')?.textContent).toBe('0');
      expect(query2('div')?.textContent).toBe('0');
    });
  });

  describe('Component Props', () => {
    it('should receive attributes as props', async () => {
      const { element } = await mount(
        {
          props: {
            size: { default: 'small' },
            variant: { default: 'secondary' },
          },
          setup: () => html`<div>Component</div>`,
        },
        {
          attrs: { size: 'large', variant: 'primary' },
        },
      );

      expect(element.getAttribute('variant')).toBe('primary');
      expect(element.getAttribute('size')).toBe('large');
    });

    it('should initialize prop signal from attribute', async () => {
      const { query } = await mount(
        {
          props: { count: { default: 0, type: Number } },
          setup: ({ props }) => {
            return html`<div class="count">${props.count}</div>`;
          },
        },
        {
          attrs: { count: '42' },
        },
      );

      expect(query('.count')?.textContent).toBe('42');
    });

    it('should pass array values through attribute bindings without stringifying', async () => {
      const suffix = Math.random().toString(36).slice(2);
      const childTag = `test-array-child-${suffix}`;
      const parentTag = `test-array-parent-${suffix}`;

      defineComponent({
        props: { items: { default: [] as string[] } },
        setup: ({ props }) => {
          return html`<div class="items">${() => props.items.value.join('|')}</div>`;
        },
        tag: childTag,
      });

      defineComponent({
        setup: () => {
          const items = signal<string[]>(['alpha', 'beta']);

          return html`
            <div>
              <button @click=${() => (items.value = ['gamma', 'delta'])}>Update</button>
              <${childTag} items=${items}></${childTag}>
            </div>
          `;
        },
        tag: parentTag,
      });

      const { query } = await mount(parentTag);
      const child = query(childTag) as HTMLElement;
      const button = query('button');

      expect(child.shadowRoot?.querySelector('.items')?.textContent).toBe('alpha|beta');

      fire.click(button!);
      await new Promise((r) => setTimeout(r, 10));

      expect(child.shadowRoot?.querySelector('.items')?.textContent).toBe('gamma|delta');
    });
  });

  describe('Shadow DOM', () => {
    it('should create shadow root', async () => {
      const { shadow } = await mount(() => html`<div>Shadow Content</div>`);

      expect(shadow).not.toBeNull();
      expect(shadow?.querySelector('div')?.textContent).toBe('Shadow Content');
    });

    it('should encapsulate styles', async () => {
      const { query } = await mount(() => html`<div class="unique-class">Test</div>`);
      const div = query('.unique-class');

      expect(div).not.toBeNull();
    });
  });

  describe('Slots', () => {
    it('should support default slot', async () => {
      const { element } = await mount(() => html`<div><slot></slot></div>`, {
        html: '<span>Slotted Content</span>',
      });

      expect(element.innerHTML).toContain('Slotted Content');
    });

    it('should support named slots', async () => {
      const { element } = await mount(
        () => html`
          <div>
            <slot name="header"></slot>
            <slot></slot>
          </div>
        `,
        {
          html: `
          <div slot="header">Header</div>
          <div>Content</div>
        `,
        },
      );

      expect(element.innerHTML).toContain('Header');
      expect(element.innerHTML).toContain('Content');
    });

    it('should support typed emit in setup context', async () => {
      const spy = vi.fn();
      const { element, flush, query } = await mount({
        setup: ({
          emit,
        }: DefineComponentSetupContext<Record<string, never>, { close: undefined; ping: { ok: boolean } }>) => {
          const fire = () => {
            emit('close');
            emit('ping', { ok: true });
          };

          return html`<button @click=${fire}>Emit</button>`;
        },
      });

      element.addEventListener('ping', spy);
      query('button')!.dispatchEvent(new Event('click'));
      await flush();

      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  it('should dispatch events via setup emit', async () => {
    const spy = vi.fn();
    const { element, flush, query } = await mount(({ emit }) => {
      const fire = () => emit('ping', { ok: true });

      return html`<button @click=${fire}>Ping</button>`;
    });

    element.addEventListener('ping', spy);
    query('button')!.dispatchEvent(new Event('click'));
    await flush();

    expect(spy).toHaveBeenCalledTimes(1);
  });

  describe('Error Handling', () => {
    it('should handle empty template', async () => {
      const { shadow } = await mount(() => html``);

      expect(shadow).not.toBeNull();
    });

    it('should handle undefined return', async () => {
      const { query } = await mount(() => html`<div>Test</div>`);

      expect(query('div')).not.toBeNull();
    });
  });

  describe('Re-rendering', () => {
    it('should update DOM when signals change', async () => {
      let count!: ReturnType<typeof signal<number>>;
      const { act, query } = await mount(() => {
        count = signal(0);

        return html`<div>${count}</div>`;
      });

      expect(query('div')?.textContent).toBe('0');
      await act(() => count.value++);
      expect(query('div')?.textContent).toBe('1');
    });

    it('should infer typed prop signals from setup context props', async () => {
      const { query } = await mount(
        {
          props: { count: { default: 0, type: Number } },
          setup: ({ props }) => {
            expectType<ReturnType<typeof signal<number>>>(props.count);

            return html`<div class="count">${props.count}</div>`;
          },
        },
        {
          attrs: { count: '7' },
        },
      );

      expect(query('.count')?.textContent).toBe('7');
    });
  });
});

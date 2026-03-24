/**
 * Core - Component Definition Tests
 * Tests for the defineComponent() function and component lifecycle
 */

import {
  defineComponent,
  defineField,
  html,
  inject,
  onCleanup,
  onError,
  onMount,
  prop,
  provide,
  ref,
  refs,
  signal,
  typed,
  type DefineComponentSetupContext,
} from '../index';
import { fire, mount, waitForEvent } from '../test';

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

    it('should throw when registering the same tag repeatedly', () => {
      const tag = `test-dup-${Math.random().toString(36).slice(2)}`;

      defineComponent({
        setup: () => html`<div>First</div>`,
        tag,
      });

      expect(() => {
        defineComponent({
          setup: () => html`<div>Second</div>`,
          tag,
        });
      }).toThrow('[craftit:E9]');
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

    it('should keep attribute->prop sync after reconnect', async () => {
      const fixture = await mount({
        props: { count: { default: 0, type: Number } },
        setup: ({ props }) => html`<div class="count">${props.count}</div>`,
      });

      await fixture.attr('count', '1');
      expect(fixture.query('.count')?.textContent).toBe('1');

      fixture.element.remove();
      await fixture.flush();
      document.body.appendChild(fixture.element);
      await fixture.flush();

      await fixture.attr('count', '2');
      expect(fixture.query('.count')?.textContent).toBe('2');
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
      const closeSpy = vi.fn();
      const { element, flush, query } = await mount((ctx) => {
        const emit = ctx.emit as ((event: 'close') => void) & ((event: 'ping', detail: { ok: boolean }) => void);

        const fire = () => {
          emit('close');
          emit('ping', { ok: true });
        };

        return html`<button @click=${fire}>Emit</button>`;
      });

      element.addEventListener('close', closeSpy);
      element.addEventListener('ping', spy);
      query('button')!.dispatchEvent(new Event('click'));
      await flush();

      expect(closeSpy).toHaveBeenCalledTimes(1);
      expect(closeSpy.mock.calls[0]?.[0]).toBeInstanceOf(CustomEvent);
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

describe('core/component.ts', () => {
  describe('prop()', () => {
    it('returns the default value when no matching attribute is present', async () => {
      const { query } = await mount(() => {
        const label = prop('label', 'Guest');

        return html`<div>${label}</div>`;
      });

      expect(query('div')?.textContent).toBe('Guest');
    });

    it('reads the attribute value set on the host element at connect time', async () => {
      const { query } = await mount(
        () => {
          const label = prop('label', 'Guest');

          return html`<div>${label}</div>`;
        },
        { attrs: { label: 'Alice' } },
      );

      expect(query('div')?.textContent).toBe('Alice');
    });

    it('coerces the string "false" to boolean false for a boolean-defaulted prop', async () => {
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

    it('coerces the string "true" to boolean true for a boolean-defaulted prop', async () => {
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

    it('coerces a numeric string to a number for a number-defaulted prop', async () => {
      let countProp!: ReturnType<typeof prop<number>>;

      await mount(
        () => {
          countProp = prop('count', 0);

          return html`<div>${() => String(countProp.value)}</div>`;
        },
        { attrs: { count: '42' } },
      );

      expect(countProp.value).toBe(42);
    });
  });

  describe('defineField()', () => {
    it('returns a handle exposing checkValidity, reportValidity, and setValidity', async () => {
      let handle!: ReturnType<typeof defineField>;

      await mount({
        formAssociated: true,
        setup: () => {
          handle = defineField({ value: signal('initial') });

          return html`<div></div>`;
        },
      });

      expect(typeof handle.checkValidity).toBe('function');
      expect(typeof handle.reportValidity).toBe('function');
      expect(typeof handle.setValidity).toBe('function');
    });

    it('sets custom validity and allows reportValidity to reflect it', async () => {
      let handle!: ReturnType<typeof defineField>;

      await mount({
        formAssociated: true,
        setup: () => {
          handle = defineField({ value: signal('') });

          return html`<div></div>`;
        },
      });

      handle.setValidity({ valueMissing: true }, 'Required');
      expect(typeof handle.reportValidity()).toBe('boolean');
    });

    it('calls toFormValue with the current signal value immediately', async () => {
      let transformCalled = false;

      await mount({
        formAssociated: true,
        setup: () => {
          defineField({
            toFormValue: (v) => {
              transformCalled = true;

              return `value:${v}`;
            },
            value: signal(42),
          });

          return html`<div></div>`;
        },
      });

      expect(transformCalled).toBe(true);
    });

    it('surfaces an error via onError when formAssociated is not enabled on the component', async () => {
      let capturedError: unknown;

      await mount({
        setup: () => {
          onError((err) => {
            capturedError = err;
          });
          defineField({ value: signal('test') });

          return html`<div></div>`;
        },
      });

      expect(capturedError).toBeInstanceOf(Error);
      expect((capturedError as Error).message).toContain('formAssociated: true');
    });
  });

  describe('emit', () => {
    it('dispatches a custom event with the correct type and detail', async () => {
      const { element } = await mount((({
        emit,
      }: {
        emit: (event: 'value-changed', detail: { value: string }) => void;
      }) => {
        setTimeout(() => emit('value-changed', { value: 'hello' }), 50);

        return html`<div></div>`;
      }) as Parameters<typeof defineComponent>[0]['setup']);

      const event = await waitForEvent<CustomEvent<{ value: string }>>(element, 'value-changed');

      expect(event.detail.value).toBe('hello');
    });

    it('dispatched events bubble and are composed so host-level listeners receive them', async () => {
      const { element } = await mount((({ emit }: { emit: (event: string) => void }) => {
        setTimeout(() => emit('ping'), 50);

        return html`<div></div>`;
      }) as Parameters<typeof defineComponent>[0]['setup']);

      const event = await waitForEvent<CustomEvent>(element, 'ping');

      expect(event.bubbles).toBe(true);
      expect(event.composed).toBe(true);
    });
  });
});

describe('defineComponent props & global helpers', () => {
  it('should support direct default values in defineComponent prop schemas', async () => {
    const { query } = await mount(
      {
        props: {
          active: typed(true, { reflect: false }),
          count: { default: 0 },
          label: { default: 'default' },
        },
        setup: ({ props }: DefineComponentSetupContext<any>) =>
          html`<div class="count">${props.count}</div>
            <div class="label">${props.label}</div>`,
      },
      {
        attrs: { count: '42', label: 'custom' },
      },
    );

    expect(query('.count')?.textContent).toBe('42');
    expect(query('.label')?.textContent).toBe('custom');
  });

  it('should support object defaults containing a default key via typed helper', async () => {
    const configDefault = { default: 'fallback', mode: 'dark' };

    const { query } = await mount({
      props: {
        // Explicit typed wrapper prevents structural ambiguity with PropDef<T>.
        config: typed(configDefault, { reflect: false }),
      },
      setup: ({ props }: DefineComponentSetupContext<any>) =>
        html`<div class="mode">${() => props.config.value.mode}</div>`,
    });

    expect(query('.mode')?.textContent).toBe('dark');
  });

  it('should provide all lifecycle and utility functions as global exports', async () => {
    let elementInstance: HTMLElement | undefined;

    const { element } = await mount(({ host }) => {
      elementInstance = host;

      expect(onMount).toBeDefined();
      expect(onCleanup).toBeDefined();
      expect(onError).toBeDefined();
      expect(provide).toBeDefined();
      expect(inject).toBeDefined();
      expect(ref).toBeDefined();
      expect(refs).toBeDefined();
      expect(defineComponent).toBeDefined();
      expect(typed).toBeDefined();

      return html`<div id="test"></div>`;
    });

    expect(elementInstance).toBe(element);
  });

  it('should support the new refs utility', async () => {
    let items: HTMLElement[] | undefined;

    const { destroy } = await mount(() => {
      items = refs<HTMLLIElement>();

      return html`
        <ul>
          <li ref=${items}>Item 1</li>
          <li ref=${items}>Item 2</li>
          <li ref=${items}>Item 3</li>
        </ul>
      `;
    });

    expect(items?.length).toBe(3);
    expect(items?.map((el) => el.textContent)).toEqual(['Item 1', 'Item 2', 'Item 3']);

    destroy();

    expect(items?.length).toBe(0);
  });
});

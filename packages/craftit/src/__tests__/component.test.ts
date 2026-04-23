// noinspection HtmlUnknownAttribute
/**
 * Core - Component Definition Tests
 * Tests for define() and component lifecycle
 */

import {
  define,
  defineField,
  html,
  inject,
  onCleanup,
  provide,
  prop,
  ref,
  refs,
  signal,
  type ComponentDefinition,
} from '../index';
import { intersectionObserver, mediaObserver, resizeObserver } from '../observers';
import { currentElementOrThrow } from '../runtime';
import { fire, mount, waitForEvent } from '../testing';

const expectType = <T>(_value: T): void => {
  // compile-time-only helper for typing assertions
};

describe('Core: Component Definition', () => {
  describe('define()', () => {
    it('should define a custom element', () => {
      const tag = `test-basic-${Math.random().toString(36).slice(2)}`;

      define(tag, {
        setup: () => ({ render: () => html`<div>Hello</div>` }),
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

        return { render: () => html`<div>${count}</div>` };
      });

      expect(query('div')?.textContent).toBe('0');
    });

    it('should isolate component state', async () => {
      const setup = () => {
        const count = signal(0);

        return { render: () => html`<div>${count}</div>` };
      };

      const { query: query1 } = await mount(setup);
      const { query: query2 } = await mount(setup);

      expect(query1('div')?.textContent).toBe('0');
      expect(query2('div')?.textContent).toBe('0');
    });

    it('should throw on repeated registration for the same tag', () => {
      const tag = `test-dup-${Math.random().toString(36).slice(2)}`;

      define(tag, {
        setup: () => ({ render: () => html`<div>First</div>` }),
      });

      expect(() => {
        define(tag, {
          setup: () => ({ render: () => html`<div>Second</div>` }),
        });
      }).toThrow('[craftit:E10]');
    });

    it('should throw on repeated registration even without process env', () => {
      const tag = `test-dup-no-env-${Math.random().toString(36).slice(2)}`;

      define(tag, {
        setup: () => ({ render: () => html`<div>First</div>` }),
      });

      expect(() => {
        define(tag, {
          setup: () => ({ render: () => html`<div>Second</div>` }),
        });
      }).toThrow('[craftit:E10]');
    });
  });

  describe('Component Props', () => {
    it('supports  + prop helpers for typed defaults and parsing', async () => {
      const { element, query } = await mount(
        {
          props: {
            count: prop.number(0),
            disabled: prop.bool(false),
            size: prop.oneOf(['sm', 'md', 'lg'] as const, 'md'),
          },
          setup: (props) => {
            return html`<div class="count">${props.count}</div>
              <div class="size">${props.size}</div>`;
          },
        },
        {
          attrs: { count: '42', disabled: true, size: 'lg' },
        },
      );

      expect(query('.count')?.textContent).toBe('42');
      expect(query('.size')?.textContent).toBe('lg');
      expect(element.hasAttribute('disabled')).toBe(true);
    });

    it('should receive attributes as props', async () => {
      const { element } = await mount(
        {
          props: {
            size: 'small',
            variant: 'secondary',
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
          props: { count: 0 },
          setup: (props) => {
            return html`<div class="count">${props.count}</div>`;
          },
        },
        {
          attrs: { count: '42' },
        },
      );

      expect(query('.count')?.textContent).toBe('42');
    });

    it('should restore undefined for typed boolean props when the attribute is removed', async () => {
      const fixture = await mount(
        {
          props: {
            open: {
              default: undefined as boolean | undefined,
              parse: (value: string | null) => (value == null ? undefined : value === '' || value === 'true'),
              reflect: false,
            },
          },
          setup: (props) => {
            return html`<div class="value">${() => String(props.open.value)}</div>`;
          },
        },
        {
          attrs: { open: '' },
        },
      );

      expect(fixture.query('.value')?.textContent).toBe('true');

      fixture.element.removeAttribute('open');
      await fixture.flush();

      expect(fixture.query('.value')?.textContent).toBe('undefined');
    });

    it('should parse numbers from attributes when a typed descriptor uses Number', async () => {
      const { query } = await mount(
        {
          props: {
            count: {
              default: undefined as number | undefined,
              parse: (value: string | null) => (value == null ? undefined : Number(value)),
              reflect: false,
            },
          },
          setup: (props) => {
            return html`<div class="count">${() => String(props.count.value)}</div>`;
          },
        },
        {
          attrs: { count: '42' },
        },
      );

      expect(query('.count')?.textContent).toBe('42');
    });

    it('should use custom parse functions for attribute bindings into child props', async () => {
      const suffix = Math.random().toString(36).slice(2);
      const childTag = `test-custom-parse-child-${suffix}`;
      const parentTag = `test-custom-parse-parent-${suffix}`;

      define(childTag, {
        props: {
          size: {
            default: 0,
            parse: (value: string | null) => (value == null ? 0 : Number(value) * 2),
            reflect: false,
          },
        },
        setup: (props) => {
          return {
            render: () => html`<div class="size">${() => String(props.size.value)}</div>`,
          };
        },
      });

      define(parentTag, {
        setup: () => {
          const size = signal('3');

          return {
            render: () => html`<${childTag} size=${size}></${childTag}>`,
          };
        },
      });

      const { query } = await mount(parentTag);
      const child = query(childTag) as HTMLElement;

      expect(child.shadowRoot?.querySelector('.size')?.textContent).toBe('6');
    });

    it('should keep attribute->prop sync after reconnect', async () => {
      const fixture = await mount({
        props: { count: 0 },
        setup: (props) => {
          return html`<div class="count">${() => props.count.value}</div>`;
        },
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

      define<{ items: string[] }>(childTag, {
        props: { items: [] as string[] },
        setup: (props) => {
          return {
            render: () =>
              html`<div class="items">
                ${() =>
                  Array.isArray(props.items.value) ? props.items.value.join('|') : String(props.items.value ?? '')}
              </div>`,
          };
        },
      });

      define(parentTag, {
        setup: () => {
          const items = signal<string[]>(['alpha', 'beta']);

          return {
            render: () => html`
              <div>
                <button @click=${() => (items.value = ['gamma', 'delta'])}>Update</button>
                <${childTag} items=${items}></${childTag}>
              </div>
            `,
          };
        },
      });

      const { query } = await mount(parentTag);
      const child = query(childTag) as HTMLElement;
      const button = query('button');

      expect(child.shadowRoot?.querySelector('.items')?.textContent?.trim()).toBe('alpha|beta');

      fire.click(button!);
      await new Promise((r) => setTimeout(r, 10));

      expect(child.shadowRoot?.querySelector('.items')?.textContent?.trim()).toBe('gamma|delta');
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
      const { element, flush, query } = await mount((_props, { emit }) => {
        const typedEmit = emit as unknown as import('../index').SetupContextBag<{
          close: undefined;
          ping: { ok: boolean };
        }>['emit'];

        const fire = () => {
          typedEmit('close');
          typedEmit('ping', { ok: true });
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

    it('should infer emits from component event generics', async () => {
      const tag = `test-object-emits-${Math.random().toString(36).slice(2)}`;

      define<Record<string, never>, { change: { value: string }; retry: void }>(tag, {
        setup: (_props, { emit }) => {
          const fire = () => {
            emit('change', { value: 'ok' });
            emit('retry');
          };

          return {
            render: () => html`<button @click=${fire}>Emit</button>`,
          };
        },
      });

      const { element, flush, query } = await mount(tag);
      const changeSpy = vi.fn();
      const retrySpy = vi.fn();

      element.addEventListener('change', changeSpy);
      element.addEventListener('retry', retrySpy);
      query('button')!.dispatchEvent(new Event('click'));
      await flush();

      expect(changeSpy).toHaveBeenCalledTimes(1);
      expect((changeSpy.mock.calls[0]?.[0] as CustomEvent<{ value: string }>).detail.value).toBe('ok');
      expect(retrySpy).toHaveBeenCalledTimes(1);
    });

    it('should expose setup slots context', async () => {
      let defaultAssigned = false;
      let triggerAssigned = false;

      const { flush } = await mount(
        (_props, { slots }) => {
          return {
            mount() {
              defaultAssigned = slots.has().value;
              triggerAssigned = slots.has('trigger').value;
            },
            render: () => html`<slot name="trigger"></slot><slot></slot>`,
          };
        },
        { html: '<button slot="trigger">Open</button><span>Body</span>' },
      );

      await flush();

      expect(defaultAssigned).toBe(true);
      expect(triggerAssigned).toBe(true);
    });

    it('should infer emit and props from object event schema + raw prop defaults', async () => {
      const tag = `test-schema-events-${Math.random().toString(36).slice(2)}`;
      const toggleProps = {
        checked: false,
        label: 'Toggle',
      };

      define<{ checked?: boolean; label?: string }, { toggle: { checked: boolean } }, typeof toggleProps>(tag, {
        props: toggleProps,
        setup: (props, { emit }) => {
          expectType<ReturnType<typeof signal<boolean | undefined>>>(props.checked);
          expectType<ReturnType<typeof signal<string | undefined>>>(props.label);

          const fireToggle = () => emit('toggle', { checked: !props.checked.value });

          return {
            render: () => html`<button @click=${fireToggle}>${props.label}</button>`,
          };
        },
      });

      const { element, flush, query } = await mount(tag);

      const spy = vi.fn();

      element.addEventListener('toggle', spy);
      query('button')!.dispatchEvent(new Event('click'));
      await flush();

      expect(spy).toHaveBeenCalledTimes(1);
      expect((spy.mock.calls[0]?.[0] as CustomEvent<{ checked: boolean }>).detail.checked).toBe(true);
    });

    it('should preserve optional prop typing when default is explicitly undefined', async () => {
      const tag = `test-optional-default-undefined-${Math.random().toString(36).slice(2)}`;

      define<{ value?: string }>(tag, {
        props: {
          value: { default: undefined as string | undefined, reflect: false },
        },
        setup: (props) => {
          expectType<import('@vielzeug/stateit').Signal<string | undefined>>(props.value);

          return {
            render: () => html`<div class="value">${() => props.value.value ?? ''}</div>`,
          };
        },
      });

      const { query } = await mount(tag);

      expect(query('.value')?.textContent).toBe('');
    });

    it('should allow object prop with reflect: true at define-time', async () => {
      const tag = `test-reflect-structured-object-${Math.random().toString(36).slice(2)}`;

      expect(() => {
        define<{ data?: Record<string, string> }>(tag, {
          props: {
            data: { default: { a: '1' } as Record<string, string>, reflect: true },
          },
          setup: () => ({ render: () => html`<div>invalid</div>` }),
        });
      }).not.toThrow();

      const { element } = await mount(tag);

      expect(element.getAttribute('data')).toBe('[object Object]');
    });

    it('should allow array prop with reflect: true at define-time', async () => {
      const tag = `test-reflect-structured-array-${Math.random().toString(36).slice(2)}`;

      expect(() => {
        define<{ items?: string[] }>(tag, {
          props: {
            items: { default: ['x'] as string[], reflect: true },
          },
          setup: () => ({ render: () => html`<div>invalid</div>` }),
        });
      }).not.toThrow();

      const { element } = await mount(tag);

      expect(element.getAttribute('items')).toBe('x');
    });
  });

  it('should dispatch events via setup emit', async () => {
    const spy = vi.fn();
    const { element, flush, query } = await mount({
      setup: (_props, { emit }) => {
        const fire = () => emit('ping', { ok: true });

        return html`<button @click=${fire}>Ping</button>`;
      },
    });

    element.addEventListener('ping', spy);
    query('button')!.dispatchEvent(new Event('click'));
    await flush();

    expect(spy).toHaveBeenCalledTimes(1);
  });

  describe('Error Handling', () => {
    it('should handle empty template', async () => {
      const { shadow } = await mount(() => ({ render: () => html`` }));

      expect(shadow).not.toBeNull();
    });

    it('should handle undefined return', async () => {
      const { query } = await mount(() => ({ render: () => html`<div>Test</div>` }));

      expect(query('div')).not.toBeNull();
    });
  });

  describe('Re-rendering', () => {
    it('should update DOM when signals change', async () => {
      let count!: ReturnType<typeof signal<number>>;
      const { act, query } = await mount(() => {
        count = signal(0);

        return { render: () => html`<div>${count}</div>` };
      });

      expect(query('div')?.textContent).toBe('0');
      await act(() => count.value++);
      expect(query('div')?.textContent).toBe('1');
    });

    it('should infer typed prop signals from setup context props', async () => {
      const { query } = await mount(
        {
          props: { count: 0 },
          setup: (props) => {
            expectType<ReturnType<typeof signal<number | undefined>>>(props.count);

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
  describe('defineField()', () => {
    it('returns a handle exposing checkValidity, reportValidity, and setValidity', async () => {
      let handle!: ReturnType<typeof defineField>;

      await mount({
        formAssociated: true,
        setup: () => {
          handle = defineField({ value: signal('initial') });

          return { render: () => html`<div></div>` };
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

          return { render: () => html`<div></div>` };
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

          return { render: () => html`<div></div>` };
        },
      });

      expect(transformCalled).toBe(true);
    });

    it('throws when formAssociated is not enabled on the component', async () => {
      await expect(
        mount({
          setup: () => {
            defineField({ value: signal('test') });

            return { render: () => html`<div></div>` };
          },
        }),
      ).rejects.toThrow(/formAssociated: true/);
    });
  });

  describe('emit', () => {
    it('dispatches a custom event with the correct type and detail', async () => {
      const { element } = await mount(((_props, { emit }) => {
        const typedEmit = emit as unknown as import('../index').SetupContextBag<{
          'value-changed': { value: string };
        }>['emit'];

        setTimeout(() => typedEmit('value-changed', { value: 'hello' }), 50);

        return { render: () => html`<div></div>` };
      }) as ComponentDefinition['setup']);

      const event = await waitForEvent<CustomEvent<{ value: string }>>(element, 'value-changed');

      expect(event.detail.value).toBe('hello');
    });

    it('dispatched events bubble and are composed so host-level listeners receive them', async () => {
      const { element } = await mount(((_props, { emit }) => {
        setTimeout(() => emit('ping'), 50);

        return { render: () => html`<div></div>` };
      }) as ComponentDefinition['setup']);

      const event = await waitForEvent<CustomEvent>(element, 'ping');

      expect(event.bubbles).toBe(true);
      expect(event.composed).toBe(true);
    });
  });
});

describe('component props & global helpers', () => {
  it('should support direct default values in component props', async () => {
    const { query } = await mount(
      {
        props: {
          active: { default: true, reflect: false },
          count: 0,
          label: 'default',
        },
        setup: (props) => {
          return html`<div class="count">${props.count}</div>
            <div class="label">${props.label}</div>`;
        },
      },
      {
        attrs: { count: '42', label: 'custom' },
      },
    );

    expect(query('.count')?.textContent).toBe('42');
    expect(query('.label')?.textContent).toBe('custom');
  });

  it('should support object defaults containing a default key via inline prop defs', async () => {
    const configDefault = { default: 'fallback', mode: 'dark' };

    const { query } = await mount({
      props: {
        config: { default: configDefault as { default: string; mode: string } | undefined, reflect: false },
      },
      setup: (props) => {
        return html`<div class="mode">${() => props.config.value?.mode ?? ''}</div>`;
      },
    });

    expect(query('.mode')?.textContent).toBe('dark');
  });

  it('should provide core utility functions as global exports', async () => {
    let elementInstance: HTMLElement | undefined;

    const { element } = await mount(() => {
      elementInstance = currentElementOrThrow();

      expect(onCleanup).toBeDefined();
      expect(provide).toBeDefined();
      expect(inject).toBeDefined();
      expect(ref).toBeDefined();
      expect(refs).toBeDefined();
      expect(define).toBeDefined();
      expect(resizeObserver).toBeDefined();
      expect(intersectionObserver).toBeDefined();
      expect(mediaObserver).toBeDefined();

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

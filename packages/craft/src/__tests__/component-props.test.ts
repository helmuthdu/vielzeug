import { define, html, prop, signal } from '../index';
import { fire, mount } from '../testing';
import { expectType, uniqueTag } from './test-utils';

describe('component props', () => {
  it('supports helper-based typed defaults and parsing', async () => {
    const { element, query } = await mount(
      (props) => {
        return html`<div class="count">${props.count}</div>
          <div class="size">${props.size}</div>`;
      },
      {
        attrs: { count: '42', disabled: true, size: 'lg' },
        componentOptions: {
          props: {
            count: prop.number(0),
            disabled: prop.bool(false),
            size: prop.oneOf(['sm', 'md', 'lg'] as const, 'md'),
          },
        },
      },
    );

    expect(query('.count')?.textContent).toBe('42');
    expect(query('.size')?.textContent).toBe('lg');
    expect(element.hasAttribute('disabled')).toBe(true);
  });

  it('initializes prop signals from attributes', async () => {
    const { query } = await mount((props) => html`<div class="count">${props.count}</div>`, {
      attrs: { count: '42' },
      componentOptions: { props: { count: prop.number(0) } },
    });

    expect(query('.count')?.textContent).toBe('42');
  });

  it('restores undefined for typed boolean prop when attribute is removed', async () => {
    const fixture = await mount((props) => html`<div class="value">${() => String(props.open.value)}</div>`, {
      attrs: { open: '' },
      componentOptions: {
        props: {
          open: {
            default: undefined as boolean | undefined,
            parse: (value: string | null) => (value == null ? undefined : value === '' || value === 'true'),
            reflect: false,
          },
        },
      },
    });

    expect(fixture.query('.value')?.textContent).toBe('true');

    fixture.element.removeAttribute('open');
    await fixture.flush();

    expect(fixture.query('.value')?.textContent).toBe('undefined');
  });

  it('applies custom parse functions for child prop bindings', async () => {
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
        return html`<div class="size">${() => String(props.size.value)}</div>`;
      },
    });

    define(parentTag, {
      setup: () => {
        const size = signal('3');

        return html`<${childTag} size=${size}></${childTag}>`;
      },
    });

    const { query } = await mount(parentTag);
    const child = query(childTag) as HTMLElement;

    expect(child.shadowRoot?.querySelector('.size')?.textContent).toBe('6');
  });

  it('passes array values through bindings without stringifying structured props', async () => {
    const suffix = Math.random().toString(36).slice(2);
    const childTag = `test-array-child-${suffix}`;
    const parentTag = `test-array-parent-${suffix}`;

    define<{ items: string[] }>(childTag, {
      props: { items: prop.json([] as string[]) },
      setup: (props) => {
        return html`<div class="items">
          ${() => (Array.isArray(props.items.value) ? props.items.value.join('|') : String(props.items.value ?? ''))}
        </div>`;
      },
    });

    define(parentTag, {
      setup: () => {
        const items = signal<string[]>(['alpha', 'beta']);

        return html`
          <div>
            <button @click=${() => (items.value = ['gamma', 'delta'])}>Update</button>
            <${childTag} items=${items}></${childTag}>
          </div>
        `;
      },
    });

    const { query } = await mount(parentTag);
    const child = query(childTag) as HTMLElement;

    expect(child.shadowRoot?.querySelector('.items')?.textContent?.trim()).toBe('alpha|beta');

    fire.click(query('button')!);
    await new Promise((r) => setTimeout(r, 10));

    expect(child.shadowRoot?.querySelector('.items')?.textContent?.trim()).toBe('gamma|delta');
  });

  it('preserves optional prop typing for explicit undefined defaults', async () => {
    const tag = uniqueTag('test-optional-default-undefined');

    define<{ value?: string }>(tag, {
      props: {
        value: {
          default: undefined as string | undefined,
          parse: (v: string | null) => v ?? undefined,
          reflect: false,
        },
      },
      setup: (props) => {
        expectType<import('/ripple').ReadonlySignal<string | undefined>>(props.value);

        return html`<div class="value">${() => props.value.value ?? ''}</div>`;
      },
    });

    const { query } = await mount(tag);

    expect(query('.value')?.textContent).toBe('');
  });

  it('rejects structured defaults with reflect:true at define time', () => {
    const objectTag = uniqueTag('test-reflect-structured-object');
    const arrayTag = uniqueTag('test-reflect-structured-array');

    expect(() => {
      define<{ data?: Record<string, string> }>(objectTag, {
        props: {
          data: {
            default: { a: '1' } as Record<string, string>,
            parse: (v: string | null) => (v ? (JSON.parse(v) as Record<string, string>) : { a: '1' }),
            reflect: true,
          },
        },
        setup: () => html`<div>invalid</div>`,
      });
    }).toThrow();

    expect(() => {
      define<{ items?: string[] }>(arrayTag, {
        props: {
          items: {
            default: ['x'] as string[],
            parse: (v: string | null) => (v ? (JSON.parse(v) as string[]) : ['x']),
            reflect: true,
          },
        },
        setup: () => html`<div>invalid</div>`,
      });
    }).toThrow();
  });

  it('infers typed prop signals from setup props', async () => {
    const { query } = await mount(
      (props) => {
        expectType<ReturnType<typeof signal<number | undefined>>>(
          props.count as ReturnType<typeof signal<number | undefined>>,
        );

        return html`<div class="count">${props.count}</div>`;
      },
      {
        attrs: { count: '7' },
        componentOptions: { props: { count: prop.number(0) } },
      },
    );

    expect(query('.count')?.textContent).toBe('7');
  });
});

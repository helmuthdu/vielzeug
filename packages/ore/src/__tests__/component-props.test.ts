import { signal } from '@vielzeug/ripple';
import { vi } from 'vitest';

import { define, html, prop } from '../index';
import { fire, flush, mount } from '../testing';
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
        expectType<import('@vielzeug/ripple').Readable<string | undefined>>(props.value);

        return html`<div class="value">${() => props.value.value ?? ''}</div>`;
      },
    });

    const { query } = await mount(tag);

    expect(query('.value')?.textContent).toBe('');
  });

  it('prop.bool parses attribute value "false" as false', async () => {
    const fixture = await mount((props) => html`<div class="out">${() => String(props.active.value)}</div>`, {
      attrs: { active: 'false' },
      componentOptions: { props: { active: prop.bool(false) } },
    });

    expect(fixture.query('.out')?.textContent).toBe('false');
  });

  it('prop.bool parses empty string attribute as true', async () => {
    const fixture = await mount((props) => html`<div class="out">${() => String(props.active.value)}</div>`, {
      attrs: { active: '' },
      componentOptions: { props: { active: prop.bool(false) } },
    });

    expect(fixture.query('.out')?.textContent).toBe('true');
  });

  it('prop.bool parses absent attribute as false', async () => {
    const fixture = await mount((props) => html`<div class="out">${() => String(props.active.value)}</div>`, {
      componentOptions: { props: { active: prop.bool(false) } },
    });

    expect(fixture.query('.out')?.textContent).toBe('false');
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

  describe('prop.data()', () => {
    it('defaults to undefined when no default is provided', async () => {
      const { element } = await mount((props) => html`<div>${() => String(props.config.value)}</div>`, {
        componentOptions: { props: { config: prop.data<{ x: number }>() } },
      });

      expect((element as HTMLElement & { config: unknown }).config).toBeUndefined();
    });

    it('uses provided default object', async () => {
      const defaultObj = { x: 42 };
      const { element } = await mount((props) => html`<div>${() => JSON.stringify(props.config.value)}</div>`, {
        componentOptions: { props: { config: prop.data<{ x: number }>(defaultObj) } },
      });

      expect((element as HTMLElement & { config: { x: number } }).config).toBe(defaultObj);
    });

    it('ignores HTML attribute — keeps default value as-is', async () => {
      const { element } = await mount((props) => html`<div>${() => String(props.config.value)}</div>`, {
        attrs: { config: 'should-be-ignored' },
        componentOptions: { props: { config: prop.data<{ x: number }>() } },
      });

      expect((element as HTMLElement & { config: unknown }).config).toBeUndefined();
    });

    it('accepts an object set via JS property', async () => {
      const obj = { x: 7 };
      const { element } = await mount(
        (props) => html`<div class="out">${() => JSON.stringify(props.item.value)}</div>`,
        { componentOptions: { props: { item: prop.data<{ x: number }>() } } },
      );
      const el = element as HTMLElement & { item?: { x: number } };

      el.item = obj;
      await Promise.resolve();

      expect(el.item).toBe(obj);
    });

    it('does not reflect value back to an attribute', async () => {
      const defaultObj = { x: 1 };
      const { element } = await mount((props) => html`<div>${() => JSON.stringify(props.data.value)}</div>`, {
        componentOptions: { props: { data: prop.data<{ x: number }>(defaultObj) } },
      });

      expect(element.hasAttribute('data')).toBe(false);
    });
  });

  describe('prop.data() with function type', () => {
    it('defaults to undefined when no default is provided', async () => {
      const { element } = await mount((props) => html`<div>${() => String(props.getValue.value)}</div>`, {
        componentOptions: { props: { getValue: prop.data<() => string>() } },
      });

      expect((element as HTMLElement & { getValue: unknown }).getValue).toBeUndefined();
    });

    it('uses provided default function', async () => {
      const defaultFn = (): string => 'hello';
      const { element } = await mount(
        (props) => html`<div>${() => (props.getValue.value as (() => string) | undefined)?.()}</div>`,
        {
          componentOptions: { props: { getValue: prop.data<() => string>(defaultFn) } },
        },
      );

      expect((element as HTMLElement & { getValue: (() => string) | undefined }).getValue).toBe(defaultFn);
    });

    it('ignores HTML attribute — keeps value as-is', async () => {
      const { element } = await mount((props) => html`<div>${() => String(props.getValue.value)}</div>`, {
        attrs: { getValue: 'should-be-ignored' },
        componentOptions: { props: { getValue: prop.data<() => string>() } },
      });

      expect((element as HTMLElement & { getValue: unknown }).getValue).toBeUndefined();
    });

    it('accepts a function set via JS property', async () => {
      const fn = (): string => 'world';
      const { element } = await mount(
        (props) => html`<div class="out">${() => (props.cb.value as (() => string) | undefined)?.()}</div>`,
        {
          componentOptions: { props: { cb: prop.data<() => string>() } },
        },
      );
      const el = element as HTMLElement & { cb?: () => string };

      el.cb = fn;
      await Promise.resolve();

      expect(el.cb).toBe(fn);
    });

    it('does not reflect value back to an attribute', async () => {
      const defaultFn = (): string => 'test';
      const { element } = await mount((props) => html`<div>${() => String(props.getVal.value)}</div>`, {
        componentOptions: { props: { getVal: prop.data<() => string>(defaultFn) } },
      });

      expect(element.hasAttribute('getVal')).toBe(false);
      expect(element.hasAttribute('get-val')).toBe(false);
    });
  });

  describe('prop.json()', () => {
    it('parses JSON from attribute on upgrade', async () => {
      const { query } = await mount((props) => html`<div class="v">${() => JSON.stringify(props.data.value)}</div>`, {
        attrs: { data: '{"x":1}' },
        componentOptions: { props: { data: prop.json<{ x: number }>({ x: 0 }) } },
      });

      expect(query('.v')?.textContent).toBe('{"x":1}');
    });

    it('does not reflect prop change back to attribute', async () => {
      const { element, flush } = await mount(
        (props) => {
          (props.data as import('@vielzeug/ripple').Signal<{ x: number }>).value = { x: 99 };

          return html`<div>${() => (props.data.value as { x: number }).x}</div>`;
        },
        { componentOptions: { props: { data: prop.json<{ x: number }>({ x: 0 }) } } },
      );

      await flush();
      expect(element.getAttribute('data')).toBeNull();
    });
  });

  describe('prop.number() NaN guard', () => {
    it('returns default when attribute value is not a valid number', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { query } = await mount((props) => html`<div class="v">${props.count}</div>`, {
        attrs: { count: 'hello' },
        componentOptions: { props: { count: prop.number(42) } },
      });

      expect(query('.v')?.textContent).toBe('42');
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('not a valid number'));
      warnSpy.mockRestore();
    });

    it('returns undefined default when no default and attribute is invalid', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { query } = await mount((props) => html`<div class="v">${() => String(props.count.value)}</div>`, {
        attrs: { count: 'nope' },
        componentOptions: { props: { count: prop.number() } },
      });

      expect(query('.v')?.textContent).toBe('undefined');
      warnSpy.mockRestore();
    });
  });

  describe('pre-upgrade property values', () => {
    // Frameworks that hydrate/patch server-rendered custom elements (e.g. Vue) may assign
    // a prop as a plain JS property on the element *before* it upgrades — the browser stashes
    // that as an own instance property, which `registerProp` must then adopt. When the
    // assigned value is a string (as it would be for a plain HTML-style attribute such as
    // `size="16"`), it must be routed through the same `parse` the attribute path uses.
    it('parses a string pre-upgrade property the same way an attribute value would be', async () => {
      const tag = uniqueTag('test-pre-upgrade-string');
      const element = document.createElement(tag) as HTMLElement & { size?: unknown };

      // Simulate a framework assigning the value as a property prior to upgrade.
      element.size = '16';

      define<{ size: number }>(tag, {
        props: { size: prop.number(0) },
        setup: (props) => html`<div class="size">${() => String(props.size.value)}</div>`,
      });

      document.body.appendChild(element);
      await flush();

      expect(element.shadowRoot?.querySelector('.size')?.textContent).toBe('16');
      expect(typeof element.size).toBe('number');

      element.remove();
    });

    it('uses an already-typed pre-upgrade property value as-is', async () => {
      const tag = uniqueTag('test-pre-upgrade-typed');
      const element = document.createElement(tag) as HTMLElement & { config?: unknown };
      const preTyped = { x: 42 };

      element.config = preTyped;

      define<{ config: { x: number } }>(tag, {
        props: { config: prop.data<{ x: number }>({ x: 0 }) },
        setup: (props) => html`<div class="config">${() => JSON.stringify(props.config.value)}</div>`,
      });

      document.body.appendChild(element);
      await flush();

      expect(element.shadowRoot?.querySelector('.config')?.textContent).toBe(JSON.stringify(preTyped));

      element.remove();
    });

    it('parses a string assigned via the property setter after the element already upgraded', async () => {
      // Mirrors the other half of the same hydration race: the element auto-upgrades from its
      // SSR attribute *before* the framework's reconciliation pass reaches it, so the property
      // already exists — the framework then assigns straight through the setter with the vnode's
      // raw (string) prop value instead of calling setAttribute.
      const { element } = await mount((props) => html`<div class="size">${() => String(props.size.value)}</div>`, {
        attrs: { size: '16' },
        componentOptions: { props: { size: prop.number(0) } },
      });

      expect((element as HTMLElement & { size: number }).size).toBe(16);

      (element as HTMLElement & { size: unknown }).size = '16';
      await flush();

      expect((element as HTMLElement & { size: number }).size).toBe(16);
      expect(typeof (element as HTMLElement & { size: unknown }).size).toBe('number');
    });
  });
});

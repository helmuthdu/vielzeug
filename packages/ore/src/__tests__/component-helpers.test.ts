import { define, html, inject, prop, ref, getHost, provide } from '../index';
import { onCleanup } from '../runtime';
import { mount } from '../testing';

describe('component helpers and exports', () => {
  it('supports direct default prop values', async () => {
    const { query } = await mount(
      (props) =>
        html`<div class="count">${props.count}</div>
          <div class="label">${props.label}</div>`,
      {
        attrs: { count: '42', label: 'custom' },
        componentOptions: {
          props: {
            active: prop.bool(true),
            count: prop.number(0),
            label: prop.string('default'),
          },
        },
      },
    );

    expect(query('.count')?.textContent).toBe('42');
    expect(query('.label')?.textContent).toBe('custom');
  });

  it('supports complex object defaults using prop.json()', async () => {
    const configDefault = { default: 'fallback', mode: 'dark' };

    const { query } = await mount(
      (props) =>
        html`<div class="mode">${() => (props.config.value as typeof configDefault | undefined)?.mode ?? ''}</div>`,
      {
        componentOptions: {
          props: {
            config: prop.json(configDefault as { default: string; mode: string } | undefined),
          },
        },
      },
    );

    expect(query('.mode')?.textContent).toBe('dark');
  });

  it('exposes core utilities during setup', async () => {
    let elementInstance: HTMLElement | undefined;

    const { element } = await mount((_props) => {
      const el = getHost();
      const ctxProvide = provide;

      elementInstance = el;
      expect(onCleanup).toBeDefined();
      expect(ctxProvide).toBeDefined();
      expect(inject).toBeDefined();
      expect(ref).toBeDefined();
      expect(define).toBeDefined();

      return html`<div id="test"></div>`;
    });

    expect(elementInstance).toBe(element);
  });
});

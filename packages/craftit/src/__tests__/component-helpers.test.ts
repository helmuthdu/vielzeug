import { define, getCurrentElement, html, inject, onCleanup, prop, provide, ref, refs } from '../index';
import { intersectionObserver, mediaObserver, resizeObserver } from '../observers';
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

    const { query } = await mount((props) => html`<div class="mode">${() => (props.config.value as typeof configDefault | undefined)?.mode ?? ''}</div>`, {
      componentOptions: {
        props: {
          config: prop.json(configDefault as { default: string; mode: string } | undefined),
        },
      },
    });

    expect(query('.mode')?.textContent).toBe('dark');
  });

  it('exposes core utilities during setup', async () => {
    let elementInstance: HTMLElement | undefined;

    const { element } = await mount(() => {
      elementInstance = getCurrentElement();

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

  it('supports refs() array aggregation and cleanup', async () => {
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

    expect(items?.map((el) => el.textContent)).toEqual(['Item 1', 'Item 2', 'Item 3']);

    destroy();

    expect(items?.length).toBe(0);
  });
});

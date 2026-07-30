import { signal } from '@vielzeug/ripple';
import { describe, expect, it } from 'vitest';

import { html } from '../index';

const mountInto = (result: ReturnType<typeof html>): HTMLElement => {
  const container = document.createElement('div');

  result.mount(container, null, () => {});

  return container;
};

describe('template caching', () => {
  it('produces independent mounts for getter interpolations', () => {
    const getter = () => 42;

    const first = mountInto(html`
      <div>${getter}</div>
    `);
    const second = mountInto(html`
      <div>${getter}</div>
    `);

    expect(first.textContent).toContain('42');
    expect(second.textContent).toContain('42');
    expect(first).not.toBe(second);
  });

  it('produces independent mounts for function interpolations that return HTMLResult', () => {
    const render = () => html`
      <span>Hello</span>
    `;

    const first = mountInto(html`
      <div>${render}</div>
    `);
    const second = mountInto(html`
      <div>${render}</div>
    `);

    expect(first.querySelector('span')?.textContent).toBe('Hello');
    expect(second.querySelector('span')?.textContent).toBe('Hello');
  });

  it('renders signal-held HTMLResult values and swaps them on update', () => {
    const source = signal<unknown>(html`
      <em>cached</em>
    `);
    const container = mountInto(html`
      <div>${source}</div>
    `);

    expect(container.querySelector('em')?.textContent).toBe('cached');

    source.value = html`
      <em>fresh</em>
    `;

    expect(container.querySelector('em')?.textContent).toBe('fresh');
  });

  it('reuses the compiled template plan for identical template strings', () => {
    // The cache key is the TemplateStringsArray reference. Identical tagged
    // template literals in the same lexical location share the same key.
    const template = () => html`
      <div class="a">static</div>
    `;

    const result1 = mountInto(template());
    const result2 = mountInto(template());

    // Both mounts produce the same DOM structure
    expect(result1.firstElementChild?.tagName).toBe('DIV');
    expect(result2.firstElementChild?.tagName).toBe('DIV');
  });

  it('renders static content without reactive wiring', () => {
    const container = mountInto(html`
      <p>Hello world</p>
    `);

    expect(container.querySelector('p')?.textContent).toBe('Hello world');
  });

  it('renders signal values at node position and updates them', () => {
    const count = signal(42);
    const container = mountInto(html`
      <span>${count}</span>
    `);

    expect(container.querySelector('span')?.textContent).toBe('42');

    count.value = 43;

    expect(container.querySelector('span')?.textContent).toBe('43');
  });
});

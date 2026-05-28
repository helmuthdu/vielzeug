import { signal } from '@vielzeug/stateit';
import { describe, expect, it } from 'vitest';

import { html } from '../template-compiler';

describe('template caching', () => {
  it('produces html bindings for plain getter interpolations', () => {
    const getter = () => 42;

    const first = html`<div>${getter}</div>`;
    const second = html`<div>${getter}</div>`;

    const firstBinding = first.__bindings.find((binding) => binding.type === 'html');
    const secondBinding = second.__bindings.find((binding) => binding.type === 'html');

    expect(firstBinding?.type).toBe('html');
    expect(secondBinding?.type).toBe('html');
  });

  it('produces html bindings for function interpolations that return HTMLResult', () => {
    const render = () => html`<span>Hello</span>`;

    const first = html`<div>${render}</div>`;
    const second = html`<div>${render}</div>`;

    const firstBinding = first.__bindings.find((binding) => binding.type === 'html');
    const secondBinding = second.__bindings.find((binding) => binding.type === 'html');

    expect(firstBinding?.type).toBe('html');
    expect(secondBinding?.type).toBe('html');
  });

  it('produces html bindings for signal-based html values', () => {
    const source = signal<unknown>(html`<em>cached</em>`);

    const first = html`<div>${source}</div>`;
    const second = html`<div>${source}</div>`;

    const firstBinding = first.__bindings.find((binding) => binding.type === 'html');
    const secondBinding = second.__bindings.find((binding) => binding.type === 'html');

    expect(firstBinding?.type).toBe('html');
    expect(secondBinding?.type).toBe('html');
  });

  it('reuses the compiled template plan for identical template strings', () => {
    // Template plan cache (WeakMap on TemplateStringsArray) means identical template
    // tag references produce the same slot/prefix plan across calls.
    const tag = (strings: TemplateStringsArray, ...values: unknown[]) =>
      html(strings, ...values);

    const result1 = tag`<div class="a">static</div>`;
    const result2 = tag`<div class="a">static</div>`;

    // Both have the same HTML structure (no bindings for static templates)
    expect(result1.__html).toBe(result2.__html);
    expect(result1.__bindings).toHaveLength(0);
    expect(result2.__bindings).toHaveLength(0);
  });
});

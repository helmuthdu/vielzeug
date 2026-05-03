import { signal } from '@vielzeug/stateit';
import { describe, expect, it } from 'vitest';

import { html } from '../template-compiler';

describe('template caching', () => {
  it('reuses html wrapper signal for plain getter interpolations', () => {
    const getter = () => 42;

    const first = html`<div>${getter}</div>`;
    const second = html`<div>${getter}</div>`;

    const firstBinding = first.__bindings.find((binding) => binding.type === 'html');
    const secondBinding = second.__bindings.find((binding) => binding.type === 'html');

    expect(firstBinding?.type).toBe('html');
    expect(secondBinding?.type).toBe('html');

    if (firstBinding?.type !== 'html' || secondBinding?.type !== 'html') {
      throw new Error('Expected html bindings to be present');
    }

    expect(secondBinding.signal).toBe(firstBinding.signal);
  });

  it('reuses html wrapper signal for function interpolations', () => {
    const render = () => html`<span>Hello</span>`;

    const first = html`<div>${render}</div>`;
    const second = html`<div>${render}</div>`;

    const firstBinding = first.__bindings.find((binding) => binding.type === 'html');
    const secondBinding = second.__bindings.find((binding) => binding.type === 'html');

    expect(firstBinding?.type).toBe('html');
    expect(secondBinding?.type).toBe('html');

    if (firstBinding?.type !== 'html' || secondBinding?.type !== 'html') {
      throw new Error('Expected html bindings to be present');
    }

    expect(secondBinding.signal).toBe(firstBinding.signal);
  });

  it('reuses html wrapper signal for signal-based html values', () => {
    const source = signal<unknown>(html`<em>cached</em>`);

    const first = html`<div>${source}</div>`;
    const second = html`<div>${source}</div>`;

    const firstBinding = first.__bindings.find((binding) => binding.type === 'html');
    const secondBinding = second.__bindings.find((binding) => binding.type === 'html');

    expect(firstBinding?.type).toBe('html');
    expect(secondBinding?.type).toBe('html');

    if (firstBinding?.type !== 'html' || secondBinding?.type !== 'html') {
      throw new Error('Expected html bindings to be present');
    }

    expect(secondBinding.signal).toBe(firstBinding.signal);
  });
});

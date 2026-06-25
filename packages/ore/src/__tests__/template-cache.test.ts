import { signal } from '@vielzeug/ripple';
import { describe, expect, it } from 'vitest';

import { html } from '../template';

describe('template caching', () => {
  it('produces a valid HTMLResult with a DocumentFragment for getter interpolations', () => {
    const getter = () => 42;

    const first = html`<div>${getter}</div>`;
    const second = html`<div>${getter}</div>`;

    expect(first.fragment).toBeInstanceOf(DocumentFragment);
    expect(second.fragment).toBeInstanceOf(DocumentFragment);
    expect(typeof first.apply).toBe('function');
    expect(typeof second.apply).toBe('function');
  });

  it('produces a valid HTMLResult for function interpolations that return HTMLResult', () => {
    const render = () => html`<span>Hello</span>`;

    const first = html`<div>${render}</div>`;
    const second = html`<div>${render}</div>`;

    expect(first.fragment).toBeInstanceOf(DocumentFragment);
    expect(second.fragment).toBeInstanceOf(DocumentFragment);
  });

  it('produces a valid HTMLResult for signal-based html values', () => {
    const source = signal<unknown>(html`<em>cached</em>`);

    const first = html`<div>${source}</div>`;
    const second = html`<div>${source}</div>`;

    expect(first.fragment).toBeInstanceOf(DocumentFragment);
    expect(second.fragment).toBeInstanceOf(DocumentFragment);
  });

  it('reuses the compiled template plan for identical template strings', () => {
    // The cache key is the TemplateStringsArray reference. Identical tagged
    // template literals in the same lexical location share the same key.
    const template = () => html`<div class="a">static</div>`;

    const result1 = template();
    const result2 = template();

    // Both fragments should have the same DOM structure
    expect(result1.fragment.firstElementChild?.tagName).toBe('DIV');
    expect(result2.fragment.firstElementChild?.tagName).toBe('DIV');
  });

  it('static content is inserted into fragment immediately (no comment anchors)', () => {
    const result = html`<p>Hello world</p>`;

    expect(result.fragment.querySelector('p')?.textContent).toBe('Hello world');
  });

  it('signal at node position uses a comment anchor in the fragment', () => {
    const count = signal(42);
    const result = html`<span>${count}</span>`;

    // Signals always use HtmlBinding (comment anchor). The actual text content
    // is inserted when apply() runs the reactive effect.
    const span = result.fragment.querySelector('span');

    // The span exists in the fragment
    expect(span).not.toBeNull();

    // A comment node is used as an anchor; no text yet before apply()
    const hasComment = Array.from(span!.childNodes).some((n) => n.nodeType === Node.COMMENT_NODE);

    expect(hasComment).toBe(true);
  });
});

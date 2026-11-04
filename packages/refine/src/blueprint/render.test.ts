import { beforeAll, describe, expect, it } from 'vitest';

import type { BlueprintNode } from '../blueprint/blueprint';
import { UI_BLUEPRINT_REGISTRY, UI_BLUEPRINT_VERSION, UiBlueprintError } from '../blueprint/blueprint';
import { createUiBlueprintElement, renderUiBlueprint } from '../blueprint/render';

// Importing the renderer entry is what registers the components: it TAG re-exports each one.
beforeAll(async () => {
  await import('../blueprint/render');
});

function textNode(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  return { text: 'Hello', type: 'text', ...overrides };
}

function documentOf(root: unknown): unknown {
  return { root, version: UI_BLUEPRINT_VERSION };
}

function container(): HTMLElement {
  return document.createElement('div');
}

function rejectionIssues(value: unknown): string {
  try {
    renderUiBlueprint(container(), value);
    return '';
  } catch (error) {
    return error instanceof UiBlueprintError ? error.issues.join(' ') : String(error);
  }
}

describe('createUiBlueprintElement()', () => {
  it('creates the registered element for each component', () => {
    const samples: Record<string, Record<string, unknown>> = {
      alert: { children: [textNode()], type: 'alert' },
      badge: { text: 'New', type: 'badge' },
      box: { children: [textNode()], type: 'box' },
      button: { label: 'Save', type: 'button' },
      card: { children: [textNode()], type: 'card' },
      checkbox: { label: 'Accept', type: 'checkbox' },
      icon: { name: 'check', type: 'icon' },
      'number-input': { label: 'Amount', type: 'number-input' },
      progress: { type: 'progress', value: 40 },
      separator: { type: 'separator' },
      slider: { label: 'Rate', type: 'slider' },
      switch: { label: 'Enabled', type: 'switch' },
      text: textNode(),
    };

    for (const [component, node] of Object.entries(samples)) {
      const element = createUiBlueprintElement(node as unknown as BlueprintNode);
      expect(element.tagName.toLowerCase()).toBe(
        UI_BLUEPRINT_REGISTRY[component as keyof typeof UI_BLUEPRINT_REGISTRY].tag,
      );
    }
  });

  it('never renders the id metadata as an attribute', () => {
    const element = createUiBlueprintElement({
      id: 'amount',
      label: 'Amount',
      min: 0,
      type: 'number-input',
    } as unknown as BlueprintNode);

    // id is host-facing metadata addressed through the render node map, never a DOM attribute.
    expect(element.hasAttribute('id')).toBe(false);
    expect(element.getAttribute('min')).toBe('0');
  });

  it('renders a slider label as slot text, not an attribute', () => {
    const element = createUiBlueprintElement({ label: 'Interest rate', type: 'slider' } as unknown as BlueprintNode);

    // ore-slider mirrors the default slot to aria-label; the label is slot content, not an attribute.
    expect(element.textContent).toBe('Interest rate');
    expect(element.hasAttribute('label')).toBe(false);
  });

  it('renders an icon by name with no URL or markup', () => {
    const element = createUiBlueprintElement({ name: 'arrow-right', type: 'icon' } as unknown as BlueprintNode);

    expect(element.getAttribute('name')).toBe('arrow-right');
    expect(element.children).toHaveLength(0);
  });

  it('sets exactly the attributes the node carries and nothing else', () => {
    const element = createUiBlueprintElement({
      children: [textNode()],
      elevation: 2,
      padding: 'lg',
      type: 'box',
    } as unknown as BlueprintNode);

    expect([...element.getAttributeNames()].sort()).toEqual(['elevation', 'padding']);
    expect(element.getAttribute('elevation')).toBe('2');
    expect(element.getAttribute('padding')).toBe('lg');
  });

  it('omits a boolean attribute when the value is false', () => {
    const element = createUiBlueprintElement({
      fullwidth: false,
      label: 'Save',
      type: 'button',
    } as unknown as BlueprintNode);

    expect(element.hasAttribute('fullwidth')).toBe(false);
  });

  it('sets a boolean attribute as a bare attribute when true', () => {
    const element = createUiBlueprintElement({
      fullwidth: true,
      label: 'Save',
      type: 'button',
    } as unknown as BlueprintNode);

    expect(element.getAttribute('fullwidth')).toBe('');
  });

  it('renders children in document order', () => {
    const element = createUiBlueprintElement({
      children: [textNode({ text: 'first' }), textNode({ text: 'second' }), textNode({ text: 'third' })],
      type: 'box',
    } as unknown as BlueprintNode);

    expect([...element.children].map((child) => child.textContent)).toEqual(['first', 'second', 'third']);
  });

  it('nests a deep tree', () => {
    const element = createUiBlueprintElement({
      children: [{ children: [textNode({ text: 'deep' })], type: 'card' }],
      type: 'box',
    } as unknown as BlueprintNode);

    expect(element.querySelector('ore-card ore-text')?.textContent).toBe('deep');
  });

  it('refuses a node type the registry does not know', () => {
    expect(() => createUiBlueprintElement({ type: 'dialog' } as unknown as BlueprintNode)).toThrow(TypeError);
  });

  it('ignores fields a hand-built node smuggles past the validator', () => {
    // The renderer reads named fields only, so an extra key cannot reach the DOM even if the
    // validator were skipped.
    const element = createUiBlueprintElement({
      children: [textNode()],
      href: 'https://evil.example',
      onclick: 'alert(1)',
      style: 'color:red',
      type: 'box',
    } as unknown as BlueprintNode);

    expect(element.hasAttribute('href')).toBe(false);
    expect(element.hasAttribute('style')).toBe(false);
    expect(element.getAttributeNames()).toEqual([]);
  });
});

describe('renderUiBlueprint(): safe text rendering', () => {
  it.each([
    '<script>alert(1)</script>',
    '<img src=x onerror=alert(1)>',
    '</ore-text><ore-button onclick="alert(1)">injected</ore-button>',
    'javascript:alert(1)',
  ])('renders %s as visible text without creating elements', (payload) => {
    const host = container();
    renderUiBlueprint(host, documentOf(textNode({ text: payload })));

    const rendered = host.querySelector('ore-text')!;
    expect(rendered.textContent).toBe(payload);
    expect(rendered.children).toHaveLength(0);
    expect(host.querySelectorAll('script, img, button')).toHaveLength(0);
    // A text node cannot carry element children, so markup stays inert whatever it looks like.
    expect(rendered.firstChild?.nodeType).toBe(Node.TEXT_NODE);
    if (payload.includes('<')) expect(host.innerHTML).toContain('&lt;');
  });

  it('renders button labels and badge text as text too', () => {
    const host = container();
    renderUiBlueprint(
      host,
      documentOf({
        children: [
          { label: '<b>bold</b>', type: 'button' },
          { text: '<i>italic</i>', type: 'badge' },
        ],
        type: 'box',
      }),
    );

    expect(host.querySelector('ore-button')?.textContent).toBe('<b>bold</b>');
    expect(host.querySelector('ore-badge')?.textContent).toBe('<i>italic</i>');
    expect(host.querySelectorAll('b, i')).toHaveLength(0);
  });

  it('gives a button an accessible label matching its text', () => {
    const host = container();
    renderUiBlueprint(host, documentOf({ label: 'Save draft', type: 'button' }));

    const button = host.querySelector('ore-button')!;
    expect(button.getAttribute('label')).toBe('Save draft');
    expect(button.textContent).toBe('Save draft');
  });
});

describe('renderUiBlueprint(): validation gate', () => {
  it('leaves the container untouched when the document is rejected', () => {
    const host = container();
    renderUiBlueprint(host, documentOf(textNode({ text: 'valid' })));
    const before = host.innerHTML;

    expect(() => renderUiBlueprint(host, documentOf({ children: [], type: 'nope' }))).toThrow(UiBlueprintError);

    expect(host.innerHTML).toBe(before);
    expect(host.querySelector('ore-text')?.textContent).toBe('valid');
  });

  it('never renders a partially valid tree', () => {
    const host = container();
    const mixed = documentOf({
      children: [textNode({ text: 'fine' }), textNode({ size: 'enormous', text: 'bad' })],
      type: 'box',
    });

    expect(() => renderUiBlueprint(host, mixed)).toThrow(UiBlueprintError);
    expect(host.childElementCount).toBe(0);
  });

  it('reports the offending path on the thrown error', () => {
    const invalid = documentOf({ children: [textNode({ size: 'enormous' })], type: 'box' });

    expect(() => renderUiBlueprint(container(), invalid)).toThrow(UiBlueprintError);
    expect(rejectionIssues(invalid)).toContain('root.children[0].size');
  });

  it('replaces the previous preview on success', () => {
    const host = container();
    renderUiBlueprint(host, documentOf(textNode({ text: 'first' })));
    renderUiBlueprint(host, documentOf(textNode({ text: 'second' })));

    expect(host.querySelectorAll('ore-text')).toHaveLength(1);
    expect(host.textContent).toBe('second');
  });

  it('appends instead of replacing when asked', () => {
    const host = container();
    renderUiBlueprint(host, documentOf(textNode({ text: 'a' })));
    renderUiBlueprint(host, documentOf(textNode({ text: 'b' })), { replace: false });

    expect(host.querySelectorAll('ore-text')).toHaveLength(2);
  });
});

describe('renderUiBlueprint(): preview region', () => {
  it('wraps the preview in a labelled group when a label is given', () => {
    const host = container();
    renderUiBlueprint(host, documentOf(textNode()), { label: 'Generated preview' });

    const region = host.firstElementChild as HTMLElement;
    expect(region.getAttribute('role')).toBe('group');
    expect(region.getAttribute('aria-label')).toBe('Generated preview');
    expect(region.querySelector('ore-text')).toBeTruthy();
  });

  it('adds no wrapper when the host already labels the region', () => {
    const host = container();
    renderUiBlueprint(host, documentOf(textNode()));

    expect(host.firstElementChild?.tagName.toLowerCase()).toBe('ore-text');
  });

  it('returns the rendered root element and an id-keyed node map', () => {
    const host = container();
    const { element, nodes } = renderUiBlueprint(host, documentOf(textNode({ text: 'returned' })));

    expect(element.textContent).toBe('returned');
    expect(element.parentElement).toBe(host);
    expect(nodes.size).toBe(0);
  });

  it('maps every id-tagged node so a host can address it', () => {
    const host = container();
    const { nodes } = renderUiBlueprint(host, {
      root: {
        children: [
          { id: 'rate', label: 'Rate', type: 'slider' },
          { id: 'enabled', label: 'Enabled', type: 'switch' },
          { text: 'unlabelled', type: 'text' },
        ],
        type: 'box',
      },
      version: UI_BLUEPRINT_VERSION,
    });

    expect([...nodes.keys()].sort()).toEqual(['enabled', 'rate']);
    expect(nodes.get('rate')?.tagName.toLowerCase()).toBe('ore-slider');
    expect(nodes.get('enabled')?.tagName.toLowerCase()).toBe('ore-switch');
  });
});

describe('renderUiBlueprint(): accessibility', () => {
  it('produces no axe violations for a representative preview', async () => {
    const host = container();
    document.body.append(host);

    try {
      renderUiBlueprint(host, {
        root: {
          children: [
            { as: 'h2', text: 'Quarterly pipeline', type: 'text', variant: 'heading' },
            { text: 'Three deals need a next step before Friday.', type: 'text' },
            { type: 'separator' },
            {
              children: [
                { color: 'warning', text: 'Needs attention', type: 'badge' },
                { label: 'Review deals', type: 'button' },
              ],
              type: 'box',
            },
          ],
          elevation: 1,
          padding: 'lg',
          type: 'card',
        },
        version: UI_BLUEPRINT_VERSION,
      });

      const results = await axeCheck(host);
      expect(results.violations.map((violation) => `${violation.id}: ${violation.help}`)).toEqual([]);
    } finally {
      host.remove();
    }
  });

  /**
   * Known upstream gap, pinned rather than worked around: `ore-badge` exposes its `label` prop as
   * `aria-label` on the role-less `<span part="badge">` inside its own shadow root, which axe
   * rejects as `aria-prohibited-attr` (naming a generic element is not permitted). The defect is
   * in the component, not the blueprint: a bare `<ore-badge label="…" dot>` mounted on its own
   * fails the same rule, and badge's own axe test only covers the default no-label render.
   *
   * This asserts the gap so it cannot be forgotten, and fails the moment the component is fixed:
   * delete this test then. The fix belongs to the component owner: either an sr-only text node
   * (needs the visible count hidden to keep the computed name identical) or an explicit role.
   */
  it('pins the known ore-badge labelled-dot axe gap', async () => {
    const host = container();
    document.body.append(host);

    try {
      renderUiBlueprint(host, documentOf({ color: 'warning', dot: true, label: 'Needs attention', type: 'badge' }));

      const results = await axeCheck(host);
      expect(results.violations.map((violation) => violation.id)).toEqual(['aria-prohibited-attr']);
    } finally {
      host.remove();
    }
  });

  it('keeps a heading semantic when the document asks for one', () => {
    const host = container();
    renderUiBlueprint(host, documentOf(textNode({ as: 'h2', text: 'Title', variant: 'heading' })));

    expect(host.querySelector('ore-text')?.getAttribute('as')).toBe('h2');
  });
});

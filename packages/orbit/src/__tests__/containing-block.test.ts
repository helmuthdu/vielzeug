import { afterEach, describe, expect, it } from 'vitest';

import { getContainingBlock } from '../containing-block';

describe('getContainingBlock', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('returns null when no ancestor establishes a containing block', () => {
    const parent = document.createElement('div');
    const el = document.createElement('div');

    parent.appendChild(el);
    document.body.appendChild(parent);

    expect(getContainingBlock(el)).toBeNull();
  });

  it('finds an ancestor with a non-none transform, even a visually-identity one', () => {
    const trap = document.createElement('div');
    const el = document.createElement('div');

    trap.style.transform = 'scale(1) translateY(0)';
    trap.appendChild(el);
    document.body.appendChild(trap);

    expect(getContainingBlock(el)).toBe(trap);
  });

  it('finds an ancestor with a non-none perspective', () => {
    const trap = document.createElement('div');
    const el = document.createElement('div');

    trap.style.perspective = '800px';
    trap.appendChild(el);
    document.body.appendChild(trap);

    expect(getContainingBlock(el)).toBe(trap);
  });

  it('finds an ancestor with a non-none filter', () => {
    const trap = document.createElement('div');
    const el = document.createElement('div');

    trap.style.filter = 'blur(2px)';
    trap.appendChild(el);
    document.body.appendChild(trap);

    expect(getContainingBlock(el)).toBe(trap);
  });

  it('finds an ancestor with a non-none backdrop-filter', () => {
    const trap = document.createElement('div');
    const el = document.createElement('div');

    trap.style.backdropFilter = 'blur(4px)';
    trap.appendChild(el);
    document.body.appendChild(trap);

    expect(getContainingBlock(el)).toBe(trap);
  });

  it('finds an ancestor with will-change: transform', () => {
    const trap = document.createElement('div');
    const el = document.createElement('div');

    trap.style.willChange = 'transform';
    trap.appendChild(el);
    document.body.appendChild(trap);

    expect(getContainingBlock(el)).toBe(trap);
  });

  it('finds an ancestor with contain: layout', () => {
    const trap = document.createElement('div');
    const el = document.createElement('div');

    trap.style.contain = 'layout';
    trap.appendChild(el);
    document.body.appendChild(trap);

    expect(getContainingBlock(el)).toBe(trap);
  });

  it('ignores will-change values unrelated to the transform-trap properties', () => {
    const notATrap = document.createElement('div');
    const el = document.createElement('div');

    notATrap.style.willChange = 'opacity';
    notATrap.appendChild(el);
    document.body.appendChild(notATrap);

    expect(getContainingBlock(el)).toBeNull();
  });

  it('returns the nearest trapping ancestor when several exist', () => {
    const outer = document.createElement('div');
    const inner = document.createElement('div');
    const el = document.createElement('div');

    outer.style.transform = 'scale(1)';
    inner.style.filter = 'blur(1px)';
    inner.appendChild(el);
    outer.appendChild(inner);
    document.body.appendChild(outer);

    expect(getContainingBlock(el)).toBe(inner);
  });

  it('crosses shadow boundaries to reach a trapping host ancestor', () => {
    const host = document.createElement('div');

    host.style.transform = 'scale(1)';
    document.body.appendChild(host);

    const shadow = host.attachShadow({ mode: 'open' });
    const el = document.createElement('div');

    shadow.appendChild(el);

    expect(getContainingBlock(el)).toBe(host);
  });

  // Regression test for the actual bug this module exists to fix: a floating element rendered
  // by a component nested inside e.g. `<ore-dialog>`'s default `<slot>` is a light-DOM
  // *descendant* of the dialog host, several levels below its own light-DOM parent (never a
  // *direct* child of the dialog element). Walking via `parentElement` alone skips straight past
  // the dialog's shadow root — and everything inside it, including the panel that establishes
  // the containing block — out into the dialog's own light-DOM ancestors, silently missing it.
  it('crosses a <slot> boundary to reach a trapping ancestor inside the projecting shadow tree', () => {
    const dialogHost = document.createElement('div');

    document.body.appendChild(dialogHost);

    const dialogShadow = dialogHost.attachShadow({ mode: 'open' });
    const panel = document.createElement('div');

    panel.style.transform = 'scale(1)';
    dialogShadow.appendChild(panel);

    const slot = document.createElement('slot');

    panel.appendChild(slot);

    // Light-DOM content of `dialogHost`, several levels deep — not a direct child — mirroring a
    // form field nested inside a grid inside a dialog's projected body content.
    const formGrid = document.createElement('div');
    const el = document.createElement('div');

    formGrid.appendChild(el);
    dialogHost.appendChild(formGrid);

    // jsdom doesn't compute slot assignment automatically the way a real browser does —
    // simulate it directly via the same `assignedSlot` property `flatTreeParent` reads.
    Object.defineProperty(formGrid, 'assignedSlot', { value: slot });

    expect(getContainingBlock(el)).toBe(panel);
  });
});

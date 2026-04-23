/**
 * Directives Tests
 * Tests for core craftit directives: each, raw
 */

import { computed, define, each, html, raw, signal, type ComponentDefinition } from '../index';
import { mount } from '../testing';

const register = (tag: string, setup: ComponentDefinition['setup'], options: Omit<ComponentDefinition, 'setup'> = {}) =>
  define(tag, { setup, ...options });

describe('Directive: each()', () => {
  it('should render list items', async () => {
    const { queryAll } = await mount(() => {
      const items = signal([1, 2, 3]);

      return html`
        <ul>
          ${each(items, { key: (item) => item, render: (item) => html`<li>${item}</li>` })}
        </ul>
      `;
    });
    const items = queryAll('li');

    expect(items.length).toBe(3);
    expect(items[0].textContent).toBe('1');
  });

  it('should render fallback for empty list', async () => {
    const { query } = await mount(() => {
      const items = signal<number[]>([]);

      return html`
        <div class="container">
          ${each(items, {
            fallback: () => html`<div class="empty">Empty</div>`,
            key: (_, i) => i,
            render: (item) => html`<li>${item}</li>`,
          })}
        </div>
      `;
    });

    expect(query('.empty')?.textContent).toBe('Empty');
  });

  it('should support key function', async () => {
    const { queryAll } = await mount(() => {
      const items = signal([1, 2, 3]);

      return html`
        <ul>
          ${each(items, { key: (item) => item, render: (item) => html`<li>${item}</li>` })}
        </ul>
      `;
    });

    expect(queryAll('li').length).toBe(3);
  });

  it('should support the short-form overload', async () => {
    const { queryAll } = await mount(() => {
      const items = signal([1, 2, 3]);

      return html`
        <ul>
          ${each(
            items,
            (item) => item,
            (item) => html`<li>${item * 2}</li>`,
          )}
        </ul>
      `;
    });

    expect(queryAll('li').map((item) => item.textContent)).toEqual(['2', '4', '6']);
  });

  it('should support computed signal sources', async () => {
    const { queryAll } = await mount(() => {
      const items = signal([1, 2, 3]);
      const visibleItems = computed(() => items.value);

      return html`
        <ul>
          ${each(visibleItems, { key: (_, i) => i, render: (item) => html`<li>${item}</li>` })}
        </ul>
      `;
    });
    const listItems = queryAll('li');

    expect(listItems.length).toBe(3);
    expect(listItems[0].textContent).toBe('1');
    expect(listItems[2].textContent).toBe('3');
  });

  it('should filter items in computed source', async () => {
    const { queryAll } = await mount(() => {
      const items = signal([
        { active: true, id: 1, name: 'Alice' },
        { active: false, id: 2, name: 'Bob' },
        { active: true, id: 3, name: 'Carol' },
      ]);
      const activeItems = computed(() => items.value.filter((item) => item.active));

      return html`
        <ul>
          ${each(activeItems, {
            key: (item) => item.id,
            render: (item) => html`<li class="item">${item.name}</li>`,
          })}
        </ul>
      `;
    });
    const listItems = queryAll('.item');

    expect(listItems.length).toBe(2);
    expect(listItems[0].textContent).toBe('Alice');
    expect(listItems[1].textContent).toBe('Carol');
  });
});

describe('Directive: raw()', () => {
  it('should render HTML without escaping', async () => {
    const { query } = await mount(() => html`<div>${raw('<strong>bold</strong>')}</div>`);

    expect(query('strong')?.textContent).toBe('bold');
  });

  it('should update reactively', async () => {
    const content = signal('<b>one</b>');

    const { flush, query } = await mount(() => html`<div>${raw(content)}</div>`);

    expect(query('b')?.textContent).toBe('one');

    content.value = '<i>two</i>';
    await flush();
    expect(query('i')?.textContent).toBe('two');
    expect(query('b')).toBeNull();
  });
});

describe('Keyed Reconciliation', () => {
  it('should preserve sibling nodes after each() block', async () => {
    const items = signal([
      { id: 1, value: 'A' },
      { id: 2, value: 'B' },
    ]);

    register(
      'test-keyed-sibling',
      () => html`
        <div class="container">
          ${each(items, { key: (item) => item.id, render: (item) => html`<span class="item">${item.value}</span>` })}
          <button class="after">After</button>
        </div>
      `,
    );

    const { flush, query, queryAll } = await mount('test-keyed-sibling');

    expect(query('.after')).toBeTruthy();
    expect(queryAll('.item')).toHaveLength(2);

    items.value = [
      { id: 2, value: 'B2' },
      { id: 3, value: 'C3' },
    ];
    await flush();

    expect(query('.after')).toBeTruthy();
    expect(queryAll('.item')).toHaveLength(2);
  });

  it('should reuse nodes with same keys', async () => {
    const items = signal([
      { id: 1, value: 'A' },
      { id: 2, value: 'B' },
    ]);

    register(
      'test-reuse-nodes',
      () => html`
        <div>
          ${each(items, {
            key: (item) => item.id,
            render: (item) => html`<div class="item" data-id="${item.id}">${item.value}</div>`,
          })}
        </div>
      `,
    );

    const { flush, queryAll } = await mount('test-reuse-nodes');

    const initialNodes = queryAll('.item');

    expect(initialNodes[0].getAttribute('data-id')).toBe('1');
    expect(initialNodes[1].getAttribute('data-id')).toBe('2');

    items.value = [
      { id: 1, value: 'A-Updated' },
      { id: 2, value: 'B-Updated' },
    ];
    await flush();

    const updatedNodes = queryAll('.item');

    expect(updatedNodes.length).toBe(2);
    expect(updatedNodes[0].textContent).toBe('A-Updated');
  });

  it('should move keyed nodes when item order changes', async () => {
    const items = signal([
      { id: 1, value: 'A' },
      { id: 2, value: 'B' },
    ]);

    register(
      'test-keyed-reorder',
      () =>
        html`<div>
          ${each(items, {
            key: (item) => item.id,
            render: (item) => html`<span class="item">${item.value}</span>`,
          })}
        </div>`,
    );

    const { flush, queryAll } = await mount('test-keyed-reorder');
    const initialNodes = queryAll('.item');

    items.value = [
      { id: 2, value: 'B' },
      { id: 1, value: 'A' },
    ];
    await flush();

    const reorderedNodes = queryAll('.item');

    expect(reorderedNodes.map((node) => node.textContent)).toEqual(['B', 'A']);
    expect(reorderedNodes[0]).toBe(initialNodes[1]);
    expect(reorderedNodes[1]).toBe(initialNodes[0]);
  });

  it('should replace item nodes when keyed item HTML changes and run ref cleanups', async () => {
    const cleanupSpy = vi.fn();
    const items = signal([{ id: 1, mode: 'button' as 'button' | 'link' }]);

    register(
      'test-keyed-html-replace',
      () => html`
        <div>
          ${each(items, {
            key: (item) => item.id,
            render: (item) =>
              item.mode === 'button'
                ? html`<button class="entry" ref=${(el: Element | null) => !el && cleanupSpy()}>Action</button>`
                : html`<a class="entry" href="#" ref=${(el: Element | null) => !el && cleanupSpy()}>Action</a>`,
          })}
        </div>
      `,
    );

    const { flush, query } = await mount('test-keyed-html-replace');

    expect(query('.entry')?.tagName).toBe('BUTTON');

    items.value = [{ id: 1, mode: 'link' }];
    await flush();

    expect(query('.entry')?.tagName).toBe('A');
    expect(cleanupSpy).toHaveBeenCalled();
  });

  it('should handle keyed list empty transitions and restore keyed nodes', async () => {
    const items = signal([{ id: 1, value: 'A' }]);

    register(
      'test-keyed-empty-transition',
      () => html`
        <ul>
          ${each(items, {
            fallback: () => html`<li class="empty">Empty</li>`,
            key: (item) => item.id,
            render: (item) => html`<li class="item">${item.value}</li>`,
          })}
        </ul>
      `,
    );

    const { flush, query, queryAll } = await mount('test-keyed-empty-transition');

    expect(queryAll('.item')).toHaveLength(1);

    items.value = [];
    await flush();
    expect(queryAll('.item')).toHaveLength(0);
    expect(query('.empty')?.textContent).toBe('Empty');

    items.value = [{ id: 2, value: 'B' }];
    await flush();
    expect(query('.empty')).toBeNull();
    expect(queryAll('.item').map((node) => node.textContent)).toEqual(['B']);
  });
});

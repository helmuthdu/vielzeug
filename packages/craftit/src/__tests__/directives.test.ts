/**
 * Directives Tests
 * Tests for core craftit directives: each, raw
 */

import {
  computed,
  define,
  each,
  guard,
  html,
  live,
  raw,
  signal,
  styleMap,
  until,
  when,
  type ComponentDefinition,
} from '../index';
import { mount, type MountSetup } from '../testing';

const register = (tag: string, setup: MountSetup, options: Omit<ComponentDefinition, 'setup'> = {}) =>
  define(tag, {
    ...options,
    setup: (props, ctx) => {
      const result = setup(props, ctx);

      if (typeof result === 'object' && result && 'render' in result) {
        return result;
      }

      return () => result;
    },
  });

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

  it('should support options-based keyed rendering', async () => {
    const { queryAll } = await mount(() => {
      const items = signal([1, 2, 3]);

      return html`
        <ul>
          ${each(items, { key: (item) => item, render: (item) => html`<li>${item * 2}</li>` })}
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

describe('Directive: styleMap()', () => {
  it('should render style declarations from mixed reactive values', async () => {
    const color = signal('rgb(255, 0, 0)');
    const width = signal(12);

    const { flush, query } = await mount(
      () =>
        html`<div class="box" :style=${styleMap({ color, display: 'block', width: () => `${width.value}px` })}></div>`,
    );

    const box = query<HTMLElement>('.box');

    expect(box?.getAttribute('style')).toContain('color:rgb(255, 0, 0)');
    expect(box?.getAttribute('style')).toContain('display:block');
    expect(box?.getAttribute('style')).toContain('width:12px');

    color.value = 'rgb(0, 0, 255)';
    width.value = 24;
    await flush();

    expect(box?.getAttribute('style')).toContain('color:rgb(0, 0, 255)');
    expect(box?.getAttribute('style')).toContain('width:24px');
  });
});

describe('Directive: when()', () => {
  it('should switch branches reactively', async () => {
    const enabled = signal(true);
    const { flush, query } = await mount(
      () =>
        html`<section>
          ${when(
            enabled,
            () => html`<p class="on">On</p>`,
            () => html`<p class="off">Off</p>`,
          )}
        </section>`,
    );

    expect(query('.on')?.textContent).toBe('On');

    enabled.value = false;
    await flush();

    expect(query('.off')?.textContent).toBe('Off');
    expect(query('.on')).toBeNull();
  });
});

describe('Directive: guard()', () => {
  it('should only recompute when dependency tuple changes', async () => {
    const trigger = signal(1);
    const other = signal(0);
    let renders = 0;

    const { flush, query } = await mount(
      () =>
        html`<div class="value">
          ${guard([trigger], () => {
            renders++;

            return html`<span>${trigger.value}</span>`;
          })}
        </div>`,
    );

    expect(query('.value span')?.textContent).toBe('1');
    expect(renders).toBe(1);

    other.value = 1;
    await flush();
    expect(renders).toBe(1);

    trigger.value = 2;
    await flush();
    expect(renders).toBe(2);
    expect(query('.value span')?.textContent).toBe('2');
  });
});

describe('Directive: live()', () => {
  it('should not clobber user-typed input when app state is stale', async () => {
    const model = signal('server');
    const { query } = await mount(() => html`<input class="field" :value=${live(model)} @input=${() => undefined} />`);

    const input = query<HTMLInputElement>('.field');

    if (!input) throw new Error('Expected input to be rendered');

    input.value = 'user-typed';

    model.value = 'server';

    expect(input.value).toBe('user-typed');
  });

  it('should not clobber user-checked input when app state is stale', async () => {
    const model = signal(true);
    const { flush, query } = await mount(
      () => html`<input class="field" type="checkbox" ?checked=${live(model)} @change=${() => undefined} />`,
    );

    const input = query<HTMLInputElement>('.field');

    if (!input) throw new Error('Expected input to be rendered');

    input.checked = false;

    model.value = true;
    await flush();

    expect(input.checked).toBe(false);
  });
});

describe('Directive: until()', () => {
  it('should render placeholder until promise resolves', async () => {
    let resolvePromise!: (value: ReturnType<typeof html>) => void;
    const deferred = new Promise<ReturnType<typeof html>>((resolve) => {
      resolvePromise = resolve;
    });
    const { flush, query } = await mount(
      () => html`<div>${until(deferred, html`<span class="loading">Loading</span>`)}</div>`,
    );

    expect(query('.loading')?.textContent).toBe('Loading');

    resolvePromise(html`<span class="done">Done</span>`);

    await flush();

    expect(query('.done')?.textContent).toBe('Done');
    expect(query('.loading')).toBeNull();
  });
});

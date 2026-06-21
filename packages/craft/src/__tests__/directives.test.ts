/**
 * Directives Tests
 * Tests for core craft directives: each, raw
 */

import { computed, signal } from '@vielzeug/ripple';

import { classMap, each, live, model, raw, setRawSanitizer, styleMap, when } from '../directives/index';
import { html } from '../index';
import { fire, mount } from '../testing';
import { register } from './test-utils';

describe('Directive: each()', () => {
  it('should render list items', async () => {
    const { queryAll } = await mount(() => {
      const items = signal([1, 2, 3]);

      return html`
        <ul>
          ${each(
            items,
            (item) => item,
            (item) => html`<li>${item}</li>`,
          )}
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
          ${each(
            items,
            (_, i) => i,
            (item) => html`<li>${item}</li>`,
            () => html`<div class="empty">Empty</div>`,
          )}
        </div>
      `;
    });

    expect(query('.empty')?.textContent).toBe('Empty');
  });

  it('should clear fallback when list becomes non-empty', async () => {
    const items = signal<number[]>([]);
    const { act, query, queryAll } = await mount(
      () =>
        html`<ul>
          ${each(
            items,
            (n) => n,
            (n) => html`<li class="item">${n}</li>`,
            () => html`<div class="empty">Empty</div>`,
          )}
        </ul>`,
    );

    expect(query('.empty')).not.toBeNull();

    await act(() => {
      items.value = [1, 2];
    });

    expect(query('.empty')).toBeNull();
    expect(queryAll('.item')).toHaveLength(2);
  });

  it('should recreate items after list empties and repopulates', async () => {
    const items = signal([1, 2]);
    const { act, queryAll } = await mount(
      () =>
        html`<ul>
          ${each(
            items,
            (n) => n,
            (n) => html`<li class="item">${n}</li>`,
          )}
        </ul>`,
    );

    expect(queryAll('.item')).toHaveLength(2);

    await act(() => {
      items.value = [];
    });
    expect(queryAll('.item')).toHaveLength(0);

    await act(() => {
      items.value = [3, 4, 5];
    });
    expect(queryAll('.item')).toHaveLength(3);
    expect(queryAll('.item').map((el) => el.textContent)).toEqual(['3', '4', '5']);
  });

  it('should support key function', async () => {
    const { queryAll } = await mount(() => {
      const items = signal([1, 2, 3]);

      return html`
        <ul>
          ${each(
            items,
            (item) => item,
            (item) => html`<li>${item}</li>`,
          )}
        </ul>
      `;
    });

    expect(queryAll('li').length).toBe(3);
  });

  it('should accept a getter function as source', async () => {
    const all = signal([1, 2, 3, 4]);
    const { flush, queryAll } = await mount(
      () =>
        html`<ul>
          ${each(
            () => all.value.filter((n) => n % 2 === 0),
            (n) => n,
            (n) => html`<li>${n}</li>`,
          )}
        </ul>`,
    );

    expect(queryAll('li').map((el) => el.textContent)).toEqual(['2', '4']);

    all.value = [1, 2, 3, 4, 6];
    await flush();
    expect(queryAll('li').map((el) => el.textContent)).toEqual(['2', '4', '6']);
  });

  it('should support options-based keyed rendering', async () => {
    const { queryAll } = await mount(() => {
      const items = signal([1, 2, 3]);

      return html`
        <ul>
          ${each(
            items,
            (item) => item,
            (item) => html`<li>${item.value * 2}</li>`,
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
          ${each(
            visibleItems,
            (n) => n,
            (item) => html`<li>${item}</li>`,
          )}
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
          ${each(
            activeItems,
            (item) => item.id,
            (item) => html`<li class="item">${item.value.name}</li>`,
          )}
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
          ${each(
            items,
            (item) => item.id,
            (item) => html`<span class="item">${item.value.value}</span>`,
          )}
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
          ${each(
            items,
            (item) => item.id,
            (item) => html`<div class="item" data-id="${() => item.value.id}">${() => item.value.value}</div>`,
          )}
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

  it('should re-render list in correct order when items reorder', async () => {
    const items = signal([
      { id: 1, value: 'A' },
      { id: 2, value: 'B' },
    ]);

    register(
      'test-keyed-reorder',
      () =>
        html`<div>
          ${each(
            items,
            (item) => item.id,
            (item) => html`<span class="item">${item.value.value}</span>`,
          )}
        </div>`,
    );

    const { flush, queryAll } = await mount('test-keyed-reorder');

    expect(queryAll('.item').map((node) => node.textContent)).toEqual(['A', 'B']);

    items.value = [
      { id: 2, value: 'B' },
      { id: 1, value: 'A' },
    ];
    await flush();

    expect(queryAll('.item').map((node) => node.textContent)).toEqual(['B', 'A']);
  });

  it('should replace item nodes when keyed item HTML changes and run ref cleanups', async () => {
    const cleanupSpy = vi.fn();
    const items = signal([{ id: 1, mode: 'button' as 'button' | 'link' }]);

    register(
      'test-keyed-html-replace',
      () => html`
        <div>
          ${each(
            items,
            (item) => item.id,
            (item) => html`
              ${when(
                () => item.value.mode === 'button',
                () => html`<button class="entry" ref=${(el: Element | null) => !el && cleanupSpy()}>Action</button>`,
                () => html`<a class="entry" href="#" ref=${(el: Element | null) => !el && cleanupSpy()}>Action</a>`,
              )}
            `,
          )}
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
          ${each(
            items,
            (item) => item.id,
            (item) => html`<li class="item">${item.value.value}</li>`,
            () => html`<li class="empty">Empty</li>`,
          )}
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

  it('warns and does not throw when list contains duplicate keys', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const items = signal([
      { id: 1, value: 'A' },
      { id: 1, value: 'B' },
    ]);

    await expect(
      mount(
        () =>
          html`<ul>
            ${each(
              items,
              (item) => item.id,
              (item) => html`<li>${item.value.value}</li>`,
            )}
          </ul>`,
      ),
    ).resolves.toBeDefined();

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('duplicate key'));
    warnSpy.mockRestore();
  });

  it('leaves no orphaned DOM nodes after duplicate-key error recovery', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const items = signal([
      { id: 1, value: 'A' },
      { id: 1, value: 'B' },
    ]);

    const { flush, query, queryAll } = await mount(
      () =>
        html`<ul>
          ${each(
            items,
            (item) => item.id,
            (item) => html`<li class="item">${() => item.value.value}</li>`,
          )}
        </ul>`,
    );

    expect(query('ul')).not.toBeNull();
    expect(queryAll('.item')).toHaveLength(0);

    items.value = [{ id: 2, value: 'C' }];
    await flush();
    expect(queryAll('.item')).toHaveLength(1);
    expect(queryAll('.item')[0]?.textContent).toBe('C');

    warnSpy.mockRestore();
  });

  it('warns when key function returns only the index', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await mount(
      () =>
        html`<ul>
          ${each(
            [1, 2, 3],
            (_item, i) => i,
            (n) => html`<li>${n}</li>`,
          )}
        </ul>`,
    );

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('index'));
    warnSpy.mockRestore();
  });

  it('renders a plain static array as a one-time snapshot', async () => {
    const staticItems = [1, 2, 3];
    const { queryAll } = await mount(
      () =>
        html`<ul>
          ${each(
            staticItems,
            (n) => n,
            (n) => html`<li class="item">${() => n.value}</li>`,
          )}
        </ul>`,
    );

    expect(queryAll('.item')).toHaveLength(3);
    expect(queryAll('.item')[0]?.textContent).toBe('1');
    expect(queryAll('.item')[2]?.textContent).toBe('3');
  });
});

describe('Directive: raw()', () => {
  it('should render HTML without escaping', async () => {
    setRawSanitizer((s) => s);

    const { query } = await mount(() => html`<div>${raw('<strong>bold</strong>')}</div>`);

    expect(query('strong')?.textContent).toBe('bold');
  });

  it('should update reactively', async () => {
    setRawSanitizer((s) => s);

    const content = signal('<b>one</b>');

    const { flush, query } = await mount(() => html`<div>${raw(content)}</div>`);

    expect(query('b')?.textContent).toBe('one');

    content.value = '<i>two</i>';
    await flush();
    expect(query('i')?.textContent).toBe('two');
    expect(query('b')).toBeNull();
  });

  it('should pass content through the registered sanitizer', async () => {
    const sanitized: string[] = [];

    setRawSanitizer((html) => {
      sanitized.push(html);

      // Strip script tags as a minimal sanitizer
      return html.replace(/<script[^>]*>.*?<\/script>/gi, '');
    });

    const { query } = await mount(() => html`<div>${raw('<b>safe</b><script>alert(1)</script>')}</div>`);

    expect(sanitized).toHaveLength(1);
    expect(query('b')?.textContent).toBe('safe');
    // Script tag removed by sanitizer
    expect(query('script')).toBeNull();
  });

  it('should pass reactive values through the sanitizer on each update', async () => {
    const calls: string[] = [];

    setRawSanitizer((html) => {
      calls.push(html);

      return html;
    });

    const content = signal('<b>first</b>');
    const { flush } = await mount(() => html`<div>${raw(content)}</div>`);

    expect(calls).toHaveLength(1);

    content.value = '<i>second</i>';
    await flush();
    expect(calls).toHaveLength(2);
    expect(calls[1]).toBe('<i>second</i>');
  });

  it('should warn in DEV mode when no sanitizer is registered', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await mount(() => html`<div>${raw('<b>content</b>')}</div>`);

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('setRawSanitizer'));
    warn.mockRestore();
  });

  it('should warn in all environments (not only DEV) when no sanitizer is registered', async () => {
    // The warning is unconditional (no import.meta.env.DEV guard) to surface
    // sanitizer-omission mistakes in production builds as well.
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Empty string does NOT warn (no content to inject)
    await mount(() => html`<div>${raw('')}</div>`);
    expect(warn).not.toHaveBeenCalled();

    // Non-empty string DOES warn regardless of environment flag
    await mount(() => html`<div>${raw('<em>text</em>')}</div>`);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('setRawSanitizer'));
    warn.mockRestore();
  });

  it('accepts a getter function and updates reactively', async () => {
    setRawSanitizer((s) => s);

    const content = signal('<b>hello</b>');
    const { flush, query } = await mount(() => html`<div>${raw(() => content.value)}</div>`);

    expect(query('b')?.textContent).toBe('hello');

    content.value = '<i>world</i>';
    await flush();
    expect(query('i')?.textContent).toBe('world');
    expect(query('b')).toBeNull();
  });

  it('re-warns after setRawSanitizer(null) clears the sanitizer', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await mount(() => html`<div>${raw('<b>first</b>')}</div>`);
    expect(warnSpy).toHaveBeenCalledTimes(1);

    setRawSanitizer((s) => s);
    await mount(() => html`<div>${raw('<b>second</b>')}</div>`);
    expect(warnSpy).toHaveBeenCalledTimes(1);

    setRawSanitizer(null);
    await mount(() => html`<div>${raw('<b>third</b>')}</div>`);
    expect(warnSpy).toHaveBeenCalledTimes(2);

    warnSpy.mockRestore();
  });

  it('getter-fn: DOM stops updating after component destroy (computed disposed)', async () => {
    setRawSanitizer((s) => s);

    const content = signal('<b>initial</b>');
    const { destroy, flush, query } = await mount(() => html`<div>${raw(() => content.value)}</div>`);

    expect(query('b')?.textContent).toBe('initial');

    destroy();

    content.value = '<i>after-destroy</i>';
    await flush();
    expect(query('i')).toBeNull();
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

  it('should strip semicolons from values to prevent CSS declaration injection', async () => {
    const { query } = await mount(
      () => html`<div class="box" :style=${styleMap({ color: 'red; display:none' })}></div>`,
    );

    const style = query<HTMLElement>('.box')?.getAttribute('style') ?? '';

    // Semicolons stripped — injection neutralised
    expect(style).not.toContain(';display:none');
    expect(style).toContain('color:red display:none');
  });

  it('should strip braces from values', async () => {
    const { query } = await mount(
      () => html`<div class="box" :style=${styleMap({ color: 'red} body{display:none' })}></div>`,
    );

    const style = query<HTMLElement>('.box')?.getAttribute('style') ?? '';

    expect(style).not.toContain('}');
    expect(style).not.toContain('{');
  });

  it('should strip semicolons from property name keys to prevent declaration injection', async () => {
    const { query } = await mount(
      () => html`<div class="box" :style=${styleMap({ 'color; background': 'red' })}></div>`,
    );

    const style = query<HTMLElement>('.box')?.getAttribute('style') ?? '';

    // Key has semicolons stripped — only valid CSS property remains
    expect(style).not.toContain('; background');
    expect(style).toContain('color background:red');
  });

  it('should drop entries with empty property names after sanitization', async () => {
    const { query } = await mount(() => html`<div class="box" :style=${styleMap({ ';{}': 'red' })}></div>`);

    const style = query<HTMLElement>('.box')?.getAttribute('style') ?? '';

    // All chars stripped from key → entry dropped entirely
    expect(style).toBe('');
  });
});

describe('Directive: classMap()', () => {
  it('should join truthy class names', async () => {
    const active = signal(true);
    const hidden = signal(false);
    const { flush, query } = await mount(() => html`<div :class=${classMap({ active, hidden, static: true })}></div>`);

    expect(query('div')?.getAttribute('class')).toContain('active');
    expect(query('div')?.getAttribute('class')).toContain('static');
    expect(query('div')?.getAttribute('class')).not.toContain('hidden');

    active.value = false;
    hidden.value = true;
    await flush();
    expect(query('div')?.getAttribute('class')).not.toContain('active');
    expect(query('div')?.getAttribute('class')).toContain('hidden');
  });

  it('should strip whitespace from class name keys to prevent token injection', async () => {
    const { query } = await mount(() => html`<div :class=${classMap({ 'foo bar': true })}></div>`);

    const cls = query('div')?.getAttribute('class') ?? '';

    // Spaces stripped — no extra token injected
    expect(cls).toBe('foobar');
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

  it('should render reactive bindings inside branches', async () => {
    const title = signal('Hello');
    const { flush, query } = await mount(
      () =>
        html`<div>
          ${when(
            false,
            () => html`<span class="on">${() => title.value}</span>`,
            () => html`<span class="off">${() => title.value}</span>`,
          )}
        </div>`,
    );

    expect(query('.off')?.textContent?.trim()).toBe('Hello');

    title.value = 'World';
    await flush();

    expect(query('.off')?.textContent?.trim()).toBe('World');
  });

  it('renders truthy branch immediately for a static true condition', async () => {
    const { query } = await mount(
      () =>
        html`<div>
          ${when(
            true,
            () => html`<p class="yes">Yes</p>`,
            () => html`<p class="no">No</p>`,
          )}
        </div>`,
    );

    expect(query('.yes')?.textContent).toBe('Yes');
    expect(query('.no')).toBeNull();
  });

  it('renders falsy branch immediately for a static false condition', async () => {
    const { query } = await mount(
      () =>
        html`<div>
          ${when(
            false,
            () => html`<p class="yes">Yes</p>`,
            () => html`<p class="no">No</p>`,
          )}
        </div>`,
    );

    expect(query('.no')?.textContent).toBe('No');
    expect(query('.yes')).toBeNull();
  });

  it('renders nothing for static false with no falsy branch', async () => {
    const { query } = await mount(() => html`<div>${when(false, () => html`<p class="yes">Yes</p>`)}</div>`);

    expect(query('.yes')).toBeNull();
  });

  it('getter-fn: DOM stops reacting after component destroy (computed disposed)', async () => {
    const flag = signal(true);
    const { destroy, element, flush, query } = await mount(
      () =>
        html`<div>
          ${when(
            () => flag.value,
            () => html`<p class="on">On</p>`,
            () => html`<p class="off">Off</p>`,
          )}
        </div>`,
    );

    expect(query('.on')).not.toBeNull();

    destroy();

    const root = element.shadowRoot ?? element;
    const snapshotAfterDestroy = root.innerHTML;

    flag.value = false;
    await flush();

    expect(root.innerHTML).toBe(snapshotAfterDestroy);
    expect(root.querySelector('.off')).toBeNull();
  });
});

describe('Directive: model()', () => {
  it('syncs text input value from signal to DOM', async () => {
    const name = signal('Alice');
    const { query } = await mount(() => html`<input class="f" type="text" ${model(name)} />`);

    expect(query<HTMLInputElement>('.f')?.value).toBe('Alice');
  });

  it('syncs text input DOM value back to signal on input event', async () => {
    const name = signal('');
    const { act, query } = await mount(() => html`<input class="f" type="text" ${model(name)} />`);
    const input = query<HTMLInputElement>('.f')!;

    await act(() => {
      input.value = 'Bob';
      fire.input(input);
    });

    expect(name.value).toBe('Bob');
  });

  it('syncs number input value from signal to DOM', async () => {
    const count = signal(42);
    const { query } = await mount(() => html`<input class="f" type="number" ${model(count)} />`);

    expect(query<HTMLInputElement>('.f')?.value).toBe('42');
  });

  it('syncs number input DOM value back to signal as a number', async () => {
    const count = signal(0);
    const { act, query } = await mount(() => html`<input class="f" type="number" ${model(count)} />`);
    const input = query<HTMLInputElement>('.f')!;

    await act(() => {
      input.value = '7';
      fire.input(input);
    });

    expect(count.value).toBe(7);
    expect(typeof count.value).toBe('number');
  });

  it('sets signal to 0 when number input is cleared', async () => {
    const count = signal(5);
    const { act, query } = await mount(() => html`<input class="f" type="number" ${model(count)} />`);
    const input = query<HTMLInputElement>('.f')!;

    await act(() => {
      input.value = '';
      fire.input(input);
    });

    expect(count.value).toBe(0);
  });

  it('syncs range input DOM value back to signal as a number', async () => {
    const vol = signal(50);
    const { act, query } = await mount(() => html`<input class="f" type="range" ${model(vol)} />`);
    const input = query<HTMLInputElement>('.f')!;

    await act(() => {
      input.value = '75';
      fire.input(input);
    });

    expect(vol.value).toBe(75);
    expect(typeof vol.value).toBe('number');
  });

  it('syncs checkbox checked state from signal to DOM', async () => {
    const checked = signal(true);
    const { query } = await mount(() => html`<input class="f" type="checkbox" ${model(checked)} />`);

    expect(query<HTMLInputElement>('.f')?.checked).toBe(true);
  });

  it('syncs checkbox DOM state back to signal as boolean', async () => {
    const checked = signal(false);
    const { act, query } = await mount(() => html`<input class="f" type="checkbox" ${model(checked)} />`);
    const input = query<HTMLInputElement>('.f')!;

    await act(() => {
      input.checked = true;
      fire.input(input);
    });

    expect(checked.value).toBe(true);
    expect(typeof checked.value).toBe('boolean');
  });

  it('syncs select value from signal to DOM', async () => {
    const choice = signal('b');
    const { query } = await mount(
      () => html`
        <select class="f" ${model(choice)}>
          <option value="a">A</option>
          <option value="b">B</option>
          <option value="c">C</option>
        </select>
      `,
    );

    expect(query<HTMLSelectElement>('.f')?.value).toBe('b');
  });

  it('syncs select DOM value back to signal on change event', async () => {
    const choice = signal('a');
    const { act, query } = await mount(
      () => html`
        <select class="f" ${model(choice)}>
          <option value="a">A</option>
          <option value="b">B</option>
        </select>
      `,
    );
    const select = query<HTMLSelectElement>('.f')!;

    await act(() => {
      select.value = 'b';
      fire.change(select);
    });

    expect(choice.value).toBe('b');
  });

  it('syncs multi-select value from signal array to DOM', async () => {
    const selected = signal<string[]>(['a', 'c']);
    const { query } = await mount(
      () => html`
        <select class="f" multiple ${model(selected)}>
          <option value="a">A</option>
          <option value="b">B</option>
          <option value="c">C</option>
        </select>
      `,
    );
    const sel = query<HTMLSelectElement>('.f')!;

    expect(sel.options[0]!.selected).toBe(true);
    expect(sel.options[1]!.selected).toBe(false);
    expect(sel.options[2]!.selected).toBe(true);
  });

  it('syncs multi-select DOM selection back to signal array on change', async () => {
    const selected = signal<string[]>([]);
    const { act, query } = await mount(
      () => html`
        <select class="f" multiple ${model(selected)}>
          <option value="a">A</option>
          <option value="b">B</option>
          <option value="c">C</option>
        </select>
      `,
    );
    const sel = query<HTMLSelectElement>('.f')!;

    await act(() => {
      sel.options[0]!.selected = true;
      sel.options[2]!.selected = true;
      fire.change(sel);
    });

    expect(selected.value).toEqual(['a', 'c']);
  });

  it('updates multi-select DOM when signal array changes reactively', async () => {
    const selected = signal<string[]>([]);
    const { act, query } = await mount(
      () => html`
        <select class="f" multiple ${model(selected)}>
          <option value="x">X</option>
          <option value="y">Y</option>
        </select>
      `,
    );
    const sel = query<HTMLSelectElement>('.f')!;

    await act(() => {
      selected.value = ['x'];
    });

    expect(sel.options[0]!.selected).toBe(true);
    expect(sel.options[1]!.selected).toBe(false);
  });

  it('syncs textarea value from signal to DOM', async () => {
    const text = signal('hello');
    const { query } = await mount(() => html`<textarea class="f" ${model(text)}></textarea>`);

    expect(query<HTMLTextAreaElement>('.f')?.value).toBe('hello');
  });

  it('syncs textarea DOM value back to signal on input event', async () => {
    const text = signal('');
    const { act, query } = await mount(() => html`<textarea class="f" ${model(text)}></textarea>`);
    const ta = query<HTMLTextAreaElement>('.f')!;

    await act(() => {
      ta.value = 'typed';
      fire.input(ta);
    });

    expect(text.value).toBe('typed');
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

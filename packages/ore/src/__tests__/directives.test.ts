/**
 * Directives Tests
 * Tests for core ore directives: each, raw
 */

import { computed, signal } from '@vielzeug/ripple';

import { classMap, each, html, live, styleMap, unsafeHtml, when } from '../index';
import { mount } from '../testing';
import { register } from './test-utils';

describe('Directive: each()', () => {
  it('should render list items', async () => {
    const { element, queryAll } = await mount(() => {
      const items = signal([1, 2, 3]);

      return html`
        <ul>
          ${each(
            items,
            (item) => item,
            (item) => html`
              <li>${item}</li>
            `,
          )}
        </ul>
      `;
    });
    const items = queryAll('li');

    expect(items.length).toBe(3);
    expect(items[0].textContent).toBe('1');

    // Structural a11y check: each() inserts/reorders real DOM nodes around
    // comment anchors — must not corrupt list semantics (see AGENTS.md § Accessibility testing).
    const results = await axeCheck(element);

    expect(results.violations).toHaveLength(0);
  });

  it('should render fallback for empty list', async () => {
    const { query } = await mount(() => {
      const items = signal<number[]>([]);

      return html`
        <div class="container">
          ${each(
            items,
            (_, i) => i,
            (item) => html`
              <li>${item}</li>
            `,
            () => html`
              <div class="empty">Empty</div>
            `,
          )}
        </div>
      `;
    });

    expect(query('.empty')?.textContent).toBe('Empty');
  });

  it('should clear fallback when list becomes non-empty', async () => {
    const items = signal<number[]>([]);
    const { act, query, queryAll } = await mount(
      () => html`
        <ul>
          ${each(
            items,
            (n) => n,
            (n) => html`
              <li class="item">${n}</li>
            `,
            () => html`
              <div class="empty">Empty</div>
            `,
          )}
        </ul>
      `,
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
      () => html`
        <ul>
          ${each(
            items,
            (n) => n,
            (n) => html`
              <li class="item">${n}</li>
            `,
          )}
        </ul>
      `,
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
            (item) => html`
              <li>${item}</li>
            `,
          )}
        </ul>
      `;
    });

    expect(queryAll('li').length).toBe(3);
  });

  it('should accept a getter function as source', async () => {
    const all = signal([1, 2, 3, 4]);
    const { flush, queryAll } = await mount(
      () => html`
        <ul>
          ${each(
            () => all.value.filter((n) => n % 2 === 0),
            (n) => n,
            (n) => html`
              <li>${n}</li>
            `,
          )}
        </ul>
      `,
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
            (item) => html`
              <li>${item.value * 2}</li>
            `,
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
            (item) => html`
              <li>${item}</li>
            `,
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
            (item) => html`
              <li class="item">${item.value.name}</li>
            `,
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
            (item) => html`
              <span class="item">${item.value.value}</span>
            `,
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
            (item) => html`
              <div class="item" data-id="${() => item.value.id}">${() => item.value.value}</div>
            `,
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
      () => html`
        <div>
          ${each(
            items,
            (item) => item.id,
            (item) => html`
              <span class="item">${item.value.value}</span>
            `,
          )}
        </div>
      `,
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
                () => html`
                  <button class="entry" ref=${(el: Element | null) => !el && cleanupSpy()}>Action</button>
                `,
                () => html`
                  <a class="entry" href="#" ref=${(el: Element | null) => !el && cleanupSpy()}>Action</a>
                `,
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
            (item) => html`
              <li class="item">${item.value.value}</li>
            `,
            () => html`
              <li class="empty">Empty</li>
            `,
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

  it('reports via ore:error and does not throw when list contains duplicate keys', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const oreErrorHandler = vi.fn();

    document.addEventListener('ore:error', oreErrorHandler);

    const items = signal([
      { id: 1, value: 'A' },
      { id: 1, value: 'B' },
    ]);

    await expect(
      mount(
        () => html`
          <ul>
            ${each(
              items,
              (item) => item.id,
              (item) => html`
                <li>${item.value.value}</li>
              `,
            )}
          </ul>
        `,
      ),
    ).resolves.toBeDefined();

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('each-reconcile'),
      expect.objectContaining({ message: expect.stringContaining('duplicate key') }),
    );
    // ore:error fires unconditionally (not gated by dev/prod) — this is the signal a consumer
    // is meant to observe in production, where the console log above is stripped.
    expect(oreErrorHandler).toHaveBeenCalledTimes(1);
    expect(oreErrorHandler.mock.calls[0]?.[0].detail.phase).toBe('each-reconcile');

    document.removeEventListener('ore:error', oreErrorHandler);
    errorSpy.mockRestore();
  });

  it('leaves no orphaned DOM nodes after duplicate-key error recovery', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const items = signal([
      { id: 1, value: 'A' },
      { id: 1, value: 'B' },
    ]);

    const { flush, query, queryAll } = await mount(
      () => html`
        <ul>
          ${each(
            items,
            (item) => item.id,
            (item) => html`
              <li class="item">${() => item.value.value}</li>
            `,
          )}
        </ul>
      `,
    );

    expect(query('ul')).not.toBeNull();
    expect(queryAll('.item')).toHaveLength(0);

    items.value = [{ id: 2, value: 'C' }];
    await flush();
    expect(queryAll('.item')).toHaveLength(1);
    expect(queryAll('.item')[0]?.textContent).toBe('C');

    errorSpy.mockRestore();
  });

  it('reports via ore:error and recovers when a subsequent update (not just the initial mount) introduces duplicate keys', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const items = signal([
      { id: 1, value: 'A' },
      { id: 2, value: 'B' },
    ]);

    const { flush, queryAll } = await mount(
      () => html`
        <ul>
          ${each(
            items,
            (item) => item.id,
            (item) => html`
              <li class="item">${() => item.value.value}</li>
            `,
          )}
        </ul>
      `,
    );

    expect(queryAll('.item').map((node) => node.textContent)).toEqual(['A', 'B']);

    // A later render introduces a duplicate key that wasn't present at mount time.
    items.value = [
      { id: 3, value: 'C' },
      { id: 3, value: 'D' },
    ];
    await flush();

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('each-reconcile'),
      expect.objectContaining({ message: expect.stringContaining('duplicate key') }),
    );
    expect(queryAll('.item')).toHaveLength(0);

    // The list can still recover cleanly on the next update after the bad one.
    items.value = [{ id: 4, value: 'E' }];
    await flush();
    expect(queryAll('.item').map((node) => node.textContent)).toEqual(['E']);

    errorSpy.mockRestore();
  });

  it('renders a plain static array as a one-time snapshot', async () => {
    const staticItems = [1, 2, 3];
    const { queryAll } = await mount(
      () => html`
        <ul>
          ${each(
            staticItems,
            (n) => n,
            (n) => html`
              <li class="item">${() => n.value}</li>
            `,
          )}
        </ul>
      `,
    );

    expect(queryAll('.item')).toHaveLength(3);
    expect(queryAll('.item')[0]?.textContent).toBe('1');
    expect(queryAll('.item')[2]?.textContent).toBe('3');
  });
});

describe('Directive: unsafeHtml()', () => {
  it('renders caller-sanitized HTML without global configuration', async () => {
    const sanitized = '<strong>bold</strong>';
    const { query } = await mount(
      () => html`
        <div>${unsafeHtml(sanitized)}</div>
      `,
    );

    expect(query('strong')?.textContent).toBe('bold');
  });

  it('updates a reactive source', async () => {
    const content = signal('<b>one</b>');
    const { flush, query } = await mount(
      () => html`
        <div>${unsafeHtml(content)}</div>
      `,
    );

    expect(query('b')?.textContent).toBe('one');

    content.value = '<i>two</i>';
    await flush();

    expect(query('i')?.textContent).toBe('two');
    expect(query('b')).toBeNull();
  });

  it('accepts a reactive getter and stops on disposal', async () => {
    const content = signal('<b>initial</b>');
    const { dispose, flush, query } = await mount(
      () => html`
        <div>${unsafeHtml(() => content.value)}</div>
      `,
    );

    expect(query('b')?.textContent).toBe('initial');

    dispose();
    content.value = '<i>after-dispose</i>';
    await flush();

    expect(query('i')).toBeNull();
  });
});

describe('Directive: styleMap()', () => {
  it('should render style declarations from mixed reactive values', async () => {
    const color = signal('rgb(255, 0, 0)');
    const width = signal(12);

    const { flush, query } = await mount(
      () => html`
        <div class="box" style=${styleMap({ color, display: 'block', width: () => `${width.value}px` })}></div>
      `,
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
      () => html`
        <div class="box" style=${styleMap({ color: 'red; display:none' })}></div>
      `,
    );

    const style = query<HTMLElement>('.box')?.getAttribute('style') ?? '';

    // Semicolons stripped — injection neutralised
    expect(style).not.toContain(';display:none');
    expect(style).toContain('color:red display:none');
  });

  it('should strip braces from values', async () => {
    const { query } = await mount(
      () => html`
        <div class="box" style=${styleMap({ color: 'red} body{display:none' })}></div>
      `,
    );

    const style = query<HTMLElement>('.box')?.getAttribute('style') ?? '';

    expect(style).not.toContain('}');
    expect(style).not.toContain('{');
  });

  it('should strip semicolons from property name keys to prevent declaration injection', async () => {
    const { query } = await mount(
      () => html`
        <div class="box" style=${styleMap({ 'color; background': 'red' })}></div>
      `,
    );

    const style = query<HTMLElement>('.box')?.getAttribute('style') ?? '';

    // Key has semicolons stripped — only valid CSS property remains
    expect(style).not.toContain('; background');
    expect(style).toContain('color background:red');
  });

  it('should drop entries with empty property names after sanitization', async () => {
    const { query } = await mount(
      () => html`
        <div class="box" style=${styleMap({ ';{}': 'red' })}></div>
      `,
    );

    const style = query<HTMLElement>('.box')?.getAttribute('style') ?? '';

    // All chars stripped from key → entry dropped entirely
    expect(style).toBe('');
  });
});

describe('Directive: classMap()', () => {
  it('should join truthy class names', async () => {
    const active = signal(true);
    const hidden = signal(false);
    const { flush, query } = await mount(
      () => html`
        <div class=${classMap({ active, hidden, static: true })}></div>
      `,
    );

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
    const { query } = await mount(
      () => html`
        <div class=${classMap({ 'foo bar': true })}></div>
      `,
    );

    const cls = query('div')?.getAttribute('class') ?? '';

    // Spaces stripped — no extra token injected
    expect(cls).toBe('foobar');
  });
});

describe('Directive: when()', () => {
  it('should switch branches reactively', async () => {
    const enabled = signal(true);
    const { flush, query } = await mount(
      () => html`
        <section>
          ${when(
            enabled,
            () => html`
              <p class="on">On</p>
            `,
            () => html`
              <p class="off">Off</p>
            `,
          )}
        </section>
      `,
    );

    expect(query('.on')?.textContent).toBe('On');

    enabled.value = false;
    await flush();

    expect(query('.off')?.textContent).toBe('Off');
    expect(query('.on')).toBeNull();
  });

  it('tears down and remounts cleanly across rapid, repeated toggles — no leftover nodes accumulate', async () => {
    const enabled = signal(true);
    let onMountCount = 0;
    let offMountCount = 0;

    const { flush, queryAll } = await mount(
      () => html`
        <section>
          ${when(
            enabled,
            () => {
              onMountCount++;

              return html`
                <p class="on">On</p>
              `;
            },
            () => {
              offMountCount++;

              return html`
                <p class="off">Off</p>
              `;
            },
          )}
        </section>
      `,
    );

    for (let i = 0; i < 5; i++) {
      enabled.value = !enabled.value;
      await flush();

      // Exactly one branch's node present at any point — never both, never zero.
      expect(queryAll('.on, .off')).toHaveLength(1);
    }

    // 1 initial mount + 5 toggles split across both branches, no duplicate mounts.
    expect(onMountCount + offMountCount).toBe(6);
  });

  it('should render reactive bindings inside branches', async () => {
    const title = signal('Hello');
    const { flush, query } = await mount(
      () => html`
        <div>
          ${when(
            false,
            () => html`
              <span class="on">${() => title.value}</span>
            `,
            () => html`
              <span class="off">${() => title.value}</span>
            `,
          )}
        </div>
      `,
    );

    expect(query('.off')?.textContent?.trim()).toBe('Hello');

    title.value = 'World';
    await flush();

    expect(query('.off')?.textContent?.trim()).toBe('World');
  });

  it('renders truthy branch immediately for a static true condition', async () => {
    const { query } = await mount(
      () => html`
        <div>
          ${when(
            true,
            () => html`
              <p class="yes">Yes</p>
            `,
            () => html`
              <p class="no">No</p>
            `,
          )}
        </div>
      `,
    );

    expect(query('.yes')?.textContent).toBe('Yes');
    expect(query('.no')).toBeNull();
  });

  it('renders falsy branch immediately for a static false condition', async () => {
    const { query } = await mount(
      () => html`
        <div>
          ${when(
            false,
            () => html`
              <p class="yes">Yes</p>
            `,
            () => html`
              <p class="no">No</p>
            `,
          )}
        </div>
      `,
    );

    expect(query('.no')?.textContent).toBe('No');
    expect(query('.yes')).toBeNull();
  });

  it('renders nothing for static false with no falsy branch', async () => {
    const { query } = await mount(
      () => html`
        <div>
          ${when(
            false,
            () => html`
              <p class="yes">Yes</p>
            `,
          )}
        </div>
      `,
    );

    expect(query('.yes')).toBeNull();
  });

  it('getter-fn: DOM stops reacting after component dispose (computed disposed)', async () => {
    const flag = signal(true);
    const { dispose, element, flush, query } = await mount(
      () => html`
        <div>
          ${when(
            () => flag.value,
            () => html`
              <p class="on">On</p>
            `,
            () => html`
              <p class="off">Off</p>
            `,
          )}
        </div>
      `,
    );

    expect(query('.on')).not.toBeNull();

    dispose();

    const root = element.shadowRoot ?? element;
    const snapshotAfterDestroy = root.innerHTML;

    flag.value = false;
    await flush();

    expect(root.innerHTML).toBe(snapshotAfterDestroy);
    expect(root.querySelector('.off')).toBeNull();
  });
});

describe('Directive: live()', () => {
  it('should not clobber user-typed input when app state is stale', async () => {
    const model = signal('server');
    const { query } = await mount(
      () => html`
        <input class="field" value=${live(model)} @input=${() => undefined} />
      `,
    );

    const input = query<HTMLInputElement>('.field');

    if (!input) throw new Error('Expected input to be rendered');

    input.value = 'user-typed';

    model.value = 'server';

    expect(input.value).toBe('user-typed');
  });

  it('should not clobber user-checked input when app state is stale', async () => {
    const model = signal(true);
    const { flush, query } = await mount(
      () => html`
        <input class="field" type="checkbox" ?checked=${live(model)} @change=${() => undefined} />
      `,
    );

    const input = query<HTMLInputElement>('.field');

    if (!input) throw new Error('Expected input to be rendered');

    input.checked = false;

    model.value = true;
    await flush();

    expect(input.checked).toBe(false);
  });

  it('is per-binding: other bindings of the same signal are unaffected', async () => {
    const model = signal('server');
    const { query } = await mount(
      () => html`
        <input class="live-field" value=${live(model)} />
        <input class="plain-field" value=${model} />
      `,
    );

    const liveInput = query<HTMLInputElement>('.live-field');
    const plainInput = query<HTMLInputElement>('.plain-field');

    if (!liveInput || !plainInput) throw new Error('Expected inputs to be rendered');

    // User diverges the live input's DOM value from the binding's last write.
    liveInput.value = 'user-typed';

    model.value = 'new-server';

    // The live binding skips the stale write; the plain binding of the same
    // signal still receives it (live() marks the binding site, not the signal).
    expect(liveInput.value).toBe('user-typed');
    expect(plainInput.value).toBe('new-server');
  });
});

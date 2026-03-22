/**
 * Directives Tests
 * Tests for all craftit directives: when, each, classes, bind,
 * style, choose, match, raw, spread, on, memo, until
 */

import { attr, bind, choose, classes, each, match, memo, on, raw, spread, style, until, when } from '../directives';
import { computed, defineComponent, html, signal } from '../index';
import { mount } from '../test';

const register = (
  tag: string,
  setup: Parameters<typeof defineComponent>[0]['setup'],
  options: Omit<Parameters<typeof defineComponent>[0], 'setup' | 'tag'> = {},
) => defineComponent({ setup, tag, ...options });

describe('Directive: when()', () => {
  it('should render when condition is true', async () => {
    const { query } = await mount(() => {
      const visible = signal(true);

      return html`${when(visible.value, () => html`<div>Visible</div>`)}`;
    });

    expect(query('div')?.textContent).toBe('Visible');
  });

  it('should not render when condition is false', async () => {
    const { query } = await mount(() => {
      const visible = signal(false);

      return html`${when(visible.value, () => html`<div class="content">Hidden</div>`)}`;
    });

    expect(query('.content')).toBeNull();
  });

  it('should support else branch', async () => {
    const { query } = await mount(() => {
      const visible = signal(false);

      return html`${when(
        visible.value,
        () => html`<div>Yes</div>`,
        () => html`<div>No</div>`,
      )}`;
    });

    expect(query('div')?.textContent).toBe('No');
  });

  it('should accept a Signal as condition', async () => {
    const { query } = await mount(() => {
      const loggedIn = signal(true);

      return html`
        <div>
          ${when(
            loggedIn,
            () => html`<span>Welcome!</span>`,
            () => html`<span>Please login</span>`,
          )}
        </div>
      `;
    });

    expect(query('span')?.textContent).toBe('Welcome!');
  });

  it('should support reactive getter conditions', async () => {
    const count = signal(0);

    const { flush, query } = await mount(() => {
      return html`
        <div>
          ${when(
            () => count.value > 5,
            () => html`<span class="above">Above threshold</span>`,
            () => html`<span class="below">Below threshold</span>`,
          )}
        </div>
      `;
    });

    expect(query('.below')).toBeTruthy();
    expect(query('.below')?.textContent).toBe('Below threshold');
    expect(query('.above')).toBeNull();

    count.value = 6;
    await flush();

    expect(query('.above')).toBeTruthy();
    expect(query('.above')?.textContent).toBe('Above threshold');
    expect(query('.below')).toBeNull();
  });
});

describe('Directive: each()', () => {
  it('should render list items', async () => {
    const { queryAll } = await mount(() => {
      const items = signal([1, 2, 3]);

      return html`
        <ul>
          ${each(items, (item) => html`<li>${item}</li>`)}
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
            (item) => html`<li>${item}</li>`,
            () => html`<div class="empty">Empty</div>`,
            { key: (_, i) => i },
          )}
        </div>
      `;
    });

    expect(query('.empty')?.textContent).toBe('Empty');
  });

  it('should update when list changes', async () => {
    const { flush, queryAll } = await mount(() => {
      const items = signal([1, 2]);

      setTimeout(() => (items.value = [1, 2, 3]), 50);

      return html`
        <ul>
          ${each(items, (item) => html`<li>${item}</li>`)}
        </ul>
      `;
    });

    expect(queryAll('li').length).toBe(2);

    await new Promise((r) => setTimeout(r, 60));
    await flush();
    expect(queryAll('li').length).toBe(3);
  });

  it('should support key function', async () => {
    const { queryAll } = await mount(() => {
      const items = signal([1, 2, 3]);

      return html`
        <ul>
          ${each(items, (item) => html`<li>${item}</li>`, undefined, { key: (item) => item })}
        </ul>
      `;
    });

    expect(queryAll('li').length).toBe(3);
  });

  it('should support simple each() without key', async () => {
    const { queryAll } = await mount(() => {
      const items = signal([1, 2, 3]);

      return html`
        <ul>
          ${each(items, (item) => html`<li>${item}</li>`)}
        </ul>
      `;
    });
    const listItems = queryAll('li');

    expect(listItems.length).toBe(3);
    expect(listItems[0].textContent).toBe('1');
    expect(listItems[2].textContent).toBe('3');
  });

  it('should support each() with key function and empty fallback', async () => {
    const { query } = await mount(() => {
      const items = signal<{ id: number; name: string }[]>([]);

      return html`
        <div>
          ${each(
            items,
            (item) => html`<div class="item">${item.name}</div>`,
            () => html`<div class="empty">No items</div>`,
            { key: (item) => item.id },
          )}
        </div>
      `;
    });

    expect(query('.empty')?.textContent).toBe('No items');
  });

  it('should filter items using select option', async () => {
    const { queryAll } = await mount(() => {
      const items = signal([
        { active: true, id: 1, name: 'Alice' },
        { active: false, id: 2, name: 'Bob' },
        { active: true, id: 3, name: 'Carol' },
      ]);

      return html`
        <ul>
          ${each(items, (item) => html`<li class="item">${item.name}</li>`, undefined, {
            key: (item) => item.id,
            select: (item) => item.active,
          })}
        </ul>
      `;
    });
    const listItems = queryAll('.item');

    expect(listItems.length).toBe(2);
    expect(listItems[0].textContent).toBe('Alice');
    expect(listItems[1].textContent).toBe('Carol');
  });

  it('should show empty when all items filtered out by select', async () => {
    const { query } = await mount(() => {
      const items = signal([{ active: false, id: 1 }]);

      return html`
        <div>
          ${each(
            items,
            (item) => html`<span>${item.id}</span>`,
            () => html`<p class="empty">None</p>`,
            { select: (item) => item.active },
          )}
        </div>
      `;
    });

    expect(query('.empty')?.textContent).toBe('None');
  });

  it('should preserve multiple bindings on the same keyed child element', async () => {
    const clicks: string[] = [];

    const { queryAll } = await mount(() => {
      const items = signal([
        { id: 'a', label: 'Alpha' },
        { id: 'b', label: 'Beta' },
      ]);

      return html`
        <div>
          ${each(
            items,
            (item) => html`
              <button data-value=${item.id} title=${item.label} @click=${() => clicks.push(item.id)}>
                ${item.label}
              </button>
            `,
            undefined,
            { key: (item) => item.id },
          )}
        </div>
      `;
    });

    const buttons = queryAll<HTMLButtonElement>('button');

    expect(buttons).toHaveLength(2);
    expect(buttons[0].getAttribute('data-value')).toBe('a');
    expect(buttons[0].getAttribute('title')).toBe('Alpha');

    (buttons[0] as HTMLButtonElement).click();

    expect(clicks).toEqual(['a']);
  });
});

describe('Directive: classes()', () => {
  it('should return a plain string for static boolean values', () => {
    const result = classes({ bar: false, baz: true, foo: true });

    expect(result).toBe('baz foo');
    expect(typeof result).toBe('string');
  });

  it('should return an empty string when all values are false', () => {
    expect(classes({ bar: false, foo: false })).toBe('');
  });

  it('should return a ReadonlySignal when a Signal is provided', () => {
    const active = signal(true);
    const result = classes({ active, disabled: false });

    expect(typeof result).toBe('object');
    expect((result as { value: string }).value).toBe('active');
  });

  it('should update reactively when a Signal changes', () => {
    const active = signal(true);
    const result = classes({ active, base: true }) as { value: string };

    expect(result.value).toBe('active base');
    active.value = false;
    expect(result.value).toBe('base');
  });

  it('should return a ReadonlySignal when a getter function is provided', () => {
    const count = signal(0);
    const result = classes({ positive: () => count.value > 0 }) as { value: string };

    expect(result.value).toBe('');
    count.value = 5;
    expect(result.value).toBe('positive');
  });

  it('should handle mixed static, Signal, and getter values', () => {
    const a = signal(true);
    const b = signal(false);
    const result = classes({ a, always: true, b, derived: () => a.value && !b.value }) as { value: string };

    expect(result.value).toBe('a always derived');
    b.value = true;
    expect(result.value).toBe('a always b');
  });

  it('should treat null and undefined as false', () => {
    const result = classes({ bar: undefined, baz: true, foo: null as unknown as boolean });

    expect(result).toBe('baz');
  });
});

describe('Directive: bind()', () => {
  it('should set the initial value on the input from the signal', async () => {
    const { query } = await mount(() => {
      const name = signal('Alice');

      return html`<input ${bind(name)} />`;
    });

    expect((query('input') as HTMLInputElement)?.value).toBe('Alice');
  });

  it('should update input value when signal changes', async () => {
    const name = signal('Alice');

    const { flush, query } = await mount(() => html`<input ${bind(name)} />`);

    name.value = 'Bob';
    await flush();
    expect((query('input') as HTMLInputElement)?.value).toBe('Bob');
  });

  it('should update signal when input fires an input event', async () => {
    const name = signal('Alice');

    const { query } = await mount(() => html`<input ${bind(name)} />`);
    const input = query('input') as HTMLInputElement;

    input.value = 'Charlie';
    input.dispatchEvent(new Event('input'));
    expect(name.value).toBe('Charlie');
  });

  it('should bind checkbox checked state to a boolean signal', async () => {
    const checked = signal(true);

    const { flush, query } = await mount(() => html`<input type="checkbox" ${bind(checked)} />`);
    const input = query('input') as HTMLInputElement;

    expect(input.checked).toBe(true);

    checked.value = false;
    await flush();
    expect(input.checked).toBe(false);

    input.checked = true;
    input.dispatchEvent(new Event('change'));
    expect(checked.value).toBe(true);
  });

  it('should sync select values via change events', async () => {
    const value = signal('sm');

    const { query } = await mount(
      () => html`
        <select ${bind(value)}>
          <option value="sm">Small</option>
          <option value="lg">Large</option>
        </select>
      `,
    );
    const select = query('select') as HTMLSelectElement;

    expect(select.value).toBe('sm');

    select.value = 'lg';
    select.dispatchEvent(new Event('change'));
    expect(value.value).toBe('lg');
  });
});

describe('Directive: attr() property map', () => {
  it('should apply a property map in spread position', async () => {
    const value = signal('One');

    const { query } = await mount(() => html`<input ${attr({ disabled: () => false, value })} />`);
    const input = query('input') as HTMLInputElement;

    expect(input.value).toBe('One');
    expect(input.disabled).toBe(false);
  });

  it('should sync back to signal for value binding', async () => {
    const value = signal('One');

    const { query } = await mount(() => html`<input ${attr({ value })} />`);
    const input = query('input') as HTMLInputElement;

    input.value = 'Two';
    input.dispatchEvent(new Event('input'));
    expect(value.value).toBe('Two');
  });

  it('should sync back to signal for checked binding', async () => {
    const checked = signal(true);

    const { query } = await mount(() => html`<input type="checkbox" ${attr({ checked })} />`);
    const input = query('input') as HTMLInputElement;

    expect(input.checked).toBe(true);

    input.checked = false;
    input.dispatchEvent(new Event('change'));
    expect(checked.value).toBe(false);
  });

  it('should keep computed value maps one-way', async () => {
    const first = signal('Grace');
    const last = signal('Hopper');
    const fullName = computed(() => `${first.value} ${last.value}`);

    const { query } = await mount(() => html`<input ${attr({ value: fullName })} />`);
    const input = query('input') as HTMLInputElement;

    expect(input.value).toBe('Grace Hopper');

    input.value = 'Edited in DOM';
    input.dispatchEvent(new Event('input'));
    expect(fullName.value).toBe('Grace Hopper');
  });
});

describe('Directive: spread()', () => {
  it('should support mixed attribute, boolean attr, property, and event entries', async () => {
    const title = signal('Start');
    let clicks = 0;

    const { flush, query } = await mount(
      () => html`<button ${spread({ '?disabled': false, '.value': title, '@click': () => clicks++, title })}></button>`,
    );
    const button = query('button') as HTMLButtonElement;

    expect(button.value).toBe('Start');
    expect(button.getAttribute('title')).toBe('Start');
    expect(button.hasAttribute('disabled')).toBe(false);

    title.value = 'Next';
    await flush();
    expect(button.value).toBe('Next');
    expect(button.getAttribute('title')).toBe('Next');

    button.click();
    expect(clicks).toBe(1);
  });
});

describe('Directive: spread() text-field map', () => {
  it('should apply common text-field props and keep .value two-way', async () => {
    const value = signal('Alice');

    const { query } = await mount(
      () => html`<input ${spread({ '.name': 'user', '.required': true, '.value': value })} />`,
    );
    const input = query('input') as HTMLInputElement;

    expect(input.name).toBe('user');
    expect(input.required).toBe(true);
    expect(input.value).toBe('Alice');

    input.value = 'Bob';
    input.dispatchEvent(new Event('input'));
    expect(value.value).toBe('Bob');
  });

  it('should keep .checked two-way for checkbox property maps', async () => {
    const checked = signal(false);

    const { flush, query } = await mount(() => html`<input type="checkbox" ${spread({ '.checked': checked })} />`);
    const input = query('input') as HTMLInputElement;

    expect(input.checked).toBe(false);

    checked.value = true;
    await flush();
    expect(input.checked).toBe(true);

    input.checked = false;
    input.dispatchEvent(new Event('change'));
    expect(checked.value).toBe(false);
  });

  it('should sync select .value via change events', async () => {
    const value = signal('b');

    const { query } = await mount(
      () => html`
        <select ${spread({ '.value': value })}>
          <option value="a">A</option>
          <option value="b">B</option>
        </select>
      `,
    );
    const select = query('select') as HTMLSelectElement;

    expect(select.value).toBe('b');

    select.value = 'a';
    select.dispatchEvent(new Event('change'));
    expect(value.value).toBe('a');
  });

  it('should keep computed property sources one-way', async () => {
    const first = signal('Ada');
    const last = signal('Lovelace');
    const fullName = computed(() => `${first.value} ${last.value}`);

    const { query } = await mount(() => html`<input ${spread({ '.value': fullName })} />`);
    const input = query('input') as HTMLInputElement;

    expect(input.value).toBe('Ada Lovelace');

    input.value = 'Changed in DOM';
    input.dispatchEvent(new Event('input'));

    expect(fullName.value).toBe('Ada Lovelace');
  });
});

describe('Directive: style()', () => {
  it('should return a plain string for static values', () => {
    const result = style({ color: 'red', fontWeight: 'bold' });

    expect(typeof result).toBe('string');
    expect(result).toBe('color:red;font-weight:bold');
  });

  it('should auto-append px for numeric values (non-unitless)', () => {
    expect(style({ fontSize: 16 })).toBe('font-size:16px');
    expect(style({ margin: 4, padding: 8 })).toBe('margin:4px;padding:8px');
  });

  it('should NOT append px for unitless properties', () => {
    expect(style({ opacity: 0.5 })).toBe('opacity:0.5');
    expect(style({ zIndex: 10 })).toBe('z-index:10');
  });

  it('should convert camelCase to kebab-case', () => {
    expect(style({ backgroundColor: 'blue' })).toBe('background-color:blue');
    expect(style({ borderTopWidth: 2 })).toBe('border-top-width:2px');
  });

  it('should return a ReadonlySignal when a Signal value is provided', () => {
    const size = signal(16);
    const result = style({ fontSize: size }) as { value: string };

    expect(typeof result).toBe('object');
    expect(result.value).toBe('font-size:16px');
  });

  it('should update reactively when signal changes', () => {
    const size = signal(16);
    const result = style({ fontSize: size }) as { value: string };

    size.value = 24;
    expect(result.value).toBe('font-size:24px');
  });

  it('should support getter functions', () => {
    const active = signal(true);
    const result = style({ opacity: () => (active.value ? 1 : 0) }) as { value: string };

    expect(result.value).toBe('opacity:1');
    active.value = false;
    expect(result.value).toBe('opacity:0');
  });

  it('should skip null/undefined/empty values', () => {
    expect(
      style({ color: null as unknown as string, fontSize: undefined as unknown as number, fontWeight: 'bold' }),
    ).toBe('font-weight:bold');
  });
});

describe('Directive: choose()', () => {
  const cases = [
    ['home', () => html`<h1 class="home">Home</h1>`],
    ['about', () => html`<h1 class="about">About</h1>`],
    ['contact', () => html`<h1 class="contact">Contact</h1>`],
  ] as const;

  it('should render the matching static case', async () => {
    const { query } = await mount(() => html`<div>${choose('about', cases)}</div>`);

    expect(query('.about')?.textContent).toBe('About');
    expect(query('.home')).toBeNull();
  });

  it('should render the default when no case matches', async () => {
    const { query } = await mount(
      () => html`<div>${choose('other' as never, cases, () => html`<h1 class="err">Error</h1>`)}</div>`,
    );

    expect(query('.err')?.textContent).toBe('Error');
  });

  it('should render empty string when no case matches and no default is given', async () => {
    const { query } = await mount(() => html`<div>${choose('other' as never, cases)}</div>`);

    expect(query('div')?.innerHTML).toBe('');
  });

  it('should update reactively when a Signal changes', async () => {
    const section = signal<'home' | 'about' | 'contact'>('home');

    const { flush, query } = await mount(() => html`<div>${choose(section, cases)}</div>`);

    expect(query('.home')).not.toBeNull();
    expect(query('.about')).toBeNull();

    section.value = 'about';
    await flush();
    expect(query('.home')).toBeNull();
    expect(query('.about')).not.toBeNull();

    section.value = 'contact';
    await flush();
    expect(query('.about')).toBeNull();
    expect(query('.contact')).not.toBeNull();
  });

  it('should update reactively when a getter function is used', async () => {
    const section = signal<'home' | 'about'>('home');

    const { flush, query } = await mount(() => html`<div>${choose(() => section.value, cases as never)}</div>`);

    expect(query('.home')).not.toBeNull();

    section.value = 'about';
    await flush();
    expect(query('.home')).toBeNull();
    expect(query('.about')).not.toBeNull();
  });
});

describe('Directive: raw()', () => {
  it('should render a static HTML string without escaping', async () => {
    const { query } = await mount(() => html`<div>${raw('<strong>bold</strong>')}</div>`);

    expect(query('strong')?.textContent).toBe('bold');
  });

  it('should NOT escape angle brackets (unlike plain string interpolation)', async () => {
    const { query } = await mount(() => html`<div>${raw('<em>hi</em>')}</div>`);

    expect(query('em')).not.toBeNull();
  });

  it('should update reactively when a Signal changes', async () => {
    const content = signal('<b>one</b>');

    const { flush, query } = await mount(() => html`<div>${raw(content)}</div>`);

    expect(query('b')?.textContent).toBe('one');

    content.value = '<i>two</i>';
    await flush();
    expect(query('i')?.textContent).toBe('two');
    expect(query('b')).toBeNull();
  });

  it('should update reactively when a getter function is used', async () => {
    const flag = signal(true);

    const { flush, query } = await mount(
      () => html`<div>${raw(() => (flag.value ? '<span class="a">A</span>' : '<span class="b">B</span>'))}</div>`,
    );

    expect(query('.a')).not.toBeNull();

    flag.value = false;
    await flush();
    expect(query('.a')).toBeNull();
    expect(query('.b')).not.toBeNull();
  });

  it('should render an empty string as empty content', async () => {
    const { query } = await mount(() => html`<div>${raw('')}</div>`);

    expect(query('div')?.innerHTML).toBe('');
  });
});

describe('Directive: spread() attribute entries', () => {
  it('should set static attribute values', async () => {
    const { query } = await mount(() => html`<input ${spread({ maxlength: 100, placeholder: 'Search' })} />`);
    const input = query('input')!;

    expect(input.getAttribute('placeholder')).toBe('Search');
    expect(input.getAttribute('maxlength')).toBe('100');
  });

  it('should set boolean true as empty-string attribute', async () => {
    const { query } = await mount(() => html`<input ${spread({ required: true })} />`);

    expect(query('input')?.hasAttribute('required')).toBe(true);
    expect(query('input')?.getAttribute('required')).toBe('');
  });

  it('should remove attribute when value is false/null/undefined', async () => {
    const { query } = await mount(
      () => html`<input ${spread({ disabled: null, readonly: undefined, required: false })} />`,
    );
    const input = query('input')!;

    expect(input.hasAttribute('required')).toBe(false);
    expect(input.hasAttribute('disabled')).toBe(false);
    expect(input.hasAttribute('readonly')).toBe(false);
  });

  it('should update reactively when a Signal changes', async () => {
    const label = signal('First');

    const { flush, query } = await mount(() => html`<input ${spread({ placeholder: label })} />`);

    expect(query('input')?.getAttribute('placeholder')).toBe('First');

    label.value = 'Second';
    await flush();
    expect(query('input')?.getAttribute('placeholder')).toBe('Second');
  });

  it('should update reactively from a getter function', async () => {
    const count = signal(0);

    const { flush, query } = await mount(
      () => html`<button ${spread({ 'aria-label': () => `count: ${count.value}` })}></button>`,
    );

    expect(query('button')?.getAttribute('aria-label')).toBe('count: 0');

    count.value = 5;
    await flush();
    expect(query('button')?.getAttribute('aria-label')).toBe('count: 5');
  });

  it('should remove attribute reactively when signal becomes false', async () => {
    const required = signal(true);

    const { flush, query } = await mount(() => html`<input ${spread({ required })} />`);

    expect(query('input')?.hasAttribute('required')).toBe(true);

    required.value = false;
    await flush();
    expect(query('input')?.hasAttribute('required')).toBe(false);
  });
});

describe('Directive: on()', () => {
  it('should attach an event listener to the element', async () => {
    let clicked = 0;

    const { query } = await mount(() => html`<button ${on('click', () => clicked++)}>Click</button>`);

    query('button')!.dispatchEvent(new Event('click'));
    expect(clicked).toBe(1);
  });

  it('should remove the listener when component unmounts', async () => {
    let fired = 0;

    const { destroy, query } = await mount(() => {
      return html`<button ${on('click', () => fired++)}>Click</button>`;
    });

    query('button')!.dispatchEvent(new Event('click'));
    expect(fired).toBe(1);

    destroy();
    query('button')?.dispatchEvent(new Event('click'));
    expect(fired).toBe(1);
  });

  it('should fire clickOutside when a click occurs outside the element', async () => {
    let outsideCount = 0;

    const { element } = await mount(() => html`<div class="inner" ${on('clickOutside', () => outsideCount++)}></div>`);

    // Click inside — should NOT fire
    element.shadowRoot!.querySelector('.inner')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(outsideCount).toBe(0);

    // Click outside
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(outsideCount).toBe(1);
  });

  it('should NOT fire clickOutside when a click is inside the element', async () => {
    let outsideCount = 0;

    const { element } = await mount(
      () =>
        html`<div ${on('clickOutside', () => outsideCount++)}>
          <button class="btn">Inside</button>
        </div>`,
    );

    element.shadowRoot!.querySelector('.btn')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(outsideCount).toBe(0);
  });
});

describe('Directive: match()', () => {
  it('should render the first truthy branch (static)', async () => {
    const { query } = await mount(
      () =>
        html`<div>
          ${match(
            [false, () => html`<span>A</span>`],
            [true, () => html`<span>B</span>`],
            [true, () => html`<span>C</span>`],
          )}
        </div>`,
    );

    expect(query('span')?.textContent).toBe('B');
  });

  it('should render fallback when no branch matches (static)', async () => {
    const { query } = await mount(
      () =>
        html`<div>
          ${match(
            [false, () => html`<span>A</span>`],
            [false, () => html`<span>B</span>`],
            () => html`<span class="fallback">Fallback</span>`,
          )}
        </div>`,
    );

    expect(query('.fallback')?.textContent).toBe('Fallback');
  });

  it('should render empty when no branch matches and no fallback', async () => {
    const { query } = await mount(() => html`<div>${match([false, () => html`<span>A</span>`])}</div>`);

    expect(query('span')).toBeNull();
  });

  it('should react to Signal conditions', async () => {
    const isAdmin = signal(false);
    const isMod = signal(false);

    const { flush, query } = await mount(
      () =>
        html`<div>
          ${match(
            [isAdmin, () => html`<span class="admin">Admin</span>`],
            [isMod, () => html`<span class="mod">Mod</span>`],
            () => html`<span class="user">User</span>`,
          )}
        </div>`,
    );

    expect(query('.user')).not.toBeNull();

    isMod.value = true;
    await flush();
    expect(query('.mod')).not.toBeNull();
    expect(query('.user')).toBeNull();

    isAdmin.value = true;
    await flush();
    expect(query('.admin')).not.toBeNull();
    expect(query('.mod')).toBeNull();
  });

  it('should react to getter conditions', async () => {
    const score = signal(0);

    const { flush, query } = await mount(
      () =>
        html`<div>
          ${match(
            [() => score.value >= 90, () => html`<span class="a">A</span>`],
            [() => score.value >= 70, () => html`<span class="b">B</span>`],
            [() => score.value >= 50, () => html`<span class="c">C</span>`],
            () => html`<span class="f">F</span>`,
          )}
        </div>`,
    );

    expect(query('.f')).not.toBeNull();

    score.value = 55;
    await flush();
    expect(query('.c')).not.toBeNull();
    expect(query('.f')).toBeNull();

    score.value = 75;
    await flush();
    expect(query('.b')).not.toBeNull();
    expect(query('.c')).toBeNull();

    score.value = 95;
    await flush();
    expect(query('.a')).not.toBeNull();
    expect(query('.b')).toBeNull();
  });

  it('should evaluate branches in order and stop at first match', async () => {
    const renderCounts = [0, 0, 0];

    const { query } = await mount(
      () =>
        html`<div>
          ${match(
            [
              true,
              () => {
                renderCounts[0]++;

                return html`<span>First</span>`;
              },
            ],
            [
              true,
              () => {
                renderCounts[1]++;

                return html`<span>Second</span>`;
              },
            ],
            [
              true,
              () => {
                renderCounts[2]++;

                return html`<span>Third</span>`;
              },
            ],
          )}
        </div>`,
    );

    expect(query('span')?.textContent).toBe('First');
    expect(renderCounts).toEqual([1, 0, 0]);
  });
});

describe('Directive: memo()', () => {
  it('should render the template initially', async () => {
    const data = signal('hello');

    const { query } = await mount(() => html`<div>${memo([data], () => html`<span>${data}</span>`)}</div>`);

    expect(query('span')?.textContent).toBe('hello');
  });

  it('should re-render when a dep signal changes', async () => {
    const count = signal(0);
    let renderCount = 0;

    const { flush, query } = await mount(
      () =>
        html`<div>
          ${memo([count], () => {
            renderCount++;

            return html`<span>${count}</span>`;
          })}
        </div>`,
    );

    expect(query('span')?.textContent).toBe('0');
    expect(renderCount).toBe(1);

    count.value = 1;
    await flush();
    expect(query('span')?.textContent).toBe('1');
    expect(renderCount).toBe(2);
  });

  it('should NOT re-render templateFn when unrelated state changes', async () => {
    const guarded = signal('initial');
    const unrelated = signal(0);
    let renderCount = 0;

    const { flush } = await mount(
      () =>
        html`<div>
          ${memo([guarded], () => {
            renderCount++;

            return html`<span class="g">${guarded}</span>`;
          })}
          <b>${unrelated}</b>
        </div>`,
    );

    expect(renderCount).toBe(1);

    unrelated.value = 99;
    await flush();
    // unrelated changed but memo dep did not — templateFn must NOT re-run
    expect(renderCount).toBe(1);

    guarded.value = 'changed';
    await flush();
    expect(renderCount).toBe(2);
  });
});

describe('Directive: until()', () => {
  it('should show pendingFn while promise is pending', async () => {
    const pending = new Promise<string>(() => {});

    const { query } = await mount(
      () => html`<div>${until(pending, () => html`<span class="loading">Loading</span>`)}</div>`,
    );

    expect(query('.loading')).not.toBeNull();
  });

  it('should render resolved content after promise resolves', async () => {
    let resolve!: (v: string) => void;
    const promise = new Promise<string>((r) => (resolve = r));

    const { flush, query } = await mount(
      () =>
        html`<div>
          ${until(
            promise.then((v) => html`<span class="done">${v}</span>`),
            () => html`<span class="loading">…</span>`,
          )}
        </div>`,
    );

    expect(query('.loading')).not.toBeNull();

    resolve('Done!');
    await promise;
    await flush();

    expect(query('.done')?.textContent).toBe('Done!');
    expect(query('.loading')).toBeNull();
  });

  it('should render empty string when no pendingFn and promise is pending', async () => {
    const pending = new Promise<string>(() => {});

    const { query } = await mount(() => html`<div>${until(pending)}</div>`);

    expect(query('div')?.textContent).toBe('');
  });

  it('should render onError content when promise rejects', async () => {
    let reject!: (err: unknown) => void;
    const promise = new Promise<string>((_, r) => (reject = r));

    const { flush, query } = await mount(
      () =>
        html`<div>
          ${until(
            promise.then((v) => html`<span class="done">${v}</span>`),
            () => html`<span class="loading">…</span>`,
            (err) => html`<span class="error">${String(err)}</span>`,
          )}
        </div>`,
    );

    expect(query('.loading')).not.toBeNull();

    reject('oops');
    await promise.catch(() => {});
    await flush();

    expect(query('.error')?.textContent).toBe('oops');
    expect(query('.loading')).toBeNull();
  });
});

describe('Keyed Reconciliation', () => {
  describe('DOM Node Lifecycle', () => {
    it('should not duplicate nodes when adding items', async () => {
      const items = signal([{ id: 1, value: 100 }]);
      const addItem = () => {
        items.value = [...items.value, { id: items.value.length + 1, value: 90 }];
      };

      register(
        'test-no-duplication',
        () => html`
          <div class="container">
            ${each(items, (item) => html`<div class="item">${item.value}</div>`, undefined, {
              key: (item) => item.id,
            })}
          </div>
          <button class="add-btn">Add</button>
        `,
      );

      const { flush, query, queryAll } = await mount('test-no-duplication');

      query('.add-btn')!.addEventListener('click', addItem);

      expect(queryAll('.item').length).toBe(1);

      query('.add-btn')!.dispatchEvent(new Event('click'));
      await flush();
      expect(queryAll('.item').length).toBe(2);

      query('.add-btn')!.dispatchEvent(new Event('click'));
      await flush();
      expect(queryAll('.item').length).toBe(3);
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
            ${each(items, (item) => html`<div class="item" data-id="${item.id}">${item.value}</div>`, undefined, {
              key: (item) => item.id,
            })}
          </div>
        `,
      );

      const { flush, queryAll } = await mount('test-reuse-nodes');

      const initialNodes = queryAll('.item');

      expect(initialNodes[0].getAttribute('data-id')).toBe('1');
      expect(initialNodes[1].getAttribute('data-id')).toBe('2');

      // Update values but keep keys
      items.value = [
        { id: 1, value: 'A-Updated' },
        { id: 2, value: 'B-Updated' },
      ];
      await flush();

      const updatedNodes = queryAll('.item');

      expect(updatedNodes.length).toBe(2);
      expect(updatedNodes[0].getAttribute('data-id')).toBe('1');
      expect(updatedNodes[1].getAttribute('data-id')).toBe('2');
      expect(updatedNodes[0].textContent).toBe('A-Updated');
    });

    it('should remove nodes correctly', async () => {
      const items = signal([
        { id: 1, value: 'A' },
        { id: 2, value: 'B' },
        { id: 3, value: 'C' },
      ]);

      register(
        'test-remove-nodes',
        () => html`
          <div>
            ${each(items, (item) => html`<div class="item" data-id="${item.id}">${item.value}</div>`, undefined, {
              key: (item) => item.id,
            })}
          </div>
        `,
      );

      const { flush, queryAll } = await mount('test-remove-nodes');

      expect(queryAll('.item').length).toBe(3);

      items.value = items.value.filter((item) => item.id !== 2);
      await flush();

      const remaining = queryAll('.item');

      expect(remaining.length).toBe(2);
      expect(remaining[0].getAttribute('data-id')).toBe('1');
      expect(remaining[1].getAttribute('data-id')).toBe('3');
    });
  });

  describe('Item Ordering', () => {
    it('should handle reordering correctly', async () => {
      const items = signal([
        { id: 1, text: 'First' },
        { id: 2, text: 'Second' },
        { id: 3, text: 'Third' },
      ]);

      register(
        'test-reorder',
        () => html`
          <div>
            ${each(items, (item) => html`<div class="item" data-id="${item.id}">${item.text}</div>`, undefined, {
              key: (item) => item.id,
            })}
          </div>
        `,
      );

      const { flush, queryAll } = await mount('test-reorder');

      const initial = queryAll('.item');

      expect(initial[0].textContent).toBe('First');
      expect(initial[2].textContent).toBe('Third');

      // Reverse order
      items.value = [items.value[2], items.value[1], items.value[0]];
      await flush();

      const reordered = queryAll('.item');

      expect(reordered[0].textContent).toBe('Third');
      expect(reordered[2].textContent).toBe('First');
    });

    it('should prepend items without recreating existing ones', async () => {
      const items = signal([{ id: 1, text: 'Existing' }]);

      register(
        'test-prepend',
        () => html`
          <div>
            ${each(items, (item) => html`<div class="item" data-id="${item.id}">${item.text}</div>`, undefined, {
              key: (item) => item.id,
            })}
          </div>
        `,
      );

      const { flush, queryAll } = await mount('test-prepend');

      items.value = [{ id: 2, text: 'New' }, ...items.value];
      await flush();

      const updated = queryAll('.item');

      expect(updated.length).toBe(2);
      expect(updated[0].getAttribute('data-id')).toBe('2');
      expect(updated[1].getAttribute('data-id')).toBe('1');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty to populated list', async () => {
      const items = signal<Array<{ id: number; text: string }>>([]);

      register(
        'test-empty-to-populated',
        () => html`
          <div>
            ${each(items, (item) => html`<div class="item">${item.text}</div>`, undefined, {
              key: (item) => item.id,
            })}
          </div>
        `,
      );

      const { flush, queryAll } = await mount('test-empty-to-populated');

      expect(queryAll('.item').length).toBe(0);

      items.value = [
        { id: 1, text: 'A' },
        { id: 2, text: 'B' },
      ];
      await flush();
      expect(queryAll('.item').length).toBe(2);
    });

    it('should handle populated to empty list', async () => {
      const items = signal([
        { id: 1, text: 'A' },
        { id: 2, text: 'B' },
      ]);

      register(
        'test-populated-to-empty',
        () => html`
          <div>
            ${each(items, (item) => html`<div class="item">${item.text}</div>`, undefined, {
              key: (item) => item.id,
            })}
          </div>
        `,
      );

      const { flush, queryAll } = await mount('test-populated-to-empty');

      expect(queryAll('.item').length).toBe(2);

      items.value = [];
      await flush();
      expect(queryAll('.item').length).toBe(0);
    });

    it('should handle single item updates', async () => {
      const items = signal([{ id: 1, text: 'Only' }]);

      register(
        'test-single-item',
        () => html`
          <div>
            ${each(items, (item) => html`<div class="item">${item.text}</div>`, undefined, {
              key: (item) => item.id,
            })}
          </div>
        `,
      );

      const { flush, queryAll } = await mount('test-single-item');

      items.value = [{ id: 1, text: 'Updated' }];
      await flush();
      expect(queryAll('.item')[0].textContent).toBe('Updated');
    });
  });

  describe('Fallback Content', () => {
    it('should show fallback when empty', async () => {
      const items = signal<number[]>([]);

      register(
        'test-fallback-empty',
        () => html`
          <div>
            ${each(
              items,
              (item) => html`<div class="item">${item}</div>`,
              () => html`<div class="empty">No items</div>`,
              { key: (i) => i },
            )}
          </div>
        `,
      );

      const { query, queryAll } = await mount('test-fallback-empty');

      expect(queryAll('.item').length).toBe(0);
      expect(query('.empty')).not.toBeNull();
    });

    it('should hide fallback when items exist', async () => {
      const items = signal([1, 2]);

      register(
        'test-fallback-hidden',
        () => html`
          <div>
            ${each(
              items,
              (item) => html`<div class="item">${item}</div>`,
              () => html`<div class="empty">No items</div>`,
              { key: (i) => i },
            )}
          </div>
        `,
      );

      const { query, queryAll } = await mount('test-fallback-hidden');

      expect(queryAll('.item').length).toBe(2);
      expect(query('.empty')).toBeNull();
    });

    it('should toggle fallback correctly', async () => {
      const items = signal([1]);

      register(
        'test-fallback-toggle',
        () => html`
          <div>
            ${each(
              items,
              (item) => html`<div class="item">${item}</div>`,
              () => html`<div class="empty">No items</div>`,
              { key: (i) => i },
            )}
          </div>
        `,
      );

      const { flush, query } = await mount('test-fallback-toggle');

      expect(query('.empty')).toBeNull();

      items.value = [];
      await flush();
      expect(query('.empty')).not.toBeNull();

      items.value = [2];
      await flush();
      expect(query('.empty')).toBeNull();
    });
  });
});

describe('List Filtering', () => {
  it('should filter list based on signal', async () => {
    const allItems = signal([
      { done: false, id: 1, text: 'Task 1' },
      { done: true, id: 2, text: 'Task 2' },
      { done: false, id: 3, text: 'Task 3' },
    ]);
    const filter = signal<'all' | 'active' | 'completed'>('all');

    const filtered = computed(() => {
      if (filter.value === 'all') return allItems.value;

      if (filter.value === 'active') return allItems.value.filter((t) => !t.done);

      return allItems.value.filter((t) => t.done);
    });

    register(
      'test-filter',
      () => html`
        <div>
          <button class="all" @click=${() => (filter.value = 'all')}>All</button>
          <button class="active" @click=${() => (filter.value = 'active')}>Active</button>
          <button class="completed" @click=${() => (filter.value = 'completed')}>Completed</button>
          ${each(filtered, (item) => html`<div class="item">${item.text}</div>`, undefined, {
            key: (item) => item.id,
          })}
        </div>
      `,
    );

    const { flush, query, queryAll } = await mount('test-filter');

    expect(queryAll('.item').length).toBe(3);

    query('.active')!.dispatchEvent(new Event('click'));
    await flush();
    expect(queryAll('.item').length).toBe(2);

    query('.completed')!.dispatchEvent(new Event('click'));
    await flush();
    expect(queryAll('.item').length).toBe(1);

    query('.all')!.dispatchEvent(new Event('click'));
    await flush();
    expect(queryAll('.item').length).toBe(3);
  });

  it('should update filtered list when items change', async () => {
    const items = signal([
      { done: false, id: 1 },
      { done: false, id: 2 },
    ]);
    const filter = signal<'all' | 'active'>('active');
    const filtered = computed(() => (filter.value === 'all' ? items.value : items.value.filter((t) => !t.done)));

    register(
      'test-filter-update',
      () => html`
        <div>
          ${each(filtered, (item) => html`<div class="item">${item.id}</div>`, undefined, { key: (item) => item.id })}
        </div>
      `,
    );

    const { flush, queryAll } = await mount('test-filter-update');

    expect(queryAll('.item').length).toBe(2);

    // Mark one as done
    items.value = [
      { done: true, id: 1 },
      { done: false, id: 2 },
    ];
    await flush();
    expect(queryAll('.item').length).toBe(1);
  });
});

describe('State Management', () => {
  describe('Todo Toggle', () => {
    it('should toggle todo completed state', async () => {
      const todos = signal([{ completed: false, id: 1, text: 'Task' }]);

      const toggle = (id: number) => {
        todos.value = todos.value.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t));
      };

      register(
        'test-toggle',
        () => html`
          <div>
            ${each(
              todos,
              (t) => html`
                <input type="checkbox" ?checked=${() => t.completed} @change=${() => toggle(t.id)} />
                <span class=${() => (t.completed ? 'done' : '')}>${t.text}</span>
                <span class="status">${t.completed ? 'done' : 'todo'}</span>
              `,
              undefined,
              { key: (t) => t.id },
            )}
          </div>
        `,
      );

      const { flush, query } = await mount('test-toggle');

      const span = query('span')!;
      const status = query('.status')!;

      expect(span.classList.contains('done')).toBe(false);
      expect(status.textContent).toBe('todo');

      todos.value = todos.value.map((t) => (t.id === 1 ? { ...t, completed: true } : t));
      await flush();

      expect(todos.value[0]?.completed).toBe(true);
    });

    it('should handle multiple toggles', async () => {
      const todos = signal([
        { completed: false, id: 1 },
        { completed: true, id: 2 },
      ]);

      const toggle = (id: number) => {
        todos.value = todos.value.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t));
      };

      register(
        'test-multi-toggle',
        () => html`
          <div>
            ${each(
              todos,
              (t) => html`
                <input type="checkbox" ?checked=${() => t.completed} @change=${() => toggle(t.id)} />
                <span class="status">${t.completed ? 'done' : 'todo'}</span>
              `,
              undefined,
              { key: (t) => t.id },
            )}
          </div>
        `,
      );

      const { flush, queryAll } = await mount('test-multi-toggle');

      const statuses = queryAll('.status');

      expect(statuses[0].textContent).toBe('todo');
      expect(statuses[1].textContent).toBe('done');

      todos.value = todos.value.map((t) => (t.id === 1 ? { ...t, completed: true } : t));
      await flush();

      todos.value = todos.value.map((t) => (t.id === 2 ? { ...t, completed: false } : t));
      await flush();

      expect(todos.value[0]?.completed).toBe(true);
      expect(todos.value[1]?.completed).toBe(false);
    });
  });
});

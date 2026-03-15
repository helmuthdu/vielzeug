/**
 * Directives Tests
 * Tests for all craftit directives: when, each, classes, bind,
 * style, choose, match, raw, attr, on, memo, until
 */

import { define, html, signal } from '..';
import { attr } from '../directives/attr';
import { bind } from '../directives/bind';
import { choose } from '../directives/choose';
import { classes } from '../directives/classes';
import { each } from '../directives/each';
import { match } from '../directives/match';
import { memo } from '../directives/memo';
import { on } from '../directives/on';
import { raw } from '../directives/raw';
import { style } from '../directives/style';
import { until } from '../directives/until';
import { when } from '../directives/when';
import { mount } from '../test';

describe('Directive: when()', () => {
  it('should render when condition is true', async () => {
    define('test-if-true', () => {
      const visible = signal(true);

      return html`${when(visible.value, () => html`<div>Visible</div>`)}`;
    });

    const { query } = await mount('test-if-true');

    expect(query('div')?.textContent).toBe('Visible');
  });

  it('should not render when condition is false', async () => {
    define('test-if-false', () => {
      const visible = signal(false);

      return html`${when(visible.value, () => html`<div class="content">Hidden</div>`)}`;
    });

    const { query } = await mount('test-if-false');

    expect(query('.content')).toBeNull();
  });

  it('should support else branch', async () => {
    define('test-if-else', () => {
      const visible = signal(false);

      return html`${when(
        visible.value,
        () => html`<div>Yes</div>`,
        () => html`<div>No</div>`,
      )}`;
    });

    const { query } = await mount('test-if-else');

    expect(query('div')?.textContent).toBe('No');
  });

  it('should accept a Signal as condition', async () => {
    define('test-if-signal', () => {
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

    const { query } = await mount('test-if-signal');

    expect(query('span')?.textContent).toBe('Welcome!');
  });

  it('should support reactive getter conditions', async () => {
    const count = signal(0);

    define('test-if-getter', () => {
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

    const { flush, query } = await mount('test-if-getter');

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
    define('test-for-basic', () => {
      const items = signal([1, 2, 3]);

      return html`
        <ul>
          ${each(items, (item) => html`<li>${item}</li>`)}
        </ul>
      `;
    });

    const { queryAll } = await mount('test-for-basic');
    const items = queryAll('li');

    expect(items.length).toBe(3);
    expect(items[0].textContent).toBe('1');
  });

  it('should render fallback for empty list', async () => {
    define('test-for-fallback', () => {
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

    const { query } = await mount('test-for-fallback');

    expect(query('.empty')?.textContent).toBe('Empty');
  });

  it('should update when list changes', async () => {
    define('test-for-reactive', () => {
      const items = signal([1, 2]);

      setTimeout(() => (items.value = [1, 2, 3]), 50);

      return html`
        <ul>
          ${each(items, (item) => html`<li>${item}</li>`)}
        </ul>
      `;
    });

    const { flush, queryAll } = await mount('test-for-reactive');

    expect(queryAll('li').length).toBe(2);

    await new Promise((r) => setTimeout(r, 60));
    await flush();
    expect(queryAll('li').length).toBe(3);
  });

  it('should support key function', async () => {
    define('test-for-keyed', () => {
      const items = signal([1, 2, 3]);

      return html`
        <ul>
          ${each(items, (item) => html`<li>${item}</li>`, undefined, { key: (item) => item })}
        </ul>
      `;
    });

    const { queryAll } = await mount('test-for-keyed');

    expect(queryAll('li').length).toBe(3);
  });

  it('should support simple each() without key', async () => {
    define('test-for-simple', () => {
      const items = signal([1, 2, 3]);

      return html`
        <ul>
          ${each(items, (item) => html`<li>${item}</li>`)}
        </ul>
      `;
    });

    const { queryAll } = await mount('test-for-simple');
    const listItems = queryAll('li');

    expect(listItems.length).toBe(3);
    expect(listItems[0].textContent).toBe('1');
    expect(listItems[2].textContent).toBe('3');
  });

  it('should support each() with key function and empty fallback', async () => {
    define('test-for-advanced', () => {
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

    const { query } = await mount('test-for-advanced');

    expect(query('.empty')?.textContent).toBe('No items');
  });

  it('should filter items using select option', async () => {
    define('test-for-select', () => {
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

    const { queryAll } = await mount('test-for-select');
    const listItems = queryAll('.item');

    expect(listItems.length).toBe(2);
    expect(listItems[0].textContent).toBe('Alice');
    expect(listItems[1].textContent).toBe('Carol');
  });

  it('should show empty when all items filtered out by select', async () => {
    define('test-for-select-empty', () => {
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

    const { query } = await mount('test-for-select-empty');

    expect(query('.empty')?.textContent).toBe('None');
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
    define('test-bind-initial', () => {
      const name = signal('Alice');

      return html`<input ${bind(name)} />`;
    });

    const { query } = await mount('test-bind-initial');

    expect((query('input') as HTMLInputElement)?.value).toBe('Alice');
  });

  it('should update input value when signal changes', async () => {
    const name = signal('Alice');

    define('test-bind-signal-update', () => {
      return html`<input ${bind(name)} />`;
    });

    const { flush, query } = await mount('test-bind-signal-update');

    name.value = 'Bob';
    await flush();
    expect((query('input') as HTMLInputElement)?.value).toBe('Bob');
  });

  it('should update signal when input fires an input event', async () => {
    const name = signal('Alice');

    define('test-bind-input-event', () => {
      return html`<input ${bind(name)} />`;
    });

    const { query } = await mount('test-bind-input-event');
    const input = query('input') as HTMLInputElement;

    input.value = 'Charlie';
    input.dispatchEvent(new Event('input'));
    expect(name.value).toBe('Charlie');
  });

  it('should bind checkbox checked state to a boolean signal', async () => {
    const checked = signal(true);

    define('test-bind-checkbox', () => {
      return html`<input type="checkbox" ${bind(checked)} />`;
    });

    const { flush, query } = await mount('test-bind-checkbox');
    const input = query('input') as HTMLInputElement;

    expect(input.checked).toBe(true);

    checked.value = false;
    await flush();
    expect(input.checked).toBe(false);

    input.checked = true;
    input.dispatchEvent(new Event('change'));
    expect(checked.value).toBe(true);
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
    define('test-choose-static', () => {
      return html`<div>${choose('about', cases)}</div>`;
    });

    const { query } = await mount('test-choose-static');

    expect(query('.about')?.textContent).toBe('About');
    expect(query('.home')).toBeNull();
  });

  it('should render the default when no case matches', async () => {
    define('test-choose-default', () => {
      return html`<div>${choose('other' as never, cases, () => html`<h1 class="err">Error</h1>`)}</div>`;
    });

    const { query } = await mount('test-choose-default');

    expect(query('.err')?.textContent).toBe('Error');
  });

  it('should render empty string when no case matches and no default is given', async () => {
    define('test-choose-empty', () => {
      return html`<div>${choose('other' as never, cases)}</div>`;
    });

    const { query } = await mount('test-choose-empty');

    expect(query('div')?.innerHTML).toBe('');
  });

  it('should update reactively when a Signal changes', async () => {
    const section = signal<'home' | 'about' | 'contact'>('home');

    define('test-choose-signal', () => {
      return html`<div>${choose(section, cases)}</div>`;
    });

    const { flush, query } = await mount('test-choose-signal');

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

    define('test-choose-getter', () => {
      return html`<div>${choose(() => section.value, cases as never)}</div>`;
    });

    const { flush, query } = await mount('test-choose-getter');

    expect(query('.home')).not.toBeNull();

    section.value = 'about';
    await flush();
    expect(query('.home')).toBeNull();
    expect(query('.about')).not.toBeNull();
  });
});

describe('Directive: raw()', () => {
  it('should render a static HTML string without escaping', async () => {
    define('test-raw-static', () => {
      return html`<div>${raw('<strong>bold</strong>')}</div>`;
    });

    const { query } = await mount('test-raw-static');

    expect(query('strong')?.textContent).toBe('bold');
  });

  it('should NOT escape angle brackets (unlike plain string interpolation)', async () => {
    define('test-raw-no-escape', () => {
      return html`<div>${raw('<em>hi</em>')}</div>`;
    });

    const { query } = await mount('test-raw-no-escape');

    expect(query('em')).not.toBeNull();
  });

  it('should update reactively when a Signal changes', async () => {
    const content = signal('<b>one</b>');

    define('test-raw-signal', () => {
      return html`<div>${raw(content)}</div>`;
    });

    const { flush, query } = await mount('test-raw-signal');

    expect(query('b')?.textContent).toBe('one');

    content.value = '<i>two</i>';
    await flush();
    expect(query('i')?.textContent).toBe('two');
    expect(query('b')).toBeNull();
  });

  it('should update reactively when a getter function is used', async () => {
    const flag = signal(true);

    define('test-raw-getter', () => {
      return html`<div>${raw(() => (flag.value ? '<span class="a">A</span>' : '<span class="b">B</span>'))}</div>`;
    });

    const { flush, query } = await mount('test-raw-getter');

    expect(query('.a')).not.toBeNull();

    flag.value = false;
    await flush();
    expect(query('.a')).toBeNull();
    expect(query('.b')).not.toBeNull();
  });

  it('should render an empty string as empty content', async () => {
    define('test-raw-empty', () => {
      return html`<div>${raw('')}</div>`;
    });

    const { query } = await mount('test-raw-empty');

    expect(query('div')?.innerHTML).toBe('');
  });
});

describe('Directive: attr()', () => {
  it('should set static attribute values', async () => {
    define('test-attr-static', () => {
      return html`<input ${attr({ maxlength: 100, placeholder: 'Search' })} />`;
    });

    const { query } = await mount('test-attr-static');
    const input = query('input')!;

    expect(input.getAttribute('placeholder')).toBe('Search');
    expect(input.getAttribute('maxlength')).toBe('100');
  });

  it('should set boolean true as empty-string attribute', async () => {
    define('test-attr-bool-true', () => {
      return html`<input ${attr({ required: true })} />`;
    });

    const { query } = await mount('test-attr-bool-true');

    expect(query('input')?.hasAttribute('required')).toBe(true);
    expect(query('input')?.getAttribute('required')).toBe('');
  });

  it('should remove attribute when value is false/null/undefined', async () => {
    define('test-attr-falsy', () => {
      return html`<input ${attr({ disabled: null, readonly: undefined, required: false })} />`;
    });

    const { query } = await mount('test-attr-falsy');
    const input = query('input')!;

    expect(input.hasAttribute('required')).toBe(false);
    expect(input.hasAttribute('disabled')).toBe(false);
    expect(input.hasAttribute('readonly')).toBe(false);
  });

  it('should update reactively when a Signal changes', async () => {
    const label = signal('First');

    define('test-attr-signal', () => {
      return html`<input ${attr({ placeholder: label })} />`;
    });

    const { flush, query } = await mount('test-attr-signal');

    expect(query('input')?.getAttribute('placeholder')).toBe('First');

    label.value = 'Second';
    await flush();
    expect(query('input')?.getAttribute('placeholder')).toBe('Second');
  });

  it('should update reactively from a getter function', async () => {
    const count = signal(0);

    define('test-attr-getter', () => {
      return html`<button ${attr({ 'aria-label': () => `count: ${count.value}` })}></button>`;
    });

    const { flush, query } = await mount('test-attr-getter');

    expect(query('button')?.getAttribute('aria-label')).toBe('count: 0');

    count.value = 5;
    await flush();
    expect(query('button')?.getAttribute('aria-label')).toBe('count: 5');
  });

  it('should remove attribute reactively when signal becomes false', async () => {
    const required = signal(true);

    define('test-attr-remove', () => {
      return html`<input ${attr({ required })} />`;
    });

    const { flush, query } = await mount('test-attr-remove');

    expect(query('input')?.hasAttribute('required')).toBe(true);

    required.value = false;
    await flush();
    expect(query('input')?.hasAttribute('required')).toBe(false);
  });
});

describe('Directive: on()', () => {
  it('should attach an event listener to the element', async () => {
    let clicked = 0;

    define('test-on-click', () => {
      return html`<button ${on('click', () => clicked++)}>Click</button>`;
    });

    const { query } = await mount('test-on-click');

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

    define('test-on-outside', () => {
      return html`<div class="inner" ${on('clickOutside', () => outsideCount++)}></div>`;
    });

    const { element } = await mount('test-on-outside');

    // Click inside — should NOT fire
    element.shadowRoot!.querySelector('.inner')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(outsideCount).toBe(0);

    // Click outside
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(outsideCount).toBe(1);
  });

  it('should NOT fire clickOutside when a click is inside the element', async () => {
    let outsideCount = 0;

    define('test-on-inside-click', () => {
      return html`<div ${on('clickOutside', () => outsideCount++)}>
        <button class="btn">Inside</button>
      </div>`;
    });

    const { element } = await mount('test-on-inside-click');

    element.shadowRoot!.querySelector('.btn')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(outsideCount).toBe(0);
  });
});

describe('Directive: match()', () => {
  it('should render the first truthy branch (static)', async () => {
    define('test-match-static', () => {
      return html`<div>
        ${match(
          [false, () => html`<span>A</span>`],
          [true, () => html`<span>B</span>`],
          [true, () => html`<span>C</span>`],
        )}
      </div>`;
    });

    const { query } = await mount('test-match-static');

    expect(query('span')?.textContent).toBe('B');
  });

  it('should render fallback when no branch matches (static)', async () => {
    define('test-match-static-fallback', () => {
      return html`<div>
        ${match(
          [false, () => html`<span>A</span>`],
          [false, () => html`<span>B</span>`],
          () => html`<span class="fallback">Fallback</span>`,
        )}
      </div>`;
    });

    const { query } = await mount('test-match-static-fallback');

    expect(query('.fallback')?.textContent).toBe('Fallback');
  });

  it('should render empty when no branch matches and no fallback', async () => {
    define('test-match-static-empty', () => {
      return html`<div>${match([false, () => html`<span>A</span>`])}</div>`;
    });

    const { query } = await mount('test-match-static-empty');

    expect(query('span')).toBeNull();
  });

  it('should react to Signal conditions', async () => {
    const isAdmin = signal(false);
    const isMod = signal(false);

    define('test-match-signal', () => {
      return html`<div>
        ${match(
          [isAdmin, () => html`<span class="admin">Admin</span>`],
          [isMod, () => html`<span class="mod">Mod</span>`],
          () => html`<span class="user">User</span>`,
        )}
      </div>`;
    });

    const { flush, query } = await mount('test-match-signal');

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

    define('test-match-getter', () => {
      return html`<div>
        ${match(
          [() => score.value >= 90, () => html`<span class="a">A</span>`],
          [() => score.value >= 70, () => html`<span class="b">B</span>`],
          [() => score.value >= 50, () => html`<span class="c">C</span>`],
          () => html`<span class="f">F</span>`,
        )}
      </div>`;
    });

    const { flush, query } = await mount('test-match-getter');

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

    define('test-match-order', () => {
      return html`<div>
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
      </div>`;
    });

    const { query } = await mount('test-match-order');

    expect(query('span')?.textContent).toBe('First');
    expect(renderCounts).toEqual([1, 0, 0]);
  });
});

describe('Directive: memo()', () => {
  it('should render the template initially', async () => {
    const data = signal('hello');

    define('test-memo-initial', () => {
      return html`<div>${memo([data], () => html`<span>${data}</span>`)}</div>`;
    });

    const { query } = await mount('test-memo-initial');

    expect(query('span')?.textContent).toBe('hello');
  });

  it('should re-render when a dep signal changes', async () => {
    const count = signal(0);
    let renderCount = 0;

    define('test-memo-re-render', () => {
      return html`<div>
        ${memo([count], () => {
          renderCount++;

          return html`<span>${count}</span>`;
        })}
      </div>`;
    });

    const { flush, query } = await mount('test-memo-re-render');

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

    define('test-memo-skip', () => {
      return html`<div>
        ${memo([guarded], () => {
          renderCount++;

          return html`<span class="g">${guarded}</span>`;
        })}
        <b>${unrelated}</b>
      </div>`;
    });

    const { flush } = await mount('test-memo-skip');

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

    define('test-until-pending', () => {
      return html`<div>${until(pending, () => html`<span class="loading">Loading</span>`)}</div>`;
    });

    const { query } = await mount('test-until-pending');

    expect(query('.loading')).not.toBeNull();
  });

  it('should render resolved content after promise resolves', async () => {
    let resolve!: (v: string) => void;
    const promise = new Promise<string>((r) => (resolve = r));

    define('test-until-resolved', () => {
      return html`<div>
        ${until(
          promise.then((v) => html`<span class="done">${v}</span>`),
          () => html`<span class="loading">…</span>`,
        )}
      </div>`;
    });

    const { flush, query } = await mount('test-until-resolved');

    expect(query('.loading')).not.toBeNull();

    resolve('Done!');
    await promise;
    await flush();

    expect(query('.done')?.textContent).toBe('Done!');
    expect(query('.loading')).toBeNull();
  });

  it('should render empty string when no pendingFn and promise is pending', async () => {
    const pending = new Promise<string>(() => {});

    define('test-until-no-fallback', () => {
      return html`<div>${until(pending)}</div>`;
    });

    const { query } = await mount('test-until-no-fallback');

    expect(query('div')?.textContent).toBe('');
  });

  it('should render onError content when promise rejects', async () => {
    let reject!: (err: unknown) => void;
    const promise = new Promise<string>((_, r) => (reject = r));

    define('test-until-error', () => {
      return html`<div>
        ${until(
          promise.then((v) => html`<span class="done">${v}</span>`),
          () => html`<span class="loading">…</span>`,
          (err) => html`<span class="error">${String(err)}</span>`,
        )}
      </div>`;
    });

    const { flush, query } = await mount('test-until-error');

    expect(query('.loading')).not.toBeNull();

    reject('oops');
    await promise.catch(() => {});
    await flush();

    expect(query('.error')?.textContent).toBe('oops');
    expect(query('.loading')).toBeNull();
  });
});

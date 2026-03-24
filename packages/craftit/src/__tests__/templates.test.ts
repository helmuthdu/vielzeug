/**
 * Template - HTML Engine Tests
 * Tests for the core HTML template system, attribute binding, event handling, and lifecycle
 */

import { computed, defineComponent, escapeHtml, html, signal } from '../index';
import { fire, mount } from '../test';

const register = (
  tag: string,
  setup: Parameters<typeof defineComponent>[0]['setup'],
  options: Omit<Parameters<typeof defineComponent>[0], 'setup' | 'tag'> = {},
) => defineComponent({ setup, tag, ...options });

describe('Template: HTML System', () => {
  describe('html Tagged Template', () => {
    it('should render static content', async () => {
      const { query } = await mount(() => html`<div>Hello World</div>`);

      expect(query('div')?.textContent).toBe('Hello World');
    });

    it('should interpolate values', async () => {
      const { query } = await mount(() => {
        const name = 'Alice';

        return html`<div>Hello ${name}</div>`;
      });

      expect(query('div')?.textContent).toBe('Hello Alice');
    });

    it('should support signal interpolation', async () => {
      const { query } = await mount(() => {
        const count = signal(0);

        return html`<div>${count}</div>`;
      });

      expect(query('div')?.textContent).toBe('0');
    });

    it('should support computed values', async () => {
      const { query } = await mount(() => {
        const count = signal(5);
        const doubled = computed(() => count.value * 2);

        return html`<div>${doubled}</div>`;
      });

      expect(query('div')?.textContent).toBe('10');
    });

    it('should escape HTML by default', async () => {
      const { query } = await mount(() => {
        const userInput = '<script>alert("xss")</script>';

        return html`<div>${userInput}</div>`;
      });

      expect(query('div')?.textContent).toBe('<script>alert("xss")</script>');
      expect(query('div')?.innerHTML).toBe('&lt;script&gt;alert("xss")&lt;/script&gt;');
    });

    it('should preserve HTMLResult objects without escaping', async () => {
      const { query } = await mount(() => {
        const inner = html`<span>Inner</span>`;

        return html`<div>${inner}</div>`;
      });

      expect(query('span')?.textContent).toBe('Inner');
    });

    it('should compile identical templates to stable marker output', () => {
      const first = html`<div>${signal(1)}</div>`;
      const second = html`<div>${signal(2)}</div>`;

      expect(first.__html).toBe(second.__html);
    });

    it('should normalize adjacent tag whitespace in compiled output', async () => {
      const { shadow } = await mount(
        () => html`
          <div>One</div>
          <div>Two</div>
        `,
      );

      expect(shadow.innerHTML).toContain('</div><div>');
    });

    it('should keep sibling nested HTMLResult bindings isolated', async () => {
      let left = 0;
      let right = 0;

      const { queryAll } = await mount(() => {
        const leftButton = html`<button @click=${() => left++}>Left</button>`;
        const rightButton = html`<button @click=${() => right++}>Right</button>`;

        return html`<div>${leftButton}${rightButton}</div>`;
      });

      const [leftButton, rightButton] = queryAll<HTMLButtonElement>('button');

      leftButton.click();
      rightButton.click();

      expect(left).toBe(1);
      expect(right).toBe(1);
    });

    it('should rekey getter-produced arrays of HTMLResult fragments', async () => {
      let alpha = 0;
      let beta = 0;
      const { queryAll } = await mount(
        () =>
          html`${() => [
            html`<button @click=${() => alpha++}>Alpha</button>`,
            html`<button @click=${() => beta++}>Beta</button>`,
          ]}`,
      );

      const [alphaButton, betaButton] = queryAll<HTMLButtonElement>('button');

      alphaButton.click();
      betaButton.click();

      expect(alpha).toBe(1);
      expect(beta).toBe(1);
    });
  });

  describe('Attributes', () => {
    it('should set string attributes', async () => {
      const { query } = await mount(() => {
        const id = 'my-id';

        return html`<div id=${id}>Test</div>`;
      });

      expect(query('div')?.getAttribute('id')).toBe('my-id');
    });

    it('should set boolean attributes', async () => {
      const { query } = await mount(() => {
        const disabled = signal(true);

        return html`<button disabled=${disabled}>Click</button>`;
      });

      expect(query('button')?.hasAttribute('disabled')).toBe(true);
    });

    it('should remove false boolean attributes', async () => {
      const { query } = await mount(() => {
        const disabled = signal(false);

        return html`<button disabled=${disabled}>Click</button>`;
      });

      expect(query('button')?.hasAttribute('disabled')).toBe(false);
    });

    it('should support reactive attributes', async () => {
      const { flush, query } = await mount(() => {
        const cls = signal('initial');

        setTimeout(() => (cls.value = 'updated'), 50);

        return html`<div class=${cls}>Test</div>`;
      });

      expect(query('div')?.className).toBe('initial');

      await new Promise((r) => setTimeout(r, 60));
      await flush();
      expect(query('div')?.className).toBe('updated');
    });
  });

  describe('Event Handlers', () => {
    it('should bind click events', async () => {
      let clicked = false;
      const { query } = await mount(() => html`<button @click=${() => (clicked = true)}>Click</button>`);

      fire.click(query('button')!);
      expect(clicked).toBe(true);
    });

    it('should support .stop modifier', async () => {
      const calls: string[] = [];
      const { query } = await mount(
        () =>
          html`<div @click=${() => calls.push('parent')}>
            <button @click.stop=${() => calls.push('child')}>Click</button>
          </div>`,
      );

      query('button')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      expect(calls).toEqual(['child']);
    });

    it('should support .prevent modifier', async () => {
      let prevented = false;
      const { query } = await mount(
        () => html`<a href="#" @click.prevent=${(event: Event) => (prevented = event.defaultPrevented)}>Link</a>`,
      );

      query('a')!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

      expect(prevented).toBe(true);
    });

    it('should support .self modifier', async () => {
      let hostClicks = 0;
      const { query } = await mount(
        () => html`<div class="host" @click.self=${() => hostClicks++}><span class="child">Child</span></div>`,
      );

      query('.child')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(hostClicks).toBe(0);

      query('.host')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(hostClicks).toBe(1);
    });

    it('should support .once modifier', async () => {
      let clicks = 0;
      const { query } = await mount(() => html`<button @click.once=${() => clicks++}>Click</button>`);
      const button = query('button')!;

      button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      expect(clicks).toBe(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null values', async () => {
      const { query } = await mount(() => {
        const value = null;

        return html`<div>${value}</div>`;
      });

      expect(query('div')?.textContent).toBe('');
    });

    it('should handle undefined values', async () => {
      const { query } = await mount(() => {
        const value = undefined;

        return html`<div>${value}</div>`;
      });

      expect(query('div')?.textContent).toBe('');
    });

    it('should handle nested templates', async () => {
      const { query } = await mount(() => {
        const inner = html`<span>Inner</span>`;

        return html`<div>${inner}</div>`;
      });

      expect(query('span')?.textContent).toBe('Inner');
    });
  });

  describe('Utility: escapeHtml()', () => {
    it('should escape & < > characters', () => {
      expect(escapeHtml('<b>Bold</b>')).toBe('&lt;b&gt;Bold&lt;/b&gt;');
    });

    it('should escape double quotes', () => {
      expect(escapeHtml('"quoted"')).toBe('&quot;quoted&quot;');
    });

    it('should escape single quotes', () => {
      expect(escapeHtml("it's")).toBe('it&#39;s');
    });

    it('should escape ampersands', () => {
      expect(escapeHtml('a & b')).toBe('a &amp; b');
    });

    it('should convert non-string values via String()', () => {
      expect(escapeHtml(42)).toBe('42');
      expect(escapeHtml(null)).toBe('null');
    });

    it('should return an empty string unchanged', () => {
      expect(escapeHtml('')).toBe('');
    });
  });
});

describe('Reflect: .property syntax', () => {
  describe('Text input .value binding', () => {
    it('should set initial value property from signal', async () => {
      const { query } = await mount(() => {
        const text = signal('hello');

        return html`<input type="text" .value=${text} />`;
      });

      const input = query<HTMLInputElement>('input');

      expect(input?.value).toBe('hello');
    });

    it('should update property when signal changes', async () => {
      const { query } = await mount(() => {
        const text = signal('hello');

        return html`
          <div>
            <button @click=${() => (text.value = 'world')}>Update</button>
            <input type="text" .value=${text} />
          </div>
        `;
      });

      const input = query('input') as HTMLInputElement;
      const button = query('button');

      expect(input.value).toBe('hello');

      fire.click(button!);
      await new Promise((r) => setTimeout(r, 10));

      expect(input.value).toBe('world');
    });

    it('should support computed values', async () => {
      const { query } = await mount(() => {
        const first = signal('hello');
        const last = signal('world');
        const fullName = computed(() => `${first.value} ${last.value}`);

        return html`<input type="text" .value=${fullName} />`;
      });

      const input = query('input') as HTMLInputElement;

      expect(input.value).toBe('hello world');
    });

    it('should support static values', async () => {
      const { query } = await mount(() => html`<input type="text" .value=${'static value'} />`);

      const input = query('input') as HTMLInputElement;

      expect(input.value).toBe('static value');
    });

    it('should update source signal when input emits an input event', async () => {
      const text = signal('hello');

      const { query } = await mount(() => html`<input type="text" .value=${text} />`);
      const input = query('input') as HTMLInputElement;

      input.value = 'changed';
      input.dispatchEvent(new Event('input'));

      expect(text.value).toBe('changed');
    });
  });

  describe('Checkbox .checked binding', () => {
    it('should set checkbox checked property from signal', async () => {
      const { query } = await mount(() => {
        const checked = signal(true);

        return html`<input type="checkbox" .checked=${checked} />`;
      });

      const checkbox = query('input') as HTMLInputElement;

      expect(checkbox.checked).toBe(true);
    });

    it('should update checked property when signal changes', async () => {
      const { query } = await mount(() => {
        const checked = signal(false);

        return html`
          <div>
            <button @click=${() => (checked.value = true)}>Check</button>
            <input type="checkbox" .checked=${checked} />
          </div>
        `;
      });

      const checkbox = query('input') as HTMLInputElement;
      const button = query('button');

      expect(checkbox.checked).toBe(false);

      fire.click(button!);
      await new Promise((r) => setTimeout(r, 10));

      expect(checkbox.checked).toBe(true);
    });

    it('should support computed values for checked', async () => {
      const { query } = await mount(() => {
        const value = signal(5);
        const isGreaterThanTen = computed(() => value.value > 10);

        return html`<input type="checkbox" .checked=${isGreaterThanTen} />`;
      });

      const checkbox = query('input') as HTMLInputElement;

      expect(checkbox.checked).toBe(false);
    });

    it('should update source signal when checked changes', async () => {
      const checked = signal(false);

      const { query } = await mount(() => html`<input type="checkbox" .checked=${checked} />`);
      const checkbox = query('input') as HTMLInputElement;

      checkbox.checked = true;
      checkbox.dispatchEvent(new Event('change'));

      expect(checked.value).toBe(true);
    });
  });

  describe('Custom element property binding', () => {
    it('should bind to custom element properties', async () => {
      defineComponent({ setup: () => html`<div></div>`, tag: 'custom-prop-element' });

      const { query } = await mount(() => {
        const data = signal({ name: 'test', value: 42 });

        return html`<custom-prop-element .data=${data} />`;
      });

      const customEl = query('custom-prop-element') as any;

      expect(customEl.data).toEqual({ name: 'test', value: 42 });
    });

    it('should update custom properties reactively', async () => {
      defineComponent({ setup: () => html`<div></div>`, tag: 'custom-prop-reactive' });

      const { query } = await mount(() => {
        const data = signal({ count: 1 });

        return html`
          <div>
            <button @click=${() => (data.value = { count: 2 })}>Update</button>
            <custom-prop-reactive .data=${data} />
          </div>
        `;
      });

      const customEl = query('custom-prop-reactive') as any;
      const button = query('button');

      expect(customEl.data).toEqual({ count: 1 });

      fire.click(button!);
      await new Promise((r) => setTimeout(r, 10));

      expect(customEl.data).toEqual({ count: 2 });
    });
  });

  describe('Interaction with attribute bindings', () => {
    it('should allow both attribute and property bindings on same element', async () => {
      const { query } = await mount(() => {
        const value = signal('hello');
        const disabled = signal(false);

        return html`<input type="text" .value=${value} ?disabled=${disabled} />`;
      });

      const input = query('input') as HTMLInputElement;

      expect(input.value).toBe('hello');
      expect(input.disabled).toBe(false);
    });
  });
});

describe('Reactive Bindings', () => {
  describe('Property Bindings', () => {
    it('should update element properties reactively', async () => {
      const value = signal('initial');

      register('test-prop-bindings', () => html` <input type="text" value=${value} /> `);

      const { flush, query } = await mount('test-prop-bindings');

      const input = query('input') as HTMLInputElement;

      expect(input.value).toBe('initial');

      value.value = 'updated';
      await flush();
      expect((query('input') as HTMLInputElement).value).toBe('updated');
    });

    it('should handle boolean attributes correctly', async () => {
      const checked = signal(false);

      register('test-boolean-attrs', () => html` <div class=${() => (checked.value ? 'checked' : '')}>State</div> `);

      const { flush, query } = await mount('test-boolean-attrs');

      await flush();

      const div = query('div')!;

      expect(div.classList.contains('checked')).toBe(false);

      checked.value = true;
      await flush();
      expect(query('div')!.classList.contains('checked')).toBe(true);
    });

    it('should update multiple properties simultaneously', async () => {
      const value = signal('');
      const placeholder = signal('Enter text');
      const maxLength = signal(10);

      register(
        'test-multi-props',
        () => html` <div data-value=${value} title=${placeholder} aria-label=${maxLength}></div> `,
      );

      const { flush, query } = await mount('test-multi-props');

      await flush();

      const div = query('div')!;

      expect(div.getAttribute('data-value')).toBe('');

      value.value = 'test';
      placeholder.value = 'New placeholder';
      maxLength.value = 20;
      await flush();

      const updatedDiv = query('div')!;

      expect(updatedDiv.getAttribute('data-value')).toBe('test');
    });
  });

  describe('CSS Class Bindings', () => {
    it('should toggle CSS classes reactively', async () => {
      const completed = signal(false);

      register(
        'test-class-toggle',
        () => html` <div class="${() => (completed.value ? 'completed' : '')}">Task</div> `,
      );

      const { flush, query } = await mount('test-class-toggle');

      const div = query('div')!;

      expect(div.classList.contains('completed')).toBe(false);

      completed.value = true;
      await flush();
      expect(div.classList.contains('completed')).toBe(true);
    });

    it('should handle multiple conditional classes', async () => {
      const active = signal(false);
      const disabled = signal(false);

      register('test-multi-classes', () => {
        const classes = computed(() => {
          const cls = ['base'];

          if (active.value) cls.push('active');

          if (disabled.value) cls.push('disabled');

          return cls.join(' ');
        });

        return html`<button class=${classes}>Button</button>`;
      });

      const { flush, query } = await mount('test-multi-classes');

      const btn = query('button')!;

      expect(btn.classList.contains('base')).toBe(true);
      expect(btn.classList.contains('active')).toBe(false);
      expect(btn.classList.contains('disabled')).toBe(false);

      active.value = true;
      await flush();
      expect(btn.classList.contains('active')).toBe(true);
      expect(btn.classList.contains('disabled')).toBe(false);

      disabled.value = true;
      await flush();
      expect(btn.classList.contains('active')).toBe(true);
      expect(btn.classList.contains('disabled')).toBe(true);
    });
  });

  describe('Event Handlers', () => {
    it('should handle event handlers correctly', async () => {
      const count = signal(0);
      const increment = () => (count.value += 1);

      register(
        'test-event-handler',
        () => html`
          <button @click=${increment}>Click</button>
          <div class="count">${count}</div>
        `,
      );

      const { flush, query } = await mount('test-event-handler');

      expect(query('.count')!.textContent).toBe('0');

      query('button')!.dispatchEvent(new Event('click'));
      await flush();
      expect(query('.count')!.textContent).toBe('1');
    });

    it('should update handlers when logic changes', async () => {
      const mode = signal<'add' | 'subtract'>('add');
      const count = signal(0);

      const handleClick = () => {
        count.value += mode.value === 'add' ? 1 : -1;
      };

      register(
        'test-dynamic-handler',
        () => html`
          <button class="action" @click=${handleClick}>Action</button>
          <button class="toggle" @click=${() => (mode.value = mode.value === 'add' ? 'subtract' : 'add')}>
            Toggle
          </button>
          <div class="count">${count}</div>
        `,
      );

      const { flush, query } = await mount('test-dynamic-handler');

      query('.action')!.dispatchEvent(new Event('click'));
      await flush();
      expect(query('.count')!.textContent).toBe('1');

      query('.toggle')!.dispatchEvent(new Event('click'));
      await flush();

      query('.action')!.dispatchEvent(new Event('click'));
      await flush();
      expect(query('.count')!.textContent).toBe('0');
    });
  });
});

describe('Computed Values', () => {
  describe('Basic Computed', () => {
    it('should update computed values reactively', async () => {
      const count = signal(0);
      const doubled = computed(() => count.value * 2);

      register('test-computed-basic', () => html`<div class="result">${doubled}</div>`);

      const { flush, query } = await mount('test-computed-basic');

      expect(query('.result')!.textContent).toBe('0');

      count.value = 5;
      await flush();
      expect(query('.result')!.textContent).toBe('10');
    });

    it('should handle nested computed values', async () => {
      const a = signal(1);
      const b = computed(() => a.value * 2);
      const c = computed(() => b.value + 1);

      register('test-nested-computed', () => html`<div>${c}</div>`);

      const { flush, query } = await mount('test-nested-computed');

      expect(query('div')!.textContent).toBe('3'); // (1 * 2) + 1

      a.value = 3;
      await flush();
      expect(query('div')!.textContent).toBe('7'); // (3 * 2) + 1
    });

    it('should handle multiple dependencies', async () => {
      const a = signal(2);
      const b = signal(3);
      const sum = computed(() => a.value + b.value);

      register('test-multi-deps', () => html`<div>${sum}</div>`);

      const { flush, query } = await mount('test-multi-deps');

      expect(query('div')!.textContent).toBe('5');

      a.value = 5;
      await flush();
      expect(query('div')!.textContent).toBe('8');

      b.value = 10;
      await flush();
      expect(query('div')!.textContent).toBe('15');
    });
  });

  describe('Computed in Conditionals', () => {
    it('should work in conditional rendering', async () => {
      const show = signal(true);
      const count = signal(0);
      const doubled = computed(() => count.value * 2);

      register('test-computed-conditional', () => {
        const content = computed(() => {
          if (show.value) {
            return html`<span class="value">${doubled}</span>`;
          }

          return html`<span class="hidden">Hidden</span>`;
        });

        return html`<div>${content}</div>`;
      });

      const { flush, query } = await mount('test-computed-conditional');

      const span = query('.value');

      expect(span).not.toBeNull();
      expect(span?.textContent).toBe('0');

      count.value = 5;
      await flush();
      expect(query('.value')?.textContent).toBe('10');

      show.value = false;
      await flush();
      expect(query('.value')).toBeNull();
      expect(query('.hidden')).not.toBeNull();
    });
  });

  describe('Computed for Validation', () => {
    it('should compute validation errors', async () => {
      const email = signal('');
      const error = computed(() => {
        if (!email.value) return '';

        return email.value.includes('@') ? '' : 'Invalid email';
      });

      register(
        'test-validation',
        () => html`
          <input
            type="email"
            :value=${() => email.value}
            @input=${(e: Event) => (email.value = (e.target as HTMLInputElement).value)} />
          <span class="error">${error}</span>
        `,
      );

      const { flush, query } = await mount('test-validation');

      email.value = 'invalid';
      await flush();
      expect(query('.error')?.textContent).toBe('Invalid email');

      email.value = 'test@example.com';
      await flush();
      expect(query('.error')?.textContent).toBe('');
    });

    it('should compute password strength', async () => {
      const password = signal('');
      const strength = computed(() => {
        const len = password.value.length;

        if (len === 0) return '';

        if (len < 4) return 'Weak';

        if (len < 8) return 'Medium';

        return 'Strong';
      });

      register(
        'test-password-strength',
        () => html`
          <input
            type="password"
            :value=${() => password.value}
            @input=${(e: Event) => (password.value = (e.target as HTMLInputElement).value)} />
          <div class="strength">${strength}</div>
        `,
      );

      const { flush, query } = await mount('test-password-strength');

      password.value = 'ab';
      await flush();
      expect(query('.strength')?.textContent).toBe('Weak');

      password.value = 'abcd123';
      await flush();
      expect(query('.strength')?.textContent).toBe('Medium');

      password.value = 'abcd12345';
      await flush();
      expect(query('.strength')?.textContent).toBe('Strong');
    });
  });
});

describe('Performance', () => {
  it('should batch multiple updates', async () => {
    const a = signal(0);
    const b = signal(0);
    const sum = computed(() => a.value + b.value);

    register('test-batching', () => html`<div>${sum}</div>`);

    const { flush, query } = await mount('test-batching');

    expect(query('div')!.textContent).toBe('0');

    // These should be batched
    a.value = 5;
    b.value = 10;
    await flush();

    expect(query('div')!.textContent).toBe('15');
  });

  it('should handle rapid updates', async () => {
    const count = signal(0);
    let intervalId: number | undefined;

    register('test-rapid', () => {
      intervalId = setInterval(() => {
        count.value++;

        if (count.value >= 10 && intervalId) clearInterval(intervalId);
      }, 5) as unknown as number;

      return html`<div>${count}</div>`;
    });

    const { flush, query } = await mount('test-rapid');

    await new Promise((r) => setTimeout(r, 100));
    await flush();

    expect(Number.parseInt(query('div')!.textContent || '0', 10)).toBeGreaterThanOrEqual(10);

    if (intervalId) clearInterval(intervalId);
  });
});

/**
 * Regression Tests
 * Organized by category to prevent previously fixed issues from reoccurring
 * Tests are focused, non-redundant, and cover edge cases
 */

import { computed, define, html, signal } from '..';
import { mount } from '../test';

describe('Regression Tests', () => {
  describe('Keyed Reconciliation', () => {
    describe('DOM Node Lifecycle', () => {
      it('should not duplicate nodes when adding items', async () => {
        const items = signal([{ id: 1, value: 100 }]);
        const addItem = () => {
          items.value = [...items.value, { id: items.value.length + 1, value: 90 }];
        };

        define(
          'test-no-duplication',
          () => html`
            <div class="container">
              ${html.each(
                items,
                (item) => item.id,
                (item) => html`<div class="item">${item.value}</div>`,
              )}
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

        define(
          'test-reuse-nodes',
          () => html`
            <div>
              ${html.each(
                items,
                (item) => item.id,
                (item) => html`<div class="item" data-id="${item.id}">${item.value}</div>`,
              )}
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

        define(
          'test-remove-nodes',
          () => html`
            <div>
              ${html.each(
                items,
                (item) => item.id,
                (item) => html`<div class="item" data-id="${item.id}">${item.value}</div>`,
              )}
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

        define(
          'test-reorder',
          () => html`
            <div>
              ${html.each(
                items,
                (item) => item.id,
                (item) => html`<div class="item" data-id="${item.id}">${item.text}</div>`,
              )}
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

        define(
          'test-prepend',
          () => html`
            <div>
              ${html.each(
                items,
                (item) => item.id,
                (item) => html`<div class="item" data-id="${item.id}">${item.text}</div>`,
              )}
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

        define(
          'test-empty-to-populated',
          () => html`
            <div>
              ${html.each(
                items,
                (item) => item.id,
                (item) => html`<div class="item">${item.text}</div>`,
              )}
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

        define(
          'test-populated-to-empty',
          () => html`
            <div>
              ${html.each(
                items,
                (item) => item.id,
                (item) => html`<div class="item">${item.text}</div>`,
              )}
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

        define(
          'test-single-item',
          () => html`
            <div>
              ${html.each(
                items,
                (item) => item.id,
                (item) => html`<div class="item">${item.text}</div>`,
              )}
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

        define(
          'test-fallback-empty',
          () => html`
            <div>
              ${html.each(
                items,
                (i) => i,
                (item) => html`<div class="item">${item}</div>`,
                () => html`<div class="empty">No items</div>`,
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

        define(
          'test-fallback-hidden',
          () => html`
            <div>
              ${html.each(
                items,
                (i) => i,
                (item) => html`<div class="item">${item}</div>`,
                () => html`<div class="empty">No items</div>`,
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

        define(
          'test-fallback-toggle',
          () => html`
            <div>
              ${html.each(
                items,
                (i) => i,
                (item) => html`<div class="item">${item}</div>`,
                () => html`<div class="empty">No items</div>`,
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

  describe('Reactive Bindings', () => {
    describe('Property Bindings', () => {
      it('should update element properties reactively', async () => {
        const value = signal('initial');
        const disabled = signal(false);

        define('test-prop-bindings', () => html` <input type="text" value=${value} disabled=${disabled} /> `);

        const { flush, query } = await mount('test-prop-bindings');

        const input = query('input') as HTMLInputElement;

        expect(input.value).toBe('initial');
        expect(input.disabled).toBe(false);

        value.value = 'updated';
        await flush();
        expect(input.value).toBe('updated');

        disabled.value = true;
        await flush();
        expect(input.disabled).toBe(true);
      });

      it('should handle boolean attributes correctly', async () => {
        const checked = signal(false);
        const readonly = signal(false);

        define('test-boolean-attrs', () => html` <input type="checkbox" checked=${checked} readonly=${readonly} /> `);

        const { flush, query } = await mount('test-boolean-attrs');

        const input = query('input') as HTMLInputElement;

        expect(input.checked).toBe(false);

        checked.value = true;
        await flush();
        expect(input.checked).toBe(true);

        readonly.value = true;
        await flush();
        expect(input.readOnly).toBe(true);
      });

      it('should update multiple properties simultaneously', async () => {
        const value = signal('');
        const placeholder = signal('Enter text');
        const maxLength = signal(10);

        define(
          'test-multi-props',
          () => html` <input value=${value} placeholder=${placeholder} maxlength=${maxLength} /> `,
        );

        const { flush, query } = await mount('test-multi-props');

        const input = query('input') as HTMLInputElement;

        expect(input.placeholder).toBe('Enter text');
        expect(input.maxLength).toBe(10);

        value.value = 'test';
        placeholder.value = 'New placeholder';
        maxLength.value = 20;
        await flush();

        expect(input.value).toBe('test');
        expect(input.placeholder).toBe('New placeholder');
        expect(input.maxLength).toBe(20);
      });
    });

    describe('CSS Class Bindings', () => {
      it('should toggle CSS classes reactively', async () => {
        const completed = signal(false);

        define(
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

        define('test-multi-classes', () => {
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

        define(
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

        define(
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

        define('test-computed-basic', () => html`<div class="result">${doubled}</div>`);

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

        define('test-nested-computed', () => html`<div>${c}</div>`);

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

        define('test-multi-deps', () => html`<div>${sum}</div>`);

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

        define('test-computed-conditional', () => {
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

        define(
          'test-validation',
          () => html`
            <input
              type="email"
              value=${email}
              @input=${(e: Event) => (email.value = (e.target as HTMLInputElement).value)} />
            <span class="error">${error}</span>
          `,
        );

        const { flush, query } = await mount('test-validation');

        const input = query('input') as HTMLInputElement;
        const errorSpan = query('.error');

        input.value = 'invalid';
        input.dispatchEvent(new Event('input'));
        await flush();
        expect(errorSpan?.textContent).toBe('Invalid email');

        input.value = 'test@example.com';
        input.dispatchEvent(new Event('input'));
        await flush();
        expect(errorSpan?.textContent).toBe('');
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

        define(
          'test-password-strength',
          () => html`
            <input
              type="password"
              value=${password}
              @input=${(e: Event) => (password.value = (e.target as HTMLInputElement).value)} />
            <div class="strength">${strength}</div>
          `,
        );

        const { flush, query } = await mount('test-password-strength');

        const input = query('input') as HTMLInputElement;

        input.value = 'ab';
        input.dispatchEvent(new Event('input'));
        await flush();
        expect(query('.strength')?.textContent).toBe('Weak');

        input.value = 'abcd123';
        input.dispatchEvent(new Event('input'));
        await flush();
        expect(query('.strength')?.textContent).toBe('Medium');

        input.value = 'abcd12345';
        input.dispatchEvent(new Event('input'));
        await flush();
        expect(query('.strength')?.textContent).toBe('Strong');
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

      define(
        'test-filter',
        () => html`
          <div>
            <button class="all" @click=${() => (filter.value = 'all')}>All</button>
            <button class="active" @click=${() => (filter.value = 'active')}>Active</button>
            <button class="completed" @click=${() => (filter.value = 'completed')}>Completed</button>
            ${html.each(
              filtered,
              (item) => item.id,
              (item) => html`<div class="item">${item.text}</div>`,
            )}
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

      define(
        'test-filter-update',
        () => html`
          <div>
            ${html.each(
              filtered,
              (item) => item.id,
              (item) => html`<div class="item">${item.id}</div>`,
            )}
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

        define(
          'test-toggle',
          () => html`
            <div>
              ${html.each(
                todos,
                (t) => t.id,
                (t) => html`
                  <input type="checkbox" checked=${t.completed} @change=${() => toggle(t.id)} />
                  <span class="${t.completed ? 'done' : ''}">${t.text}</span>
                `,
              )}
            </div>
          `,
        );

        const { flush, query } = await mount('test-toggle');

        let checkbox = query('input') as HTMLInputElement;
        let span = query('span')!;

        expect(checkbox.checked).toBe(false);
        expect(span.classList.contains('done')).toBe(false);

        checkbox.dispatchEvent(new Event('change'));
        await flush();

        // Query again after update since keyed reconciliation may recreate nodes
        checkbox = query('input') as HTMLInputElement;
        span = query('span')!;

        expect(checkbox.checked).toBe(true);
        expect(span.classList.contains('done')).toBe(true);
      });

      it('should handle multiple toggles', async () => {
        const todos = signal([
          { completed: false, id: 1 },
          { completed: true, id: 2 },
        ]);

        const toggle = (id: number) => {
          todos.value = todos.value.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t));
        };

        define(
          'test-multi-toggle',
          () => html`
            <div>
              ${html.each(
                todos,
                (t) => t.id,
                (t) => html`<input type="checkbox" checked=${t.completed} @change=${() => toggle(t.id)} />`,
              )}
            </div>
          `,
        );

        const { flush, queryAll } = await mount('test-multi-toggle');

        let checkboxes = queryAll('input') as HTMLInputElement[];

        expect(checkboxes[0].checked).toBe(false);
        expect(checkboxes[1].checked).toBe(true);

        checkboxes[0].dispatchEvent(new Event('change'));
        await flush();
        // Query again after the first update
        checkboxes = queryAll('input') as HTMLInputElement[];
        checkboxes[1].dispatchEvent(new Event('change'));
        await flush();

        // Query again after the second update
        const updated = queryAll('input') as HTMLInputElement[];

        expect(updated[0].checked).toBe(true);
        expect(updated[1].checked).toBe(false);
      });
    });
  });

  describe('Performance', () => {
    it('should batch multiple updates', async () => {
      const a = signal(0);
      const b = signal(0);
      const sum = computed(() => a.value + b.value);

      define('test-batching', () => html`<div>${sum}</div>`);

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

      define('test-rapid', () => {
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
});

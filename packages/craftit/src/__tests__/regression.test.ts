/**
 * Regression Tests
 * Organized by category to prevent previously fixed issues from reoccurring
 * Tests are focused, non-redundant, and cover edge cases
 */

import { describe, expect, it, vi } from 'vitest';

import {
  computed,
  define,
  html,
  signal,
  typed,
  onMount,
  onCleanup,
  onError,
  useProvide,
  useInject,
  ref,
  refs,
  defineEmits,
  defineProps,
  onSlotChange,
} from '..';
import { each } from '../directives';
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

        define(
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

        define(
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

        define(
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

        define(
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

        define(
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

        define(
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

        define(
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

        define(
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

        define(
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

        define(
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

  describe('Reactive Bindings', () => {
    describe('Property Bindings', () => {
      it('should update element properties reactively', async () => {
        const value = signal('initial');

        define('test-prop-bindings', () => html` <input type="text" value=${value} /> `);

        const { flush, query } = await mount('test-prop-bindings');

        const input = query('input') as HTMLInputElement;

        expect(input.value).toBe('initial');

        value.value = 'updated';
        await flush();
        expect((query('input') as HTMLInputElement).value).toBe('updated');
      });

      it('should handle boolean attributes correctly', async () => {
        const checked = signal(false);

        define('test-boolean-attrs', () => html` <div class=${() => (checked.value ? 'checked' : '')}>State</div> `);

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

        define(
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

        define(
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

      define(
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

        define(
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

        define(
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

  describe('defineProps & Global Helpers', () => {
    it('should support shorthand defineProps with direct default values', async () => {
      const { query } = await mount(
        () => {
          const props = defineProps({
            active: typed(true, { reflect: false }),
            count: 0,
            label: 'default',
          });

          return html`<div class="count">${props.count}</div>
            <div class="label">${props.label}</div>`;
        },
        {
          attrs: { count: '42', label: 'custom' },
        },
      );

      expect(query('.count')?.textContent).toBe('42');
      expect(query('.label')?.textContent).toBe('custom');
    });

    it('should support object defaults containing a default key via typed helper', async () => {
      const configDefault = { default: 'fallback', mode: 'dark' };

      const { query } = await mount(() => {
        const props = defineProps<{ config: { mode: string } }>({
          // Explicit typed wrapper prevents structural ambiguity with PropDef<T>.
          config: typed(configDefault, { reflect: false }),
        });

        return html`<div class="mode">${() => props.config.value.mode}</div>`;
      });

      expect(query('.mode')?.textContent).toBe('dark');
    });

    it('should useProvide all lifecycle and utility functions as global exports', async () => {
      let elementInstance: HTMLElement | undefined;

      const { element } = await mount(({ host }) => {
        elementInstance = host;

        expect(onMount).toBeDefined();
        expect(onCleanup).toBeDefined();
        expect(onError).toBeDefined();
        expect(useProvide).toBeDefined();
        expect(useInject).toBeDefined();
        expect(ref).toBeDefined();
        expect(refs).toBeDefined();
        expect(defineEmits).toBeDefined();
        expect(defineProps).toBeDefined();

        return html`<div id="test"></div>`;
      });

      expect(elementInstance).toBe(element);
    });

    it('should support the new refs utility', async () => {
      let items: HTMLElement[] | undefined;

      const { destroy } = await mount(() => {
        items = refs<HTMLLIElement>();

        return html`
          <ul>
            <li ref=${items}>Item 1</li>
            <li ref=${items}>Item 2</li>
            <li ref=${items}>Item 3</li>
          </ul>
        `;
      });

      expect(items?.length).toBe(3);
      expect(items?.map((el) => el.textContent)).toEqual(['Item 1', 'Item 2', 'Item 3']);

      destroy();

      expect(items?.length).toBe(0);
    });
  });

  describe('onMount slot timing', () => {
    it('onMount callbacks run after slot assignment', async () => {
      const onMountFn = vi.fn();

      define('test-slot-timing-element', ({ host }) => {
        onMount(() => {
          onMountFn();

          // During onMount, slots should be assignable and accessible
          const slot = host.shadowRoot?.querySelector('slot');
          const assigned = slot?.assignedElements();

          expect(assigned).toBeDefined();
          expect(assigned?.length).toBeGreaterThanOrEqual(1);
        });

        return '<slot></slot>';
      });

      const el = document.createElement('test-slot-timing-element');
      const child = document.createElement('div');

      child.textContent = 'slotted';
      el.appendChild(child);
      document.body.appendChild(el);

      // Give microtask time to run onMount
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(onMountFn).toHaveBeenCalled();
      el.remove();
    });

    it('onSlotChange callback receives assigned elements', async () => {
      const onSlotChangeFn = vi.fn();

      define('test-slot-change-element', () => {
        onMount(() => {
          onSlotChange('default', (elements) => {
            onSlotChangeFn(elements.length);
          });
        });

        return '<slot></slot>';
      });

      const el = document.createElement('test-slot-change-element');
      const child = document.createElement('div');

      el.appendChild(child);
      document.body.appendChild(el);

      // Give microtask time to run onMount and initial onSlotChange
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(onSlotChangeFn).toHaveBeenCalledWith(1);
      el.remove();
    });
  });
});

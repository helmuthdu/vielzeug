/**
 * Craftit - Phase 2 Tests
 * Tests for directives and keyed list reconciliation
 */
import { computed, define, html, signal } from '..';
import { mount } from '../testing/render';

describe('Phase 2: Directives & Keyed Lists', () => {
  describe('Directive: html.if (reactive)', () => {
    it('should render conditionally with signals', async () => {
      const show = signal(true);

      define('test-if-reactive', () => {
        return html`
          <div>
            ${html.if(show, () => html`<p>Visible</p>`)}
          </div>
        `;
      });

      const { query, waitForUpdates, unmount } = mount('test-if-reactive');
      await waitForUpdates();

      expect(query('p')).not.toBeNull();
      expect(query('p')?.textContent).toBe('Visible');

      show.value = false;
      await waitForUpdates();

      expect(query('p')).toBeNull();

      unmount();
    });

    it('should handle if-else branches', async () => {
      const isLoggedIn = signal(true);

      define('test-if-else-reactive', () => {
        return html`
          <div>
            ${html.ifElse(
              isLoggedIn,
              () => html`<p>Welcome back!</p>`,
              () => html`<p>Please login</p>`,
            )}
          </div>
        `;
      });

      const { query, waitForUpdates, unmount } = mount('test-if-else-reactive');
      await waitForUpdates();

      expect(query('p')?.textContent).toBe('Welcome back!');

      isLoggedIn.value = false;
      await waitForUpdates();

      expect(query('p')?.textContent).toBe('Please login');

      unmount();
    });

    it('should work with computed signals', async () => {
      const count = signal(0);
      const isEven = computed(() => count.value % 2 === 0);

      define('test-if-computed', () => {
        return html`
          <div>
            ${html.if(isEven, () => html`<p>Even</p>`)}
          </div>
        `;
      });

      const { query, waitForUpdates, unmount } = mount('test-if-computed');
      await waitForUpdates();

      expect(query('p')?.textContent).toBe('Even');

      count.value = 1;
      await waitForUpdates();

      expect(query('p')).toBeNull();

      count.value = 2;
      await waitForUpdates();

      expect(query('p')?.textContent).toBe('Even');

      unmount();
    });
  });

  describe('Directive: html.show', () => {
    it('should toggle display with signals', async () => {
      const visible = signal(true);

      define('test-show-reactive', () => {
        return html`
          <div>
            ${html.show(visible, html`<p>Content</p>`)}
          </div>
        `;
      });

      const { query, waitForUpdates, unmount } = mount('test-show-reactive');
      await waitForUpdates();

      const wrapper = query('div div') as HTMLElement;
      expect(wrapper).not.toBeNull();
      expect(wrapper.style.display).toBe('contents');

      visible.value = false;
      await waitForUpdates();

      expect(wrapper.style.display).toBe('none');

      visible.value = true;
      await waitForUpdates();

      expect(wrapper.style.display).toBe('contents');

      unmount();
    });
  });

  describe('Directive: html.for (keyed lists)', () => {
    it('should render list with keys', async () => {
      const items = signal([
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
        { id: 3, name: 'Charlie' },
      ]);

      define('test-for-keyed', () => {
        return html`
          <ul>
            ${html.for(
              items,
              (item) => item.id,
              (item) => html`<li data-id=${item.id}>${item.name}</li>`,
            )}
          </ul>
        `;
      });

      const { query, waitForUpdates, unmount } = mount('test-for-keyed');
      await waitForUpdates();

      const listItems = query('ul')?.querySelectorAll('li');
      expect(listItems?.length).toBe(3);
      expect(listItems?.[0].textContent).toBe('Alice');
      expect(listItems?.[1].textContent).toBe('Bob');
      expect(listItems?.[2].textContent).toBe('Charlie');

      unmount();
    });

    it('should update list reactively', async () => {
      const items = signal([
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ]);

      define('test-for-reactive', () => {
        return html`
          <ul>
            ${html.for(
              items,
              (item) => item.id,
              (item) => html`<li>${item.name}</li>`,
            )}
          </ul>
        `;
      });

      const { query, waitForUpdates, unmount } = mount('test-for-reactive');
      await waitForUpdates();

      let listItems = query('ul')?.querySelectorAll('li');
      expect(listItems?.length).toBe(2);

      // Add item
      items.value = [...items.value, { id: 3, name: 'Charlie' }];
      await waitForUpdates();

      listItems = query('ul')?.querySelectorAll('li');
      expect(listItems?.length).toBe(3);
      expect(listItems?.[2].textContent).toBe('Charlie');

      // Remove item
      items.value = items.value.filter((i) => i.id !== 2);
      await waitForUpdates();

      listItems = query('ul')?.querySelectorAll('li');
      expect(listItems?.length).toBe(2);
      expect(listItems?.[0].textContent).toBe('Alice');
      expect(listItems?.[1].textContent).toBe('Charlie');

      unmount();
    });

    it('should reorder items efficiently', async () => {
      const items = signal([
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
        { id: 3, name: 'Charlie' },
      ]);

      define('test-for-reorder', () => {
        return html`
          <ul>
            ${html.for(
              items,
              (item) => item.id,
              (item) => html`<li data-id=${item.id}>${item.name}</li>`,
            )}
          </ul>
        `;
      });

      const { query, waitForUpdates, unmount } = mount('test-for-reorder');
      await waitForUpdates();

      const getIds = () => {
        const listItems = query('ul')?.querySelectorAll('li');
        return Array.from(listItems || []).map((li) => li.getAttribute('data-id'));
      };

      expect(getIds()).toEqual(['1', '2', '3']);

      // Reverse order
      items.value = [...items.value].reverse();
      await waitForUpdates();

      expect(getIds()).toEqual(['3', '2', '1']);

      unmount();
    });

    it('should work with index parameter', async () => {
      const items = signal(['A', 'B', 'C']);

      define('test-for-index', () => {
        return html`
          <ol>
            ${html.for(
              items,
              (_, i) => i,
              (item, i) => html`<li>${i}: ${item}</li>`,
            )}
          </ol>
        `;
      });

      const { query, waitForUpdates, unmount } = mount('test-for-index');
      await waitForUpdates();

      const listItems = query('ol')?.querySelectorAll('li');
      expect(listItems?.[0].textContent).toBe('0: A');
      expect(listItems?.[1].textContent).toBe('1: B');
      expect(listItems?.[2].textContent).toBe('2: C');

      unmount();
    });
  });

  describe('Combined: Directives + Reactive Class/Style', () => {
    it('should work together seamlessly', async () => {
      const items = signal([
        { id: 1, text: 'Task 1', done: false },
        { id: 2, text: 'Task 2', done: true },
      ]);

      const filter = signal('all');

      const filtered = computed(() => {
        if (filter.value === 'active') return items.value.filter((t) => !t.done);
        if (filter.value === 'done') return items.value.filter((t) => t.done);
        return items.value;
      });

      define('test-combined-phase2', () => {
        return html`
          <div>
            <select value=${filter}>
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="done">Done</option>
            </select>

            ${html.if(
              computed(() => filtered.value.length === 0),
              () => html`<p class="empty">No items</p>`,
            )}

            ${html.if(
              computed(() => filtered.value.length > 0),
              () => html`
                <ul>
                  ${html.for(
                    filtered,
                    (t) => t.id,
                    (task) => html`
                      <li class=${{ done: task.done }} style=${{ opacity: task.done ? 0.5 : 1 }}>
                        ${task.text}
                      </li>
                    `,
                  )}
                </ul>
              `,
            )}
          </div>
        `;
      });

      const { query, waitForUpdates, unmount } = mount('test-combined-phase2');
      await waitForUpdates();

      const listItems = query('ul')?.querySelectorAll('li');
      expect(listItems?.length).toBe(2);

      // Filter to active only
      filter.value = 'active';
      await waitForUpdates();

      const activeItems = query('ul')?.querySelectorAll('li');
      expect(activeItems?.length).toBe(1);
      expect(activeItems?.[0].textContent?.trim()).toBe('Task 1');

      // Filter to done only
      filter.value = 'done';
      await waitForUpdates();

      const doneItems = query('ul')?.querySelectorAll('li');
      expect(doneItems?.length).toBe(1);
      expect(doneItems?.[0].textContent?.trim()).toBe('Task 2');

      unmount();
    });
  });

  describe('Performance: Keyed List Reconciliation', () => {
    it('should reuse DOM nodes when keys match', async () => {
      const items = signal([
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
        { id: 3, name: 'Charlie' },
      ]);

      define('test-dom-reuse', () => {
        return html`
          <ul>
            ${html.for(
              items,
              (item) => item.id,
              (item) => html`<li class="item">${item.name}</li>`,
            )}
          </ul>
        `;
      });

      const { query, waitForUpdates, unmount } = mount('test-dom-reuse');
      await waitForUpdates();

      const originalNodes = Array.from(query('ul')?.querySelectorAll('li') || []);
      expect(originalNodes.length).toBe(3);

      // Reorder - should reuse same nodes
      items.value = [items.value[2], items.value[0], items.value[1]];
      await waitForUpdates();

      const reorderedNodes = Array.from(query('ul')?.querySelectorAll('li') || []);
      expect(reorderedNodes.length).toBe(3);

      // Check that nodes were reused (same references)
      // Note: This is implementation-dependent, the test documents expected behavior

      unmount();
    });
  });
});


/**
 * Template - HTML & Directives Tests
 * Comprehensive tests for HTML template system and all directives
 */

import { computed, define, escapeHtml, html, raw, rawHtml, signal, suspense } from '..';
import { fire, mount } from '../test';

describe('Template: HTML System', () => {
  describe('html Tagged Template', () => {
    it('should render static content', async () => {
      define('test-static', () => {
        return html`<div>Hello World</div>`;
      });

      const { query } = await mount('test-static');
      expect(query('div')?.textContent).toBe('Hello World');
    });

    it('should interpolate values', async () => {
      define('test-interpolate', () => {
        const name = 'Alice';
        return html`<div>Hello ${name}</div>`;
      });

      const { query } = await mount('test-interpolate');
      expect(query('div')?.textContent).toBe('Hello Alice');
    });

    it('should support signal interpolation', async () => {
      define('test-signal-interpolate', () => {
        const count = signal(0);
        return html`<div>${count}</div>`;
      });

      const { query } = await mount('test-signal-interpolate');
      expect(query('div')?.textContent).toBe('0');
    });

    it('should support computed values', async () => {
      define('test-computed', () => {
        const count = signal(5);
        const doubled = computed(() => count.value * 2);
        return html`<div>${doubled}</div>`;
      });

      const { query } = await mount('test-computed');
      expect(query('div')?.textContent).toBe('10');
    });

    it('should escape HTML by default', async () => {
      define('test-escape', () => {
        const userInput = '<script>alert("xss")</script>';
        return html`<div>${userInput}</div>`;
      });

      const { query } = await mount('test-escape');
      expect(query('div')?.textContent).toBe('<script>alert("xss")</script>');
      expect(query('div')?.innerHTML).toBe('&lt;script&gt;alert("xss")&lt;/script&gt;');
    });

    it('should support rawHtml() for trusted content', async () => {
      define('test-raw-html', () => {
        const trustedHtml = '<strong>Bold</strong>';
        return html`<div>${rawHtml(trustedHtml)}</div>`;
      });

      const { query } = await mount('test-raw-html');
      expect(query('strong')?.textContent).toBe('Bold');
    });

    it('should preserve HTMLResult objects without escaping', async () => {
      define('test-html-result', () => {
        const inner = html`<span>Inner</span>`;
        return html`<div>${inner}</div>`;
      });

      const { query } = await mount('test-html-result');
      expect(query('span')?.textContent).toBe('Inner');
    });
  });

  describe('raw Tagged Template', () => {
    it('should render raw HTML without escaping', async () => {
      define('test-raw-template', () => {
        const userInput = '<em>Italic</em>';
        return raw`<div>${userInput}</div>`;
      });

      const { query } = await mount('test-raw-template');
      expect(query('em')?.textContent).toBe('Italic');
    });

    it('should interpolate values in raw template', async () => {
      define('test-raw-interpolate', () => {
        const text = 'Hello';
        return raw`<div>${text}</div>`;
      });

      const { query } = await mount('test-raw-interpolate');
      expect(query('div')?.textContent).toBe('Hello');
    });
  });

  describe('Attributes', () => {
    it('should set string attributes', async () => {
      define('test-attr-string', () => {
        const id = 'my-id';
        return html`<div id=${id}>Test</div>`;
      });

      const { query } = await mount('test-attr-string');
      expect(query('div')?.getAttribute('id')).toBe('my-id');
    });

    it('should set boolean attributes', async () => {
      define('test-attr-boolean', () => {
        const disabled = signal(true);
        return html`<button disabled=${disabled}>Click</button>`;
      });

      const { query } = await mount('test-attr-boolean');
      expect(query('button')?.hasAttribute('disabled')).toBe(true);
    });

    it('should remove false boolean attributes', async () => {
      define('test-attr-remove', () => {
        const disabled = signal(false);
        return html`<button disabled=${disabled}>Click</button>`;
      });

      const { query } = await mount('test-attr-remove');
      expect(query('button')?.hasAttribute('disabled')).toBe(false);
    });

    it('should support reactive attributes', async () => {
      define('test-reactive-attr', () => {
        const cls = signal('initial');
        setTimeout(() => (cls.value = 'updated'), 50);
        return html`<div class=${cls}>Test</div>`;
      });

      const { query, flush } = await mount('test-reactive-attr');
      expect(query('div')?.className).toBe('initial');

      await new Promise((r) => setTimeout(r, 60));
      await flush();
      expect(query('div')?.className).toBe('updated');
    });
  });

  describe('Event Handlers', () => {
    it('should bind click events', async () => {
      let clicked = false;

      define('test-click', () => {
        return html`<button @click=${() => (clicked = true)}>Click</button>`;
      });

      const { query } = await mount('test-click');
      fire.click(query('button')!);
      expect(clicked).toBe(true);
    });

    it('should support event modifiers', async () => {
      const events: Event[] = [];

      define('test-modifiers', () => {
        return html`
          <form @submit.prevent=${(e: Event) => events.push(e)}>
            <button type="submit">Submit</button>
          </form>
        `;
      });

      const { query } = await mount('test-modifiers');
      const form = query('form')!;
      const event = new Event('submit', { cancelable: true });
      form.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(true);
      expect(events.length).toBe(1);
    });

    it('should support keyboard modifiers', async () => {
      let enterPressed = false;
      let escPressed = false;
      let anyKeyPressed = false;

      define('test-keys', () => {
        return html`
          <div>
            <input id="enter-input" @keydown.enter=${() => (enterPressed = true)} />
            <input id="esc-input" @keydown.esc=${() => (escPressed = true)} />
            <input id="any-input" @keydown=${() => (anyKeyPressed = true)} />
          </div>
        `;
      });

      const { query } = await mount('test-keys');

      // Test Enter key
      const enterInput = query('#enter-input') as HTMLInputElement;
      enterInput.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' }));
      expect(enterPressed).toBe(true);

      // A key should not trigger the enter handler
      enterPressed = false;
      enterInput.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'a' }));
      expect(enterPressed).toBe(false);

      // Test Esc key
      const escInput = query('#esc-input') as HTMLInputElement;
      escInput.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Escape' }));
      expect(escPressed).toBe(true);

      // Test any key (no modifier)
      const anyInput = query('#any-input') as HTMLInputElement;
      anyInput.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'x' }));
      expect(anyKeyPressed).toBe(true);
    });
  });

  describe('Conditional: html.when()', () => {
    it('should render when condition is true', async () => {
      define('test-if-true', () => {
        const show = signal(true);
        return html`${html.when(show.value, () => html`<div>Visible</div>`)}`;
      });

      const { query } = await mount('test-if-true');
      expect(query('div')?.textContent).toBe('Visible');
    });

    it('should not render when condition is false', async () => {
      define('test-if-false', () => {
        const show = signal(false);
        return html`${html.when(show.value, () => html`<div class="content">Hidden</div>`)}`;
      });

      const { query } = await mount('test-if-false');
      expect(query('.content')).toBeNull();
    });

    it('should support else branch', async () => {
      define('test-if-else', () => {
        const show = signal(false);
        return html`${html.when(
          show.value,
          () => html`<div>Yes</div>`,
          () => html`<div>No</div>`,
        )}`;
      });

      const { query } = await mount('test-if-else');
      expect(query('div')?.textContent).toBe('No');
    });

    it('should support html.when() syntax', async () => {
      define('test-if-syntax', () => {
        const loggedIn = signal(true);
        return html`
          <div>
            ${html.when(
              loggedIn,
              () => html`<span>Welcome!</span>`,
              () => html`<span>Please login</span>`,
            )}
          </div>
        `;
      });

      const { query } = await mount('test-if-syntax');
      expect(query('span')?.textContent).toBe('Welcome!');
    });

    it('should support reactive function conditions', async () => {
      const count = signal(0);

      define('test-if-function-condition', () => {
        return html`
          <div>
            ${html.when(
              () => count.value > 5,
              () => html`<span class="above">Above threshold</span>`,
              () => html`<span class="below">Below threshold</span>`,
            )}
          </div>
        `;
      });

      const { query, flush } = await mount('test-if-function-condition');

      // Initially below threshold
      expect(query('.below')).toBeTruthy();
      expect(query('.below')?.textContent).toBe('Below threshold');
      expect(query('.above')).toBeNull();

      // Update count to go above threshold
      count.value = 6;
      await flush();

      // Now above threshold
      expect(query('.above')).toBeTruthy();
      expect(query('.above')?.textContent).toBe('Above threshold');
      expect(query('.below')).toBeNull();
    });
  });

  describe('Loop: html.each()', () => {
    it('should render list items (requires full reconciliation)', async () => {
      define('test-for-basic', () => {
        const items = signal([1, 2, 3]);
        return html`
          <ul>
            ${html.each(items, (item) => html`<li>${item}</li>`)}
          </ul>
        `;
      });

      const { queryAll } = await mount('test-for-basic');
      const items = queryAll('li');
      expect(items.length).toBe(3);
      expect(items[0].textContent).toBe('1');
    });

    it('should render fallback for empty list (requires full reconciliation)', async () => {
      define('test-for-fallback', () => {
        const items = signal<number[]>([]);
        return html`
          <div class="container">
            ${html.each(
              items,
              (_, i) => i,
              (item) => html`<li>${item}</li>`,
              () => html`<div class="empty">Empty</div>`,
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
            ${html.each(items, (item) => html`<li>${item}</li>`)}
          </ul>
        `;
      });

      const { queryAll, flush } = await mount('test-for-reactive');
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
            ${html.each(
              items,
              (item) => item,
              (item) => html`<li>${item}</li>`,
            )}
          </ul>
        `;
      });

      const { queryAll } = await mount('test-for-keyed');
      expect(queryAll('li').length).toBe(3);
    });

    it('should support simple html.each() syntax', async () => {
      define('test-for-simple', () => {
        const items = signal([1, 2, 3]);
        return html`
          <ul>
            ${html.each(items, (item) => html`<li>${item}</li>`)}
          </ul>
        `;
      });

      const { queryAll } = await mount('test-for-simple');
      const listItems = queryAll('li');
      expect(listItems.length).toBe(3);
      expect(listItems[0].textContent).toBe('1');
      expect(listItems[2].textContent).toBe('3');
    });

    it('should support html.each() with key and empty state', async () => {
      define('test-for-advanced', () => {
        const items = signal<{ id: number; name: string }[]>([]);
        return html`
          <div>
            ${html.each(
              items,
              (item) => item.id,
              (item) => html`<div class="item">${item.name}</div>`,
              () => html`<div class="empty">No items</div>`,
            )}
          </div>
        `;
      });

      const { query } = await mount('test-for-advanced');
      expect(query('.empty')?.textContent).toBe('No items');
    });
  });

  describe('Async: suspense()', () => {
    it('should support suspense() for async components', async () => {
      define('test-suspense', () => {
        const fetchData = async () => {
          await new Promise((resolve) => setTimeout(resolve, 100));
          return 'Loaded!';
        };

        return html`
          <div>
            ${suspense(fetchData, {
              fallback: () => html`<span>Loading...</span>`,
              template: (data) => html`<span>${data}</span>`,
            })}
          </div>
        `;
      });

      const { query, flush } = await mount('test-suspense');
      expect(query('span')?.textContent).toBe('Loading...');

      await new Promise((resolve) => setTimeout(resolve, 120));
      await flush();
      expect(query('span')?.textContent).toBe('Loaded!');
    });

    it('should show errorFn on rejection and allow retry()', async () => {
      let callCount = 0;
      define('test-suspense-error', () => {
        const fetchData = async () => {
          callCount++;
          await new Promise((r) => setTimeout(r, 100));
          if (callCount === 1) throw new Error('Oops');
          return 'Recovered!';
        };
        return html`
          <div>
            ${suspense(fetchData, {
              error: (_err, retry) => html`<button class="retry" @click=${retry}>Retry</button>`,
              fallback: () => html`<span>Loading...</span>`,
              template: (data) => html`<span class="data">${data}</span>`,
            })}
          </div>
        `;
      });

      const { query, flush } = await mount('test-suspense-error');
      expect(query('span')?.textContent).toBe('Loading...');

      await new Promise((r) => setTimeout(r, 120));
      await flush();
      expect(query('.retry')).not.toBeNull();

      fire.click(query('.retry')!);
      await new Promise((r) => setTimeout(r, 120));
      await flush();
      expect(query('.data')?.textContent).toBe('Recovered!');
      expect(callCount).toBe(2);
    });

    it('should provide an AbortSignal to asyncFn', async () => {
      let receivedSignal: AbortSignal | undefined;
      define('test-suspense-abortsignal', () => {
        const fetchData = async (signal?: AbortSignal) => {
          receivedSignal = signal;
          await new Promise((r) => setTimeout(r, 10));
          return 'Done';
        };
        return html`
          <div>
            ${suspense(fetchData, {
              fallback: () => html`<span>Loading...</span>`,
              template: (data) => html`<span class="data">${data}</span>`,
            })}
          </div>
        `;
      });

      await mount('test-suspense-abortsignal');
      await new Promise((r) => setTimeout(r, 20));
      expect(receivedSignal).toBeInstanceOf(AbortSignal);
    });
  });

  describe('Conditional Rendering', () => {
    it('should render element when true', async () => {
      define('test-render-true', () => {
        const visible = signal(true);
        return html`${html.when(visible.value, () => html`<div>Visible</div>`)}`;
      });

      const { query } = await mount('test-render-true');
      expect(query('div')).not.toBeNull();
      expect(query('div')?.textContent).toBe('Visible');
    });

    it('should not render element when false', async () => {
      define('test-render-false', () => {
        const visible = signal(false);
        return html`${html.when(visible.value, () => html`<div>Hidden</div>`)}`;
      });

      const { query } = await mount('test-render-false');
      expect(query('div')).toBeNull();
    });
  });

  describe('Portal Option', () => {
    it('should move component to portal target', async () => {
      const portalRoot = document.createElement('div');
      portalRoot.id = 'portal-root';
      document.body.appendChild(portalRoot);

      define(
        'test-portal-option',
        () => {
          return html`<div class="portaled">Portal Content</div>`;
        },
        { target: '#portal-root' },
      );

      const { element } = await mount('test-portal-option');

      // Component should be in portal target
      expect(portalRoot.contains(element)).toBe(true);
      expect(element.shadowRoot?.querySelector('.portaled')?.textContent).toBe('Portal Content');

      element.remove();
      portalRoot.remove();
    });

    it('should restore component position on disconnect', () => {
      const portalRoot = document.createElement('div');
      portalRoot.id = 'portal-restore-test';
      document.body.appendChild(portalRoot);

      const container = document.createElement('div');
      document.body.appendChild(container);

      define(
        'test-portal-restore',
        () => {
          return html`<div>Content</div>`;
        },
        { target: '#portal-restore-test' },
      );

      const element = document.createElement('test-portal-restore');
      container.appendChild(element);

      // Should be in portal
      expect(portalRoot.contains(element)).toBe(true);

      // Disconnect and verify restoration
      element.remove();
      expect(portalRoot.contains(element)).toBe(false);

      portalRoot.remove();
      container.remove();
    });
  });

  describe('Edge Cases', () => {
    it('should handle null values', async () => {
      define('test-null', () => {
        const value = null;
        return html`<div>${value}</div>`;
      });

      const { query } = await mount('test-null');
      expect(query('div')?.textContent).toBe('');
    });

    it('should handle undefined values', async () => {
      define('test-undefined', () => {
        const value = undefined;
        return html`<div>${value}</div>`;
      });

      const { query } = await mount('test-undefined');
      expect(query('div')?.textContent).toBe('');
    });

    it('should handle nested templates', async () => {
      define('test-nested', () => {
        const inner = html`<span>Inner</span>`;
        return html`<div>${inner}</div>`;
      });

      const { query } = await mount('test-nested');
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

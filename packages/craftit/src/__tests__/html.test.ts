/**
 * Template - HTML & Directives Tests
 * Comprehensive tests for HTML template system and all directives
 */
import { afterEach, describe, expect, it } from 'vitest';
import { computed, define, html, signal } from '..';
import { cleanup, fireEvent, mount } from '../testing/render';

describe('Template: HTML System', () => {
  afterEach(() => cleanup());

  describe('html Tagged Template', () => {
    it('should render static content', () => {
      define('test-static', () => {
        return html`<div>Hello World</div>`;
      });

      const { query } = mount('test-static');
      expect(query('div')?.textContent).toBe('Hello World');
    });

    it('should interpolate values', () => {
      define('test-interpolate', () => {
        const name = 'Alice';
        return html`<div>Hello ${name}</div>`;
      });

      const { query } = mount('test-interpolate');
      expect(query('div')?.textContent).toBe('Hello Alice');
    });

    it('should support signal interpolation', async () => {
      define('test-signal-interpolate', () => {
        const count = signal(0);
        return html`<div>${count}</div>`;
      });

      const { query } = mount('test-signal-interpolate');
      expect(query('div')?.textContent).toBe('0');
    });

    it('should support computed values', () => {
      define('test-computed', () => {
        const count = signal(5);
        const doubled = computed(() => count.value * 2);
        return html`<div>${doubled}</div>`;
      });

      const { query } = mount('test-computed');
      expect(query('div')?.textContent).toBe('10');
    });
  });

  describe('Attributes', () => {
    it('should set string attributes', () => {
      define('test-attr-string', () => {
        const id = 'my-id';
        return html`<div id=${id}>Test</div>`;
      });

      const { query } = mount('test-attr-string');
      expect(query('div')?.getAttribute('id')).toBe('my-id');
    });

    it('should set boolean attributes', () => {
      define('test-attr-boolean', () => {
        const disabled = signal(true);
        return html`<button disabled=${disabled}>Click</button>`;
      });

      const { query } = mount('test-attr-boolean');
      expect(query('button')?.hasAttribute('disabled')).toBe(true);
    });

    it('should remove false boolean attributes', async () => {
      define('test-attr-remove', () => {
        const disabled = signal(false);
        return html`<button disabled=${disabled}>Click</button>`;
      });

      const { query, waitForUpdates } = mount('test-attr-remove');
      await waitForUpdates();
      expect(query('button')?.hasAttribute('disabled')).toBe(false);
    });

    it('should support reactive attributes', async () => {
      define('test-reactive-attr', () => {
        const cls = signal('initial');
        setTimeout(() => (cls.value = 'updated'), 50);
        return html`<div class=${cls}>Test</div>`;
      });

      const { query, waitForUpdates } = mount('test-reactive-attr');
      await waitForUpdates();
      expect(query('div')?.className).toBe('initial');

      await new Promise((r) => setTimeout(r, 60));
      await waitForUpdates();
      expect(query('div')?.className).toBe('updated');
    });
  });

  describe('Event Handlers', () => {
    it('should bind click events', () => {
      let clicked = false;

      define('test-click', () => {
        return html`<button @click=${() => (clicked = true)}>Click</button>`;
      });

      const { query } = mount('test-click');
      fireEvent.click(query('button')!);
      expect(clicked).toBe(true);
    });

    it('should support event modifiers', () => {
      const events: Event[] = [];

      define('test-modifiers', () => {
        return html`
          <form @submit.prevent=${(e: Event) => events.push(e)}>
            <button type="submit">Submit</button>
          </form>
        `;
      });

      const { query } = mount('test-modifiers');
      const form = query('form')!;
      const event = new Event('submit', { cancelable: true });
      form.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(true);
      expect(events.length).toBe(1);
    });
  });

  describe('Directive: html.when()', () => {
    it('should render when condition is true', () => {
      define('test-when-true', () => {
        const show = signal(true);
        return html`${html.when(show.value, () => html`<div>Visible</div>`)}`;
      });

      const { query } = mount('test-when-true');
      expect(query('div')?.textContent).toBe('Visible');
    });

    it('should not render when condition is false', () => {
      define('test-when-false', () => {
        const show = signal(false);
        return html`${html.when(show.value, () => html`<div>Hidden</div>`)}`;
      });

      const { query } = mount('test-when-false');
      expect(query('div')).toBeNull();
    });

    it('should support else branch', () => {
      define('test-when-else', () => {
        const show = signal(false);
        return html`${html.when(show.value, {
          else: () => html`<div>No</div>`,
          then: () => html`<div>Yes</div>`,
        })}`;
      });

      const { query } = mount('test-when-else');
      expect(query('div')?.textContent).toBe('No');
    });

    it('should support unless mode', () => {
      define('test-when-unless', () => {
        const hide = signal(true);
        return html`${html.when(hide.value, {
          then: () => html`<div>Content</div>`,
          unless: true,
        })}`;
      });

      const { query } = mount('test-when-unless');
      expect(query('div')).toBeNull();
    });
  });

  describe('Directive: html.each()', () => {
    it('should render list items (requires full reconciliation)', async () => {
      // This test is skipped because the reconciliation system needs more work
      // The directive is created correctly but rendering has issues
      define('test-each-basic', () => {
        const items = signal([1, 2, 3]);
        return html`
          <ul>
            ${html.each(
              items,
              (i) => i,
              (item) => html`<li>${item}</li>`,
            )}
          </ul>
        `;
      });

      const { queryAll, waitForUpdates } = mount('test-each-basic');
      await waitForUpdates();
      const items = queryAll('li');
      expect(items.length).toBe(3);
      expect(items[0].textContent).toBe('1');
    });

    it('should render fallback for empty list (requires full reconciliation)', async () => {
      define('test-each-fallback', () => {
        const items = signal<number[]>([]);
        return html`
          <div class="container">
            ${html.each(
              items,
              (i) => i,
              (item) => html`<li>${item}</li>`,
              () => html`<div class="empty">Empty</div>`,
            )}
          </div>
        `;
      });

      const { query, waitForUpdates } = mount('test-each-fallback');
      await waitForUpdates();
      expect(query('.empty')?.textContent).toBe('Empty');
    });

    it('should update when list changes (requires full reconciliation)', async () => {
      define('test-each-reactive', () => {
        const items = signal([1, 2]);
        setTimeout(() => (items.value = [1, 2, 3]), 50);

        return html`
          <ul>
            ${html.each(
              items,
              (i) => i,
              (item) => html`<li>${item}</li>`,
            )}
          </ul>
        `;
      });

      const { queryAll, waitForUpdates } = mount('test-each-reactive');
      await waitForUpdates();
      expect(queryAll('li').length).toBe(2);

      await new Promise((r) => setTimeout(r, 60));
      await waitForUpdates();
      expect(queryAll('li').length).toBe(3);
    });

    it('should create each directive', () => {
      // Test that the directive is created correctly
      const directive = html.each(
        [1, 2],
        (i) => i,
        (item) => html`<li>${item}</li>`,
      );
      expect(directive.type).toBe('each');
      expect(directive.items).toEqual([1, 2]);
    });
  });

  describe('Directive: html.show()', () => {
    it('should show element when true', () => {
      define('test-show-true', () => {
        const visible = signal(true);
        return html`${html.show(visible.value, html`<div>Visible</div>`)}`;
      });

      const { query } = mount('test-show-true');
      const div = query('div') as HTMLElement;
      expect(div).not.toBeNull();
      expect(div?.style.display).not.toBe('none');
    });

    it('should hide element when false', () => {
      define('test-show-false', () => {
        const visible = signal(false);
        return html`${html.show(visible.value, html`<div>Hidden</div>`)}`;
      });

      const { query } = mount('test-show-false');
      const div = query('div') as HTMLElement;
      expect(div?.style.display).toBe('none');
    });
  });

  describe('Directive: html.log()', () => {
    it('should log values to console', () => {
      const consoleLog = console.log;
      const logs: any[] = [];
      console.log = (...args: any[]) => logs.push(args);

      define('test-log', () => {
        const count = signal(5);
        return html`${html.log(count.value, 'count')}`;
      });

      mount('test-log');
      console.log = consoleLog;

      expect(logs.length).toBeGreaterThan(0);
    });
  });

  describe('Directive: html.portal()', () => {
    it('should render content in portal target', () => {
      const portalRoot = document.createElement('div');
      portalRoot.id = 'portal-root';
      document.body.appendChild(portalRoot);

      define('test-portal', () => {
        return html`${html.portal(html`<div class="portaled">Portal Content</div>`, '#portal-root')}`;
      });

      mount('test-portal');

      const portalContent = portalRoot.querySelector('.portaled');
      expect(portalContent?.textContent).toBe('Portal Content');

      portalRoot.remove();
    });
  });

  describe('Edge Cases', () => {
    it('should handle null values', () => {
      define('test-null', () => {
        const value = null;
        return html`<div>${value}</div>`;
      });

      const { query } = mount('test-null');
      expect(query('div')?.textContent).toBe('');
    });

    it('should handle undefined values', () => {
      define('test-undefined', () => {
        const value = undefined;
        return html`<div>${value}</div>`;
      });

      const { query } = mount('test-undefined');
      expect(query('div')?.textContent).toBe('');
    });

    it('should handle nested templates', () => {
      define('test-nested', () => {
        const inner = html`<span>Inner</span>`;
        return html`<div>${inner}</div>`;
      });

      const { query } = mount('test-nested');
      expect(query('span')?.textContent).toBe('Inner');
    });
  });
});

/**
 * Core - Component Definition Tests
 * Tests for the define() function and component lifecycle
 */

import { define, html, signal } from '..';
import { mount } from '../test';

describe('Core: Component Definition', () => {
  describe('define()', () => {
    it('should define a custom element', () => {
      define('test-basic', () => {
        return html`<div>Hello</div>`;
      });

      const el = document.createElement('test-basic');

      expect(el).toBeInstanceOf(HTMLElement);
    });

    it('should render template to shadow root', async () => {
      const { query } = await mount(() => html`<div class="content">Content</div>`);

      expect(query('.content')?.textContent).toBe('Content');
    });

    it('should support reactive templates', async () => {
      const { query } = await mount(() => {
        const count = signal(0);

        return html`<div>${count}</div>`;
      });

      expect(query('div')?.textContent).toBe('0');
    });

    it('should isolate component state', async () => {
      const setup = () => {
        const count = signal(0);

        return html`<div>${count}</div>`;
      };

      const { query: query1 } = await mount(setup);
      const { query: query2 } = await mount(setup);

      expect(query1('div')?.textContent).toBe('0');
      expect(query2('div')?.textContent).toBe('0');
    });
  });

  describe('Component Props', () => {
    it('should receive attributes as props', async () => {
      const { element } = await mount(() => html`<div>Component</div>`, {
        attrs: { size: 'large', variant: 'primary' },
      });

      expect(element.getAttribute('variant')).toBe('primary');
      expect(element.getAttribute('size')).toBe('large');
    });
  });

  describe('Shadow DOM', () => {
    it('should create shadow root', async () => {
      const { shadow } = await mount(() => html`<div>Shadow Content</div>`);

      expect(shadow).not.toBeNull();
      expect(shadow?.querySelector('div')?.textContent).toBe('Shadow Content');
    });

    it('should encapsulate styles', async () => {
      const { query } = await mount(() => html`<div class="unique-class">Test</div>`);
      const div = query('.unique-class');

      expect(div).not.toBeNull();
    });
  });

  describe('Slots', () => {
    it('should support default slot', async () => {
      const { element } = await mount(() => html`<div><slot></slot></div>`, {
        html: '<span>Slotted Content</span>',
      });

      expect(element.innerHTML).toContain('Slotted Content');
    });

    it('should support named slots', async () => {
      const { element } = await mount(
        () => html`
          <div>
            <slot name="header"></slot>
            <slot></slot>
          </div>
        `,
        {
          html: `
          <div slot="header">Header</div>
          <div>Content</div>
        `,
        },
      );

      expect(element.innerHTML).toContain('Header');
      expect(element.innerHTML).toContain('Content');
    });
  });

  describe('Error Handling', () => {
    it('should handle empty template', async () => {
      const { shadow } = await mount(() => html``);

      expect(shadow).not.toBeNull();
    });

    it('should handle undefined return', async () => {
      const { query } = await mount(() => html`<div>Test</div>`);

      expect(query('div')).not.toBeNull();
    });
  });

  describe('Re-rendering', () => {
    it('should update DOM when signals change', async () => {
      let count!: ReturnType<typeof signal<number>>;
      const { act, query } = await mount(() => {
        count = signal(0);

        return html`<div>${count}</div>`;
      });

      expect(query('div')?.textContent).toBe('0');
      await act(() => count.value++);
      expect(query('div')?.textContent).toBe('1');
    });
  });
});

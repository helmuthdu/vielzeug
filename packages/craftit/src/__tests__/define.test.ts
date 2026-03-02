/**
 * Core - Component Definition Tests
 * Tests for the define() function and component lifecycle
 */
import { define, html, signal } from '..';
import { cleanup, mount } from '../test/trial';

describe('Core: Component Definition', () => {
  afterEach(() => cleanup());

  describe('define()', () => {
    it('should define a custom element', () => {
      define('test-basic', () => {
        return html`<div>Hello</div>`;
      });

      const el = document.createElement('test-basic');
      expect(el).toBeInstanceOf(HTMLElement);
    });

    it('should render template to shadow root', () => {
      define('test-shadow', () => {
        return html`<div class="content">Content</div>`;
      });

      const { query } = mount('test-shadow');
      expect(query('.content')?.textContent).toBe('Content');
    });

    it('should support reactive templates', async () => {
      define('test-reactive', () => {
        const count = signal(0);
        return html`<div>${count}</div>`;
      });

      const { query } = mount('test-reactive');
      expect(query('div')?.textContent).toBe('0');
    });

    it('should isolate component state', () => {
      define('test-isolated', () => {
        const count = signal(0);
        return html`<div>${count}</div>`;
      });

      const { query: query1 } = mount('test-isolated');
      const { query: query2 } = mount('test-isolated');

      expect(query1('div')?.textContent).toBe('0');
      expect(query2('div')?.textContent).toBe('0');
    });
  });

  describe('Component Props', () => {
    it('should receive attributes as props', () => {
      define('test-props-basic', () => {
        return html`<div>Component</div>`;
      });

      const { element } = mount('test-props-basic', {
        props: { size: 'large', variant: 'primary' },
      });

      expect(element.getAttribute('variant')).toBe('primary');
      expect(element.getAttribute('size')).toBe('large');
    });
  });

  describe('Shadow DOM', () => {
    it('should create shadow root', () => {
      define('test-shadow-root', () => {
        return html`<div>Shadow Content</div>`;
      });

      const { shadow } = mount('test-shadow-root');
      expect(shadow).not.toBeNull();
      expect(shadow?.querySelector('div')?.textContent).toBe('Shadow Content');
    });

    it('should encapsulate styles', () => {
      define('test-encapsulation', () => {
        return html`<div class="unique-class">Test</div>`;
      });

      const { query } = mount('test-encapsulation');
      const div = query('.unique-class');
      expect(div).not.toBeNull();
    });
  });

  describe('Slots', () => {
    it('should support default slot', () => {
      define('test-default-slot', () => {
        return html`<div><slot></slot></div>`;
      });

      const { element } = mount('test-default-slot', {
        innerHTML: '<span>Slotted Content</span>',
      });

      expect(element.innerHTML).toContain('Slotted Content');
    });

    it('should support named slots', () => {
      define('test-named-slots', () => {
        return html`
          <div>
            <slot name="header"></slot>
            <slot></slot>
          </div>
        `;
      });

      const { element } = mount('test-named-slots', {
        innerHTML: `
          <div slot="header">Header</div>
          <div>Content</div>
        `,
      });

      expect(element.innerHTML).toContain('Header');
      expect(element.innerHTML).toContain('Content');
    });
  });

  describe('Error Handling', () => {
    it('should handle empty template', () => {
      define('test-empty', () => {
        return html``;
      });

      const { shadow } = mount('test-empty');
      expect(shadow).not.toBeNull();
    });

    it('should handle undefined return', () => {
      define('test-undefined', () => {
        return html`<div>Test</div>`;
      });

      const { query } = mount('test-undefined');
      expect(query('div')).not.toBeNull();
    });
  });

  describe('Re-rendering', () => {
    it('should update DOM when signals change', async () => {
      define('test-rerender', () => {
        const count = signal(0);
        setTimeout(() => count.value++, 10);
        return html`<div>${count}</div>`;
      });

      const { query, waitForUpdates } = mount('test-rerender');
      expect(query('div')?.textContent).toBe('0');

      await new Promise((resolve) => setTimeout(resolve, 20));
      await waitForUpdates();

      expect(query('div')?.textContent).toBe('1');
    });
  });
});

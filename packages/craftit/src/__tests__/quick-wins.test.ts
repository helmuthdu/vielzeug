/**
 * Quick Wins Tests
 * Tests for template caching, html.unsafe(), slots, and fragments
 */
import { define, html, signal } from '..';
import { mount } from '../testing/render';

describe('Quick Wins Features', () => {
  describe('1. Template Caching', () => {
    it('should cache template structure for performance', async () => {
      const count = signal(0);

      define('test-caching', () => {
        return html`
          <div>
            <p>Count: ${count}</p>
            <button>Increment</button>
          </div>
        `;
      });

      const { query, waitForUpdates, unmount } = mount('test-caching');
      await waitForUpdates();

      expect(query('p')?.textContent).toContain('Count: 0');

      // Update signal - template structure should be reused
      count.value = 1;
      await waitForUpdates();

      expect(query('p')?.textContent).toContain('Count: 1');
      // Template parsing is cached internally for performance

      unmount();
    });

    it('should handle complex templates with caching', async () => {
      const items = signal([1, 2, 3]);

      define('test-complex-cache', () => {
        return html`
          <ul>
            ${items.value.map(item => html`
              <li>Item ${item}</li>
            `)}
          </ul>
        `;
      });

      const { query, waitForUpdates, unmount } = mount('test-complex-cache');
      await waitForUpdates();

      expect(query('ul')?.children.length).toBe(3);

      unmount();
    });
  });

  describe('2. html.unsafe()', () => {
    it('should render raw HTML', async () => {
      const rawHtml = '<strong>Bold</strong> and <em>italic</em> text';

      define('test-unsafe', () => {
        return html`
          <div>
            ${html.unsafe(rawHtml)}
          </div>
        `;
      });

      const { query, waitForUpdates, unmount } = mount('test-unsafe');
      await waitForUpdates();

      const div = query('div');
      expect(div?.querySelector('strong')?.textContent).toBe('Bold');
      expect(div?.querySelector('em')?.textContent).toBe('italic');

      unmount();
    });

    it('should handle complex HTML structures', async () => {
      const complexHtml = `
        <div class="card">
          <header><h2>Title</h2></header>
          <main><p>Content</p></main>
          <footer><button>Action</button></footer>
        </div>
      `;

      define('test-unsafe-complex', () => {
        return html`
          <div class="container">
            ${html.unsafe(complexHtml)}
          </div>
        `;
      });

      const { query, waitForUpdates, unmount } = mount('test-unsafe-complex');
      await waitForUpdates();

      expect(query('.card header h2')?.textContent).toBe('Title');
      expect(query('.card main p')?.textContent).toBe('Content');
      expect(query('.card footer button')?.textContent).toBe('Action');

      unmount();
    });

    it('should work with CMS-like content', async () => {
      const cmsContent = `
        <article>
          <h1>Blog Post Title</h1>
          <p>First paragraph with <a href="#">link</a>.</p>
          <p>Second paragraph.</p>
        </article>
      `;

      define('test-cms-content', () => {
        return html`
          <div class="content">
            ${html.unsafe(cmsContent)}
          </div>
        `;
      });

      const { query, waitForUpdates, unmount } = mount('test-cms-content');
      await waitForUpdates();

      expect(query('article h1')?.textContent).toBe('Blog Post Title');
      expect(query('article a')?.textContent).toBe('link');

      unmount();
    });
  });

  describe('3. Slot Support', () => {
    it('should create default slot', async () => {
      define('test-slot-default', () => {
        return html`
          <div class="wrapper">
            ${html.slot()}
          </div>
        `;
      });

      const { query, waitForUpdates, unmount } = mount('test-slot-default');
      await waitForUpdates();

      const slot = query('slot');
      expect(slot).not.toBeNull();
      expect(slot?.getAttribute('name')).toBeNull();

      unmount();
    });

    it('should create named slot', async () => {
      define('test-slot-named', () => {
        return html`
          <div class="card">
            <header>${html.slot('header')}</header>
            <main>${html.slot()}</main>
            <footer>${html.slot('footer')}</footer>
          </div>
        `;
      });

      const { query, waitForUpdates, unmount } = mount('test-slot-named');
      await waitForUpdates();

      const headerSlot = query('header slot');
      const mainSlot = query('main slot');
      const footerSlot = query('footer slot');

      expect(headerSlot?.getAttribute('name')).toBe('header');
      expect(mainSlot?.getAttribute('name')).toBeNull();
      expect(footerSlot?.getAttribute('name')).toBe('footer');

      unmount();
    });

    it('should support multiple named slots', async () => {
      define('test-multiple-slots', () => {
        return html`
          <div class="layout">
            <aside>${html.slot('sidebar')}</aside>
            <main>${html.slot()}</main>
            <aside>${html.slot('actions')}</aside>
          </div>
        `;
      });

      const { query, waitForUpdates, unmount } = mount('test-multiple-slots');
      await waitForUpdates();

      const slots = query('.layout')?.querySelectorAll('slot');
      expect(slots?.length).toBe(3);

      unmount();
    });
  });

  describe('4. Template Fragments', () => {
    it('should support multiple root nodes', async () => {
      define('test-fragment-multi-root', () => {
        return html`
          <li>Item 1</li>
          <li>Item 2</li>
          <li>Item 3</li>
        `;
      });

      const { container, waitForUpdates, unmount } = mount('test-fragment-multi-root');
      await waitForUpdates();

      // Component's shadow root should contain multiple li elements
      const component = container.querySelector('test-fragment-multi-root');
      const shadowRoot = component?.shadowRoot;
      const items = shadowRoot?.querySelectorAll('li');

      expect(items?.length).toBe(3);
      expect(items?.[0].textContent).toBe('Item 1');
      expect(items?.[1].textContent).toBe('Item 2');
      expect(items?.[2].textContent).toBe('Item 3');

      unmount();
    });

    it('should handle fragments with signals', async () => {
      const show1 = signal(true);
      const show2 = signal(true);

      define('test-fragment-signals', () => {
        return html`
          ${show1.value ? html`<div class="first">First</div>` : ''}
          ${show2.value ? html`<div class="second">Second</div>` : ''}
        `;
      });

      const { query, waitForUpdates, unmount } = mount('test-fragment-signals');
      await waitForUpdates();

      expect(query('.first')).not.toBeNull();
      expect(query('.second')).not.toBeNull();

      show1.value = false;
      await waitForUpdates();

      expect(query('.first')).toBeNull();
      expect(query('.second')).not.toBeNull();

      unmount();
    });

    it('should work with html.fragment() helper', async () => {
      define('test-fragment-helper', () => {
        return html.fragment(
          html`<h1>Title</h1>`,
          html`<p>Paragraph</p>`,
          html`<footer>Footer</footer>`
        );
      });

      const { query, waitForUpdates, unmount } = mount('test-fragment-helper');
      await waitForUpdates();

      expect(query('h1')?.textContent).toBe('Title');
      expect(query('p')?.textContent).toBe('Paragraph');
      expect(query('footer')?.textContent).toBe('Footer');

      unmount();
    });

    it('should handle conditional fragments', async () => {
      const showHeader = signal(true);
      const showFooter = signal(true);

      define('test-conditional-fragments', () => {
        return html`
          ${showHeader.value ? html`<header>Header</header>` : ''}
          <main>Main content</main>
          ${showFooter.value ? html`<footer>Footer</footer>` : ''}
        `;
      });

      const { query, waitForUpdates, unmount } = mount('test-conditional-fragments');
      await waitForUpdates();

      expect(query('header')).not.toBeNull();
      expect(query('main')).not.toBeNull();
      expect(query('footer')).not.toBeNull();

      showHeader.value = false;
      await waitForUpdates();

      expect(query('header')).toBeNull();
      expect(query('main')).not.toBeNull();
      expect(query('footer')).not.toBeNull();

      unmount();
    });
  });

  describe('Integration: All Quick Wins Together', () => {
    it('should work together seamlessly', async () => {
      const items = signal([
        { id: 1, content: '<strong>Bold item 1</strong>' },
        { id: 2, content: '<em>Italic item 2</em>' },
      ]);

      define('test-all-quick-wins', () => {
        return html`
          <div class="container">
            ${html.slot('header')}
            
            <ul>
              ${items.value.map(item => html`
                <li>${html.unsafe(item.content)}</li>
              `)}
            </ul>
            
            ${html.slot('footer')}
          </div>
        `;
      });

      const { query, waitForUpdates, unmount } = mount('test-all-quick-wins');
      await waitForUpdates();

      // Check slots
      expect(query('[slot="header"], slot[name="header"]')).not.toBeNull();
      expect(query('[slot="footer"], slot[name="footer"]')).not.toBeNull();

      // Check unsafe HTML rendering
      expect(query('li strong')?.textContent).toBe('Bold item 1');
      expect(query('li em')?.textContent).toBe('Italic item 2');

      unmount();
    });
  });
});


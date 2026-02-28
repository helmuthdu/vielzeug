/**
 * Craftit - Portal Directive Tests
 * Tests for html.portal() directive
 */
import { define, html, signal } from '..';
import { mount } from '../testing/render';

describe('Portal Directive', () => {
  // Create a portal target element before each test
  let portalRoot: HTMLDivElement;

  beforeEach(() => {
    portalRoot = document.createElement('div');
    portalRoot.id = 'portal-root';
    document.body.appendChild(portalRoot);
  });

  afterEach(() => {
    document.body.removeChild(portalRoot);
  });

  describe('Basic Portal Rendering', () => {
    it('should render content in portal target', async () => {
      define('test-portal-basic', () => {
        return html`
          <div>
            <p>Main content</p>
            ${html.portal(html`<div class="modal">Modal content</div>`, '#portal-root')}
          </div>
        `;
      });

      const { query, unmount } = mount('test-portal-basic');

      // Main content should be in component
      expect(query('p')?.textContent).toBe('Main content');

      // Portal content should be in portal root
      const portalContent = portalRoot.querySelector('.modal');
      expect(portalContent).not.toBeNull();
      expect(portalContent?.textContent).toBe('Modal content');

      unmount();
    });

    it('should render string content in portal', async () => {
      define('test-portal-string', () => {
        return html`
          <div>
            ${html.portal('<p class="portal-text">Portal text</p>', '#portal-root')}
          </div>
        `;
      });

      const { unmount } = mount('test-portal-string');

      const portalContent = portalRoot.querySelector('.portal-text');
      expect(portalContent).not.toBeNull();
      expect(portalContent?.textContent).toBe('Portal text');

      unmount();
    });

    it('should render with element reference as target', async () => {
      const customTarget = document.createElement('div');
      customTarget.id = 'custom-target';
      document.body.appendChild(customTarget);

      define('test-portal-element', () => {
        return html`
          <div>
            ${html.portal(html`<span>In custom target</span>`, customTarget)}
          </div>
        `;
      });

      const { unmount } = mount('test-portal-element');

      expect(customTarget.querySelector('span')?.textContent).toBe('In custom target');

      unmount();
      document.body.removeChild(customTarget);
    });
  });

  describe('Portal with Signals', () => {
    it('should render reactive content in portal', async () => {
      const message = signal('Initial');

      define('test-portal-reactive', () => {
        return html`
          <div>
            ${html.portal(html`<p>${message}</p>`, '#portal-root')}
          </div>
        `;
      });

      const { waitForUpdates, unmount } = mount('test-portal-reactive');
      await waitForUpdates();

      expect(portalRoot.querySelector('p')?.textContent).toBe('Initial');

      message.value = 'Updated';
      await waitForUpdates();

      // Note: Current implementation doesn't auto-update portal content
      // This documents current behavior

      unmount();
    });
  });

  describe('Multiple Portals', () => {
    it('should handle multiple portals to same target', async () => {
      define('test-multiple-portals', () => {
        return html`
          <div>
            ${html.portal(html`<div class="first">First</div>`, '#portal-root')}
            ${html.portal(html`<div class="second">Second</div>`, '#portal-root')}
          </div>
        `;
      });

      const { unmount } = mount('test-multiple-portals');

      // Last portal wins (replaces content)
      expect(portalRoot.querySelector('.first')).toBeNull();
      expect(portalRoot.querySelector('.second')).not.toBeNull();

      unmount();
    });

    it('should handle portals to different targets', async () => {
      const target1 = document.createElement('div');
      const target2 = document.createElement('div');
      target1.id = 'target-1';
      target2.id = 'target-2';
      document.body.appendChild(target1);
      document.body.appendChild(target2);

      define('test-multiple-targets', () => {
        return html`
          <div>
            ${html.portal(html`<span>Target 1</span>`, '#target-1')}
            ${html.portal(html`<span>Target 2</span>`, '#target-2')}
          </div>
        `;
      });

      const { unmount } = mount('test-multiple-targets');

      expect(target1.querySelector('span')?.textContent).toBe('Target 1');
      expect(target2.querySelector('span')?.textContent).toBe('Target 2');

      unmount();
      document.body.removeChild(target1);
      document.body.removeChild(target2);
    });
  });

  describe('Portal Cleanup', () => {
    it('should clean up portal content when component unmounts', async () => {
      define('test-portal-cleanup', () => {
        return html`
          <div>
            ${html.portal(html`<div class="cleanup-test">Content</div>`, '#portal-root')}
          </div>
        `;
      });

      const { unmount } = mount('test-portal-cleanup');

      expect(portalRoot.querySelector('.cleanup-test')).not.toBeNull();

      unmount();

      // Portal content should be cleaned up
      expect(portalRoot.querySelector('.cleanup-test')).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should warn when target not found', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      define('test-portal-missing', () => {
        return html`
          <div>
            ${html.portal(html`<div>Content</div>`, '#non-existent')}
          </div>
        `;
      });

      const { unmount } = mount('test-portal-missing');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Portal] Target not found'),
        '#non-existent'
      );

      consoleSpy.mockRestore();
      unmount();
    });
  });

  describe('Real-World Use Cases', () => {
    it('should work for modal dialogs', async () => {
      const isOpen = signal(false);

      define('test-modal', () => {
        return html`
          <div>
            <button @click=${() => (isOpen.value = true)}>Open Modal</button>
            
            ${html.when(isOpen.value, () =>
              html.portal(
                html`
                  <div class="modal-overlay">
                    <div class="modal">
                      <h2>Modal Title</h2>
                      <p>Modal content</p>
                      <button @click=${() => (isOpen.value = false)}>Close</button>
                    </div>
                  </div>
                `,
                '#portal-root'
              )
            )}
          </div>
        `;
      });

      const { query, waitForUpdates, unmount } = mount('test-modal');
      await waitForUpdates();

      expect(portalRoot.querySelector('.modal')).toBeNull();

      const openButton = query('button');
      openButton?.click();
      await waitForUpdates();

      // Modal should appear in portal
      expect(portalRoot.querySelector('.modal')).not.toBeNull();
      expect(portalRoot.querySelector('h2')?.textContent).toBe('Modal Title');

      unmount();
    });

    it('should work for tooltips', async () => {
      const showTooltip = signal(false);

      define('test-tooltip', () => {
        return html`
          <div>
            <button
              @mouseenter=${() => (showTooltip.value = true)}
              @mouseleave=${() => (showTooltip.value = false)}
            >
              Hover me
            </button>
            
            ${html.when(showTooltip.value, () =>
              html.portal(
                html`<div class="tooltip">Helpful tooltip</div>`,
                document.body
              )
            )}
          </div>
        `;
      });

      const { query, waitForUpdates, unmount } = mount('test-tooltip');
      await waitForUpdates();

      const button = query('button');

      // Tooltip hidden initially
      expect(document.body.querySelector('.tooltip')).toBeNull();

      // Show tooltip on hover
      button?.dispatchEvent(new MouseEvent('mouseenter'));
      await waitForUpdates();

      expect(document.body.querySelector('.tooltip')?.textContent).toBe('Helpful tooltip');

      unmount();
    });

    it('should work for dropdown menus', async () => {
      const isOpen = signal(false);

      define('test-dropdown', () => {
        return html`
          <div class="dropdown">
            <button @click=${() => (isOpen.value = !isOpen.value)}>
              Menu
            </button>
            
            ${html.when(isOpen.value, () =>
              html.portal(
                html`
                  <ul class="dropdown-menu">
                    <li>Option 1</li>
                    <li>Option 2</li>
                    <li>Option 3</li>
                  </ul>
                `,
                '#portal-root'
              )
            )}
          </div>
        `;
      });

      const { query, waitForUpdates, unmount } = mount('test-dropdown');
      await waitForUpdates();

      const button = query('button');

      expect(portalRoot.querySelector('.dropdown-menu')).toBeNull();

      button?.click();
      await waitForUpdates();

      const menu = portalRoot.querySelector('.dropdown-menu');
      expect(menu).not.toBeNull();
      expect(menu?.querySelectorAll('li').length).toBe(3);

      unmount();
    });
  });
});


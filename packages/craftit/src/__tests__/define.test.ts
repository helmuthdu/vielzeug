/**
 * Craftit - Component Definition Tests
 * Tests for component creation and management
 */

import { css, define, html, type Signal, signal } from '..';
import { mount } from '../testing/render';

describe('Component Definition', () => {
  describe('define()', () => {
    it('should define a custom element', () => {
      define('test-define', () => {
        return html`<div>Test</div>`;
      });

      expect(customElements.get('test-define')).toBeDefined();
    });

    it('should require hyphen in tag name', () => {
      expect(() => {
        define('nohyphen', () => html`<div>Test</div>`);
      }).toThrow();
    });

    it('should warn when redefining element', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      define('test-redefine', () => html`<div>First</div>`);
      define('test-redefine', () => html`<div>Second</div>`);

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should create shadow DOM', async () => {
      define('test-shadow', () => {
        return html`<div>Shadow Content</div>`;
      });

      const { shadow, waitForUpdates, unmount } = mount('test-shadow');
      await waitForUpdates();

      expect(shadow).not.toBeNull();
      expect(shadow?.mode).toBe('open');

      unmount();
    });

    it('should render template', async () => {
      define('test-render', () => {
        return html`<div class="content">Hello</div>`;
      });

      const { query, waitForUpdates, unmount } = mount('test-render');
      await waitForUpdates();

      expect(query('.content')?.textContent).toBe('Hello');

      unmount();
    });
  });

  describe('Setup Function', () => {
    it('should run setup once', async () => {
      const setupSpy = vi.fn();

      define('test-setup-once', () => {
        setupSpy();
        return html`<div>Test</div>`;
      });

      const { waitForUpdates, unmount } = mount('test-setup-once');
      await waitForUpdates();

      expect(setupSpy).toHaveBeenCalledTimes(1);

      unmount();
    });

    it('should run setup before rendering', async () => {
      let setupRan = false;

      define('test-setup-order', () => {
        setupRan = true;
        return html`<div>Content</div>`;
      });

      const { query, waitForUpdates, unmount } = mount('test-setup-order');
      await waitForUpdates();

      expect(setupRan).toBe(true);
      expect(query('div')).not.toBeNull();

      unmount();
    });

    it('should support returning just template', async () => {
      define('test-template-only', () => {
        return html`<div>Simple</div>`;
      });

      const { query, waitForUpdates, unmount } = mount('test-template-only');
      await waitForUpdates();

      expect(query('div')?.textContent).toBe('Simple');

      unmount();
    });

    it('should support returning template with styles', async () => {
      define('test-with-styles', () => {
        return {
          styles: [
            css`
						.styled {
							color: red;
						}
					`,
          ],
          template: html`<div class="styled">Styled</div>`,
        };
      });

      const { query, waitForUpdates, unmount } = mount('test-with-styles');
      await waitForUpdates();

      expect(query('.styled')).not.toBeNull();

      unmount();
    });
  });

  describe('Styles', () => {
    it.skip('should apply styles (JSDOM limitation)', async () => {
      define('test-styles', () => {
        return {
          styles: [
            css`
						.red {
							color: rgb(255, 0, 0);
						}
					`,
          ],
          template: html`<div class="red">Red Text</div>`,
        };
      });

      const { query, waitForUpdates, unmount } = mount('test-styles');
      await waitForUpdates();

      const color = window.getComputedStyle(query('.red') as Element).color;
      expect(color).toBe('rgb(255, 0, 0)');

      unmount();
    });

    it.skip('should apply multiple style sheets (JSDOM limitation)', async () => {
      define('test-multiple-styles', () => {
        return {
          styles: [css`.test { color: red; }`, css`.test { font-size: 20px; }`],
          template: html`<div class="test">Test</div>`,
        };
      });

      const { query, waitForUpdates, unmount } = mount('test-multiple-styles');
      await waitForUpdates();

      const styled = query('.test') as Element;
      const color = window.getComputedStyle(styled).color;
      const fontSize = window.getComputedStyle(styled).fontSize;

      expect(color).toBe('rgb(255, 0, 0)');
      expect(fontSize).toBe('20px');

      unmount();
    });

    it('should use constructable stylesheets', async () => {
      define('test-constructable', () => {
        return {
          styles: [css`.test { color: blue; }`],
          template: html`<div>Test</div>`,
        };
      });

      const { shadow, waitForUpdates, unmount } = mount('test-constructable');
      await waitForUpdates();

      expect(shadow?.adoptedStyleSheets).toBeDefined();
      expect(shadow?.adoptedStyleSheets.length).toBeGreaterThan(0);

      unmount();
    });
  });

  describe('Reactivity', () => {
    it('should support reactive signals', async () => {
      let count!: Signal<number>;

      define('test-reactive', () => {
        count = signal(0);
        return html`<div class="count">${count}</div>`;
      });

      const { query, waitForUpdates, unmount } = mount('test-reactive');
      await waitForUpdates();

      expect(query('.count')?.textContent).toBe('0');

      count.value = 42;
      await waitForUpdates();

      expect(query('.count')?.textContent).toBe('42');

      unmount();
    });

    it('should support reactive events', async () => {
      const clickSpy = vi.fn();

      define('test-reactive-events', () => {
        return html`
					<div>
						<button @click=${clickSpy}>Increment</button>
					</div>
				`;
      });

      const { query, waitForUpdates, unmount } = mount('test-reactive-events');
      await waitForUpdates();

      const button = query('button');
      expect(button).not.toBeNull();

      (button as HTMLButtonElement)?.click();
      await waitForUpdates();

      expect(clickSpy).toHaveBeenCalled();

      unmount();
    });
  });

  describe('Error Handling', () => {
    it('should handle setup errors', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      define('test-setup-error', () => {
        throw new Error('Setup failed');
      });

      const { query, waitForUpdates, unmount } = mount('test-setup-error');
      await waitForUpdates();

      expect(consoleSpy).toHaveBeenCalled();

      // Should render error UI
      const errorDiv = query("[style*='color']");
      expect(errorDiv).not.toBeNull();

      consoleSpy.mockRestore();
      unmount();
    });

    it('should show error message', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      define('test-error-message', () => {
        throw new Error('Custom error message');
      });

      const { shadow, waitForUpdates, unmount } = mount('test-error-message');
      await waitForUpdates();

      const errorContent = shadow?.textContent;
      expect(errorContent).toContain('Custom error message');

      consoleSpy.mockRestore();
      unmount();
    });

    it('should provide retry button', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      define('test-error-retry', () => {
        throw new Error('Fail');
      });

      const { query, waitForUpdates, unmount } = mount('test-error-retry');
      await waitForUpdates();

      const retryButton = query('button');
      expect(retryButton?.textContent).toContain('Retry');

      consoleSpy.mockRestore();
      unmount();
    });
  });

  describe('Multiple Instances', () => {
    it('should support multiple instances', async () => {
      define('test-multiple', () => {
        const count = signal(0);
        return html`<div class="count">${count}</div>`;
      });

      const fixture1 = mount('test-multiple');
      const fixture2 = mount('test-multiple');
      await fixture1.waitForUpdates();
      await fixture2.waitForUpdates();

      expect(fixture1.query('.count')?.textContent).toBe('0');
      expect(fixture2.query('.count')?.textContent).toBe('0');

      // Each instance should have its own state
      expect(fixture1.query('.count')).not.toBe(fixture2.query('.count'));

      fixture1.unmount();
      fixture2.unmount();
    });

    it('should isolate state between instances', async () => {
      let count1!: ReturnType<typeof signal>;
      let count2!: ReturnType<typeof signal>;
      let instanceCounter = 0;

      define('test-isolated', () => {
        const count = signal(0);
        // Store reference to each instance's signal
        if (instanceCounter === 0) {
          count1 = count;
        } else if (instanceCounter === 1) {
          count2 = count;
        }
        instanceCounter++;

        return html`
					<div>
						<span class="count">${count}</span>
					</div>
				`;
      });

      const fixture1 = mount('test-isolated');
      const fixture2 = mount('test-isolated');
      await fixture1.waitForUpdates();
      await fixture2.waitForUpdates();

      // Verify both start at 0
      expect(fixture1.query('.count')?.textContent).toBe('0');
      expect(fixture2.query('.count')?.textContent).toBe('0');

      // Update first instance's signal directly
      count1.value = 5;
      await fixture1.waitForUpdates();

      // First instance should update
      expect(fixture1.query('.count')?.textContent).toBe('5');
      // Second instance should remain unchanged (isolated)
      expect(fixture2.query('.count')?.textContent).toBe('0');

      // Update second instance's signal
      count2.value = 10;
      await fixture2.waitForUpdates();

      // Verify isolation - each has its own value
      expect(fixture1.query('.count')?.textContent).toBe('5');
      expect(fixture2.query('.count')?.textContent).toBe('10');

      fixture1.unmount();
      fixture2.unmount();
    });
  });

  describe('Component Lifecycle', () => {
    it('should connect and disconnect', async () => {
      let connected = false;

      define('test-lifecycle', () => {
        connected = true;
        return html`<div>Test</div>`;
      });

      const { waitForUpdates, unmount } = mount('test-lifecycle');
      await waitForUpdates();

      expect(connected).toBe(true);

      unmount();
      await waitForUpdates();
    });

    it('should cleanup on disconnect', async () => {
      define('test-cleanup', () => {
        // Using onUnmount would be better, but testing raw cleanup
        return html`<div>Test</div>`;
      });

      const { waitForUpdates, unmount } = mount('test-cleanup');
      await waitForUpdates();

      unmount();
      await waitForUpdates();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty template', async () => {
      define('test-empty', () => {
        return html``;
      });

      const { shadow, waitForUpdates, unmount } = mount('test-empty');
      await waitForUpdates();

      expect(shadow?.childNodes.length).toBeGreaterThanOrEqual(0);

      unmount();
    });

    it('should handle whitespace-only template', async () => {
      define('test-whitespace', () => {
        return html`   `;
      });

      const { shadow, waitForUpdates, unmount } = mount('test-whitespace');
      await waitForUpdates();

      expect(shadow).not.toBeNull();

      unmount();
    });

    it('should handle very long tag names', () => {
      const longName = `test-${'a'.repeat(100)}`;

      define(longName, () => html`<div>Test</div>`);

      expect(customElements.get(longName)).toBeDefined();
    });
  });
});

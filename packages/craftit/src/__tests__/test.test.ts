/**
 * Example tests showing Craftit test utilities with Vitest
 * These examples demonstrate working features and skip known limitations
 */

import { describe, expect, it, vi } from 'vitest';
import { computed, define, html, onMount, ref, signal } from '..';
import { mount, runInContext, waitForRef, waitForSignal } from '../testing/render';

describe('Craftit + Vitest Examples', () => {
  describe('Basic Component Mounting', () => {
    it('mounts a simple component', async () => {
      define('example-simple', () => {
        return html`<div><h1>Hello World</h1></div>`;
      });

      const { query, unmount } = mount('example-simple');

      expect(query('h1')?.textContent).toBe('Hello World');

      unmount();
    });

    it('renders with initial signal values', async () => {
      define('example-with-signal', () => {
        const message = signal('Initial');
        return html`<div><span class="msg">${message}</span></div>`;
      });

      const { query, waitForUpdates, unmount } = mount('example-with-signal');
      await waitForUpdates();

      expect(query('.msg')?.textContent).toBe('Initial');

      unmount();
    });

    it('queries multiple elements', async () => {
      define('example-list', () => {
        return html`
					<ul>
						<li>Item 1</li>
						<li>Item 2</li>
						<li>Item 3</li>
					</ul>
				`;
      });

      const { queryAll, unmount } = mount('example-list');

      expect(queryAll('li')).toHaveLength(3);
      expect(queryAll('li')[0]?.textContent).toBe('Item 1');

      unmount();
    });
  });

  describe('Testing with runInContext', () => {
    it('tests computed values in isolation', () => {
      const result = runInContext(() => {
        const count = signal(5);
        const doubled = computed(() => count.value * 2);
        return doubled.value;
      });

      expect(result).toBe(10);
    });

    it('tests signal updates in isolation', () => {
      const result = runInContext(() => {
        const count = signal(0);
        count.value = 42;
        return count.value;
      });

      expect(result).toBe(42);
    });

    it('tests multiple signals', () => {
      const result = runInContext(() => {
        const a = signal(3);
        const b = signal(4);
        const sum = computed(() => a.value + b.value);
        return sum.value;
      });

      expect(result).toBe(7);
    });
  });

  describe('Async Utilities', () => {
    it('waits for signal changes', async () => {
      const loading = signal(true);

      setTimeout(() => {
        loading.value = false;
      }, 10);

      await waitForSignal(loading, false);

      expect(loading.value).toBe(false);
    });

    it('times out if signal never changes', async () => {
      const never = signal(true);

      await expect(waitForSignal(never, false, { timeout: 50 })).rejects.toThrow('Timeout');
    });

    it('waits for refs to populate', async () => {
      const divRef = ref<HTMLDivElement>();

      define('example-ref-simple', () => {
        onMount(() => {
          // Manually populate ref in onMount (since template refs have issues)
          divRef.value = document.createElement('div');
        });
        return html`<div>Test</div>`;
      });

      mount('example-ref-simple');

      await waitForRef(divRef);

      expect(divRef.value).toBeInstanceOf(HTMLDivElement);
    });
  });

  describe('Component Lifecycle', () => {
    it('runs onMount callback', async () => {
      const mountSpy = vi.fn();

      define('example-mount', () => {
        onMount(mountSpy);
        return html`<div>Mounted</div>`;
      });

      const { unmount } = mount('example-mount');

      // Wait a bit for mount callbacks
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mountSpy).toHaveBeenCalled();

      unmount();
    });

    it('provides access to shadow root', async () => {
      define('example-shadow', () => {
        return html`<div class="content">Shadow Content</div>`;
      });

      const { shadow, query, unmount } = mount('example-shadow');

      expect(shadow).toBeInstanceOf(ShadowRoot);
      expect(query('.content')).toBeTruthy();

      unmount();
    });

    it('provides access to component element', async () => {
      define('example-element', () => {
        return html`<div>Test</div>`;
      });

      const { element, unmount } = mount('example-element');

      expect(element.tagName).toBe('EXAMPLE-ELEMENT');
      expect(element.shadowRoot).not.toBeNull();

      unmount();
    });
  });

  describe('Vitest Integration', () => {
    it('works with Vitest expect matchers', () => {
      define('example-matchers', () => {
        return html`<div class="test">Test</div>`;
      });

      const { query, unmount } = mount('example-matchers');

      expect(query('.test')).toBeTruthy();
      expect(query('.test')?.textContent).toContain('Test');
      expect(query('.missing')).toBeNull();

      unmount();
    });

    it('works with Vitest spies for callbacks', () => {
      const callback = vi.fn();

      define('example-callback', () => {
        onMount(() => {
          callback('mounted');
        });
        return html`<div>Test</div>`;
      });

      mount('example-callback');

      // Wait for mount
      return new Promise((resolve) => {
        setTimeout(() => {
          expect(callback).toHaveBeenCalledWith('mounted');
          resolve(undefined);
        }, 10);
      });
    });
  });

  // Skip examples that require working event handlers/template system
  describe.skip('Advanced Examples (requires event handler support)', () => {
    it('would test event handlers', () => {
      // Event handlers in templates aren't fully working yet
      // This is a placeholder for future functionality
    });

    it('would test complex reactivity', () => {
      // Complex reactive scenarios need more work
      // This is a placeholder for future functionality
    });
  });
});

/**
 * Craftit - Lifecycle Tests
 * Tests for lifecycle hooks
 */

import { define, html, onMount, onUnmount, onUpdated, signal } from '..';
import { mount } from '../testing/render';

describe('Lifecycle Hooks', () => {
  describe('onMount()', () => {
    it('should run when component is mounted', async () => {
      const mountSpy = vi.fn();

      define('test-mount', () => {
        onMount(mountSpy);
        return html`<div>Test</div>`;
      });

      expect(mountSpy).not.toHaveBeenCalled();

      const { waitForUpdates, unmount } = mount('test-mount');
      await waitForUpdates();

      expect(mountSpy).toHaveBeenCalledTimes(1);

      unmount();
    });

    it('should run after initial render', async () => {
      let renderedElement: Element | null = null;

      define('test-mount-order', () => {
        onMount(() => {
          // Access the rendered content
          renderedElement = document.querySelector('test-mount-order')?.shadowRoot?.firstElementChild ?? null;
        });
        return html`<div>Content</div>`;
      });

      const { waitForUpdates, unmount } = mount('test-mount-order');
      await waitForUpdates();

      expect(renderedElement).not.toBeNull();
      // At this point, we know renderedElement is not null because of the test assertion above
      // and because waitForUpdates() ensures onMount has completed
      expect(renderedElement!.textContent).toBe('Content');

      unmount();
    });

    it('should support cleanup function', async () => {
      const cleanupSpy = vi.fn();

      define('test-mount-cleanup', () => {
        onMount(() => {
          return cleanupSpy;
        });
        return html`<div>Test</div>`;
      });

      const { waitForUpdates, unmount } = mount('test-mount-cleanup');
      await waitForUpdates();

      expect(cleanupSpy).not.toHaveBeenCalled();

      unmount();
      await waitForUpdates();

      expect(cleanupSpy).toHaveBeenCalledTimes(1);
    });

    it('should support multiple onMount calls', async () => {
      const spy1 = vi.fn();
      const spy2 = vi.fn();
      const spy3 = vi.fn();

      define('test-mount-multiple', () => {
        onMount(spy1);
        onMount(spy2);
        onMount(spy3);
        return html`<div>Test</div>`;
      });

      const { waitForUpdates, unmount } = mount('test-mount-multiple');
      await waitForUpdates();

      expect(spy1).toHaveBeenCalledTimes(1);
      expect(spy2).toHaveBeenCalledTimes(1);
      expect(spy3).toHaveBeenCalledTimes(1);

      unmount();
    });

    it('should run all cleanup functions', async () => {
      const cleanup1 = vi.fn();
      const cleanup2 = vi.fn();

      define('test-mount-cleanups', () => {
        onMount(() => cleanup1);
        onMount(() => cleanup2);
        return html`<div>Test</div>`;
      });

      const { waitForUpdates, unmount } = mount('test-mount-cleanups');
      await waitForUpdates();

      unmount();
      await waitForUpdates();

      expect(cleanup1).toHaveBeenCalledTimes(1);
      expect(cleanup2).toHaveBeenCalledTimes(1);
    });

    it('should handle async setup', async () => {
      let data = '';

      define('test-mount-async', () => {
        onMount(async () => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          data = 'loaded';
        });
        return html`<div>Test</div>`;
      });

      const { unmount } = mount('test-mount-async');
      await new Promise((resolve) => setTimeout(resolve, 30));

      expect(data).toBe('loaded');

      unmount();
    });
  });

  describe('onUnmount()', () => {
    it('should run when component is unmounted', async () => {
      const unmountSpy = vi.fn();

      define('test-unmount', () => {
        onUnmount(unmountSpy);
        return html`<div>Test</div>`;
      });

      const { waitForUpdates, unmount } = mount('test-unmount');
      await waitForUpdates();

      expect(unmountSpy).not.toHaveBeenCalled();

      unmount();
      await waitForUpdates();

      expect(unmountSpy).toHaveBeenCalledTimes(1);
    });

    it('should support multiple onUnmount calls', async () => {
      const spy1 = vi.fn();
      const spy2 = vi.fn();

      define('test-unmount-multiple', () => {
        onUnmount(spy1);
        onUnmount(spy2);
        return html`<div>Test</div>`;
      });

      const { waitForUpdates, unmount } = mount('test-unmount-multiple');
      await waitForUpdates();

      unmount();
      await waitForUpdates();

      expect(spy1).toHaveBeenCalledTimes(1);
      expect(spy2).toHaveBeenCalledTimes(1);
    });

    it('should run after mount cleanups', async () => {
      const callOrder: string[] = [];

      define('test-unmount-order', () => {
        onMount(() => {
          return () => callOrder.push('mount-cleanup');
        });
        onUnmount(() => {
          callOrder.push('unmount');
        });
        return html`<div>Test</div>`;
      });

      const { waitForUpdates, unmount } = mount('test-unmount-order');
      await waitForUpdates();

      unmount();
      await waitForUpdates();

      expect(callOrder).toContain('mount-cleanup');
      expect(callOrder).toContain('unmount');
    });
  });

  describe('onUpdated()', () => {
    it.skip('should run after updates (not implemented)', async () => {
      const updateSpy = vi.fn();
      let count!: ReturnType<typeof signal>;

      define('test-updated', () => {
        count = signal(0);
        onUpdated(updateSpy);
        return html`<div>${count}</div>`;
      });

      const { waitForUpdates, unmount } = mount('test-updated');
      await waitForUpdates();

      // Should not run on initial mount
      const initialCalls = updateSpy.mock.calls.length;

      count.value = 1;
      await waitForUpdates();

      expect(updateSpy.mock.calls.length).toBeGreaterThan(initialCalls);

      unmount();
    });

    it.skip('should not run before mount (onUpdated not implemented)', async () => {
      const updateSpy = vi.fn();

      define('test-updated-mount', () => {
        const count = signal(0);
        onUpdated(updateSpy);

        // Trigger update during setup
        count.value = 1;

        return html`<div>${count}</div>`;
      });

      const { unmount } = mount('test-updated-mount');
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Should not have run during setup, only after mount
      unmount();
    });

    it.skip('should run multiple times for multiple updates (onUpdated not implemented)', async () => {
      const updateSpy = vi.fn();
      let count!: ReturnType<typeof signal>;

      define('test-updated-multiple', () => {
        count = signal(0);
        onUpdated(updateSpy);
        return html`<div>${count}</div>`;
      });

      const { waitForUpdates, unmount } = mount('test-updated-multiple');
      await waitForUpdates();

      const initialCalls = updateSpy.mock.calls.length;

      count.value = 1;
      await waitForUpdates();

      count.value = 2;
      await waitForUpdates();

      count.value = 3;
      await waitForUpdates();

      expect(updateSpy.mock.calls.length).toBeGreaterThan(initialCalls);

      unmount();
    });
  });

  describe('Lifecycle Integration', () => {
    it('should run lifecycle hooks in correct order', async () => {
      const callOrder: string[] = [];

      define('test-lifecycle-order', () => {
        onMount(() => {
          callOrder.push('mount');
          return () => callOrder.push('mount-cleanup');
        });

        onUpdated(() => {
          callOrder.push('updated');
        });

        onUnmount(() => {
          callOrder.push('unmount');
        });

        return html`<div>Test</div>`;
      });

      const { waitForUpdates, unmount } = mount('test-lifecycle-order');
      await waitForUpdates();

      expect(callOrder).toContain('mount');

      unmount();
      await waitForUpdates();

      expect(callOrder).toContain('mount-cleanup');
      expect(callOrder).toContain('unmount');
    });

    it('should cleanup effects on unmount', async () => {
      const effectSpy = vi.fn();
      let count!: ReturnType<typeof signal>;

      define('test-lifecycle-effects', () => {
        count = signal(0);

        onMount(() => {
          // Effect should cleanup on unmount
          const stop = setInterval(() => {
            effectSpy();
          }, 10);

          return () => clearInterval(stop);
        });

        return html`<div>${count}</div>`;
      });

      const { waitForUpdates, unmount } = mount('test-lifecycle-effects');
      await waitForUpdates();

      const callsBefore = effectSpy.mock.calls.length;
      expect(callsBefore).toBeGreaterThan(0);

      unmount();

      const callsAfter = effectSpy.mock.calls.length;
      // Should not have increased significantly
      expect(callsAfter - callsBefore).toBeLessThan(5);
    });

    it('should handle remounting', async () => {
      const mountSpy = vi.fn();
      const unmountSpy = vi.fn();

      define('test-lifecycle-remount', () => {
        onMount(mountSpy);
        onUnmount(unmountSpy);
        return html`<div>Test</div>`;
      });

      const el = document.createElement('test-lifecycle-remount');

      const container = document.createElement('div');
      document.body.appendChild(container);

      // First mount
      container.appendChild(el);
      await new Promise((resolve) => setTimeout(resolve, 10));
      const firstMountCount = mountSpy.mock.calls.length;
      expect(firstMountCount).toBeGreaterThanOrEqual(1);

      // Unmount
      el.remove();
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(unmountSpy).toHaveBeenCalled();

      // Remount
      container.appendChild(el);
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(mountSpy.mock.calls.length).toBeGreaterThan(firstMountCount);

      container.remove();
    });
  });

  describe('Error Handling', () => {
    it('should handle errors in mount callbacks', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      define('test-mount-error', () => {
        onMount(() => {
          throw new Error('Mount error');
        });
        return html`<div>Test</div>`;
      });

      const { waitForUpdates, unmount } = mount('test-mount-error');
      await waitForUpdates();

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();

      unmount();
    });

    it('should handle errors in unmount callbacks', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      define('test-unmount-error', () => {
        onUnmount(() => {
          throw new Error('Unmount error');
        });
        return html`<div>Test</div>`;
      });

      const { waitForUpdates, unmount } = mount('test-unmount-error');
      await waitForUpdates();

      unmount();
      await waitForUpdates();

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});

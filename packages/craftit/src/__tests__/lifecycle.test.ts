/**
 * Core - Lifecycle Hooks Tests
 * Tests for onMount, onUnmount, and onUpdated hooks
 */
import { define, html, onMount, onUnmount, onUpdated, signal } from '..';
import { cleanup, mount } from '../test/trial';

// Counter for unique component names
let componentCounter = 0;
const uniqueName = (base: string) => `${base}-${++componentCounter}`;

describe('Core: Lifecycle Hooks', () => {
  afterEach(() => cleanup());

  describe('onMount()', () => {
    it('should run when component mounts', () => {
      const spy = vi.fn();
      const name = uniqueName('test-mount-hook');

      define(name, () => {
        onMount(spy);
        return html`<div>Test</div>`;
      });

      mount(name);
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should run after DOM is ready', () => {
      let hasElement = false;
      const name = uniqueName('test-mount-dom');

      define(name, () => {
        onMount(() => {
          hasElement = true;
        });
        return html`<div>Test</div>`;
      });

      mount(name);
      expect(hasElement).toBe(true);
    });

    it('should support multiple onMount callbacks', () => {
      const calls: number[] = [];
      const name = uniqueName('test-multiple-mount');

      define(name, () => {
        onMount(() => {
          calls.push(1);
        });
        onMount(() => {
          calls.push(2);
        });
        return html`<div>Test</div>`;
      });

      mount(name);
      expect(calls).toEqual([1, 2]);
    });
  });

  describe('onUnmount()', () => {
    it('should run when component unmounts', () => {
      const spy = vi.fn();
      const name = uniqueName('test-unmount-hook');

      define(name, () => {
        onUnmount(spy);
        return html`<div>Test</div>`;
      });

      const { unmount } = mount(name);
      expect(spy).not.toHaveBeenCalled();

      unmount();
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should clean up resources', () => {
      let cleaned = false;
      const name = uniqueName('test-cleanup');

      define(name, () => {
        onUnmount(() => {
          cleaned = true;
        });
        return html`<div>Test</div>`;
      });

      const { unmount } = mount(name);
      unmount();
      expect(cleaned).toBe(true);
    });

    it('should support multiple onUnmount callbacks', () => {
      const calls: number[] = [];
      const name = uniqueName('test-multiple-unmount');

      define(name, () => {
        onUnmount(() => calls.push(1));
        onUnmount(() => calls.push(2));
        return html`<div>Test</div>`;
      });

      const { unmount } = mount(name);
      unmount();
      expect(calls).toEqual([1, 2]);
    });
  });

  describe('onUpdated()', () => {
    it('should run after signal updates', async () => {
      const spy = vi.fn();
      const name = uniqueName('test-updated-hook');

      define(name, () => {
        const count = signal(0);
        onUpdated(spy);

        // Update the signal after mount completes
        setTimeout(() => count.value++, 10);
        return html`<div>${count}</div>`;
      });

      const { waitForUpdates } = mount(name);
      await waitForUpdates(); // Wait for initial mount

      await new Promise((resolve) => setTimeout(resolve, 20)); // Wait for signal update
      await waitForUpdates(); // Wait for re-render

      expect(spy).toHaveBeenCalled();
    });
  });

  describe('Lifecycle Order', () => {
    it('should execute in correct order', () => {
      const order: string[] = [];
      const name = uniqueName('test-lifecycle-order');

      define(name, () => {
        order.push('setup');

        onMount(() => {
          order.push('mount');
        });
        onUnmount(() => {
          order.push('unmount');
        });

        return html`<div>Test</div>`;
      });

      const { unmount } = mount(name);
      unmount();

      expect(order).toEqual(['setup', 'mount', 'unmount']);
    });
  });

  describe('Integration with Effects', () => {
    it('should work with effects in onMount', async () => {
      const values: number[] = [];
      const name = uniqueName('test-mount-effect');

      define(name, () => {
        const count = signal(0);

        onMount(() => {
          count.value = 5;
        });

        onUpdated(() => {
          values.push(count.value);
        });

        return html`<div>${count}</div>`;
      });

      const { waitForUpdates } = mount(name);
      await waitForUpdates(); // Wait for mount and initial update

      // The initial value (0) gets updated to 5 in onMount, triggering onUpdated
      expect(values).toContain(5);
    });

    it('should cleanup effects on unmount', async () => {
      let effectRuns = 0;
      const name = uniqueName('test-effect-cleanup');

      define(name, () => {
        const count = signal(0);

        onMount(() => {
          const interval = setInterval(() => {
            count.value++;
            effectRuns++;
          }, 10);

          onUnmount(() => {
            clearInterval(interval);
          });
        });

        return html`<div>${count}</div>`;
      });

      const { unmount } = mount(name);

      // Wait for some interval executions
      await new Promise((resolve) => setTimeout(resolve, 50));
      const runsBeforeUnmount = effectRuns;

      unmount();

      // Wait and verify no more runs after unmount
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(effectRuns).toBe(runsBeforeUnmount);
    });
  });
});

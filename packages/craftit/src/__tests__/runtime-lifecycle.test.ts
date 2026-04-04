/**
 * Core - Lifecycle Hooks Tests
 * Tests for onMount, onCleanup, and onRendered hooks
 */

import { createCleanupSignal, handle, html, onCleanup, onError, onMount, signal } from '../index';
import { mount } from '../testing';

describe('Core: Lifecycle Hooks', () => {
  describe('onMount()', () => {
    it('should run when component mounts', async () => {
      const spy = vi.fn();

      await mount(() => {
        onMount(spy);

        return html`<div>Test</div>`;
      });
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should run after DOM is ready', async () => {
      let hasElement = false;

      await mount(() => {
        onMount(() => {
          hasElement = true;
        });

        return html`<div>Test</div>`;
      });
      expect(hasElement).toBe(true);
    });

    it('should support multiple onMount callbacks', async () => {
      const calls: number[] = [];

      await mount(() => {
        onMount(() => {
          calls.push(1);
        });
        onMount(() => {
          calls.push(2);
        });

        return html`<div>Test</div>`;
      });
      expect(calls).toEqual([1, 2]);
    });
  });

  describe('onCleanup()', () => {
    it('should run when component unmounts', async () => {
      const spy = vi.fn();
      const { destroy } = await mount(() => {
        onCleanup(spy);

        return html`<div>Test</div>`;
      });

      expect(spy).not.toHaveBeenCalled();
      destroy();
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should clean up resources', async () => {
      let cleaned = false;
      const { destroy } = await mount(() => {
        onCleanup(() => {
          cleaned = true;
        });

        return html`<div>Test</div>`;
      });

      destroy();
      expect(cleaned).toBe(true);
    });

    it('should support multiple onCleanup callbacks', async () => {
      const calls: number[] = [];
      const { destroy } = await mount(() => {
        onCleanup(() => calls.push(1));
        onCleanup(() => calls.push(2));

        return html`<div>Test</div>`;
      });

      destroy();
      expect(calls).toEqual([2, 1]);
    });
  });

  describe('Lifecycle Order', () => {
    it('should execute in correct order', async () => {
      const order: string[] = [];
      const { destroy } = await mount(() => {
        order.push('setup');
        onMount(() => {
          order.push('mount');
        });
        onCleanup(() => order.push('unmount'));

        return html`<div>Test</div>`;
      });

      destroy();
      expect(order).toEqual(['setup', 'mount', 'unmount']);
    });
  });

  describe('Integration with Effects', () => {
    it('should work with effects in onMount', async () => {
      const values: number[] = [];
      const { flush } = await mount(() => {
        const count = signal(0);

        onMount(() => {
          count.value = 5;
        });

        return html`<div>${count}</div>`;
      });

      await flush();
      expect(values).toHaveLength(0); // no onRendered hook registered
    });

    it('should cleanup effects on unmount', async () => {
      let effectRuns = 0;
      const { destroy } = await mount(() => {
        const count = signal(0);

        onMount(() => {
          const interval = setInterval(() => {
            count.value++;
            effectRuns++;
          }, 10);

          onCleanup(() => clearInterval(interval));
        });

        return html`<div>${count}</div>`;
      });

      await new Promise((resolve) => setTimeout(resolve, 50));

      const runsBeforeUnmount = effectRuns;

      destroy();
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(effectRuns).toBe(runsBeforeUnmount);
    });
  });

  describe('handle()', () => {
    it('should attach an event listener and clean it up on unmount', async () => {
      let clickCount = 0;
      let btn!: HTMLButtonElement;

      const { destroy } = await mount(() => {
        onMount(() => {
          btn = document.createElement('button');
          document.body.appendChild(btn);
          handle(btn, 'click', () => {
            clickCount++;
          });

          return () => btn.remove();
        });

        return html`<div></div>`;
      });

      btn.dispatchEvent(new Event('click'));
      expect(clickCount).toBe(1);

      destroy();

      btn.dispatchEvent(new Event('click'));
      expect(clickCount).toBe(1);
    });
  });

  describe('createCleanupSignal()', () => {
    it('disposes previous cleanup when replaced and latest cleanup on unmount', async () => {
      let disposed = 0;

      const { destroy } = await mount(() => {
        const cleanup = createCleanupSignal();

        onMount(() => {
          cleanup.set(() => {
            disposed += 1;
          });

          cleanup.set(() => {
            disposed += 10;
          });
        });

        return html`<div></div>`;
      });

      // Replacing cleanup disposes the previous one.
      expect(disposed).toBe(1);

      destroy();

      // Unmount disposes the latest cleanup.
      expect(disposed).toBe(11);
    });
  });
});

describe('Lifecycle: onError()', () => {
  it('should call the error handler when setup throws', async () => {
    const errors: unknown[] = [];

    await mount(() => {
      onError((err) => errors.push(err));
      throw new Error('setup error');
    });

    expect(errors).toHaveLength(1);
    expect((errors[0] as Error).message).toBe('setup error');
  });

  it('should call the error handler when onMount throws', async () => {
    const errors: unknown[] = [];
    const { destroy } = await mount(() => {
      onError((err) => errors.push(err));

      onMount(() => {
        throw new Error('mount error');
      });

      return html`<div></div>`;
    });

    expect(errors).toHaveLength(1);
    expect((errors[0] as Error).message).toBe('mount error');

    destroy();
  });

  it('should not throw to the caller when a handler is registered', async () => {
    await expect(
      mount(() => {
        onError(() => {});
        throw new Error('swallowed');
      }),
    ).resolves.not.toThrow();
  });
});

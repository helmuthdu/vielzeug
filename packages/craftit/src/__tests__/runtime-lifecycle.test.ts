/**
 * Core - Lifecycle Hooks Tests
 * Tests for mount, onCleanup, and handle hooks
 */

import { handle, html, onCleanup, signal } from '../index';
import { mount } from '../testing';

describe('Core: mount() lifecycle', () => {
  it('should run mount callback after component renders', async () => {
    const spy = vi.fn();

    await mount(() => ({
      mount: spy,
      render: () => html`<div>Test</div>`,
    }));
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('should have access to DOM when mount runs', async () => {
    let hasElement = false;

    await mount(() => ({
      mount() {
        hasElement = true;
      },
      render: () => html`<div>Test</div>`,
    }));
    expect(hasElement).toBe(true);
  });

  it('should register mount cleanup that runs on unmount', async () => {
    const spy = vi.fn();

    const { destroy } = await mount(() => ({
      mount: () => spy,
      render: () => html`<div>Test</div>`,
    }));

    expect(spy).not.toHaveBeenCalled();
    destroy();
    expect(spy).toHaveBeenCalledTimes(1);
  });
});

describe('Core: Lifecycle Order', () => {
  it('should execute in correct order: setup → mount → unmount', async () => {
    const order: string[] = [];
    const { destroy } = await mount(() => {
      order.push('setup');

      return {
        mount() {
          order.push('mount');

          return () => order.push('unmount');
        },
        render: () => html`<div>Test</div>`,
      };
    });

    destroy();
    expect(order).toEqual(['setup', 'mount', 'unmount']);
  });
});

describe('Core: onCleanup()', () => {
  it('should run when component unmounts', async () => {
    const spy = vi.fn();
    const { destroy } = await mount(() => {
      onCleanup(spy);

      return { render: () => html`<div>Test</div>` };
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

      return { render: () => html`<div>Test</div>` };
    });

    destroy();
    expect(cleaned).toBe(true);
  });

  it('should support multiple onCleanup callbacks', async () => {
    const calls: number[] = [];
    const { destroy } = await mount(() => {
      onCleanup(() => calls.push(1));
      onCleanup(() => calls.push(2));

      return { render: () => html`<div>Test</div>` };
    });

    destroy();
    expect(calls).toEqual([2, 1]);
  });
});

describe('Core: mount + cleanup integration', () => {
  it('should cleanup effects on unmount', async () => {
    let effectRuns = 0;
    const { destroy } = await mount(() => {
      const count = signal(0);

      return {
        mount() {
          const interval = setInterval(() => {
            count.value++;
            effectRuns++;
          }, 10);

          return () => clearInterval(interval);
        },
        render: () => html`<div>${count}</div>`,
      };
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

    const { destroy } = await mount(() => ({
      mount() {
        btn = document.createElement('button');
        document.body.appendChild(btn);
        handle(btn, 'click', () => {
          clickCount++;
        });

        return () => btn.remove();
      },
      render: () => html`<div></div>`,
    }));

    btn.dispatchEvent(new Event('click'));
    expect(clickCount).toBe(1);

    destroy();

    btn.dispatchEvent(new Event('click'));
    expect(clickCount).toBe(1);
  });
});

describe('imperative cleanup pattern', () => {
  it('disposes previous cleanup when replaced and latest cleanup on unmount', async () => {
    let disposed = 0;

    const { destroy } = await mount(() => ({
      mount() {
        let cleanup: (() => void) | null = null;

        const setCleanup = (next: (() => void) | null) => {
          cleanup?.();
          cleanup = next;
        };

        setCleanup(() => {
          disposed += 1;
        });

        setCleanup(() => {
          disposed += 10;
        });

        onCleanup(() => {
          cleanup?.();
          cleanup = null;
        });
      },
      render: () => html`<div></div>`,
    }));

    // Replacing cleanup disposes the previous one.
    expect(disposed).toBe(1);

    destroy();

    // Unmount disposes the latest cleanup.
    expect(disposed).toBe(11);
  });
});

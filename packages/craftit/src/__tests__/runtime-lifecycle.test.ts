/**
 * Runtime lifecycle tests
 */

import { on, html, onCleanup, onMounted, signal } from '../index';
import { mount } from '../testing';

describe('runtime lifecycle: onMounted', () => {
  it('runs mount callback after component renders', async () => {
    const spy = vi.fn();

    await mount(() => {
      onMounted(spy);

      return () => html`<div>Test</div>`;
    });
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('provides DOM access when mount callback runs', async () => {
    let hasElement = false;

    await mount(() => {
      onMounted(() => {
        hasElement = true;
      });

      return () => html`<div>Test</div>`;
    });
    expect(hasElement).toBe(true);
  });

  it('runs mount cleanup on unmount', async () => {
    const spy = vi.fn();

    const { destroy } = await mount(() => {
      onMounted(() => spy);

      return () => html`<div>Test</div>`;
    });

    expect(spy).not.toHaveBeenCalled();
    destroy();
    expect(spy).toHaveBeenCalledTimes(1);
  });
});

describe('runtime lifecycle: execution order', () => {
  it('executes setup -> mount -> unmount in order', async () => {
    const order: string[] = [];
    const { destroy } = await mount(() => {
      order.push('setup');

      onMounted(() => {
        order.push('mount');

        return () => order.push('unmount');
      });

      return () => html`<div>Test</div>`;
    });

    destroy();
    expect(order).toEqual(['setup', 'mount', 'unmount']);
  });
});

describe('runtime lifecycle: onCleanup', () => {
  it('runs callbacks when component unmounts', async () => {
    const spy = vi.fn();
    const { destroy } = await mount(() => {
      onCleanup(spy);

      return () => html`<div>Test</div>`;
    });

    expect(spy).not.toHaveBeenCalled();
    destroy();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('supports resource cleanup side effects', async () => {
    let cleaned = false;
    const { destroy } = await mount(() => {
      onCleanup(() => {
        cleaned = true;
      });

      return () => html`<div>Test</div>`;
    });

    destroy();
    expect(cleaned).toBe(true);
  });

  it('runs multiple cleanup callbacks in LIFO order', async () => {
    const calls: number[] = [];
    const { destroy } = await mount(() => {
      onCleanup(() => calls.push(1));
      onCleanup(() => calls.push(2));

      return () => html`<div>Test</div>`;
    });

    destroy();
    expect(calls).toEqual([2, 1]);
  });
});

describe('runtime lifecycle: mount + cleanup integration', () => {
  it('stops mount-owned async work on unmount', async () => {
    let effectRuns = 0;
    const { destroy } = await mount(() => {
      const count = signal(0);

      onMounted(() => {
        const interval = setInterval(() => {
          count.value++;
          effectRuns++;
        }, 10);

        return () => clearInterval(interval);
      });

      return () => html`<div>${count}</div>`;
    });

    await new Promise((resolve) => setTimeout(resolve, 50));

    const runsBeforeUnmount = effectRuns;

    destroy();
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(effectRuns).toBe(runsBeforeUnmount);
  });
});

describe('on()', () => {
  it('attaches listener and cleans it up on unmount', async () => {
    let clickCount = 0;
    let btn!: HTMLButtonElement;

    const { destroy } = await mount(() => {
      onMounted(() => {
        btn = document.createElement('button');
        document.body.appendChild(btn);
        on(btn, 'click', () => {
          clickCount++;
        });

        return () => btn.remove();
      });

      return () => html`<div></div>`;
    });

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

    const { destroy } = await mount(() => {
      onMounted(() => {
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
      });

      return () => html`<div></div>`;
    });

    // Replacing cleanup disposes the previous one.
    expect(disposed).toBe(1);

    destroy();

    // Unmount disposes the latest cleanup.
    expect(disposed).toBe(11);
  });
});

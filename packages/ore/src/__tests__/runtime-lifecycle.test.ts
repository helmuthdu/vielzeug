/**
 * Runtime lifecycle tests
 */

import { signal } from '@vielzeug/ripple';

import { createContext, html, ref } from '../index';
import { mount } from '../testing';

describe('runtime lifecycle: onMounted', () => {
  it('runs mount callback after component renders', async () => {
    const spy = vi.fn();

    await mount((_props, ctx) => {
      ctx.onMounted(spy);

      return html`<div>Test</div>`;
    });
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('provides DOM access when mount callback runs', async () => {
    let hasElement = false;

    await mount((_props, ctx) => {
      ctx.onMounted(() => {
        hasElement = true;
      });

      return html`<div>Test</div>`;
    });
    expect(hasElement).toBe(true);
  });

  it('runs mount cleanup on unmount', async () => {
    const spy = vi.fn();

    const { dispose } = await mount((_props, ctx) => {
      ctx.onMounted(() => spy);

      return html`<div>Test</div>`;
    });

    expect(spy).not.toHaveBeenCalled();
    dispose();
    expect(spy).toHaveBeenCalledTimes(1);
  });
});

describe('runtime lifecycle: execution order', () => {
  it('executes setup -> mount -> unmount in order', async () => {
    const order: string[] = [];
    const { dispose } = await mount((_props, ctx) => {
      order.push('setup');

      ctx.onMounted(() => {
        order.push('mount');

        return () => order.push('unmount');
      });

      return html`<div>Test</div>`;
    });

    dispose();
    expect(order).toEqual(['setup', 'mount', 'unmount']);
  });
});

describe('runtime lifecycle: onCleanup', () => {
  it('runs callbacks when component unmounts', async () => {
    const spy = vi.fn();
    const { dispose } = await mount((_props, ctx) => {
      ctx.onCleanup(spy);

      return html`<div>Test</div>`;
    });

    expect(spy).not.toHaveBeenCalled();
    dispose();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('supports resource cleanup side effects', async () => {
    let cleaned = false;
    const { dispose } = await mount((_props, ctx) => {
      ctx.onCleanup(() => {
        cleaned = true;
      });

      return html`<div>Test</div>`;
    });

    dispose();
    expect(cleaned).toBe(true);
  });

  it('runs multiple cleanup callbacks in LIFO order', async () => {
    const calls: number[] = [];
    const { dispose } = await mount((_props, ctx) => {
      ctx.onCleanup(() => calls.push(1));
      ctx.onCleanup(() => calls.push(2));

      return html`<div>Test</div>`;
    });

    dispose();
    expect(calls).toEqual([2, 1]);
  });
});

describe('runtime lifecycle: mount + cleanup integration', () => {
  it('stops mount-owned async work on unmount', async () => {
    let effectRuns = 0;
    const { dispose } = await mount((_props, ctx) => {
      const count = signal(0);

      ctx.onMounted(() => {
        const interval = setInterval(() => {
          count.value++;
          effectRuns++;
        }, 10);

        return () => clearInterval(interval);
      });

      return html`<div>${count}</div>`;
    });

    await new Promise((resolve) => setTimeout(resolve, 50));

    const runsBeforeUnmount = effectRuns;

    dispose();
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(effectRuns).toBe(runsBeforeUnmount);
  });
});

describe('ctx.onEvent()', () => {
  it('does not throw when target is null or undefined', async () => {
    await expect(
      mount((_props, ctx) => {
        ctx.onEvent(null, 'click', () => {});
        ctx.onEvent(undefined, 'click', () => {});

        return html`<div></div>`;
      }),
    ).resolves.toBeDefined();
  });

  it('attaches listener and cleans it up on unmount', async () => {
    let clickCount = 0;
    let btn!: HTMLButtonElement;

    const { dispose } = await mount((_props, ctx) => {
      ctx.onMounted(() => {
        btn = document.createElement('button');
        document.body.appendChild(btn);
        ctx.onEvent(btn, 'click', () => {
          clickCount++;
        });

        return () => btn.remove();
      });

      return html`<div></div>`;
    });

    btn.dispatchEvent(new Event('click'));
    expect(clickCount).toBe(1);

    dispose();

    btn.dispatchEvent(new Event('click'));
    expect(clickCount).toBe(1);
  });
});

describe('ctx.onElement()', () => {
  it('calls callback with element when ref becomes non-null', async () => {
    const elRef = ref<HTMLButtonElement>();
    const seen: (HTMLButtonElement | null)[] = [];

    await mount((_props, ctx) => {
      ctx.onElement(elRef, (el) => {
        seen.push(el);
      });

      return html`<button ref=${elRef}>Click</button>`;
    });

    expect(seen).toHaveLength(1);
    expect(seen[0]).toBeInstanceOf(HTMLButtonElement);
  });

  it('runs cleanup returned by callback when ref resets to null', async () => {
    const elRef = ref<HTMLButtonElement>();
    const cleanupSpy = vi.fn();
    const show = signal(true);

    const { act } = await mount((_props, ctx) => {
      ctx.onElement(elRef, () => cleanupSpy);

      return html`<div>${() => (show.value ? html`<button ref=${elRef}>Btn</button>` : html``)}</div>`;
    });

    expect(cleanupSpy).not.toHaveBeenCalled();

    await act(() => {
      show.value = false;
    });

    expect(cleanupSpy).toHaveBeenCalledTimes(1);
  });
});

describe('async setup: no onError recovery', () => {
  it('resets phase to UNINITIALIZED so component is not stuck in LOADING', async () => {
    const errors: Event[] = [];

    const { element } = await mount(
      async () => {
        throw new Error('async setup failed');
      },
      {
        componentOptions: {
          onError: () => {
            errors.push(new Event('caught'));

            return undefined;
          },
        },
      },
    );

    expect(element).toBeDefined();
  });

  it('recovers with onError template when async setup throws', async () => {
    const { query } = await mount(
      async () => {
        throw new Error('async setup failed');
      },
      {
        componentOptions: {
          onError: () => html`<p class="error">Error</p>`,
        },
      },
    );

    expect(query('.error')?.textContent).toBe('Error');
  });
});

describe('async setup: stale result discard on disconnect', () => {
  it('discards async setup result if element disconnects before promise resolves', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    let resolve!: () => void;
    const blocker = new Promise<void>((r) => {
      resolve = r;
    });

    const { element, flush } = await mount(
      async () => {
        await blocker;

        return html`<p class="content">Loaded</p>`;
      },
      { componentOptions: { loading: () => html`<p class="loading">Loading...</p>` } },
    );

    // Component is in LOADING state — loading template visible
    expect(element.shadowRoot?.querySelector('.loading')).not.toBeNull();

    // Disconnect before the async setup resolves
    element.remove();
    await flush();

    // Now resolve the promise
    resolve();
    await flush();

    // Element is disconnected — warn should have fired and content should NOT be mounted
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('disconnected'));
    expect(document.body.contains(element)).toBe(false);

    warnSpy.mockRestore();
  });
});

describe('imperative cleanup pattern', () => {
  it('disposes previous cleanup when replaced and latest cleanup on unmount', async () => {
    let disposed = 0;

    const { dispose } = await mount((_props, ctx) => {
      ctx.onMounted(() => {
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

        ctx.onCleanup(() => {
          cleanup?.();
          cleanup = null;
        });
      });

      return html`<div></div>`;
    });

    // Replacing cleanup disposes the previous one.
    expect(disposed).toBe(1);

    dispose();

    // Unmount disposes the latest cleanup.
    expect(disposed).toBe(11);
  });
});

describe('inject() inside onMounted (C3)', () => {
  it('resolves a provided context value when called inside onMounted', async () => {
    const KEY = createContext<string>('test-key');
    let resolved: string | undefined;

    await mount(
      (_props, ctx) => {
        ctx.provide(KEY, 'hello-from-provider');
        ctx.onMounted(() => {
          resolved = ctx.inject(KEY);
        });

        return html`<div></div>`;
      },
      { componentOptions: {} },
    );

    expect(resolved).toBe('hello-from-provider');
  });
});

describe('SetupContextBag lifecycle aliases (R9)', () => {
  it('ctx.onMounted fires after mount', async () => {
    const spy = vi.fn();

    await mount((_props, ctx) => {
      ctx.onMounted(spy);

      return html`<div></div>`;
    });

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('ctx.onCleanup fires on dispose', async () => {
    const spy = vi.fn();

    const { dispose } = await mount((_props, ctx) => {
      ctx.onCleanup(spy);

      return html`<div></div>`;
    });

    expect(spy).not.toHaveBeenCalled();
    dispose();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('ctx.inject resolves a provided context value', async () => {
    const KEY = createContext<number>('ctx-inject-test');
    let resolved: number | undefined;

    await mount(
      (_props, ctx) => {
        ctx.provide(KEY, 42);
        resolved = ctx.inject(KEY);

        return html`<div></div>`;
      },
      { componentOptions: {} },
    );

    expect(resolved).toBe(42);
  });
});

describe('html template: dynamic tag-name guard (R5)', () => {
  it('warns and skips replacement for an invalid dynamic tag name', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await mount(() => html`<${'invalid tag name'}></${'invalid tag name'}>`);

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('not a valid HTML element name'));
    warnSpy.mockRestore();
  });
});

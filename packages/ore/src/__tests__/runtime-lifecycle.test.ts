/**
 * Runtime lifecycle tests
 */

import { signal } from '@vielzeug/ripple';

import {
  bind,
  createContext,
  getHost,
  html,
  inject,
  OreApiError,
  onCleanup,
  onElement,
  onEvent,
  onFormReset,
  onMounted,
  provide,
  ref,
  watchEffect,
} from '../index';
import { flush, mount } from '../testing';

describe('runtime lifecycle: onMounted', () => {
  it('runs mount callback after component renders', async () => {
    const spy = vi.fn();

    await mount((_props) => {
      onMounted(spy);

      return html`
        <div>Test</div>
      `;
    });
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('provides DOM access when mount callback runs', async () => {
    let hasElement = false;

    await mount((_props) => {
      onMounted(() => {
        hasElement = true;
      });

      return html`
        <div>Test</div>
      `;
    });
    expect(hasElement).toBe(true);
  });

  it('runs mount cleanup on unmount', async () => {
    const spy = vi.fn();

    const { dispose } = await mount((_props) => {
      onMounted(() => spy);

      return html`
        <div>Test</div>
      `;
    });

    expect(spy).not.toHaveBeenCalled();
    dispose();
    await Promise.resolve(); // teardown lands one microtask after disconnect
    expect(spy).toHaveBeenCalledTimes(1);
  });
});

describe('runtime lifecycle: execution order', () => {
  it('executes setup -> mount -> unmount in order', async () => {
    const order: string[] = [];
    const { dispose } = await mount((_props) => {
      order.push('setup');
      onMounted(() => {
        order.push('mount');

        return () => order.push('unmount');
      });

      return html`
        <div>Test</div>
      `;
    });

    dispose();
    await Promise.resolve();
    expect(order).toEqual(['setup', 'mount', 'unmount']);
  });
});

describe('runtime lifecycle: ownership outside setup', () => {
  it('watchEffect() throws outside setup instead of creating an unowned effect', () => {
    expect(() => watchEffect(() => undefined)).toThrow(OreApiError);
  });

  it('onCleanup() throws outside setup', () => {
    expect(() => onCleanup(() => undefined)).toThrow(OreApiError);
  });

  it('bind() with an explicit target works outside setup and returns its own disposer', () => {
    const el = document.createElement('div');
    const label = signal('a');
    const stop = bind({ attr: { 'aria-label': label } }, { target: el });

    expect(el.getAttribute('aria-label')).toBe('a');
    label.value = 'b';
    expect(el.getAttribute('aria-label')).toBe('b');

    stop();
    label.value = 'c';
    expect(el.getAttribute('aria-label')).toBe('b');
  });
});

describe('runtime lifecycle: onCleanup', () => {
  it('runs callbacks when component unmounts', async () => {
    const spy = vi.fn();
    const { dispose } = await mount((_props) => {
      onCleanup(spy);

      return html`
        <div>Test</div>
      `;
    });

    expect(spy).not.toHaveBeenCalled();
    dispose();
    await Promise.resolve();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('supports resource cleanup side effects', async () => {
    let cleaned = false;
    const { dispose } = await mount((_props) => {
      onCleanup(() => {
        cleaned = true;
      });

      return html`
        <div>Test</div>
      `;
    });

    dispose();
    await Promise.resolve();
    expect(cleaned).toBe(true);
  });

  it('runs multiple cleanup callbacks in LIFO order', async () => {
    const calls: number[] = [];
    const { dispose } = await mount((_props) => {
      onCleanup(() => calls.push(1));
      onCleanup(() => calls.push(2));

      return html`
        <div>Test</div>
      `;
    });

    dispose();
    await Promise.resolve();
    expect(calls).toEqual([2, 1]);
  });
});

describe('runtime lifecycle: mount + cleanup integration', () => {
  it('stops mount-owned async work on unmount', async () => {
    let effectRuns = 0;
    const { dispose } = await mount((_props) => {
      const count = signal(0);

      onMounted(() => {
        const interval = setInterval(() => {
          count.value++;
          effectRuns++;
        }, 10);

        return () => clearInterval(interval);
      });

      return html`
        <div>${count}</div>
      `;
    });

    await new Promise((resolve) => setTimeout(resolve, 50));

    const runsBeforeUnmount = effectRuns;

    dispose();
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(effectRuns).toBe(runsBeforeUnmount);
  });
});

describe('onEvent()', () => {
  it('does not throw when target is null or undefined', async () => {
    await expect(
      mount((_props) => {
        onEvent(null, 'click', () => {});
        onEvent(undefined, 'click', () => {});

        return html`
          <div></div>
        `;
      }),
    ).resolves.toBeDefined();
  });

  it('attaches listener and cleans it up on unmount', async () => {
    let clickCount = 0;
    let btn!: HTMLButtonElement;

    const { dispose } = await mount((_props) => {
      onMounted(() => {
        btn = document.createElement('button');
        document.body.appendChild(btn);
        onEvent(btn, 'click', () => {
          clickCount++;
        });

        return () => btn.remove();
      });

      return html`
        <div></div>
      `;
    });

    btn.dispatchEvent(new Event('click'));
    expect(clickCount).toBe(1);

    dispose();
    await Promise.resolve();

    btn.dispatchEvent(new Event('click'));
    expect(clickCount).toBe(1);
  });
});

describe('onElement()', () => {
  it('calls callback with element when ref becomes non-null', async () => {
    const elRef = ref<HTMLButtonElement>();
    const seen: (HTMLButtonElement | null)[] = [];

    await mount((_props) => {
      onElement(elRef, (el) => {
        seen.push(el);
      });

      return html`
        <button ref=${elRef}>Click</button>
      `;
    });

    expect(seen).toHaveLength(1);
    expect(seen[0]).toBeInstanceOf(HTMLButtonElement);
  });

  it('runs cleanup returned by callback when ref resets to null', async () => {
    const elRef = ref<HTMLButtonElement>();
    const cleanupSpy = vi.fn();
    const show = signal(true);

    const { act } = await mount((_props) => {
      onElement(elRef, () => cleanupSpy);

      return html`
        <div>
          ${() =>
            show.value
              ? html`
                  <button ref=${elRef}>Btn</button>
                `
              : html``}
        </div>
      `;
    });

    expect(cleanupSpy).not.toHaveBeenCalled();

    await act(() => {
      show.value = false;
    });

    expect(cleanupSpy).toHaveBeenCalledTimes(1);
  });
});

describe('onFormReset()', () => {
  it('runs every registered callback, in order, each time the ancestor form resets', async () => {
    const form = document.createElement('form');

    document.body.appendChild(form);

    const calls: number[] = [];

    const fixture = await mount(
      () => {
        onFormReset(() => calls.push(1));
        onFormReset(() => calls.push(2));

        return html`
          <div></div>
        `;
      },
      { componentOptions: { formAssociated: true }, container: form },
    );

    form.reset();
    expect(calls).toEqual([1, 2]);

    form.reset();
    expect(calls).toEqual([1, 2, 1, 2]);

    fixture.dispose();
    form.remove();
  });

  it('does not fire after the component has disconnected', async () => {
    const form = document.createElement('form');

    document.body.appendChild(form);

    const spy = vi.fn();

    const fixture = await mount(
      () => {
        onFormReset(spy);

        return html`
          <div></div>
        `;
      },
      { componentOptions: { formAssociated: true }, container: form },
    );

    fixture.dispose();
    form.reset();

    expect(spy).not.toHaveBeenCalled();
    form.remove();
  });
});

describe('setup return value', () => {
  it('rejects a promise returned by untyped JavaScript consumers', async () => {
    await expect(
      mount((() =>
        Promise.resolve(html`
          <p>Later</p>
        `)) as unknown as Parameters<typeof mount>[0]),
    ).rejects.toThrow('setup() must return an HTMLResult or null');
  });
});

describe('imperative cleanup pattern', () => {
  it('disposes previous cleanup when replaced and latest cleanup on unmount', async () => {
    let disposed = 0;

    const { dispose } = await mount((_props) => {
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

      return html`
        <div></div>
      `;
    });

    // Replacing cleanup disposes the previous one.
    expect(disposed).toBe(1);

    dispose();

    // Unmount disposes the latest cleanup (one microtask after disconnect).
    await Promise.resolve();
    expect(disposed).toBe(11);
  });
});

describe('inject() inside onMounted (C3)', () => {
  it('resolves a provided context value when called inside onMounted', async () => {
    const KEY = createContext<string>('test-key');
    let resolved: string | undefined;

    await mount(
      (_props) => {
        provide(KEY, 'hello-from-provider');
        onMounted(() => {
          resolved = inject(KEY);
        });

        return html`
          <div></div>
        `;
      },
      { componentOptions: {} },
    );

    expect(resolved).toBe('hello-from-provider');
  });
});

describe('provide() cleanup on disconnect/reconnect', () => {
  it('does not warn about overwriting on reconnect', async () => {
    const KEY = createContext<string>('reconnect-key');
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const { element } = await mount((_props) => {
      provide(KEY, 'value');

      return html` <div></div> `;
    });

    element.remove();
    await flush();
    document.body.appendChild(element);
    await flush();

    expect(warnSpy).not.toHaveBeenCalledWith(expect.stringContaining('key already provided'));

    warnSpy.mockRestore();
  });

  it('removes stale context keys after disconnect', async () => {
    const KEY = createContext<string>('stale-key');
    let resolved: string | undefined;
    let firstConnect = true;

    const { element } = await mount((_props) => {
      if (firstConnect) provide(KEY, 'first');

      firstConnect = false;

      return html` <div></div> `;
    });

    element.remove();
    await flush();

    document.body.appendChild(element);
    await flush();

    const { element: child } = await mount(
      (_props) => {
        resolved = inject(KEY);

        return html` <div></div> `;
      },
      { container: element.shadowRoot ?? undefined },
    );

    expect(resolved).toBeUndefined();

    child.remove();
    element.remove();
  });
});

describe('lifecycle hook aliases (R9)', () => {
  it('onMounted fires after mount', async () => {
    const spy = vi.fn();

    await mount((_props) => {
      onMounted(spy);

      return html`
        <div></div>
      `;
    });

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('onCleanup fires on dispose', async () => {
    const spy = vi.fn();

    const { dispose } = await mount((_props) => {
      onCleanup(spy);

      return html`
        <div></div>
      `;
    });

    expect(spy).not.toHaveBeenCalled();
    dispose();
    await Promise.resolve();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('inject resolves a provided context value', async () => {
    const KEY = createContext<number>('ctx-inject-test');
    let resolved: number | undefined;

    await mount(
      (_props) => {
        provide(KEY, 42);
        resolved = inject(KEY);

        return html`
          <div></div>
        `;
      },
      { componentOptions: {} },
    );

    expect(resolved).toBe(42);
  });
});

describe('testing/flush(): deterministic pending-work draining', () => {
  it('settles a deeply nested chain of self-registering onMounted callbacks with a single default flush()', async () => {
    // Regression test: flush() used to drain a fixed, guessed number of microtask turns
    // (5 by default, 12 via the now-removed FLUSH_DEEP): a chain deeper than that would
    // silently leave later callbacks unrun. It's now deterministic: it waits for exactly as
    // much scheduled mount-callback work as is actually pending, however many microtask
    // turns that takes. Ten levels deep comfortably exceeds the old default.
    const DEPTH = 10;
    let ranDepth = 0;

    const { flush } = await mount(() => {
      const registerNested = (remaining: number): void => {
        onMounted(() => {
          ranDepth++;

          if (remaining > 0) registerNested(remaining - 1);
        });
      };

      registerNested(DEPTH);

      return html`
        <div></div>
      `;
    });

    await flush();

    expect(ranDepth).toBe(DEPTH + 1);
  });
});

describe('same-turn node moves are not lifecycle boundaries', () => {
  it('keeps scope, state, and mounted DOM across a reparent', async () => {
    let setups = 0;
    const cleanups = vi.fn();

    const { element, query } = await mount((_props) => {
      setups++;

      const local = signal(0);

      onEvent(getHost(), 'bump', () => local.value++);
      onCleanup(cleanups);

      return html`
        <span class="v">${() => String(local.value)}</span>
      `;
    });

    const span = query('.v');

    expect(span).toBeDefined();
    element.dispatchEvent(new CustomEvent('bump'));
    expect(span?.textContent).toBe('1');

    const target = document.createElement('div');

    document.body.appendChild(target);
    target.appendChild(element); // reparent: disconnect + reconnect in one turn
    await flush();

    expect(setups).toBe(1); // no re-setup
    expect(cleanups).not.toHaveBeenCalled(); // no disposal
    expect(query('.v')).toBe(span); // template was not re-cloned
    expect(span?.textContent).toBe('1'); // scope state survived the move

    element.remove();
    await flush();

    expect(cleanups).toHaveBeenCalledTimes(1); // a real removal does dispose
  });

  it('preserves state across repeated rapid moves', async () => {
    let setups = 0;

    const { element, query } = await mount((_props) => {
      setups++;

      const local = signal(0);

      onEvent(getHost(), 'bump', () => local.value++);

      return html`
        <span class="v">${() => String(local.value)}</span>
      `;
    });

    element.dispatchEvent(new CustomEvent('bump'));

    const holderA = document.createElement('div');
    const holderB = document.createElement('div');

    document.body.append(holderA, holderB);

    for (let i = 0; i < 3; i++) {
      (i % 2 === 0 ? holderB : holderA).appendChild(element);
    }

    await flush();

    expect(setups).toBe(1);
    expect(query('.v')?.textContent).toBe('1');
  });
});

import { waitForEvent } from '@vielzeug/assay';
import { signal } from '@vielzeug/ripple';

import { define, html, prop, useEmit, useSlots, watchEffect, when } from '../index';
import { onMounted } from '../runtime';
import { flush, mount } from '../testing';
import { expectType, uniqueTag } from './test-utils';

describe('component slots and emit', () => {
  it('supports default and named slots', async () => {
    const { element } = await mount(
      () => html`
        <div>
          <slot name="header"></slot>
          <slot></slot>
        </div>
      `,
      {
        html: '<div slot="header">Header</div><div>Content</div>',
      },
    );

    expect(element.innerHTML).toContain('Header');
    expect(element.innerHTML).toContain('Content');

    // Structural a11y check: slot/content projection plumbing must not introduce
    // violations axe can detect in jsdom (see AGENTS.md § Accessibility testing).
    const results = await axeCheck(element);

    expect(results.violations).toHaveLength(0);
  });

  it('exposes setup slots context with accurate presence signals', async () => {
    let defaultAssigned = false;
    let triggerAssigned = false;

    const { flush } = await mount(
      (_props) => {
        const slots = useSlots();

        onMounted(() => {
          defaultAssigned = slots.has().value;
          triggerAssigned = slots.has('trigger').value;
        });

        return html`
          <slot name="trigger"></slot>
          <slot></slot>
        `;
      },
      { html: '<button slot="trigger">Open</button><span>Body</span>' },
    );

    await flush();

    expect(defaultAssigned).toBe(true);
    expect(triggerAssigned).toBe(true);
  });

  it('has() reflects rendered slots only: gating a slot on its own has() never shows it', async () => {
    let gated: boolean | undefined;

    const { flush, query } = await mount(
      (_props) => {
        const slots = useSlots<'header' | 'footer'>();

        onMounted(() => {
          gated = slots.has('footer').value;
        });

        return html`
          <header ?hidden=${() => !slots.has('header').value}><slot name="header"></slot></header>
          ${when(slots.has('footer'), () => html`<footer><slot name="footer"></slot></footer>`)}
        `;
      },
      { html: '<b slot="header">H</b><i slot="footer">F</i>' },
    );

    await flush();

    expect(query('header')?.hasAttribute('hidden')).toBe(false);
    expect(gated).toBe(false);
    expect(query('footer')).toBeNull();
  });

  it('useSlots() called from setup() and from within onMounted() returns the same registry', async () => {
    // Regression test: two registries would mean two independent MutationObservers
    // over the same shadow root.
    let fromSetup: ReturnType<typeof useSlots> | undefined;
    let fromMounted: ReturnType<typeof useSlots> | undefined;

    const { flush } = await mount((_props) => {
      fromSetup = useSlots();

      onMounted(() => {
        fromMounted = useSlots();
      });

      return html`
        <slot></slot>
      `;
    });

    await flush();

    expect(fromSetup).toBeDefined();
    expect(fromMounted).toBe(fromSetup);
  });

  it('useSlots() stays live across a move and rebuilds after teardown + reconnect', async () => {
    let presence: boolean | undefined;

    const { element, flush } = await mount(
      (_props) => {
        const slots = useSlots();

        watchEffect(() => {
          presence = slots.has().value;
        });

        return html`
          <slot></slot>
        `;
      },
      { html: '<span>Body</span>' },
    );

    await flush();
    expect(presence).toBe(true);

    // A same-turn move keeps the registry: slot signals must keep reacting.
    const parent = element.parentNode;

    element.remove();
    parent?.appendChild(element);
    await flush();

    element.textContent = '';
    await flush();
    expect(presence).toBe(false);

    element.appendChild(document.createElement('span'));
    await flush();
    expect(presence).toBe(true);

    // Reconnect after the deferred teardown re-runs setup(), and useSlots()
    // must return a freshly-observing registry, not a torn-down cached one.
    element.remove();
    await flush();
    document.body.appendChild(element);

    element.textContent = '';
    await flush();
    expect(presence).toBe(false);

    element.appendChild(document.createElement('span'));
    await flush();
    expect(presence).toBe(true);
  });

  it('supports typed setup emit usage', async () => {
    const pingSpy = vi.fn();
    const closeSpy = vi.fn();
    const { element, flush, query } = await mount((_props) => {
      const typedEmit = useEmit<{ close: undefined; ping: { ok: boolean } }>();

      return html`
        <button
          @click=${() => {
            typedEmit('close');
            typedEmit('ping', { ok: true });
          }}>
          Emit
        </button>
      `;
    });

    element.addEventListener('close', closeSpy);
    element.addEventListener('ping', pingSpy);
    query('button')?.dispatchEvent(new Event('click'));
    await flush();

    expect(closeSpy).toHaveBeenCalledTimes(1);
    expect(pingSpy).toHaveBeenCalledTimes(1);
  });

  it('infers event payloads from event schema generics', async () => {
    const tag = uniqueTag('test-object-emits');

    define<Record<string, never>>(tag, {
      setup: (_props) => {
        const emit = useEmit<{
          change: {
            value: string;
          };
          retry: undefined;
        }>();
        const fire = () => {
          emit('change', { value: 'ok' });
          emit('retry');
        };

        return html`
          <button @click=${fire}>Emit</button>
        `;
      },
    });

    const { element, flush, query } = await mount(tag);
    const changeSpy = vi.fn();
    const retrySpy = vi.fn();

    element.addEventListener('change', changeSpy);
    element.addEventListener('retry', retrySpy);
    query('button')?.dispatchEvent(new Event('click'));
    await flush();

    expect((changeSpy.mock.calls[0]?.[0] as CustomEvent<{ value: string }>).detail.value).toBe('ok');
    expect(retrySpy).toHaveBeenCalledTimes(1);
  });

  it('dispatches bubbling, composed custom events from setup emit', async () => {
    const { element } = await mount(((_props) => {
      const emit = useEmit<{ ping: { ok: boolean } }>();

      setTimeout(() => emit('ping', { ok: true }), 30);

      return html`
        <div></div>
      `;
    }) as import('../index').ComponentDefinition['setup']);

    const event = await waitForEvent<CustomEvent<{ ok: boolean }>>(element, 'ping');

    expect(event.detail.ok).toBe(true);
    expect(event.bubbles).toBe(true);
    expect(event.composed).toBe(true);
  });

  it('emit() crosses a nested shadow boundary so an outer listener observes it', async () => {
    // The inner component emits; it lives inside an outer component's shadow root.
    // A listener on the outer host must still observe the event: only a composed
    // event propagates out of the inner component's own shadow tree.
    define('ore-emit-nested-inner', {
      setup: () => {
        const emit = useEmit<{ ping: undefined }>();

        setTimeout(() => emit('ping'), 30);

        return html`
          <span></span>
        `;
      },
    });

    define('ore-emit-nested-outer', {
      setup: () => html`
        <ore-emit-nested-inner></ore-emit-nested-inner>
      `,
    });

    const { element } = await mount('ore-emit-nested-outer');

    const inner = element.shadowRoot?.querySelector('ore-emit-nested-inner');

    // The event originates inside the inner shadow tree; the outer host listener
    // only sees it because emit() dispatches composed:true.
    const seen = waitForEvent(element, 'ping');

    await expect(seen).resolves.toBeTruthy();
    expect(inner).toBeTruthy();
  });

  it('emit() returns false when a listener calls preventDefault(), true otherwise', async () => {
    const results: boolean[] = [];
    let cancelNext = false;

    const { element } = await mount((_props) => {
      const emit = useEmit<{ send: { value: string } }>();

      return html`
        <button @click=${() => results.push(emit('send', { value: 'hi' }))}>Emit</button>
      `;
    });

    element.addEventListener('send', (e) => {
      if (cancelNext) e.preventDefault();
    });

    (element.shadowRoot?.querySelector('button') as HTMLButtonElement).click();
    expect(results).toEqual([true]);

    cancelNext = true;
    (element.shadowRoot?.querySelector('button') as HTMLButtonElement).click();
    expect(results).toEqual([true, false]);
  });

  it('infers emit and prop signals from schema + prop.* helpers', async () => {
    const tag = uniqueTag('test-schema-events');
    const toggleProps = {
      checked: prop.bool(false),
      label: prop.string('Toggle'),
    };

    define<{ checked?: boolean; label?: string }>(tag, {
      props: toggleProps,
      setup: (props) => {
        const emit = useEmit<{
          toggle: {
            checked: boolean;
          };
        }>();

        expectType<import('@vielzeug/ripple').Readable<boolean | undefined>>(props.checked);
        expectType<import('@vielzeug/ripple').Readable<string | undefined>>(props.label);

        return html`
          <button @click=${() => emit('toggle', { checked: !props.checked.value })}>${props.label}</button>
        `;
      },
    });

    const { element, flush, query } = await mount(tag);
    const spy = vi.fn();

    element.addEventListener('toggle', spy);
    query('button')?.dispatchEvent(new Event('click'));
    await flush();

    expect((spy.mock.calls[0]?.[0] as CustomEvent<{ checked: boolean }>).detail.checked).toBe(true);
  });
});

describe('slots: stale slot cleanup (C1)', () => {
  it('slot presence signal reflects false after a conditional slot is removed from shadow DOM', async () => {
    const showSlot = signal(true);
    let hasDefault!: import('@vielzeug/ripple').Readable<boolean>;

    const { flush } = await mount(
      (_props) => {
        const slots = useSlots();

        hasDefault = slots.has();

        return html`
          <div>
            ${when(
              showSlot,
              () => html`
                <slot></slot>
              `,
            )}
          </div>
        `;
      },
      { html: '<span>content</span>' },
    );

    expect(hasDefault.value).toBe(true);

    showSlot.value = false;
    await flush();

    expect(hasDefault.value).toBe(false);
  });

  it('slot presence signal returns true when slot is re-added after removal', async () => {
    const showSlot = signal(true);
    let hasDefault!: import('@vielzeug/ripple').Readable<boolean>;

    const { flush } = await mount(
      (_props) => {
        const slots = useSlots();

        hasDefault = slots.has();

        return html`
          <div>
            ${when(
              showSlot,
              () => html`
                <slot></slot>
              `,
            )}
          </div>
        `;
      },
      { html: '<span>content</span>' },
    );

    showSlot.value = false;
    await flush();
    expect(hasDefault.value).toBe(false);

    showSlot.value = true;
    await flush();
    expect(hasDefault.value).toBe(true);
  });
});

describe('useSlots() dynamic slots', () => {
  it('unbinds a slot removed inside a wrapper and clears its signal', async () => {
    let presence: boolean | undefined;
    const showSlot = signal(true);

    await mount(
      (_props) => {
        const slots = useSlots();

        watchEffect(() => {
          presence = slots.has().value;
        });

        return html`
        <div class="shell">
          ${when(
            () => showSlot.value,
            () => html`
              <section><slot></slot></section>
            `,
          )}
        </div>
      `;
      },
      { html: '<span>Slotted</span>' },
    );

    await flush();
    expect(presence).toBe(true);

    showSlot.value = false;
    await flush();

    expect(presence).toBe(false);
  });

  it('does not rescan when mutations involve no slots', async () => {
    let presence: boolean | undefined;

    const { shadow } = await mount(
      (_props) => {
        const slots = useSlots();

        watchEffect(() => {
          presence = slots.has().value;
        });

        return html`
          <slot></slot>
          <div class="busy"></div>
        `;
      },
      { html: '<span>Body</span>' },
    );

    await flush();
    expect(presence).toBe(true);

    const busy = shadow?.querySelector('.busy') as HTMLElement;
    let rescanCount = 0;
    const originalQuerySelectorAll = shadow?.querySelectorAll.bind(shadow) as (s: string) => NodeListOf<Element>;

    // Spy on the observer's full-root rescan: only slot mutations may reach it.
    (shadow as ShadowRoot & { querySelectorAll: typeof originalQuerySelectorAll }).querySelectorAll = ((
      selector: string,
    ) => {
      if (selector === 'slot') rescanCount++;

      return originalQuerySelectorAll(selector);
    }) as never;

    for (let i = 0; i < 20; i++) {
      busy.appendChild(document.createElement('p'));
    }

    await flush();

    expect(rescanCount).toBe(0);
    expect(presence).toBe(true);
  });
});

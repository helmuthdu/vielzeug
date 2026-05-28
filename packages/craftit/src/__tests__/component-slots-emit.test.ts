import { define, html, onMounted, prop } from '../index';
import { mount, waitForEvent } from '../testing';
import { expectType, uniqueTag } from './test-utils';

describe('component slots and emit', () => {
  it('supports default and named slots', async () => {
    const { element } = await mount(() => html`<div><slot name="header"></slot><slot></slot></div>`, {
      html: '<div slot="header">Header</div><div>Content</div>',
    });

    expect(element.innerHTML).toContain('Header');
    expect(element.innerHTML).toContain('Content');
  });

  it('exposes setup slots context with accurate presence signals', async () => {
    let defaultAssigned = false;
    let triggerAssigned = false;

    const { flush } = await mount(
      (_props, { slots }) => {
        onMounted(() => {
          defaultAssigned = slots.has().value;
          triggerAssigned = slots.has('trigger').value;
        });

        return html`<slot name="trigger"></slot><slot></slot>`;
      },
      { html: '<button slot="trigger">Open</button><span>Body</span>' },
    );

    await flush();

    expect(defaultAssigned).toBe(true);
    expect(triggerAssigned).toBe(true);
  });

  it('supports typed setup emit usage', async () => {
    const pingSpy = vi.fn();
    const closeSpy = vi.fn();
    const { element, flush, query } = await mount((_props, { emit }) => {
      const typedEmit = emit as unknown as import('../index').SetupContextBag<{
        close: undefined;
        ping: { ok: boolean };
      }>['emit'];

      return html`<button
        @click=${() => {
          typedEmit('close');
          typedEmit('ping', { ok: true });
        }}>
        Emit
      </button>`;
    });

    element.addEventListener('close', closeSpy);
    element.addEventListener('ping', pingSpy);
    query('button')!.dispatchEvent(new Event('click'));
    await flush();

    expect(closeSpy).toHaveBeenCalledTimes(1);
    expect(pingSpy).toHaveBeenCalledTimes(1);
  });

  it('infers event payloads from event schema generics', async () => {
    const tag = uniqueTag('test-object-emits');

    define<Record<string, never>, { change: { value: string }; retry: void }>(tag, {
      setup: (_props, { emit }) => {
        const fire = () => {
          emit('change', { value: 'ok' });
          emit('retry');
        };

        return html`<button @click=${fire}>Emit</button>`;
      },
    });

    const { element, flush, query } = await mount(tag);
    const changeSpy = vi.fn();
    const retrySpy = vi.fn();

    element.addEventListener('change', changeSpy);
    element.addEventListener('retry', retrySpy);
    query('button')!.dispatchEvent(new Event('click'));
    await flush();

    expect((changeSpy.mock.calls[0]?.[0] as CustomEvent<{ value: string }>).detail.value).toBe('ok');
    expect(retrySpy).toHaveBeenCalledTimes(1);
  });

  it('dispatches bubbling (non-composed) custom events from setup emit', async () => {
    const { element } = await mount(((_props, { emit }) => {
      setTimeout(() => emit('ping', { ok: true }), 30);

      return html`<div></div>`;
    }) as import('../index').ComponentDefinition['setup']);

    const event = await waitForEvent<CustomEvent<{ ok: boolean }>>(element, 'ping');

    expect(event.detail.ok).toBe(true);
    expect(event.bubbles).toBe(true);
    expect(event.composed).toBe(false);
  });

  it('infers emit and prop signals from schema + prop.* helpers', async () => {
    const tag = uniqueTag('test-schema-events');
    const toggleProps = {
      checked: prop.bool(false),
      label: prop.string('Toggle'),
    };

    define<{ checked?: boolean; label?: string }, { toggle: { checked: boolean } }, typeof toggleProps>(tag, {
      props: toggleProps,
      setup: (props, { emit }) => {
        expectType<import('@vielzeug/stateit').Signal<boolean | undefined>>(props.checked);
        expectType<import('@vielzeug/stateit').Signal<string | undefined>>(props.label);

        return html`<button @click=${() => emit('toggle', { checked: !props.checked.value })}>${props.label}</button>`;
      },
    });

    const { element, flush, query } = await mount(tag);
    const spy = vi.fn();

    element.addEventListener('toggle', spy);
    query('button')!.dispatchEvent(new Event('click'));
    await flush();

    expect((spy.mock.calls[0]?.[0] as CustomEvent<{ checked: boolean }>).detail.checked).toBe(true);
  });
});

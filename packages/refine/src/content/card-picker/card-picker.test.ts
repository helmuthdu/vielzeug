import { type Fixture, mount } from '@vielzeug/ore/testing';

describe('ore-card-picker', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('./card-picker');
  });

  afterEach(() => {
    fixture?.dispose();
  });

  const cards = `
    <ore-card-picker-item value="alpha" label="Alpha">
      <span slot="media">Alpha image</span>
      <p>Alpha details</p>
    </ore-card-picker-item>
    <ore-card-picker-item value="beta" label="Beta">
      <span slot="media">Beta image</span>
      <p>Beta details</p>
    </ore-card-picker-item>
    <ore-card-picker-item value="gamma" label="Gamma">
      <p>Gamma details</p>
    </ore-card-picker-item>`;

  it('derives selected and active item states from the parent values', async () => {
    fixture = await mount('ore-card-picker', {
      attrs: { label: 'Choose cards', values: 'beta' },
      html: cards,
    });

    const items = [...fixture.element.querySelectorAll('ore-card-picker-item')];

    expect(items[0]?.hasAttribute('selected')).toBe(false);
    expect(items[1]?.hasAttribute('selected')).toBe(true);
    expect(items[0]?.hasAttribute('data-active')).toBe(true);
    expect(items[0]?.hasAttribute('aria-hidden')).toBe(false);
    expect(items[1]?.getAttribute('aria-hidden')).toBe('true');
    expect(items[1]?.hasAttribute('inert')).toBe(true);
  });

  it('changes the active card without changing selected values', async () => {
    fixture = await mount('ore-card-picker', {
      attrs: { label: 'Choose cards', values: 'alpha' },
      html: cards,
    });
    const onBrowse = vi.fn();
    fixture.element.addEventListener('browse-change', onBrowse);

    const next = fixture.element.shadowRoot?.querySelector<HTMLElement>('[part="next"]');
    next?.click();
    await fixture.flush();

    expect(fixture.element.getAttribute('active-index')).toBe('1');
    expect(fixture.element.getAttribute('values')).toBe('alpha');
    expect(fixture.element.querySelectorAll('[data-active]')).toHaveLength(1);
    expect(onBrowse).toHaveBeenCalledOnce();
    expect(onBrowse.mock.calls[0]?.[0].detail).toEqual({ index: 1, label: 'Beta', value: 'beta' });
  });

  it('toggles an item through its checkbox and emits the complete selection', async () => {
    fixture = await mount('ore-card-picker', {
      attrs: { label: 'Choose cards', values: 'alpha' },
      html: cards,
    });
    const onChange = vi.fn();
    fixture.element.addEventListener('change', onChange);

    fixture.element.shadowRoot?.querySelector<HTMLElement>('[part="next"]')?.click();
    await fixture.flush();

    const checkbox = fixture.element
      .querySelector('ore-card-picker-item[value="beta"]')
      ?.shadowRoot?.querySelector('ore-checkbox');
    expect(checkbox?.textContent).toContain('Select');
    checkbox?.click();
    await fixture.flush();

    expect(fixture.element.getAttribute('values')).toBe('alpha,beta');
    expect(fixture.element.querySelector('ore-card-picker-item[value="beta"]')?.hasAttribute('selected')).toBe(true);
    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange.mock.calls[0]?.[0].detail).toEqual({
      labels: ['Alpha', 'Beta'],
      originalEvent: expect.any(Event),
      value: 'beta',
      values: ['alpha', 'beta'],
    });
  });

  it('handles a selection request bubbled from an item', async () => {
    fixture = await mount('ore-card-picker', {
      attrs: { label: 'Choose cards', values: 'alpha' },
      html: cards,
    });

    const item = fixture.element.querySelector('ore-card-picker-item[value="beta"]')!;
    item.dispatchEvent(
      new CustomEvent('card-picker-toggle', {
        bubbles: true,
        composed: true,
        detail: { originalEvent: new Event('change') },
      }),
    );
    await fixture.flush();

    expect(fixture.element.getAttribute('values')).toBe('alpha,beta');
    expect(item.hasAttribute('selected')).toBe(true);
  });

  it('syncs an external active index and selected values', async () => {
    fixture = await mount('ore-card-picker', { html: cards });

    await fixture.attr('active-index', 2);
    await fixture.attr('values', 'gamma');
    await fixture.flush();

    expect(fixture.element.querySelector('ore-card-picker-item[data-active]')?.getAttribute('value')).toBe('gamma');
    expect(fixture.element.querySelector('ore-card-picker-item[selected]')?.getAttribute('value')).toBe('gamma');
  });

  it('browses with arrows and jumps to the first and last cards', async () => {
    fixture = await mount('ore-card-picker', { html: cards });

    fixture.element.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'ArrowRight' }));
    await fixture.flush();
    expect(fixture.element.getAttribute('active-index')).toBe('1');

    fixture.element.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'End' }));
    await fixture.flush();
    expect(fixture.element.getAttribute('active-index')).toBe('2');

    fixture.element.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Home' }));
    await fixture.flush();
    expect(fixture.element.getAttribute('active-index')).toBe('0');
  });

  it('stops previous and next browsing at the deck boundaries', async () => {
    fixture = await mount('ore-card-picker', { html: cards });

    fixture.element.shadowRoot?.querySelector<HTMLElement>('[part="previous"]')?.click();
    await fixture.flush();
    expect(fixture.element.getAttribute('active-index')).toBe('0');

    fixture.element.shadowRoot?.querySelector<HTMLElement>('[part="next"]')?.click();
    fixture.element.shadowRoot?.querySelector<HTMLElement>('[part="next"]')?.click();
    fixture.element.shadowRoot?.querySelector<HTMLElement>('[part="next"]')?.click();
    await fixture.flush();
    expect(fixture.element.getAttribute('active-index')).toBe('2');
  });

  it('keeps disabled items browsable but prevents selection', async () => {
    fixture = await mount('ore-card-picker', {
      html: '<ore-card-picker-item disabled value="locked" label="Locked card">Locked</ore-card-picker-item><ore-card-picker-item value="open" label="Open card">Open</ore-card-picker-item>',
    });

    const item = fixture.element.querySelector('ore-card-picker-item[disabled]')!;
    const checkbox = item.shadowRoot?.querySelector('ore-checkbox');

    expect(item.hasAttribute('data-active')).toBe(true);
    expect(checkbox?.hasAttribute('disabled')).toBe(true);
    expect(fixture.element.getAttribute('values')).toBe('');
  });

  it('disables selection when the item is not inside a picker', async () => {
    fixture = await mount('ore-card-picker-item', {
      attrs: { label: 'Standalone card', value: 'standalone' },
      html: '<p>Card details.</p>',
    });

    expect(fixture.element.shadowRoot?.querySelector('ore-checkbox')?.hasAttribute('disabled')).toBe(true);
  });
});

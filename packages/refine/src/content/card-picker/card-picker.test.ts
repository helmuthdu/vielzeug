import { type Fixture, mount } from '@vielzeug/ore/testing';

describe('ore-card-picker', () => {
  let fixture: Fixture<HTMLElement>;
  const control = (selector: string): HTMLElement | null =>
    fixture.element.shadowRoot
      ?.querySelector('ore-media-navigation')
      ?.shadowRoot?.querySelector<HTMLElement>(selector) ?? null;

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

    const next = control('[part="next"]');
    next?.click();
    await fixture.flush();

    expect(fixture.element.getAttribute('active-index')).toBe('1');
    expect(fixture.element.getAttribute('values')).toBe('alpha');
    expect(fixture.element.querySelectorAll('[data-active]')).toHaveLength(1);
    expect(onBrowse).toHaveBeenCalledOnce();
    expect(onBrowse.mock.calls[0]?.[0].detail).toEqual({ index: 1, label: 'Beta', value: 'beta' });
  });

  it('updates item layout from the picker orientation without changing selection', async () => {
    fixture = await mount('ore-card-picker', { attrs: { orientation: 'horizontal', values: 'alpha' }, html: cards });
    const item = fixture.element.querySelector('ore-card-picker-item')!;
    expect(item.getAttribute('data-orientation')).toBe('horizontal');
    expect(item.shadowRoot?.querySelector('ore-card')?.getAttribute('orientation')).toBe('horizontal');
    await fixture.attr('orientation', 'vertical');
    await fixture.flush();
    expect(item.getAttribute('data-orientation')).toBe('vertical');
    expect(item.shadowRoot?.querySelector('ore-card')?.hasAttribute('orientation')).toBe(false);
    expect(fixture.element.getAttribute('values')).toBe('alpha');
  });

  it('browses with indicators without changing selected values', async () => {
    fixture = await mount('ore-card-picker', { attrs: { values: 'alpha' }, html: cards });
    const indicator = control('.indicator[data-index="1"]');
    indicator?.click();
    await fixture.flush();
    expect(fixture.element.getAttribute('active-index')).toBe('1');
    expect(indicator?.getAttribute('aria-current')).toBe('true');
    expect(fixture.element.getAttribute('values')).toBe('alpha');
  });

  it('keeps the active indicator in sync across a deck whose window stops sliding', async () => {
    // The indicator window pins at the end of a large deck, so the last steps change
    // only the active index. The rendered indicator must follow rather than freeze.
    const deck = Array.from(
      { length: 28 },
      (_, index) => `<ore-card-picker-item value="c${index}" label="Card ${index + 1}">Body</ore-card-picker-item>`,
    ).join('');
    fixture = await mount('ore-card-picker', { attrs: { label: 'cards' }, html: deck });
    const activeIndicator = (): string | null => control('.indicator-active')?.getAttribute('data-index') ?? null;
    const next = (): HTMLElement | null =>
      fixture.element.shadowRoot?.querySelector('ore-media-navigation')?.shadowRoot?.querySelector('[part="next"]') ??
      null;

    for (let step = 1; step <= 27; step++) {
      next()?.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
      await fixture.flush();
      expect(fixture.element.getAttribute('active-index')).toBe(String(step));
      expect(activeIndicator()).toBe(String(step));
    }

    for (const target of [24, 27, 25]) {
      await fixture.attr('active-index', target);
      expect(activeIndicator()).toBe(String(target));
    }
  });

  it('forwards the indicator limit to shared navigation', async () => {
    fixture = await mount('ore-card-picker', { attrs: { 'max-indicators': 5 }, html: cards });
    expect(fixture.element.shadowRoot?.querySelector('ore-media-navigation')?.getAttribute('max-indicators')).toBe('5');
  });

  it('hides configurable navigation without disabling keyboard browsing', async () => {
    fixture = await mount('ore-card-picker', {
      attrs: { 'show-controls': 'false', 'show-indicators': 'false' },
      html: cards,
    });
    expect(fixture.element.shadowRoot?.querySelector('[part="navigation"]')?.hasAttribute('hidden')).toBe(true);
    fixture.element.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'ArrowRight' }));
    await fixture.flush();
    expect(fixture.element.getAttribute('active-index')).toBe('1');
  });

  it('keeps the stage to the active card when the neighbour previews are off', async () => {
    fixture = await mount('ore-card-picker', { attrs: { 'show-neighbors': 'false' }, html: cards });
    // The host carries the state as its own marker: a false boolean prop removes its attribute, so
    // the previews cannot be styled off from `show-neighbors` alone.
    expect(fixture.element.hasAttribute('data-neighbors-hidden')).toBe(true);
    // The neighbours stay stamped and reachable: only their presentation is withheld, so browsing
    // (and the card a swipe drags in) is untouched.
    const items = [...fixture.element.querySelectorAll('ore-card-picker-item')];

    expect(items[1]?.hasAttribute('data-next')).toBe(true);
    expect(items[2]?.hasAttribute('data-hidden')).toBe(true);

    await fixture.attr('show-neighbors', 'true');
    expect(fixture.element.hasAttribute('data-neighbors-hidden')).toBe(false);
  });

  it('places artwork before the body title and summary', async () => {
    fixture = await mount('ore-card-picker', { html: cards });
    const card = fixture.element.querySelector('ore-card-picker-item')!.shadowRoot!.querySelector('ore-card')!;
    const media = card.querySelector('[slot="media"]')!;
    const title = card.querySelector('[slot="header"]')!;
    const content = card.querySelector('[part="content"]')!;

    expect(media.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(title.compareDocumentPosition(content) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('toggles an item through its checkbox and emits the complete selection', async () => {
    fixture = await mount('ore-card-picker', {
      attrs: { label: 'Choose cards', values: 'alpha' },
      html: cards,
    });
    const onChange = vi.fn();
    fixture.element.addEventListener('change', onChange);

    control('[part="next"]')?.click();
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

    control('[part="previous"]')?.click();
    await fixture.flush();
    expect(fixture.element.getAttribute('active-index')).toBe('0');

    control('[part="next"]')?.click();
    control('[part="next"]')?.click();
    control('[part="next"]')?.click();
    await fixture.flush();
    expect(fixture.element.getAttribute('active-index')).toBe('2');
  });

  it('prevents native image dragging from taking over a card swipe', async () => {
    fixture = await mount('ore-card-picker', {
      html: '<ore-card-picker-item value="alpha" label="Alpha"><img alt="Alpha scan"></ore-card-picker-item>',
    });
    await fixture.flush();

    const drag = new Event('dragstart', { bubbles: true, cancelable: true, composed: true });

    fixture.element.querySelector('img')!.dispatchEvent(drag);

    expect(drag.defaultPrevented).toBe(true);
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

  it('updates child selection controls when the picker is disabled', async () => {
    fixture = await mount('ore-card-picker', {
      html: '<ore-card-picker-item value="alpha" label="Alpha">Alpha</ore-card-picker-item>',
    });

    const checkbox = fixture.element.querySelector('ore-card-picker-item')?.shadowRoot?.querySelector('ore-checkbox');
    expect(checkbox?.hasAttribute('disabled')).toBe(false);

    await fixture.attr('disabled', true);
    await fixture.flush();
    expect(checkbox?.hasAttribute('disabled')).toBe(true);

    await fixture.attr('disabled', false);
    await fixture.flush();
    expect(checkbox?.hasAttribute('disabled')).toBe(false);
  });

  it('leaves selected-list presentation outside the picker', async () => {
    fixture = await mount('ore-card-picker', { attrs: { values: 'beta' }, html: cards });
    expect(fixture.element.shadowRoot?.querySelector('[part="selection-summary"]')).toBeNull();
    expect(fixture.element.shadowRoot?.querySelector('[aria-label="Selected cards"]')).toBeNull();
    expect(fixture.element.getAttribute('active-index')).toBe('0');
    expect(fixture.element.getAttribute('values')).toBe('beta');
  });

  it('disables selection when the item is not inside a picker', async () => {
    fixture = await mount('ore-card-picker-item', {
      attrs: { label: 'Standalone card', value: 'standalone' },
      html: '<p>Card details.</p>',
    });

    expect(fixture.element.shadowRoot?.querySelector('ore-checkbox')?.hasAttribute('disabled')).toBe(true);
  });
});

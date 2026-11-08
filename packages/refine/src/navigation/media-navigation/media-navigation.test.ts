import { type Fixture, mount } from '@vielzeug/ore/testing';

describe('ore-media-navigation', () => {
  let fixture: Fixture<HTMLElement>;
  beforeAll(async () => {
    await import('./media-navigation');
  });
  afterEach(() => fixture?.dispose());

  it('requests navigation without changing its controlled index', async () => {
    fixture = await mount('ore-media-navigation', { attrs: { 'active-index': 0, count: 3 } });
    const navigate = vi.fn();
    fixture.element.addEventListener('navigate', navigate);
    fixture.element.shadowRoot?.querySelector<HTMLElement>('[part="next"]')?.click();
    await fixture.flush();
    expect(navigate.mock.calls[0]?.[0].detail).toEqual({ index: 1 });
    expect(fixture.element.getAttribute('active-index')).toBe('0');
    await fixture.attr('active-index', 1);
    expect(fixture.element.shadowRoot?.querySelector('[data-index="1"]')?.getAttribute('aria-current')).toBe('true');
  });

  it('wraps previous requests only when loop is enabled', async () => {
    fixture = await mount('ore-media-navigation', { attrs: { count: 3, loop: true } });
    const navigate = vi.fn();
    fixture.element.addEventListener('navigate', navigate);
    fixture.element.shadowRoot?.querySelector<HTMLElement>('[part="previous"]')?.click();
    await fixture.flush();
    expect(navigate.mock.calls[0]?.[0].detail).toEqual({ index: 2 });
  });

  it('uses supplied indicator names and blocks disabled requests', async () => {
    fixture = await mount('ore-media-navigation', {
      attrs: { count: 2, disabled: true, labels: '["First card","Second card"]' },
    });
    const navigate = vi.fn();
    fixture.element.addEventListener('navigate', navigate);
    const indicator = fixture.element.shadowRoot?.querySelector<HTMLElement>('[aria-label="Second card"]');
    expect(indicator).not.toBeNull();
    expect(indicator?.hasAttribute('disabled')).toBe(true);
    indicator?.click();
    await fixture.flush();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('hides navigation when both controls are disabled', async () => {
    fixture = await mount('ore-media-navigation', {
      attrs: { count: 3, 'show-controls': 'false', 'show-indicators': 'false' },
    });
    expect(fixture.element.hasAttribute('hidden')).toBe(true);
  });

  it('requests vertical navigation from indicator keyboard input', async () => {
    fixture = await mount('ore-media-navigation', { attrs: { count: 3, orientation: 'vertical' } });
    const navigate = vi.fn();
    fixture.element.addEventListener('navigate', navigate);
    fixture.element.shadowRoot
      ?.querySelector('[data-index="0"]')
      ?.dispatchEvent(
        new KeyboardEvent('keydown', { bubbles: true, cancelable: true, composed: true, key: 'ArrowDown' }),
      );
    await fixture.flush();
    expect(navigate.mock.calls[0]?.[0].detail).toEqual({ index: 1 });
  });

  it('clamps invalid count and index inputs to an empty state', async () => {
    fixture = await mount('ore-media-navigation', { attrs: { 'active-index': -1, count: -2 } });
    expect(fixture.element.hasAttribute('hidden')).toBe(true);
    expect(fixture.element.shadowRoot?.querySelectorAll('.indicator')).toHaveLength(0);
  });

  it('changes keyboard wrapping when loop changes', async () => {
    fixture = await mount('ore-media-navigation', { attrs: { 'active-index': 2, count: 3 } });
    const navigate = vi.fn();
    fixture.element.addEventListener('navigate', navigate);
    const last = fixture.element.shadowRoot?.querySelector('[data-index="2"]');
    const nextKey = () =>
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, composed: true, key: 'ArrowRight' });
    last?.dispatchEvent(nextKey());
    await fixture.flush();
    expect(navigate).not.toHaveBeenCalled();
    await fixture.attr('loop', true);
    last?.dispatchEvent(nextKey());
    await fixture.flush();
    expect(navigate.mock.calls[0]?.[0].detail).toEqual({ index: 0 });
  });

  it('follows indicator click focus across a window shift', async () => {
    fixture = await mount('ore-media-navigation', { attrs: { 'active-index': 8, count: 50 } });
    const navigate = vi.fn();
    fixture.element.addEventListener('navigate', navigate);
    const edge = fixture.element.shadowRoot?.querySelector<HTMLElement>('[data-index="11"]');
    expect(edge).not.toBeNull();
    edge?.focus();
    edge?.click();
    await fixture.flush();
    expect(navigate.mock.calls[0]?.[0].detail).toEqual({ index: 11 });
    await fixture.attr('active-index', 11);
    await fixture.flush();
    expect(fixture.element.shadowRoot?.activeElement?.dataset.index).toBe('11');
  });

  it('keeps keyboard focus on the indicator that becomes active', async () => {
    fixture = await mount('ore-media-navigation', { attrs: { 'active-index': 8, count: 50 } });
    const navigate = vi.fn();
    fixture.element.addEventListener('navigate', navigate);
    const active = fixture.element.shadowRoot?.querySelector<HTMLElement>('[data-index="8"]');
    active?.focus();
    active?.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, composed: true, key: 'ArrowRight' }),
    );
    await fixture.flush();
    expect(navigate.mock.calls[0]?.[0].detail).toEqual({ index: 9 });
    await fixture.attr('active-index', 9);
    await fixture.flush();
    expect(fixture.element.shadowRoot?.activeElement?.dataset.index).toBe('9');
  });

  it('stages backward moves for leftward travel', async () => {
    fixture = await mount('ore-media-navigation', { attrs: { 'active-index': 2, count: 3 } });
    const bar = () => fixture.element.shadowRoot?.querySelector('[part="bar"]');
    const dot = (index: number) => fixture.element.shadowRoot?.querySelector(`.indicator[data-index="${index}"]`);
    expect(bar()?.className).not.toContain('indicator-moving-back');
    await fixture.attr('active-index', 1);
    expect(bar()?.className).toContain('indicator-moving-back');
    expect(dot(2)?.className).toContain('indicator-leaving');
    await fixture.attr('active-index', 2);
    expect(bar()?.className).not.toContain('indicator-moving-back');
    expect(dot(2)?.className).not.toContain('indicator-leaving');
    expect(dot(1)?.className).not.toContain('indicator-leaving');
  });

  it('limits a large deck to a centered indicator window', async () => {
    fixture = await mount('ore-media-navigation', { attrs: { 'active-index': 8, count: 50 } });
    const indicators = [...fixture.element.shadowRoot!.querySelectorAll<HTMLElement>('.indicator')];
    expect(indicators.map((indicator) => Number(indicator.dataset.index))).toEqual([5, 6, 7, 8, 9, 10, 11]);
    expect(indicators[0]?.dataset.edge).toBe('before');
    expect(indicators[6]?.dataset.edge).toBe('after');
    expect(indicators[3]?.getAttribute('aria-current')).toBe('true');
  });

  it('keeps the first and last items inside a configurable window', async () => {
    fixture = await mount('ore-media-navigation', { attrs: { count: 50, 'max-indicators': 5 } });
    expect(
      [...fixture.element.shadowRoot!.querySelectorAll<HTMLElement>('.indicator')].map(
        (indicator) => indicator.dataset.index,
      ),
    ).toEqual(['0', '1', '2', '3', '4']);
    await fixture.attr('active-index', 49);
    expect(
      [...fixture.element.shadowRoot!.querySelectorAll<HTMLElement>('.indicator')].map(
        (indicator) => indicator.dataset.index,
      ),
    ).toEqual(['45', '46', '47', '48', '49']);
    expect(fixture.element.shadowRoot!.querySelector('[data-index="49"]')?.getAttribute('aria-current')).toBe('true');
  });
});

import { type Fixture, mount } from '@vielzeug/ore/testing';

describe('ore-timeline', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('./timeline');
  });

  afterEach(() => {
    fixture?.dispose();
  });

  it('exposes an accessible list in the authored order, including metadata and descriptions', async () => {
    fixture = await mount('ore-timeline', {
      attrs: { 'aria-label': 'Order history' },
      html: '<ore-timeline-item>Shipped<time slot="meta" datetime="2026-06-10">June 10</time><span slot="description">Handed to carrier</span></ore-timeline-item><ore-timeline-item>Ordered</ore-timeline-item>',
    });

    const items = [...fixture.element.querySelectorAll('ore-timeline-item')];

    expect(fixture.element.getAttribute('role')).toBe('list');
    expect(items.map((item) => item.getAttribute('role'))).toEqual(['listitem', 'listitem']);
    expect(items[0].textContent).toContain('Shipped');
    expect(items[0].querySelector('time')?.getAttribute('datetime')).toBe('2026-06-10');
    expect(items[1].textContent).toContain('Ordered');
    expect((await axeCheck(fixture.element)).violations).toHaveLength(0);
  });

  it('keeps dynamically added and removed events in the supplied order', async () => {
    fixture = await mount('ore-timeline', { html: '<ore-timeline-item>First</ore-timeline-item>' });
    const item = document.createElement('ore-timeline-item');

    item.textContent = 'Second';
    await fixture.act(() => fixture.element.append(item));
    expect([...fixture.element.querySelectorAll('ore-timeline-item')].map((node) => node.textContent)).toEqual([
      'First',
      'Second',
    ]);
    await fixture.act(() => fixture.element.firstElementChild?.remove());
    expect(fixture.element.querySelector('ore-timeline-item')?.textContent).toBe('Second');
    expect(item.getAttribute('role')).toBe('listitem');
  });
});

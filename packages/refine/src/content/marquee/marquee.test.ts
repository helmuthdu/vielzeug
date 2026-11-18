import { type Fixture, mount } from '@vielzeug/ore/testing';

describe('ore-marquee', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('./marquee');
  });

  afterEach(() => {
    fixture?.dispose();
  });

  it('duplicates direct children for a seamless loop', async () => {
    fixture = await mount('ore-marquee', { html: '<span>One</span><span>Two</span>' });
    await fixture.flush();

    const items = Array.from(fixture.element.children);

    expect(items).toHaveLength(4);
    expect(items.slice(2).map((item) => item.textContent)).toEqual(['One', 'Two']);
  });

  it('hides and disables cloned content', async () => {
    fixture = await mount('ore-marquee', { html: '<a href="/one">One</a><a href="/two">Two</a>' });
    await fixture.flush();

    const clones = Array.from(fixture.element.children).slice(2);

    clones.forEach((clone) => {
      expect(clone.getAttribute('aria-hidden')).toBe('true');
      expect(clone.hasAttribute('inert')).toBe(true);
      expect(clone.hasAttribute('data-marquee-clone')).toBe(true);
    });
  });

  it('sets the duration as the CSS animation duration', async () => {
    fixture = await mount('ore-marquee', { attrs: { duration: '12' } });
    await fixture.flush();

    expect(fixture.element.style.getPropertyValue('--_marquee-duration')).toBe('12s');
  });

  it('updates the CSS animation duration when duration changes', async () => {
    fixture = await mount('ore-marquee', { attrs: { duration: '12' } });
    await fixture.flush();

    (fixture.element as HTMLElement & { duration: number }).duration = 30;
    await fixture.flush();

    expect(fixture.element.style.getPropertyValue('--_marquee-duration')).toBe('30s');
  });

  it('supports rightward motion and hover pause through attributes', async () => {
    fixture = await mount('ore-marquee', { attrs: { direction: 'right', 'pause-on-hover': 'true' } });
    await fixture.flush();

    expect(fixture.element.getAttribute('direction')).toBe('right');
    expect(fixture.element.getAttribute('pause-on-hover')).toBe('true');
  });

  it('pauses on hover by default and opts out with pause-on-hover="false"', async () => {
    // SC 2.2.2: scrolling content pauses for hover/focus unless explicitly disabled.
    // Boolean props reflect presence-only, so the default renders as a bare attribute.
    fixture = await mount('ore-marquee', { html: '<span>One</span><span>Two</span>' });
    await fixture.flush();

    expect(fixture.element.hasAttribute('pause-on-hover')).toBe(true);

    fixture.element.setAttribute('pause-on-hover', 'false');
    await fixture.flush();

    expect(fixture.element.hasAttribute('pause-on-hover')).toBe(false);
  });

  it('renders navigation controls by default', async () => {
    fixture = await mount('ore-marquee', { html: '<span>One</span><span>Two</span>' });
    await fixture.flush();

    expect(fixture.queryAll('.nav-btn')).toHaveLength(2);
  });

  it('uses full rounding for every navigation button', async () => {
    fixture = await mount('ore-marquee', { html: '<span>One</span><span>Two</span>' });
    await fixture.flush();

    const buttons = fixture.queryAll<HTMLElement>('.nav-btn');

    expect(buttons.map((button) => button.getAttribute('rounded'))).toEqual(['full', 'full']);
    expect(fixture.query<HTMLElement>('[part="pause-toggle"]')?.getAttribute('rounded')).toBe('full');
  });

  it('hides navigation arrows while keeping the pause toggle when show-controls is false', async () => {
    fixture = await mount('ore-marquee', {
      attrs: { 'show-controls': 'false' },
      html: '<span>One</span><span>Two</span>',
    });
    await fixture.flush();

    expect(fixture.query('[part="prev-btn"]')).toBeNull();
    expect(fixture.query('[part="next-btn"]')).toBeNull();
    expect(fixture.query('[part="pause-toggle"]')).not.toBeNull();
  });

  it('keeps a persistent pause toggle when navigation arrows are hidden', async () => {
    fixture = await mount('ore-marquee', {
      attrs: { 'pause-on-hover': 'false', 'show-controls': 'false' },
      html: '<span>One</span><span>Two</span>',
    });
    await fixture.flush();

    const toggle = fixture.query<HTMLElement>('[part="pause-toggle"]');

    expect(toggle?.getAttribute('label')).toBe('Pause marquee');
    expect(toggle?.getAttribute('elevation')).toBe('0');
    toggle?.click();
    await fixture.flush();
    expect(toggle?.getAttribute('label')).toBe('Resume marquee');
    expect(fixture.element.hasAttribute('data-marquee-paused')).toBe(true);
    toggle?.click();
    await fixture.flush();
    expect(toggle?.getAttribute('label')).toBe('Pause marquee');
    expect(fixture.element.hasAttribute('data-marquee-paused')).toBe(false);
  });

  it('passes axe checks', async () => {
    fixture = await mount('ore-marquee', { html: '<span>Free shipping</span><span>New arrivals</span>' });

    const results = await axeCheck(fixture.element);

    expect(results.violations).toHaveLength(0);
  });
});

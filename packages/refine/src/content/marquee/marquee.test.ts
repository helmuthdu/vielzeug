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

  it('renders navigation controls by default', async () => {
    fixture = await mount('ore-marquee', { html: '<span>One</span><span>Two</span>' });
    await fixture.flush();

    expect(fixture.queryAll('.nav-btn')).toHaveLength(2);
  });

  it('hides navigation controls when show-controls is false', async () => {
    fixture = await mount('ore-marquee', {
      attrs: { 'show-controls': 'false' },
      html: '<span>One</span><span>Two</span>',
    });
    await fixture.flush();

    expect(fixture.query('.controls')).toBeNull();
  });

  it('passes axe checks', async () => {
    fixture = await mount('ore-marquee', { html: '<span>Free shipping</span><span>New arrivals</span>' });

    const results = await axeCheck(fixture.element);

    expect(results.violations).toHaveLength(0);
  });
});

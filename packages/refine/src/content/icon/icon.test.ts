import { type Fixture, mount } from '@vielzeug/ore/testing';

describe('ore-icon', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('./icon');
  });

  afterEach(() => {
    fixture?.dispose();
  });

  it('renders an SVG element (not [object Object]) for a known icon', async () => {
    fixture = await mount('ore-icon', { attrs: { name: 'search' } });

    const shadow = fixture.element.shadowRoot;

    expect(shadow).toBeTruthy();
    // The shadow root must contain an SVG, not the literal string "[object Object]"
    expect(shadow!.textContent).not.toContain('[object Object]');
    expect(shadow!.querySelector('svg')).toBeTruthy();
  });

  it('renders no SVG when name is omitted', async () => {
    fixture = await mount('ore-icon', {});

    expect(fixture.element.shadowRoot?.querySelector('svg')).toBeNull();
  });

  it('renders no SVG for an unknown icon name', async () => {
    fixture = await mount('ore-icon', { attrs: { name: 'not-a-real-icon-xyz' } });

    const shadow = fixture.element.shadowRoot;

    expect(shadow?.querySelector('svg')).toBeNull();
    expect(shadow?.textContent).not.toContain('[object Object]');
  });

  it('updates the SVG reactively when name attribute changes', async () => {
    fixture = await mount('ore-icon', { attrs: { name: 'search' } });

    const shadow = fixture.element.shadowRoot!;

    expect(shadow.querySelector('svg')).toBeTruthy();

    fixture.element.setAttribute('name', 'trash-2');
    await fixture.flush();

    expect(shadow.querySelector('svg')).toBeTruthy();
    expect(shadow.textContent).not.toContain('[object Object]');
  });

  it('sets aria-hidden on decorative icons (no label)', async () => {
    fixture = await mount('ore-icon', { attrs: { name: 'search' } });

    expect(fixture.element.getAttribute('aria-hidden')).toBe('true');
    expect(fixture.element.getAttribute('role')).toBeNull();
  });

  it('sets role=img and aria-label when label is provided', async () => {
    fixture = await mount('ore-icon', { attrs: { label: 'Search', name: 'search' } });

    expect(fixture.element.getAttribute('role')).toBe('img');
    expect(fixture.element.getAttribute('aria-label')).toBe('Search');
    expect(fixture.element.getAttribute('aria-hidden')).toBeNull();
  });

  it('SVG has correct viewBox', async () => {
    fixture = await mount('ore-icon', { attrs: { name: 'search' } });

    const svg = fixture.element.shadowRoot?.querySelector('svg');

    expect(svg?.getAttribute('viewBox')).toBe('0 0 24 24');
  });

  it('applies custom size as --_size-px custom property on the host element', async () => {
    fixture = await mount('ore-icon', { attrs: { name: 'search', size: '24' } });

    expect(fixture.element.style.getPropertyValue('--_size-px')).toBe('24px');
  });

  describe('Accessibility', () => {
    it('passes axe checks (decorative icon)', async () => {
      fixture = await mount('ore-icon', { attrs: { 'aria-hidden': 'true', name: 'search' } });

      const results = await axeCheck(fixture.element);

      expect(results.violations).toHaveLength(0);
    });
  });
});

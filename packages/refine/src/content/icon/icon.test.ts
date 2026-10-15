import { type Fixture, mount } from '@vielzeug/ore/testing';

import { type IconDefinition, registerIcons } from './icon';

const CUSTOM_ICON_NODE: IconDefinition = {
  children: [{ attrs: { d: 'M0 0h24v24H0z' }, tag: 'path' }],
  viewBox: [0, 0, 24, 24],
};

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
    expect(shadow?.textContent).not.toContain('[object Object]');
    expect(shadow?.querySelector('svg')).toBeTruthy();
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

  it('preserves filled, outline and mixed nested presentation and native dimensions', async () => {
    registerIcons({
      MixedIcon: {
        children: [
          {
            children: [
              { attrs: { d: 'M0 0h12', fill: 'none', stroke: 'currentColor', 'stroke-width': 1.5 }, tag: 'path' },
              { attrs: { r: 3 }, tag: 'circle' },
            ],
            tag: 'g',
          },
        ],
        presentation: { fill: 'currentColor' },
        viewBox: [-1, -2, 32, 16],
      },
    });
    fixture = await mount('ore-icon', { attrs: { name: 'mixed-icon', size: '2em' } });
    const svg = fixture.element.shadowRoot!.querySelector('svg')!;
    expect(svg.getAttribute('viewBox')).toBe('-1 -2 32 16');
    expect(svg.getAttribute('fill')).toBe('currentColor');
    expect(svg.getAttribute('stroke')).toBeNull();
    expect(svg.querySelector('path')?.getAttribute('stroke-width')).toBe('1.5');
    expect(fixture.element.style.getPropertyValue('--_size-px')).toBe('2em');
    fixture.element.setAttribute('stroke-width', '3');
    fixture.element.setAttribute('absolute-stroke-width', '');
    await fixture.flush();
    expect(svg.getAttribute('stroke-width')).toBe('3');
    expect(svg.querySelector('path')?.getAttribute('stroke-width')).toBeNull();
    expect(svg.querySelector('path')?.getAttribute('vector-effect')).toBe('non-scaling-stroke');
    fixture.element.setAttribute('solid', '');
    await fixture.flush();
    expect(svg.querySelector('path')?.getAttribute('fill')).toBe('currentColor');
    expect(svg.querySelector('path')?.getAttribute('stroke')).toBe('none');
    fixture.element.removeAttribute('solid');
    fixture.element.removeAttribute('stroke-width');
    fixture.element.removeAttribute('absolute-stroke-width');
    await fixture.flush();
    expect(svg.querySelector('path')?.getAttribute('stroke-width')).toBe('1.5');
    expect(svg.querySelector('path')?.getAttribute('fill')).toBe('none');
  });

  describe('Accessibility', () => {
    it('passes axe checks (decorative icon)', async () => {
      fixture = await mount('ore-icon', { attrs: { 'aria-hidden': 'true', name: 'search' } });

      const results = await axeCheck(fixture.element);

      expect(results.violations).toHaveLength(0);
    });
  });

  describe('registerIcons', () => {
    it('registers a custom icon under a kebab-case name and renders it', async () => {
      registerIcons({ 'my-custom-icon': CUSTOM_ICON_NODE });

      fixture = await mount('ore-icon', { attrs: { name: 'my-custom-icon' } });

      expect(fixture.element.shadowRoot?.querySelector('svg path')?.getAttribute('d')).toBe('M0 0h24v24H0z');
    });

    it('registers a custom icon under a PascalCase name, resolvable via kebab-case lookup', async () => {
      registerIcons({ MyPascalIcon: CUSTOM_ICON_NODE });

      fixture = await mount('ore-icon', { attrs: { name: 'my-pascal-icon' } });

      expect(fixture.element.shadowRoot?.querySelector('svg path')?.getAttribute('d')).toBe('M0 0h24v24H0z');
    });

    it('overrides an existing icon when re-registered under the same name', async () => {
      registerIcons({ search: CUSTOM_ICON_NODE });

      fixture = await mount('ore-icon', { attrs: { name: 'search' } });

      expect(fixture.element.shadowRoot?.querySelector('svg path')?.getAttribute('d')).toBe('M0 0h24v24H0z');
    });
  });

  describe('icons/lucide', () => {
    it('registers the complete Lucide set beyond the built-in component icons', async () => {
      await import('../../icons/lucide/all');

      // atom is outside the icons refine's own components render.
      fixture = await mount('ore-icon', { attrs: { name: 'atom' } });

      expect(fixture.element.shadowRoot?.querySelector('svg')).toBeTruthy();
    });
  });
});

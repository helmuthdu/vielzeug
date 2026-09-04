import { type Fixture, mount } from '@vielzeug/ore/testing';

import type { OreStatsProps } from './stats';

describe('ore-stats', () => {
  let fixture: Fixture<HTMLElement & OreStatsProps>;

  beforeAll(async () => {
    await import('./stats');
  });

  afterEach(() => {
    fixture?.dispose();
  });

  it('renders minimal label and value props', async () => {
    fixture = await mount('ore-stats', { attrs: { label: 'Revenue', value: '$42,800' } });

    expect(fixture.query('[part="card"]')?.tagName.toLowerCase()).toBe('article');
    expect(fixture.query('[part="label"]')?.textContent).toContain('Revenue');
    expect(fixture.query('[part="value"]')?.textContent).toContain('$42,800');
  });

  it('renders property fallbacks and matching named slot overrides', async () => {
    fixture = await mount('ore-stats', {
      attrs: { description: 'Last month', label: 'Revenue', trend: '+12%', value: '$42,800' },
      html: '<span slot="label">Net revenue</span><span slot="value">$45,000</span><span slot="trend">+15%</span><span slot="description">This month</span>',
    });

    expect(fixture.element.querySelector('[slot="label"]')?.textContent).toBe('Net revenue');
    expect(fixture.element.querySelector('[slot="value"]')?.textContent).toBe('$45,000');
    expect(fixture.element.querySelector('[slot="trend"]')?.textContent).toBe('+15%');
    expect(fixture.element.querySelector('[slot="description"]')?.textContent).toBe('This month');
  });

  it.each(['up', 'down', 'neutral'])('reflects %s trend direction', async (direction) => {
    fixture = await mount('ore-stats', {
      attrs: { trend: '12%', 'trend-direction': direction },
    });

    expect(fixture.query('[part="trend"]')?.getAttribute('data-direction')).toBe(direction);
  });

  it('shows and hides optional sections when slots change', async () => {
    fixture = await mount('ore-stats');

    expect(fixture.query('[part="header"]')?.hasAttribute('hidden')).toBe(true);
    expect(fixture.query('[part="visual"]')?.hasAttribute('hidden')).toBe(true);

    const icon = document.createElement('span');
    icon.slot = 'icon';
    icon.textContent = 'Icon';
    const visual = document.createElement('span');
    visual.slot = 'visual';
    visual.textContent = 'Chart';
    fixture.element.append(icon, visual);
    await fixture.flush();

    expect(fixture.query('[part="header"]')?.hasAttribute('hidden')).toBe(false);
    expect(fixture.query('[part="visual"]')?.hasAttribute('hidden')).toBe(false);

    icon.remove();
    visual.remove();
    await fixture.flush();

    expect(fixture.query('[part="header"]')?.hasAttribute('hidden')).toBe(true);
    expect(fixture.query('[part="visual"]')?.hasAttribute('hidden')).toBe(true);
  });

  it('reflects loading and disabled accessibility state', async () => {
    fixture = await mount('ore-stats', { attrs: { disabled: '', loading: '' } });

    expect(fixture.element.getAttribute('aria-busy')).toBe('true');
    expect(fixture.element.getAttribute('aria-disabled')).toBe('true');
    expect(fixture.query('[part="loading"]')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('supports visual variants, colors, sizes, and rounding', async () => {
    fixture = await mount('ore-stats', {
      attrs: { color: 'success', rounded: 'xl', size: 'lg', variant: 'solid' },
    });

    expect(fixture.element.getAttribute('color')).toBe('success');
    expect(fixture.element.getAttribute('rounded')).toBe('xl');
    expect(fixture.element.getAttribute('size')).toBe('lg');
    expect(fixture.element.getAttribute('variant')).toBe('solid');
  });

  it('falls back from invalid trend directions and variants', async () => {
    fixture = await mount('ore-stats', {
      attrs: { trend: '12%', 'trend-direction': 'sideways', variant: 'glass' },
    });

    expect(fixture.query('[part="trend"]')?.getAttribute('data-direction')).toBe('neutral');
    expect(fixture.element.getAttribute('variant')).toBe('outlined');
  });

  it('passes axe checks', async () => {
    fixture = await mount('ore-stats', {
      attrs: { description: 'Compared with last month', label: 'Revenue', trend: '+12%', value: '$42,800' },
    });

    const results = await axeCheck(fixture.element);

    expect(results.violations).toHaveLength(0);
  });
});

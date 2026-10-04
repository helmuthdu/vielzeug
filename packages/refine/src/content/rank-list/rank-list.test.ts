import { type Fixture, mount } from '@vielzeug/ore/testing';

import type { OreRankItemProps } from './rank-item';

type RankItemElement = HTMLElement & OreRankItemProps;

/** Three pre-sorted rows: 8 is the scale, so bars land on exact 100 / 75 / 37.5 percentages. */
const itemsHtml = `
  <ore-rank-item value="8">Documentation</ore-rank-item>
  <ore-rank-item value="6">Pricing</ore-rank-item>
  <ore-rank-item value="3">Blog</ore-rank-item>
`;

describe('ore-rank-list', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('./rank-list');
    await import('./rank-item');
  });

  afterEach(() => {
    fixture?.dispose();
  });

  const items = (): RankItemElement[] => [...fixture.element.querySelectorAll<RankItemElement>('ore-rank-item')];

  const part = (item: RankItemElement, name: string): HTMLElement | null =>
    item.shadowRoot?.querySelector<HTMLElement>(`[part="${name}"]`) ?? null;

  it('renders list and listitem semantics', async () => {
    fixture = await mount('ore-rank-list', { attrs: { 'aria-label': 'Most visited pages' }, html: itemsHtml });

    expect(fixture.element.getAttribute('role')).toBe('list');
    expect(fixture.element.getAttribute('aria-label')).toBe('Most visited pages');

    for (const item of items()) expect(item.getAttribute('role')).toBe('listitem');
  });

  it('numbers items in DOM order without sorting them', async () => {
    fixture = await mount('ore-rank-list', {
      html: '<ore-rank-item value="2">Blog</ore-rank-item><ore-rank-item value="8">Documentation</ore-rank-item>',
    });

    const [first, second] = items();

    expect(part(first, 'rank')?.textContent).toBe('1');
    expect(part(second, 'rank')?.textContent).toBe('2');
  });

  it('sizes each bar against the largest sibling value', async () => {
    fixture = await mount('ore-rank-list', { html: itemsHtml });

    const [first, second, third] = items();

    expect(part(first, 'bar-fill')?.style.getPropertyValue('--_fill')).toBe('1');
    expect(part(second, 'bar-fill')?.style.getPropertyValue('--_fill')).toBe('0.75');
    expect(part(third, 'bar-fill')?.style.getPropertyValue('--_fill')).toBe('0.375');
  });

  it('rescales every bar when a value grows past the previous maximum', async () => {
    fixture = await mount('ore-rank-list', { html: itemsHtml });

    const [first, second, third] = items();

    await fixture.act(() => {
      first.setAttribute('value', '12');
    });

    expect(part(first, 'bar-fill')?.style.getPropertyValue('--_fill')).toBe('1');
    expect(part(second, 'bar-fill')?.style.getPropertyValue('--_fill')).toBe('0.5');
    expect(part(third, 'bar-fill')?.style.getPropertyValue('--_fill')).toBe('0.25');
  });

  it('re-ranks when an item is appended', async () => {
    fixture = await mount('ore-rank-list', { html: itemsHtml });

    const appended = document.createElement('ore-rank-item');

    appended.setAttribute('value', '1');
    appended.textContent = 'Careers';

    await fixture.act(() => {
      fixture.element.append(appended);
    });

    const ranks = items().map((item) => part(item, 'rank')?.textContent);

    expect(ranks).toEqual(['1', '2', '3', '4']);
  });

  it('hides the bar and the auto value when a row has no value', async () => {
    fixture = await mount('ore-rank-list', {
      html: '<ore-rank-item value="4">Documentation</ore-rank-item><ore-rank-item>Pricing</ore-rank-item>',
    });

    const [, valueless] = items();

    expect(part(valueless, 'bar')?.hasAttribute('hidden')).toBe(true);
    expect(part(valueless, 'trailing')?.hasAttribute('hidden')).toBe(true);
    expect(part(valueless, 'label')).not.toBeNull();
    expect(valueless.textContent).toBe('Pricing');
  });

  it('disables the bar per item while keeping the formatted value', async () => {
    fixture = await mount('ore-rank-list', {
      html: '<ore-rank-item value="4" bar="false">Documentation</ore-rank-item>',
    });

    const [item] = items();

    expect(part(item, 'bar')?.hasAttribute('hidden')).toBe(true);
    expect(part(item, 'trailing')?.textContent).toBe('4');
  });

  it('displays the formatted value only when no trailing slot is present', async () => {
    fixture = await mount('ore-rank-list', {
      html: '<ore-rank-item value="8">Documentation</ore-rank-item><ore-rank-item value="6" bar="false">Pricing<span slot="trailing">24m 11s</span><span slot="description">4 timed sessions</span></ore-rank-item>',
    });

    const [counted, timed] = items();

    expect(part(counted, 'trailing')?.textContent).toBe('8');
    expect(timed.querySelector('[slot="trailing"]')?.textContent).toContain('24m 11s');
    expect(timed.querySelector('[slot="description"]')?.textContent).toContain('4 timed sessions');
    expect(part(timed, 'trailing')?.hasAttribute('hidden')).toBe(false);
  });

  it('renders a leading slot beside the rank', async () => {
    fixture = await mount('ore-rank-list', {
      html: '<ore-rank-item value="8"><span slot="leading">avatar</span>Documentation</ore-rank-item>',
    });

    const [item] = items();

    expect(part(item, 'leading')?.hasAttribute('hidden')).toBe(false);
    expect(item.querySelector('[slot="leading"]')?.textContent).toBe('avatar');
  });

  it('degrades to a plain labeled line outside a list', async () => {
    const item = await mount('ore-rank-item', {
      attrs: { value: '8' },
      html: 'Documentation',
    });

    fixture = item;

    expect(part(item.element as RankItemElement, 'rank')?.hasAttribute('hidden')).toBe(true);
    expect(part(item.element as RankItemElement, 'bar')?.hasAttribute('hidden')).toBe(true);
    expect(part(item.element as RankItemElement, 'label')).not.toBeNull();
    expect(item.element.textContent).toBe('Documentation');
    expect(part(item.element as RankItemElement, 'trailing')?.textContent).toBe('8');
  });

  describe('Accessibility', () => {
    it('passes axe checks with bars and slots', async () => {
      fixture = await mount('ore-rank-list', {
        attrs: { 'aria-label': 'Most visited pages' },
        html: '<ore-rank-item value="8"><span slot="leading">avatar</span>Documentation<span slot="trailing">8</span></ore-rank-item><ore-rank-item value="6">Pricing</ore-rank-item>',
      });

      const results = await axeCheck(fixture.element);

      expect(results.violations).toHaveLength(0);
    });

    it('passes axe checks as a standalone item', async () => {
      // role="listitem" outside a list flags aria-required-parent in a standalone mount, the
      // same documented jsdom limitation list-item.test.ts disables for its own case.
      fixture = await mount('ore-rank-item', { attrs: { value: '8' }, html: 'Documentation' });

      const results = await axeCheck(fixture.element, { rules: { 'aria-required-parent': { enabled: false } } });

      expect(results.violations).toHaveLength(0);
    });
  });
});

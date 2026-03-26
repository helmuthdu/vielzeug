import { type Fixture, mount } from '@vielzeug/craftit/testing';

describe('bit-breadcrumb', () => {
  let fixture: Fixture<HTMLElement>;
  const getItems = (): HTMLElement[] =>
    Array.from(fixture.element.getElementsByTagName('bit-breadcrumb-item')) as HTMLElement[];

  beforeAll(async () => {
    await import('./breadcrumb');
  });

  afterEach(() => {
    fixture?.destroy();
  });

  describe('Core Functionality', () => {
    it('renders navigation landmark and list', async () => {
      fixture = await mount('bit-breadcrumb', {
        html: '<bit-breadcrumb-item href="/">Home</bit-breadcrumb-item>',
      });

      expect(fixture.query('nav')).toBeTruthy();
      expect(fixture.query('ol[role="list"]')).toBeTruthy();
    });

    it('applies custom aria label', async () => {
      fixture = await mount('bit-breadcrumb', {
        attrs: { label: 'Page path' },
        html: '<bit-breadcrumb-item href="/">Home</bit-breadcrumb-item>',
      });

      expect(fixture.query('nav')?.getAttribute('aria-label')).toBe('Page path');
    });

    it('sets custom separator CSS variable', async () => {
      fixture = await mount('bit-breadcrumb', {
        attrs: { separator: '>' },
        html: '<bit-breadcrumb-item href="/">Home</bit-breadcrumb-item>',
      });

      expect(fixture.element.style.getPropertyValue('--breadcrumb-separator')).toContain('>');
    });

    it('propagates separator and visibility metadata to slotted items', async () => {
      fixture = await mount('bit-breadcrumb', {
        attrs: { separator: '>' },
        html: `
          <bit-breadcrumb-item href="/">Home</bit-breadcrumb-item>
          <bit-breadcrumb-item href="/docs">Docs</bit-breadcrumb-item>
        `,
      });

      const items = getItems();

      expect(items[0].getAttribute('separator')).toBe('>');
      expect(items[0].hasAttribute('data-show-separator')).toBe(false);
      expect(items[1].getAttribute('separator')).toBe('>');
      expect(items[1].hasAttribute('data-show-separator')).toBe(true);
    });
  });
});

describe('bit-breadcrumb-item accessibility', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('./breadcrumb');
  });

  afterEach(() => {
    fixture?.destroy();
  });

  describe('Accessibility', () => {
    it('uses semantic list item role', async () => {
      fixture = await mount('bit-breadcrumb-item', { html: 'Home' });

      expect(fixture.query('li[role="listitem"]')).toBeTruthy();
    });

    it('marks active item with aria-current page', async () => {
      fixture = await mount('bit-breadcrumb-item', { attrs: { active: '' }, html: 'Current' });

      expect(fixture.query('a')?.getAttribute('aria-current')).toBe('page');
    });

    it('removes active item from tab order', async () => {
      fixture = await mount('bit-breadcrumb-item', { attrs: { active: '' }, html: 'Current' });

      expect(fixture.query('a')?.getAttribute('tabindex')).toBe('-1');
    });

    it('keeps inactive links keyboard reachable', async () => {
      fixture = await mount('bit-breadcrumb-item', { attrs: { href: '/docs' }, html: 'Docs' });

      expect(fixture.query('a')?.getAttribute('href')).toBe('/docs');
      expect(fixture.query('a')?.getAttribute('tabindex')).toBeNull();
    });
  });
});

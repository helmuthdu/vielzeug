import { type Fixture, mount } from '@vielzeug/ore/testing';

beforeAll(async () => {
  await import('./app-store-button');
});

function badgePart(fixture: Fixture<HTMLElement>): Element | null {
  return fixture.element.shadowRoot?.querySelector('[part="link"]') ?? null;
}

describe('ore-app-store-button', () => {
  let fixture: Fixture<HTMLElement>;

  afterEach(() => {
    fixture?.dispose();
  });

  describe('Rendering', () => {
    it('renders an image-role badge when no href is set', async () => {
      fixture = await mount('ore-app-store-button');
      const badge = badgePart(fixture);

      expect(badge?.tagName).toBe('SPAN');
      expect(badge?.getAttribute('role')).toBe('img');
    });

    it('renders an anchor with href, rel, and target when href is set', async () => {
      fixture = await mount('ore-app-store-button', {
        attrs: { href: 'https://apps.apple.com/app/id1', rel: 'author', target: '_self' },
      });
      const badge = badgePart(fixture);

      expect(badge?.tagName).toBe('A');
      expect(badge?.getAttribute('href')).toBe('https://apps.apple.com/app/id1');
      expect(badge?.getAttribute('rel')).toBe('author');
      expect(badge?.getAttribute('target')).toBe('_self');
    });

    it('merges noopener noreferrer into rel when target is _blank', async () => {
      fixture = await mount('ore-app-store-button', {
        attrs: { href: 'https://example.test', target: '_blank' },
      });
      const rel = badgePart(fixture)?.getAttribute('rel');

      expect(rel).toContain('noopener');
      expect(rel).toContain('noreferrer');
    });

    it('renders the logo and the two-line store lockup', async () => {
      fixture = await mount('ore-app-store-button', { attrs: { store: 'google-play' } });
      const shadow = fixture.element.shadowRoot;

      expect(shadow?.querySelector('[part="logo"] svg path')).toBeTruthy();
      expect(shadow?.querySelector('[part="eyebrow"]')?.textContent).toBe('Get it on');
      expect(shadow?.querySelector('[part="store"]')?.textContent).toBe('Google Play');
    });
  });

  describe('Accessible naming', () => {
    it('names the default apple badge with the printed App Store badge text', async () => {
      fixture = await mount('ore-app-store-button');

      expect(badgePart(fixture)?.getAttribute('aria-label')).toBe('Download on the App Store');
    });

    it('names each store badge with its own printed text', async () => {
      fixture = await mount('ore-app-store-button', { attrs: { store: 'google-play' } });

      expect(badgePart(fixture)?.getAttribute('aria-label')).toBe('Get it on Google Play');
      fixture.dispose();

      fixture = await mount('ore-app-store-button', { attrs: { store: 'huawei' } });

      expect(badgePart(fixture)?.getAttribute('aria-label')).toBe('Explore it on AppGallery');
    });

    it('falls back to the apple badge for an unknown store value', async () => {
      fixture = await mount('ore-app-store-button', { attrs: { store: 'nintendo-eShop' } });

      expect(badgePart(fixture)?.getAttribute('aria-label')).toBe('Download on the App Store');
      expect(fixture.element.shadowRoot?.querySelector('[part="store"]')?.textContent).toBe('App Store');
    });

    it('uses an explicit label override instead of the badge text', async () => {
      fixture = await mount('ore-app-store-button', { attrs: { label: 'Get Quest Tamer on the App Store' } });

      expect(badgePart(fixture)?.getAttribute('aria-label')).toBe('Get Quest Tamer on the App Store');
    });
  });

  describe('Accessibility', () => {
    it('image badge passes axe without violations', async () => {
      fixture = await mount('ore-app-store-button');

      const results = await axeCheck(fixture.element);

      expect(results.violations).toHaveLength(0);
    });

    it('link badge passes axe without violations', async () => {
      fixture = await mount('ore-app-store-button', {
        attrs: { href: 'https://play.google.com/store/apps/details?id=test', store: 'google-play' },
      });

      const results = await axeCheck(fixture.element);

      expect(results.violations).toHaveLength(0);
    });
  });
});

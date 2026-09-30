import { fireClick } from '@vielzeug/assay';
import { type Fixture, mount } from '@vielzeug/ore/testing';

import type { CookieBannerElement, OreCookieBannerCategory } from './cookie-banner';

const MUSIC: OreCookieBannerCategory[] = [{ id: 'music', label: 'Music embeds' }];
const MUSIC_AND_STATS: OreCookieBannerCategory[] = [
  { description: 'Embed music from YouTube', id: 'music', label: 'Music embeds' },
  { description: 'Anonymous usage analytics', id: 'stats', label: 'Statistics' },
];

const openBanner = async (props: Partial<CookieBannerElement> = {}): Promise<Fixture<HTMLElement>> =>
  mount('ore-cookie-banner', { props: { categories: MUSIC, ...props } });

const captureDecide = (fixture: Fixture<HTMLElement>): ReturnType<typeof vi.fn> => {
  const handler = vi.fn();
  fixture.element.addEventListener('decide', handler);
  return handler;
};

const decideConsent = (handler: ReturnType<typeof vi.fn>): unknown =>
  (handler.mock.lastCall?.[0] as CustomEvent).detail.consent;

const checkedOf = (element: HTMLElement): boolean => (element as unknown as { checked: boolean }).checked;

/** The helper text rendered inside a row's checkbox (descriptions live there). */
const helperTextOf = (row: HTMLElement): string | null => {
  const checkbox = row.querySelector('ore-checkbox');
  const helper = checkbox?.shadowRoot?.querySelector<HTMLElement>('.helper-text');
  const text = helper && !helper.hasAttribute('hidden') ? helper.textContent?.trim() : null;
  return text || null;
};

describe('ore-cookie-banner', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('./cookie-banner');
  });

  afterEach(() => {
    fixture?.dispose();
  });

  describe('Rendering', () => {
    it('renders a labelled dialog with the default heading', async () => {
      fixture = await mount('ore-cookie-banner');

      const banner = fixture.query<HTMLElement>('.banner')!;

      expect(banner.getAttribute('role')).toBe('dialog');
      expect(banner.getAttribute('aria-modal')).toBe('false');
      expect(banner.getAttribute('aria-labelledby')).toBeTruthy();
      expect(banner.getAttribute('aria-describedby')).toBeTruthy();
      expect(fixture.query('.heading')?.textContent).toBe('Your privacy');
    });

    it('renders slot content as the policy text', async () => {
      fixture = await mount('ore-cookie-banner', { html: '<a href="/privacy">Privacy policy</a>' });

      expect(fixture.element.textContent).toContain('Privacy policy');
    });

    it('uses translated labels from the labels prop', async () => {
      fixture = await mount('ore-cookie-banner', { props: { labels: { acceptAll: 'Alle akzeptieren' } } });

      expect(fixture.query('.actions')?.textContent).toContain('Alle akzeptieren');
    });

    it('shows the essential row as locked with its note', async () => {
      fixture = await openBanner({ categories: MUSIC_AND_STATS });

      const essentialRow = fixture.queryAll<HTMLElement>('.category-row')[0]!;
      const essentialBox = essentialRow.querySelector('ore-checkbox')!;

      expect(essentialBox.hasAttribute('disabled')).toBe(true);
      expect(helperTextOf(essentialRow)).toBe('Required for the site to work');
    });

    it('links the essential note to the checkbox via aria-describedby', async () => {
      fixture = await openBanner({ categories: MUSIC_AND_STATS });

      const essentialBox = fixture.queryAll<HTMLElement>('.category-row')[0]!.querySelector('ore-checkbox')!;
      const helperId = essentialBox.shadowRoot?.querySelector('.helper-text')?.id;

      expect(essentialBox.getAttribute('aria-describedby')).toBe(helperId);
    });

    it('renders each category description as the checkbox helper text', async () => {
      fixture = await openBanner({ categories: MUSIC_AND_STATS });

      const rows = fixture.queryAll<HTMLElement>('.category-row');

      expect(rows).toHaveLength(3);
      expect(helperTextOf(rows[1]!)).toBe('Embed music from YouTube');
      expect(helperTextOf(rows[2]!)).toBe('Anonymous usage analytics');
    });

    it('omits the helper region when a category has no description', async () => {
      fixture = await openBanner();

      const musicRow = fixture.queryAll<HTMLElement>('.category-row')[1]!;

      expect(helperTextOf(musicRow)).toBeNull();
    });

    it('hides the banner via hide() and reveals it via show()', async () => {
      fixture = await mount('ore-cookie-banner');
      const banner = fixture.element as CookieBannerElement;

      await fixture.act(() => banner.hide());
      expect(banner.hidden).toBe(true);
      await fixture.act(() => banner.show());
      expect(banner.hidden).toBe(false);
    });
  });

  describe('Decisions', () => {
    it('accept all emits true for every category plus essential', async () => {
      fixture = await openBanner({ categories: MUSIC_AND_STATS });
      const buttons = fixture.queryAll<HTMLElement>('.actions ore-button');
      const handler = captureDecide(fixture);

      await fixture.act(() => fireClick(buttons[buttons.length - 1]!));

      expect(handler).toHaveBeenCalledTimes(1);
      expect(decideConsent(handler)).toEqual({ essential: true, music: true, stats: true });
    });

    it('reject emits false for every category but keeps essential true', async () => {
      fixture = await openBanner({ categories: MUSIC_AND_STATS });
      const reject = fixture.query<HTMLElement>('.actions ore-button')!;
      const handler = captureDecide(fixture);

      await fixture.act(() => fireClick(reject));

      expect(decideConsent(handler)).toEqual({ essential: true, music: false, stats: false });
    });

    it('decide always carries essential even without categories', async () => {
      fixture = await mount('ore-cookie-banner');
      const handler = captureDecide(fixture);

      await fixture.act(() => fireClick(fixture.query<HTMLElement>('.actions ore-button')!));

      expect(decideConsent(handler)).toEqual({ essential: true });
    });

    it('hides the banner automatically after a decision (default)', async () => {
      fixture = await openBanner();

      await fixture.act(() => fireClick(fixture.query<HTMLElement>('.actions ore-button')!));

      expect(fixture.element.hidden).toBe(true);
    });

    it('keeps the banner open after a decision when hide-on-decide is false', async () => {
      fixture = await openBanner({ hideOnDecide: false });

      await fixture.act(() => fireClick(fixture.query<HTMLElement>('.actions ore-button')!));

      expect(fixture.element.hidden).toBe(false);
    });
  });

  describe('Categories', () => {
    it('renders one checkbox per category plus a disabled essential row', async () => {
      fixture = await openBanner({ categories: MUSIC_AND_STATS });

      const boxes = fixture.queryAll<HTMLElement>('.categories ore-checkbox');

      expect(boxes).toHaveLength(3);
      expect(boxes[0]?.hasAttribute('disabled')).toBe(true);
      expect(boxes[1]?.textContent).toContain('Music embeds');
    });

    it('omits the category list when no categories are set', async () => {
      fixture = await mount('ore-cookie-banner');

      expect(fixture.query('.categories')).toBeNull();
    });

    it('seeds checkboxes from the consent prop', async () => {
      fixture = await openBanner({ categories: MUSIC, consent: { music: true } });

      const musicBox = fixture.queryAll<HTMLElement>('.categories ore-checkbox')[1]!;

      expect(checkedOf(musicBox)).toBe(true);
    });

    it('save emits the current checkbox state', async () => {
      fixture = await openBanner({ categories: MUSIC_AND_STATS, hideOnDecide: false });

      const musicBox = fixture.queryAll<HTMLElement>('.categories ore-checkbox')[1]!;
      await fixture.act(() => fireClick(musicBox));

      const save = fixture.queryAll<HTMLElement>('.actions ore-button')[1]!;
      const handler = captureDecide(fixture);
      await fixture.act(() => fireClick(save));

      expect(decideConsent(handler)).toEqual({ essential: true, music: true, stats: false });
    });

    it('show() re-seeds the checkboxes from the consent prop', async () => {
      fixture = await openBanner({ categories: MUSIC, consent: { music: true } });
      const banner = fixture.element as CookieBannerElement;
      const musicBox = () => fixture.queryAll<HTMLElement>('.categories ore-checkbox')[1]!;

      await fixture.act(() => fireClick(musicBox()));
      expect(checkedOf(musicBox())).toBe(false);

      await fixture.act(() => {
        banner.consent = { music: true };
        banner.show();
      });

      expect(checkedOf(musicBox())).toBe(true);
    });
  });

  describe('Focus management', () => {
    it('moves focus to the dialog card on show() — no action is preselected', async () => {
      fixture = await mount('ore-cookie-banner');
      const banner = fixture.element as CookieBannerElement;

      await fixture.act(() => banner.hide());
      await fixture.act(() => banner.show());

      const active = banner.shadowRoot?.activeElement;
      expect(active?.classList.contains('banner')).toBe(true);
    });

    it('returns focus to the previously focused element on hide()', async () => {
      const outside = document.createElement('button');
      document.body.appendChild(outside);
      outside.focus();

      fixture = await mount('ore-cookie-banner');
      const banner = fixture.element as CookieBannerElement;

      await fixture.act(() => banner.hide());

      expect(document.activeElement).toBe(outside);
      outside.remove();
    });
  });

  describe('Accessibility', () => {
    it('passes axe checks without categories', async () => {
      fixture = await mount('ore-cookie-banner', { html: '<p>We use cookies.</p>' });

      const results = await axeCheck(fixture.element);

      expect(results.violations).toHaveLength(0);
    });

    it('passes axe checks with categories and descriptions', async () => {
      fixture = await openBanner({ categories: MUSIC_AND_STATS });

      const results = await axeCheck(fixture.element);

      expect(results.violations).toHaveLength(0);
    });
  });
});

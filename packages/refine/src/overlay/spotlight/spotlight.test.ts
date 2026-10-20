import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { type Fixture, mount } from '@vielzeug/ore/testing';

const spotlightCss = readFileSync(join(import.meta.dirname, 'spotlight.css'), 'utf-8');

describe('ore-spotlight', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('./spotlight');
  });

  afterEach(() => {
    fixture?.dispose();
  });

  // ─── Rendering ───────────────────────────────────────────────────────────────

  describe('Rendering', () => {
    it('renders an aria-hidden overlay and a cutout', async () => {
      fixture = await mount('ore-spotlight');

      const overlay = fixture.query('.overlay');

      expect(overlay).toBeTruthy();
      expect(overlay?.getAttribute('aria-hidden')).toBe('true');
      expect(fixture.query('.cutout')).toBeTruthy();
    });

    it('is visible by default', async () => {
      fixture = await mount('ore-spotlight');

      expect(fixture.query('.overlay')?.getAttribute('data-visible')).toBe('true');
    });

    it('hides the dim layer when visible=false', async () => {
      fixture = await mount('ore-spotlight', { attrs: { visible: 'false' } });

      expect(fixture.query('.overlay')?.getAttribute('data-visible')).toBe('false');
    });
  });

  // ─── Rect ────────────────────────────────────────────────────────────────────

  describe('Rect', () => {
    it('suppresses the cutout when no rect is set', async () => {
      fixture = await mount('ore-spotlight');

      expect(fixture.query('.overlay')?.getAttribute('style')).toContain('--_cutout-display:none');
    });

    it('positions the cutout from a viewport-space rect', async () => {
      fixture = await mount('ore-spotlight', {
        props: { rect: { height: 40, width: 100, x: 12, y: 34 } },
      });

      const style = fixture.query('.overlay')?.getAttribute('style') ?? '';

      expect(style).toContain('--_cutout-display:block');
      expect(style).toContain('--_cutout-h:40px');
      expect(style).toContain('--_cutout-l:12px');
      expect(style).toContain('--_cutout-t:34px');
      expect(style).toContain('--_cutout-w:100px');
    });

    it('falls back to no cutout for a zero-size rect', async () => {
      fixture = await mount('ore-spotlight', {
        props: { rect: { height: 0, width: 100, x: 0, y: 0 } },
      });

      expect(fixture.query('.overlay')?.getAttribute('style')).toContain('--_cutout-display:none');
    });

    it('updates the cutout when the rect prop changes', async () => {
      fixture = await mount('ore-spotlight', {
        props: { rect: { height: 10, width: 10, x: 0, y: 0 } },
      });

      await fixture.act(() => {
        (fixture.element as { rect: unknown }).rect = { height: 20, width: 30, x: 5, y: 6 };
      });

      const style = fixture.query('.overlay')?.getAttribute('style') ?? '';

      expect(style).toContain('--_cutout-h:20px');
      expect(style).toContain('--_cutout-w:30px');
    });
  });

  // ─── Radius ──────────────────────────────────────────────────────────────────

  describe('Radius', () => {
    it('defaults the cutout radius to 8px', async () => {
      fixture = await mount('ore-spotlight');

      expect(fixture.query('.cutout')?.getAttribute('style')).toContain('--_cutout-radius:8px');
    });

    it('applies the radius prop', async () => {
      fixture = await mount('ore-spotlight', { attrs: { radius: '16' } });

      expect(fixture.query('.cutout')?.getAttribute('style')).toContain('--_cutout-radius:16px');
    });
  });

  // ─── Dim rendering ───────────────────────────────────────────────────────────

  describe('Dim rendering', () => {
    it('keeps the dim shadow valid without a ring', () => {
      // Regression: `box-shadow: none, 0 0 0 100vmax ...` is invalid CSS (none
      // cannot appear in a comma-separated shadow list), so a default ring of
      // `none` used to invalidate the whole declaration and nothing painted.
      // The dim must be a single shadow; the ring lives on .cutout::after.
      const cutoutBlock = spotlightCss.match(/\.cutout\s*{([^}]*)}/s)?.[1] ?? '';

      expect(cutoutBlock).toMatch(/box-shadow:\s*0 0 0 100vmax var\(--_dim\);/);
      expect(cutoutBlock).not.toMatch(/var\(--_ring\)/);
      expect(spotlightCss).toMatch(/\.cutout::after\s*{[^}]*box-shadow:\s*var\(--_ring\);/s);
    });
  });

  // ─── Accessibility ───────────────────────────────────────────────────────────

  describe('Accessibility', () => {
    it('has no detectable violations', async () => {
      fixture = await mount('ore-spotlight', {
        props: { rect: { height: 40, width: 100, x: 12, y: 34 } },
      });

      const results = await axeCheck(fixture.element);

      expect(results.violations).toHaveLength(0);
    });
  });
});

import { type Fixture, mount } from '@vielzeug/craftit/testing';

describe('bit-separator', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('./separator');
  });

  afterEach(() => {
    fixture?.destroy();
  });

  // ─── Rendering ───────────────────────────────────────────────────────────────

  describe('Rendering', () => {
    it('renders an hr element', async () => {
      fixture = await mount('bit-separator');

      expect(fixture.query('hr.separator')).toBeTruthy();
    });

    it('renders label text when label prop is provided', async () => {
      fixture = await mount('bit-separator', { attrs: { label: 'or' } });

      expect(fixture.query('.separator-label')?.textContent?.trim()).toBe('or');
    });

    it('renders two hr elements when label is present', async () => {
      fixture = await mount('bit-separator', { attrs: { label: 'section' } });

      expect(fixture.shadow?.querySelectorAll('hr').length).toBeGreaterThanOrEqual(2);
    });

    it('renders single hr when no label', async () => {
      fixture = await mount('bit-separator');

      expect(fixture.shadow?.querySelectorAll('hr').length).toBe(1);
    });
  });

  // ─── Props ───────────────────────────────────────────────────────────────────

  describe('Props', () => {
    it('applies orientation attribute on host', async () => {
      fixture = await mount('bit-separator', { attrs: { orientation: 'vertical' } });

      expect(fixture.element.getAttribute('orientation')).toBe('vertical');
    });

    it('applies color attribute on host', async () => {
      fixture = await mount('bit-separator', { attrs: { color: 'primary' } });

      expect(fixture.element.getAttribute('color')).toBe('primary');
    });

    it('defaults to horizontal orientation', async () => {
      fixture = await mount('bit-separator');

      const orientation = fixture.element.getAttribute('orientation') ?? 'horizontal';

      expect(orientation).toBe('horizontal');
    });
  });

  // ─── Edge Cases ──────────────────────────────────────────────────────────────

  describe('Edge Cases', () => {
    it('renders without label when label is empty string', async () => {
      fixture = await mount('bit-separator', { attrs: { label: '' } });

      expect(fixture.query('.separator-label')).toBeFalsy();
    });
  });
});

// ─── Accessibility ────────────────────────────────────────────────────────────

describe('bit-separator accessibility', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('./separator');
  });

  afterEach(() => {
    fixture?.destroy();
  });

  describe('Decorative Mode (default)', () => {
    it('hr is aria-hidden in decorative mode', async () => {
      fixture = await mount('bit-separator');

      expect(fixture.query('hr')?.getAttribute('aria-hidden')).toBe('true');
    });

    it('hr has role="none" in decorative mode', async () => {
      fixture = await mount('bit-separator');

      expect(fixture.query('hr')?.getAttribute('role')).toBe('none');
    });
  });

  describe('Semantic Mode (decorative=false)', () => {
    it('hr has role="separator" when not decorative', async () => {
      fixture = await mount('bit-separator', { attrs: { decorative: 'false' } });

      expect(fixture.query('hr')?.getAttribute('role')).toBe('separator');
    });

    it('aria-hidden is removed when not decorative', async () => {
      fixture = await mount('bit-separator', { attrs: { decorative: 'false' } });

      expect(fixture.query('hr')?.getAttribute('aria-hidden')).toBeNull();
    });

    it('exposes aria-orientation for vertical semantic separator', async () => {
      fixture = await mount('bit-separator', { attrs: { decorative: 'false', orientation: 'vertical' } });

      expect(fixture.query('hr')?.getAttribute('aria-orientation')).toBe('vertical');
    });
  });

  describe('Labelled Separator', () => {
    it('label text is visible in DOM', async () => {
      fixture = await mount('bit-separator', { attrs: { label: 'Continue with' } });

      expect(fixture.query('.separator-label')?.textContent?.trim()).toBe('Continue with');
    });
  });
});

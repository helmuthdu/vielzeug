import { type Fixture, mount } from '@vielzeug/craftit/test';

describe('bit-progress', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('./progress');
  });

  afterEach(() => {
    fixture?.destroy();
  });

  describe('Core Functionality', () => {
    it('renders linear progressbar by default', async () => {
      fixture = await mount('bit-progress', { attrs: { value: '40' } });

      expect(fixture.query('.track[role="progressbar"]')).toBeTruthy();
      expect(fixture.query('.fill')).toBeTruthy();
    });

    it('renders circular variant when requested', async () => {
      fixture = await mount('bit-progress', { attrs: { type: 'circular', value: '40' } });

      expect(fixture.query('.circular-track[role="progressbar"]')).toBeTruthy();
      expect(fixture.query('svg')).toBeTruthy();
    });

    it('applies visible fill width in linear determinate mode', async () => {
      fixture = await mount('bit-progress', { attrs: { max: '100', value: '40' } });

      // Both the CSS custom property (for CSS var inheritance) and the inline
      // style binding (direct fallback) should reflect the correct percentage.
      expect(fixture.element.style.getPropertyValue('--_percent')).toBe('40%');

      const fill = fixture.query<HTMLElement>('.fill');

      expect(fill?.getAttribute('style')).toContain('width:40%');
    });
  });

  describe('Accessibility', () => {
    it('exposes valuemin and valuemax attributes', async () => {
      fixture = await mount('bit-progress', { attrs: { max: '200', value: '40' } });

      const el = fixture.query('[role="progressbar"]');

      expect(el?.getAttribute('aria-valuemin')).toBe('0');
      expect(el?.getAttribute('aria-valuemax')).toBe('200');
    });

    it('exposes valuenow in determinate mode', async () => {
      fixture = await mount('bit-progress', { attrs: { value: '40' } });

      expect(fixture.query('[role="progressbar"]')?.getAttribute('aria-valuenow')).toBe('40');
    });

    it('omits valuenow in indeterminate mode for screen readers', async () => {
      fixture = await mount('bit-progress', { attrs: { indeterminate: '', label: 'Loading tasks' } });

      expect(fixture.query('[role="progressbar"]')?.getAttribute('aria-valuenow')).toBeNull();
      expect(fixture.query('[role="progressbar"]')?.getAttribute('aria-label')).toBe('Loading tasks');
    });
  });
});

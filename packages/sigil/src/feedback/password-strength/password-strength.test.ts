import { type Fixture, mount } from '@vielzeug/craft/testing';

describe('bit-password-strength', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('./password-strength');
  });

  afterEach(() => {
    fixture?.destroy();
  });

  describe('Core Functionality', () => {
    it('renders meter structure with four segments', async () => {
      fixture = await mount('bit-password-strength');

      expect(fixture.query('[role="meter"]')).toBeTruthy();
      expect(fixture.queryAll('.segment').length).toBe(4);
    });

    it('activates segments based on computed score from value', async () => {
      fixture = await mount('bit-password-strength', { attrs: { value: 'Abcdef12!' } });

      expect(fixture.queryAll('.segment.active').length).toBe(3);
    });

    it('uses score override when provided', async () => {
      fixture = await mount('bit-password-strength', { attrs: { score: '4', value: 'abc' } });

      expect(fixture.queryAll('.segment.active').length).toBe(4);
      expect(fixture.element.getAttribute('data-level')).toBe('strong');
    });

    it('normalizes out-of-range score to 4', async () => {
      fixture = await mount('bit-password-strength', { attrs: { score: '10' } });

      expect(fixture.queryAll('.segment.active').length).toBe(4);
    });

    it('uses value scoring when score is -1 (no override)', async () => {
      fixture = await mount('bit-password-strength', { attrs: { score: '-1', value: 'Tr0ub4dor&3Abc' } });

      expect(fixture.queryAll('.segment.active').length).toBe(4);
    });

    it('supports custom labels array', async () => {
      fixture = await mount('bit-password-strength', { attrs: { score: '2' } });

      (fixture.element as HTMLElement & { labels: string[] }).labels = ['none', 'bad', 'ok', 'nice', 'excellent'];
      await fixture.flush();

      expect(fixture.query('.level-label')?.textContent?.trim()).toBe('ok');
    });
  });

  describe('Accessibility & WAI-ARIA', () => {
    it('uses role meter with aria range attrs', async () => {
      fixture = await mount('bit-password-strength', { attrs: { score: '3' } });

      const meter = fixture.query('[role="meter"]');

      expect(meter?.getAttribute('aria-valuemin')).toBe('0');
      expect(meter?.getAttribute('aria-valuemax')).toBe('4');
      expect(meter?.getAttribute('aria-valuenow')).toBe('3');
    });

    it('uses default accessible label', async () => {
      fixture = await mount('bit-password-strength');

      expect(fixture.query('[role="meter"]')?.getAttribute('aria-label')).toBe('Password strength');
    });

    it('supports custom accessible label', async () => {
      fixture = await mount('bit-password-strength', { attrs: { label: 'Account password strength' } });

      expect(fixture.query('[role="meter"]')?.getAttribute('aria-label')).toBe('Account password strength');
    });

    it('omits aria-valuetext when score resolves to empty', async () => {
      fixture = await mount('bit-password-strength', { attrs: { value: '' } });

      expect(fixture.query('[role="meter"]')?.getAttribute('aria-valuetext')).toBeNull();
    });

    it('sets aria-valuetext when score has a label', async () => {
      fixture = await mount('bit-password-strength', { attrs: { score: '4' } });

      expect(fixture.query('[role="meter"]')?.getAttribute('aria-valuetext')).toBe('Strong');
    });

    it('keeps decorative segments aria-hidden', async () => {
      fixture = await mount('bit-password-strength');

      expect(fixture.query('.segments')?.getAttribute('aria-hidden')).toBe('true');
    });

    it('is not keyboard-focusable by default', async () => {
      fixture = await mount('bit-password-strength');

      expect(fixture.element.getAttribute('tabindex')).toBeNull();
    });
  });

  describe('Edge Cases & Error Handling', () => {
    it('handles empty value gracefully', async () => {
      fixture = await mount('bit-password-strength', { attrs: { value: '' } });

      expect(fixture.queryAll('.segment.active').length).toBe(0);
      expect(fixture.element.getAttribute('data-level')).toBe('empty');
    });

    it('reacts to dynamic value changes', async () => {
      fixture = await mount('bit-password-strength', { attrs: { value: 'abc' } });
      await fixture.attr('value', 'Abcdef12!');

      expect(fixture.queryAll('.segment.active').length).toBe(3);
      expect(fixture.element.getAttribute('data-level')).toBe('good');
    });

    it('hides visible label when show-label is false', async () => {
      fixture = await mount('bit-password-strength', { attrs: { score: '3' } });

      (fixture.element as HTMLElement & { ['show-label']: boolean })['show-label'] = false;
      await fixture.flush();

      expect(fixture.query('.level-label')).toBeNull();
    });

    it('updates data-level host state for color indicators', async () => {
      fixture = await mount('bit-password-strength', { attrs: { score: '2' } });

      expect(fixture.element.getAttribute('data-level')).toBe('fair');
    });

    it('falls back to default labels when custom labels length is invalid', async () => {
      fixture = await mount('bit-password-strength', { attrs: { score: '3' } });

      (fixture.element as HTMLElement & { labels: string[] }).labels = ['x', 'y'];
      await fixture.flush();

      expect(fixture.query('.level-label')?.textContent?.trim()).toBe('Good');
    });

    it('reacts to dynamic score updates', async () => {
      fixture = await mount('bit-password-strength', { attrs: { score: '1' } });
      await fixture.attr('score', '4');

      expect(fixture.queryAll('.segment.active').length).toBe(4);
      expect(fixture.element.getAttribute('data-level')).toBe('strong');
    });
  });
});

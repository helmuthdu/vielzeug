import { type Fixture, mount } from '@vielzeug/craftit/testing';

describe('bit-tab-panel', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('./tab-panel');
  });

  afterEach(() => {
    fixture?.destroy();
  });

  describe('Core Functionality', () => {
    it('renders panel with role tabpanel', async () => {
      fixture = await mount('bit-tab-panel', { attrs: { value: 'overview' }, html: 'Overview body' });

      expect(fixture.query('[role="tabpanel"]')).toBeTruthy();
    });

    it('maps value to panel id', async () => {
      fixture = await mount('bit-tab-panel', { attrs: { value: 'overview' }, html: 'Overview body' });

      expect(fixture.query('[role="tabpanel"]')?.id).toBe('tabpanel-overview');
    });
  });

  describe('Accessibility', () => {
    it('links panel back to tab using aria-labelledby', async () => {
      fixture = await mount('bit-tab-panel', { attrs: { value: 'overview' }, html: 'Overview body' });

      expect(fixture.query('[role="tabpanel"]')?.getAttribute('aria-labelledby')).toBe('tab-overview');
    });

    it('uses aria-hidden false when active', async () => {
      fixture = await mount('bit-tab-panel', { attrs: { active: '', value: 'overview' }, html: 'Overview body' });

      expect(fixture.query('[role="tabpanel"]')?.getAttribute('aria-hidden')).toBe('false');
    });

    it('uses aria-hidden true when inactive', async () => {
      fixture = await mount('bit-tab-panel', { attrs: { value: 'overview' }, html: 'Overview body' });

      expect(fixture.query('[role="tabpanel"]')?.getAttribute('aria-hidden')).toBe('true');
    });

    it('is keyboard focusable for screen reader browse mode handoff', async () => {
      fixture = await mount('bit-tab-panel', { attrs: { value: 'overview' }, html: 'Overview body' });

      expect(fixture.query('[role="tabpanel"]')?.getAttribute('tabindex')).toBe('0');
    });
  });

  describe('Edge Cases', () => {
    it('does not render slot content before first activation in lazy mode', async () => {
      fixture = await mount('bit-tab-panel', { attrs: { lazy: '', value: 'overview' }, html: 'Overview body' });

      expect(fixture.query('[role="tabpanel"]')?.textContent?.trim()).toBe('');
    });
  });
});

import { type Fixture, mount } from '@vielzeug/ore/testing';

describe('ore-tab-panel', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('./tab-panel');
  });

  afterEach(() => {
    fixture?.dispose();
  });

  describe('Core Functionality', () => {
    it('renders panel with role tabpanel', async () => {
      fixture = await mount('ore-tab-panel', { attrs: { value: 'overview' }, html: 'Overview body' });

      expect(fixture.query('[role="tabpanel"]')).toBeTruthy();
    });

    it('maps value to panel id', async () => {
      fixture = await mount('ore-tab-panel', { attrs: { value: 'overview' }, html: 'Overview body' });

      expect(fixture.query('[role="tabpanel"]')?.id).toBe('tabpanel-overview');
    });
  });

  describe('Accessibility', () => {
    // `aria-labelledby` is a cross-shadow-root ARIA relationship — set via `ariaLabelledByElements`
    // (or a plain attribute fallback) once a matching `<ore-tab-item>` is found inside an
    // ancestor `<ore-tabs>`. See `ore-tabs`'s own integration test for the paired assertion —
    // a standalone `<ore-tab-panel>` (no `<ore-tabs>` ancestor) has no peer, so the relationship
    // is correctly absent rather than pointing at a nonexistent element.
    it('has no aria-labelledby relationship when mounted without an ore-tabs ancestor', async () => {
      fixture = await mount('ore-tab-panel', { attrs: { value: 'overview' }, html: 'Overview body' });

      const panel = fixture.query<HTMLElement>('[role="tabpanel"]');

      expect(panel?.getAttribute('aria-labelledby')).toBeNull();
      expect(panel && 'ariaLabelledByElements' in panel ? panel.ariaLabelledByElements : null).toBeNull();
    });

    it('uses aria-hidden false when active', async () => {
      fixture = await mount('ore-tab-panel', { attrs: { active: '', value: 'overview' }, html: 'Overview body' });

      expect(fixture.query('[role="tabpanel"]')?.getAttribute('aria-hidden')).toBe('false');
    });

    it('uses aria-hidden true when inactive', async () => {
      fixture = await mount('ore-tab-panel', { attrs: { value: 'overview' }, html: 'Overview body' });

      expect(fixture.query('[role="tabpanel"]')?.getAttribute('aria-hidden')).toBe('true');
    });

    it('is keyboard focusable for screen reader browse mode handoff', async () => {
      fixture = await mount('ore-tab-panel', { attrs: { value: 'overview' }, html: 'Overview body' });

      expect(fixture.query('[role="tabpanel"]')?.getAttribute('tabindex')).toBe('0');
    });
  });

  describe('Edge Cases', () => {
    it('does not render slot content before first activation in lazy mode', async () => {
      fixture = await mount('ore-tab-panel', { attrs: { lazy: '', value: 'overview' }, html: 'Overview body' });

      expect(fixture.query('[role="tabpanel"]')?.textContent?.trim()).toBe('');
    });
  });

  describe('Accessibility', () => {
    it('passes axe checks', async () => {
      fixture = await mount('ore-tab-panel', {
        attrs: { value: 'overview' },
        html: 'Overview content',
      });

      const results = await axeCheck(fixture.element, {
        rules: { 'aria-required-parent': { enabled: false } },
      });

      expect(results.violations).toHaveLength(0);
    });
  });
});

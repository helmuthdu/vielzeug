import { type Fixture, mount } from '@vielzeug/ore/testing';

describe('ore-tab-item', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('./tab-item');
  });

  afterEach(() => {
    fixture?.dispose();
  });

  describe('Core Functionality', () => {
    it('renders interactive button with role tab', async () => {
      fixture = await mount('ore-tab-item', { attrs: { value: 'overview' }, html: 'Overview' });

      expect(fixture.query('button[role="tab"]')).toBeTruthy();
    });

    it('dispatches click with value on click', async () => {
      fixture = await mount('ore-tab-item', { attrs: { value: 'overview' }, html: 'Overview' });

      const handler = vi.fn();

      fixture.element.addEventListener('click', handler);

      fixture.query('button')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      expect(handler).toHaveBeenCalledTimes(1);
      expect((handler.mock.calls[0][0] as CustomEvent).detail.value).toBe('overview');
    });
  });

  describe('Accessibility', () => {
    // `aria-controls` is a cross-shadow-root ARIA relationship — set via `ariaControlsElements`
    // (or a plain attribute fallback) once a matching `<ore-tab-panel>` is found inside an
    // ancestor `<ore-tabs>`. See `ore-tabs`'s own integration test for the paired assertion —
    // a standalone `<ore-tab-item>` (no `<ore-tabs>` ancestor) has no peer, so the relationship
    // is correctly absent rather than pointing at a nonexistent element.
    it('has no aria-controls relationship when mounted without an ore-tabs ancestor', async () => {
      fixture = await mount('ore-tab-item', { attrs: { value: 'settings' }, html: 'Settings' });

      const button = fixture.query<HTMLButtonElement>('button');

      expect(button?.getAttribute('aria-controls')).toBeNull();
      expect(button && 'ariaControlsElements' in button ? button.ariaControlsElements : null).toBeNull();
    });

    it('sets aria-disabled when disabled', async () => {
      fixture = await mount('ore-tab-item', { attrs: { disabled: '', value: 'settings' }, html: 'Settings' });

      expect(fixture.query('button')?.getAttribute('aria-disabled')).toBe('true');
    });

    it('uses roving tabindex attributes', async () => {
      fixture = await mount('ore-tab-item', { attrs: { value: 'settings' }, html: 'Settings' });

      const tabindex = fixture.query('button')?.getAttribute('tabindex');

      expect(tabindex === '0' || tabindex === '-1').toBe(true);
    });
  });

  describe('Accessibility', () => {
    it('passes axe checks', async () => {
      fixture = await mount('ore-tab-item', { attrs: { value: 'overview' }, html: 'Overview' });

      const results = await axeCheck(fixture.element, {
        rules: {
          'aria-required-parent': { enabled: false },
          'aria-valid-attr-value': { enabled: false },
        },
      });

      expect(results.violations).toHaveLength(0);
    });
  });
});

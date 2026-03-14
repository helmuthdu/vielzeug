import { type Fixture, mount } from '@vielzeug/craftit/test';

describe('bit-tab-item', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('./tab-item');
  });

  afterEach(() => {
    fixture?.destroy();
  });

  describe('Core Functionality', () => {
    it('renders interactive button with role tab', async () => {
      fixture = await mount('bit-tab-item', { attrs: { value: 'overview' }, html: 'Overview' });

      expect(fixture.query('button[role="tab"]')).toBeTruthy();
    });

    it('dispatches tab-click with value on click', async () => {
      fixture = await mount('bit-tab-item', { attrs: { value: 'overview' }, html: 'Overview' });

      const handler = vi.fn();

      fixture.element.addEventListener('tab-click', handler);

      fixture.query('button')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      expect(handler).toHaveBeenCalledTimes(1);
      expect((handler.mock.calls[0][0] as CustomEvent).detail.value).toBe('overview');
    });
  });

  describe('Accessibility', () => {
    it('links tab to panel via aria-controls', async () => {
      fixture = await mount('bit-tab-item', { attrs: { value: 'settings' }, html: 'Settings' });

      expect(fixture.query('button')?.getAttribute('aria-controls')).toBe('tabpanel-settings');
    });

    it('sets aria-disabled when disabled', async () => {
      fixture = await mount('bit-tab-item', { attrs: { disabled: '', value: 'settings' }, html: 'Settings' });

      expect(fixture.query('button')?.getAttribute('aria-disabled')).toBe('true');
    });

    it('uses roving tabindex attributes', async () => {
      fixture = await mount('bit-tab-item', { attrs: { value: 'settings' }, html: 'Settings' });

      const tabindex = fixture.query('button')?.getAttribute('tabindex');

      expect(tabindex === '0' || tabindex === '-1').toBe(true);
    });
  });
});

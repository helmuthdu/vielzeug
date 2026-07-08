import { type Fixture, mount } from '@vielzeug/ore/testing';

describe('ore-typing-indicator', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('./typing-indicator');
  });

  afterEach(() => {
    fixture?.dispose();
  });

  describe('Core Functionality', () => {
    it('renders three dots', async () => {
      fixture = await mount('ore-typing-indicator');

      expect(fixture.queryAll('.dot')).toHaveLength(3);
    });

    it('announces the default label once mounted', async () => {
      fixture = await mount('ore-typing-indicator');

      const region = document.querySelector('[data-block-announcer="polite"]');

      await new Promise((r) => setTimeout(r, 60)); // announce() clear-then-set delay

      expect(region?.textContent).toBe('Typing…');
    });

    it('announces a custom label', async () => {
      fixture = await mount('ore-typing-indicator', { attrs: { label: 'Assistant is typing…' } });

      const region = document.querySelector('[data-block-announcer="polite"]');

      await new Promise((r) => setTimeout(r, 60));

      expect(region?.textContent).toBe('Assistant is typing…');
    });

    it('re-announces when the label attribute changes', async () => {
      fixture = await mount('ore-typing-indicator', { attrs: { label: 'Assistant is typing…' } });

      await new Promise((r) => setTimeout(r, 60));

      fixture.element.setAttribute('label', 'Bot is typing…');
      await fixture.flush();

      const region = document.querySelector('[data-block-announcer="polite"]');

      await new Promise((r) => setTimeout(r, 60));

      expect(region?.textContent).toBe('Bot is typing…');
    });

    it('applies color attribute', async () => {
      fixture = await mount('ore-typing-indicator', { attrs: { color: 'primary' } });

      expect(fixture.element.getAttribute('color')).toBe('primary');
    });

    it('applies size attribute', async () => {
      fixture = await mount('ore-typing-indicator', { attrs: { size: 'lg' } });

      expect(fixture.element.getAttribute('size')).toBe('lg');
    });
  });

  describe('Accessibility', () => {
    it('dots container is aria-hidden (decorative)', async () => {
      fixture = await mount('ore-typing-indicator');

      expect(fixture.query('.dots')?.getAttribute('aria-hidden')).toBe('true');
    });

    it('has no visible live region in its own shadow tree — the label is announced, not rendered', async () => {
      fixture = await mount('ore-typing-indicator');

      expect(fixture.query('[role="status"]')).toBeFalsy();
      expect(fixture.query('[aria-live]')).toBeFalsy();
    });

    it('passes axe checks', async () => {
      fixture = await mount('ore-typing-indicator');

      const results = await axeCheck(fixture.element);

      expect(results.violations).toHaveLength(0);
    });

    it('passes axe checks with a custom label and color', async () => {
      fixture = await mount('ore-typing-indicator', { attrs: { color: 'primary', label: 'Bot is typing…' } });

      const results = await axeCheck(fixture.element);

      expect(results.violations).toHaveLength(0);
    });
  });
});

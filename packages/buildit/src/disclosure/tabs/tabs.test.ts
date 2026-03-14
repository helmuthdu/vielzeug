import { type Fixture, mount, user } from '@vielzeug/craftit/test';

describe('bit-tabs', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('./tabs');
    await import('../tab-item/tab-item');
    await import('../tab-panel/tab-panel');
  });

  afterEach(() => {
    fixture?.destroy();
  });

  const htmlTabs = `
    <bit-tab-item slot="tabs" value="overview">Overview</bit-tab-item>
    <bit-tab-item slot="tabs" value="settings">Settings</bit-tab-item>
    <bit-tab-panel value="overview">Overview content</bit-tab-panel>
    <bit-tab-panel value="settings">Settings content</bit-tab-panel>
  `;

  describe('Core Functionality', () => {
    it('renders tablist and panel container', async () => {
      fixture = await mount('bit-tabs', { attrs: { value: 'overview' }, html: htmlTabs });

      expect(fixture.query('[role="tablist"]')).toBeTruthy();
      expect(fixture.query('.panels')).toBeTruthy();
    });

    it('emits change when a different tab is clicked', async () => {
      fixture = await mount('bit-tabs', { attrs: { value: 'overview' }, html: htmlTabs });

      const onChange = vi.fn();

      fixture.element.addEventListener('change', onChange);

      const tabs = fixture.element.querySelectorAll('bit-tab-item');

      tabs[1].dispatchEvent(new CustomEvent('tab-click', { bubbles: true, composed: true }));

      expect(onChange).toHaveBeenCalledTimes(1);
      expect((onChange.mock.calls[0][0] as CustomEvent).detail.value).toBe('settings');
    });
  });

  describe('Accessibility', () => {
    it('supports keyboard navigation on horizontal tabs', async () => {
      fixture = await mount('bit-tabs', { attrs: { value: 'overview' }, html: htmlTabs });

      await user.press(fixture.element, 'ArrowRight');
      expect(fixture.element.getAttribute('value')).toBe('settings');
    });

    it('sets aria orientation on tablist', async () => {
      fixture = await mount('bit-tabs', {
        attrs: { orientation: 'vertical', value: 'overview' },
        html: htmlTabs,
      });

      expect(fixture.query('[role="tablist"]')?.getAttribute('aria-orientation')).toBe('vertical');
    });

    it('keeps only active panel visible to assistive tech', async () => {
      fixture = await mount('bit-tabs', { attrs: { value: 'overview' }, html: htmlTabs });

      const panels = fixture.element.querySelectorAll('bit-tab-panel');
      const firstPanel = panels[0].shadowRoot?.querySelector('[role="tabpanel"]');
      const secondPanel = panels[1].shadowRoot?.querySelector('[role="tabpanel"]');

      expect(firstPanel?.getAttribute('aria-hidden')).toBe('false');
      expect(secondPanel?.getAttribute('aria-hidden')).toBe('true');
    });
  });

  describe('Edge Cases', () => {
    it('renders lazy tab-panel content when the lazy panel is initially active', async () => {
      fixture = await mount('bit-tabs', {
        attrs: { value: 'details' },
        html: `
          <bit-tab-item slot="tabs" value="overview">Overview</bit-tab-item>
          <bit-tab-item slot="tabs" value="details">Details</bit-tab-item>
          <bit-tab-panel value="overview">Overview content</bit-tab-panel>
          <bit-tab-panel value="details" lazy>Details content</bit-tab-panel>
        `,
      });

      const lazyPanel = fixture.element.querySelectorAll('bit-tab-panel')[1];

      await fixture.flush();
      await new Promise((r) => setTimeout(r, 20));

      const panelAfter = lazyPanel.shadowRoot?.querySelector('[role="tabpanel"]');

      expect(panelAfter?.getAttribute('aria-hidden')).toBe('false');
      expect(panelAfter?.querySelector('slot')).toBeTruthy();
    });
  });
});

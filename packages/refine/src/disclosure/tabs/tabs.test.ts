import { type Fixture, mount, user } from '@vielzeug/ore/testing';

describe('ore-tabs', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('./tabs');
    await import('../tab-item/tab-item');
    await import('../tab-panel/tab-panel');
  });

  afterEach(() => {
    fixture?.dispose();
  });

  const htmlTabs = `
    <ore-tab-item slot="tabs" value="overview">Overview</ore-tab-item>
    <ore-tab-item slot="tabs" value="settings">Settings</ore-tab-item>
    <ore-tab-panel value="overview">Overview content</ore-tab-panel>
    <ore-tab-panel value="settings">Settings content</ore-tab-panel>
  `;

  describe('Core Functionality', () => {
    it('renders tablist and panel container', async () => {
      fixture = await mount('ore-tabs', { attrs: { value: 'overview' }, html: htmlTabs });

      expect(fixture.query('[role="tablist"]')).toBeTruthy();
      expect(fixture.query('.panels')).toBeTruthy();
    });

    it('emits change when a different tab is clicked', async () => {
      fixture = await mount('ore-tabs', { attrs: { value: 'overview' }, html: htmlTabs });

      const onChange = vi.fn();

      fixture.element.addEventListener('change', onChange);

      const tabs = fixture.element.querySelectorAll('ore-tab-item');

      tabs[1].dispatchEvent(new CustomEvent('click', { bubbles: true, composed: true }));

      expect(onChange).toHaveBeenCalledTimes(1);
      expect((onChange.mock.calls[0][0] as CustomEvent).detail.value).toBe('settings');
    });

    it('falls back to first enabled tab when value is missing', async () => {
      fixture = await mount('ore-tabs', { html: htmlTabs });

      await fixture.flush();

      const panels = fixture.element.querySelectorAll('ore-tab-panel');
      const firstPanel = panels[0].shadowRoot?.querySelector('[role="tabpanel"]');

      expect(fixture.element.getAttribute('value')).toBe('overview');
      expect(firstPanel?.getAttribute('aria-hidden')).toBe('false');
    });

    it('falls back to first enabled tab when value does not exist', async () => {
      fixture = await mount('ore-tabs', { attrs: { value: 'missing' }, html: htmlTabs });

      await fixture.flush();

      expect(fixture.element.getAttribute('value')).toBe('overview');
    });

    it('keeps configured selection when tab items are assigned after connect', async () => {
      fixture = await mount('ore-tabs', { attrs: { value: 'settings' } });

      fixture.element.innerHTML = htmlTabs;
      await fixture.flush();

      const panels = fixture.element.querySelectorAll('ore-tab-panel');
      const overviewPanel = panels[0].shadowRoot?.querySelector('[role="tabpanel"]');
      const settingsPanel = panels[1].shadowRoot?.querySelector('[role="tabpanel"]');

      expect(fixture.element.getAttribute('value')).toBe('settings');
      expect(overviewPanel?.getAttribute('aria-hidden')).toBe('true');
      expect(settingsPanel?.getAttribute('aria-hidden')).toBe('false');
    });

    it('keeps initially selected panel visible across reconnect', async () => {
      fixture = await mount('ore-tabs', { attrs: { value: 'settings' }, html: htmlTabs });

      const getPanelHidden = (value: string) =>
        fixture.element
          .querySelector<HTMLElement>(`ore-tab-panel[value="${value}"]`)
          ?.shadowRoot?.querySelector('[role="tabpanel"]')
          ?.getAttribute('aria-hidden');

      await fixture.flush();

      expect(fixture.element.getAttribute('value')).toBe('settings');
      expect(getPanelHidden('settings')).toBe('false');
      expect(getPanelHidden('overview')).toBe('true');

      fixture.element.remove();
      await fixture.flush();
      document.body.appendChild(fixture.element);
      await fixture.flush();

      expect(fixture.element.getAttribute('value')).toBe('settings');
      expect(getPanelHidden('settings')).toBe('false');
      expect(getPanelHidden('overview')).toBe('true');
    });
  });

  describe('Accessibility', () => {
    it('supports keyboard navigation on horizontal tabs', async () => {
      fixture = await mount('ore-tabs', { attrs: { value: 'overview' }, html: htmlTabs });

      await user.press(fixture.element, 'ArrowRight');
      expect(fixture.element.getAttribute('value')).toBe('settings');
    });

    it('sets aria orientation on tablist', async () => {
      fixture = await mount('ore-tabs', {
        attrs: { orientation: 'vertical', value: 'overview' },
        html: htmlTabs,
      });

      expect(fixture.query('[role="tablist"]')?.getAttribute('aria-orientation')).toBe('vertical');
    });

    it('links each tab to its panel and back via cross-shadow-root ARIA reflection', async () => {
      // aria-controls / aria-labelledby cross a shadow-tree boundary here (tab-item's <button>
      // is in tab-item's own shadow root; the matching <div role="tabpanel"> is in tab-panel's).
      // Plain IDREF attributes cannot resolve across that boundary — see
      // headless/aria-reflection.ts — so this must be asserted via the element-reflection API
      // (or its jsdom-unsupported attribute fallback), not by comparing id strings.
      fixture = await mount('ore-tabs', { attrs: { value: 'overview' }, html: htmlTabs });
      await fixture.flush();

      const items = fixture.element.querySelectorAll<HTMLElement>('ore-tab-item');
      const panels = fixture.element.querySelectorAll<HTMLElement>('ore-tab-panel');

      const overviewButton = items[0].shadowRoot?.querySelector<HTMLButtonElement>('[role="tab"]');
      const overviewPanel = panels[0].shadowRoot?.querySelector<HTMLElement>('[role="tabpanel"]');

      expect(overviewButton).toBeTruthy();
      expect(overviewPanel).toBeTruthy();

      if (overviewButton && 'ariaControlsElements' in overviewButton) {
        expect(Array.from(overviewButton.ariaControlsElements ?? [])).toEqual([overviewPanel]);
      } else {
        expect(overviewButton?.getAttribute('aria-controls')).toBe(overviewPanel?.id);
      }

      if (overviewPanel && 'ariaLabelledByElements' in overviewPanel) {
        expect(Array.from(overviewPanel.ariaLabelledByElements ?? [])).toEqual([overviewButton]);
      } else {
        expect(overviewPanel?.getAttribute('aria-labelledby')).toBe(overviewButton?.id);
      }
    });

    it('keeps only active panel visible to assistive tech', async () => {
      fixture = await mount('ore-tabs', { attrs: { value: 'overview' }, html: htmlTabs });

      const panels = fixture.element.querySelectorAll('ore-tab-panel');
      const firstPanel = panels[0].shadowRoot?.querySelector('[role="tabpanel"]');
      const secondPanel = panels[1].shadowRoot?.querySelector('[role="tabpanel"]');

      expect(firstPanel?.getAttribute('aria-hidden')).toBe('false');
      expect(secondPanel?.getAttribute('aria-hidden')).toBe('true');
    });

    it('manual activation waits for Enter after arrow focus movement', async () => {
      fixture = await mount('ore-tabs', {
        attrs: { activation: 'manual', value: 'overview' },
        html: htmlTabs,
      });

      const tabs = fixture.element.querySelectorAll<HTMLElement>('ore-tab-item');

      tabs[0]?.focus();

      await user.press(tabs[0]!, 'ArrowRight');
      expect(fixture.element.getAttribute('value')).toBe('overview');

      await user.press(tabs[1]!, 'Enter');
      expect(fixture.element.getAttribute('value')).toBe('settings');
    });

    it('manual activation also supports Space after arrow focus movement', async () => {
      fixture = await mount('ore-tabs', {
        attrs: { activation: 'manual', value: 'overview' },
        html: htmlTabs,
      });

      const tabs = fixture.element.querySelectorAll<HTMLElement>('ore-tab-item');

      tabs[0]?.focus();

      await user.press(tabs[0]!, 'ArrowRight');
      expect(fixture.element.getAttribute('value')).toBe('overview');

      await user.press(tabs[1]!, ' ');
      expect(fixture.element.getAttribute('value')).toBe('settings');
    });
  });

  describe('Edge Cases', () => {
    it('renders lazy tab-panel content when the lazy panel is initially active', async () => {
      fixture = await mount('ore-tabs', {
        attrs: { value: 'details' },
        html: `
          <ore-tab-item slot="tabs" value="overview">Overview</ore-tab-item>
          <ore-tab-item slot="tabs" value="details">Details</ore-tab-item>
          <ore-tab-panel value="overview">Overview content</ore-tab-panel>
          <ore-tab-panel value="details" lazy>Details content</ore-tab-panel>
        `,
      });

      const lazyPanel = fixture.element.querySelectorAll('ore-tab-panel')[1];

      await fixture.flush();
      await new Promise((r) => setTimeout(r, 20));

      const panelAfter = lazyPanel.shadowRoot?.querySelector('[role="tabpanel"]');

      expect(panelAfter?.getAttribute('aria-hidden')).toBe('false');
      expect(panelAfter?.querySelector('slot')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('passes axe checks with tabs rendered', async () => {
      fixture = await mount('ore-tabs', {
        attrs: { value: 'overview' },
        html: `
          <ore-tab-item slot="tabs" value="overview">Overview</ore-tab-item>
          <ore-tab-item slot="tabs" value="settings">Settings</ore-tab-item>
          <ore-tab-panel value="overview">Overview content</ore-tab-panel>
          <ore-tab-panel value="settings">Settings content</ore-tab-panel>
        `,
      });

      const results = await axeCheck(fixture.element, {
        rules: { 'aria-valid-attr-value': { enabled: false } },
      });

      expect(results.violations).toHaveLength(0);
    });
  });
});

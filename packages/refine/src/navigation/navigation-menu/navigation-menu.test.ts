import { fireClick, installPopoverPolyfill } from '@vielzeug/assay';
import { type Fixture, mount } from '@vielzeug/ore/testing';

describe('ore-navigation-menu', () => {
  let fixture: Fixture<HTMLElement>;
  let uninstallPopover: (() => void) | undefined;

  beforeAll(async () => {
    uninstallPopover = installPopoverPolyfill();

    await import('./navigation-menu');
  });

  afterAll(() => {
    uninstallPopover?.();
  });

  afterEach(() => {
    fixture?.dispose();
  });

  it('opens matching live panel from its trigger', async () => {
    fixture = await mount('ore-navigation-menu', {
      html: `
        <ore-navigation-menu-item value="products">Products</ore-navigation-menu-item>
        <ore-navigation-menu-panel for="products"><a href="/products">Products</a></ore-navigation-menu-panel>
      `,
    });

    const trigger = fixture.element.querySelector<HTMLElement>('ore-navigation-menu-item')!;
    const panel = fixture.element.querySelector<HTMLElement>('ore-navigation-menu-panel')!;

    const triggerButton = trigger.shadowRoot?.querySelector<HTMLElement>('.trigger');

    if (!triggerButton) throw new Error('Expected navigation trigger button');

    fireClick(triggerButton);

    expect(panel.hidden).toBe(false);
    expect(triggerButton?.getAttribute('aria-expanded')).toBe('true');
  });

  it('opens default panel after mount', async () => {
    fixture = await mount('ore-navigation-menu', {
      attrs: { 'default-open': 'products' },
      html: '<ore-navigation-menu-item value="products">Products</ore-navigation-menu-item><ore-navigation-menu-panel for="products">Products</ore-navigation-menu-panel>',
    });

    expect(fixture.element.querySelector<HTMLElement>('ore-navigation-menu-panel')?.hidden).toBe(false);
  });

  it('hides inactive panels', async () => {
    fixture = await mount('ore-navigation-menu', {
      html: '<ore-navigation-menu-item value="products">Products</ore-navigation-menu-item><ore-navigation-menu-panel for="products">Products</ore-navigation-menu-panel>',
    });

    expect(fixture.element.querySelector<HTMLElement>('ore-navigation-menu-panel')?.hidden).toBe(true);
  });

  it('closes when a panel link is activated', async () => {
    fixture = await mount('ore-navigation-menu', {
      html: '<ore-navigation-menu-item value="products">Products</ore-navigation-menu-item><ore-navigation-menu-panel for="products"><a href="/products">Products</a></ore-navigation-menu-panel>',
    });

    const trigger = fixture.element.querySelector<HTMLElement>('ore-navigation-menu-item')!;
    const panel = fixture.element.querySelector<HTMLElement>('ore-navigation-menu-panel')!;
    const triggerButton = trigger.shadowRoot?.querySelector<HTMLElement>('.trigger');
    const link = panel.querySelector<HTMLElement>('a');

    if (!triggerButton || !link) throw new Error('Expected navigation trigger and panel link');

    fireClick(triggerButton);
    fireClick(link);

    expect(panel.hidden).toBe(true);
    expect(triggerButton.getAttribute('aria-expanded')).toBe('false');
  });

  it('emits selection for the built-in link and closes its panel', async () => {
    fixture = await mount('ore-navigation-menu', {
      html: '<ore-navigation-menu-item value="products">Products</ore-navigation-menu-item><ore-navigation-menu-panel for="products"><ore-navigation-menu-link href="/products" active>Products</ore-navigation-menu-link></ore-navigation-menu-panel>',
    });

    const trigger = fixture.element
      .querySelector<HTMLElement>('ore-navigation-menu-item')
      ?.shadowRoot?.querySelector<HTMLButtonElement>('.trigger');
    const panel = fixture.element.querySelector<HTMLElement>('ore-navigation-menu-panel');
    const link = panel?.querySelector<HTMLElement>('ore-navigation-menu-link');
    const anchor = link?.shadowRoot?.querySelector<HTMLAnchorElement>('a');
    const onSelect = vi.fn();

    if (!trigger || !panel || !link || !anchor) throw new Error('Expected trigger, panel, and navigation link');

    fixture.element.addEventListener('select', onSelect);
    fireClick(trigger);
    anchor.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, composed: true }));

    expect(anchor.getAttribute('aria-current')).toBe('page');
    expect(panel.hidden).toBe(true);
    expect((onSelect.mock.calls[0]?.[0] as CustomEvent).detail).toEqual({
      href: new URL('/products', document.baseURI).href,
      value: 'products',
    });
  });

  it('keeps a selected link panel open when opted out', async () => {
    fixture = await mount('ore-navigation-menu', {
      html: '<ore-navigation-menu-item value="products">Products</ore-navigation-menu-item><ore-navigation-menu-panel for="products"><a data-navigation-menu-keep-open href="/products">Products</a></ore-navigation-menu-panel>',
    });

    const trigger = fixture.element.querySelector<HTMLElement>('ore-navigation-menu-item')!;
    const panel = fixture.element.querySelector<HTMLElement>('ore-navigation-menu-panel')!;
    const triggerButton = trigger.shadowRoot?.querySelector<HTMLElement>('.trigger');
    const link = panel.querySelector<HTMLElement>('a');

    if (!triggerButton || !link) throw new Error('Expected navigation trigger and panel link');

    fireClick(triggerButton);
    fireClick(link);

    expect(panel.hidden).toBe(false);
  });

  it('keeps controlled state unchanged until the open prop updates', async () => {
    fixture = await mount('ore-navigation-menu', {
      attrs: { open: 'products' },
      html: `
        <ore-navigation-menu-item value="products">Products</ore-navigation-menu-item>
        <ore-navigation-menu-item value="resources">Resources</ore-navigation-menu-item>
        <ore-navigation-menu-panel for="products">Products</ore-navigation-menu-panel>
        <ore-navigation-menu-panel for="resources">Resources</ore-navigation-menu-panel>
      `,
    });

    const onOpenChange = vi.fn();
    const resourcesTrigger = fixture.element
      .querySelectorAll<HTMLElement>('ore-navigation-menu-item')[1]
      ?.shadowRoot?.querySelector<HTMLElement>('.trigger');

    if (!resourcesTrigger) throw new Error('Expected resources trigger');

    fixture.element.addEventListener('open-change', onOpenChange);
    fireClick(resourcesTrigger);

    expect(fixture.element.querySelector<HTMLElement>('ore-navigation-menu-panel[for="products"]')?.hidden).toBe(false);
    expect(fixture.element.querySelector<HTMLElement>('ore-navigation-menu-panel[for="resources"]')?.hidden).toBe(true);
    expect((onOpenChange.mock.calls[0]?.[0] as CustomEvent).detail).toEqual({
      open: true,
      reason: 'click',
      value: 'resources',
    });
  });

  it('labels each panel with its associated trigger', async () => {
    fixture = await mount('ore-navigation-menu', {
      html: `
        <ore-navigation-menu-item value="products">Products</ore-navigation-menu-item>
        <ore-navigation-menu-item value="resources">Resources</ore-navigation-menu-item>
        <ore-navigation-menu-panel for="products">Products</ore-navigation-menu-panel>
        <ore-navigation-menu-panel for="resources">Resources</ore-navigation-menu-panel>
      `,
    });

    const items = fixture.element.querySelectorAll<HTMLElement>('ore-navigation-menu-item');
    const panels = fixture.element.querySelectorAll<HTMLElement>('ore-navigation-menu-panel');
    expect(panels[0]?.getAttribute('aria-labelledby')).toBe(items[0]?.id);
    expect(panels[1]?.getAttribute('aria-labelledby')).toBe(items[1]?.id);
  });

  it('uses disclosure semantics on the trigger without adding a nested navigation landmark', async () => {
    fixture = await mount('ore-navigation-menu', {
      html: '<ore-navigation-menu-item value="products">Products</ore-navigation-menu-item><ore-navigation-menu-panel for="products"><a href="/products">Products</a></ore-navigation-menu-panel>',
    });

    const item = fixture.element.querySelector<HTMLElement>('ore-navigation-menu-item');
    const trigger = item?.shadowRoot?.querySelector<HTMLButtonElement>('.trigger');

    expect(fixture.element.shadowRoot?.querySelector('nav')).toBeNull();
    expect(item?.hasAttribute('aria-expanded')).toBe(false);
    expect(trigger?.getAttribute('aria-haspopup')).toBeNull();
    expect(trigger?.getAttribute('aria-expanded')).toBe('false');
    expect(trigger?.getAttribute('aria-controls')).toBeNull();
  });

  it('moves Tab into the open panel and Shift+Tab back to its trigger', async () => {
    fixture = await mount('ore-navigation-menu', {
      html: '<ore-navigation-menu-item value="products">Products</ore-navigation-menu-item><ore-navigation-menu-panel for="products"><a href="/first">First</a><a href="/last">Last</a></ore-navigation-menu-panel>',
    });

    const item = fixture.element.querySelector<HTMLElement>('ore-navigation-menu-item');
    const trigger = item?.shadowRoot?.querySelector<HTMLButtonElement>('.trigger');
    const panel = fixture.element.querySelector<HTMLElement>('ore-navigation-menu-panel');
    const firstLink = panel?.querySelector<HTMLAnchorElement>('a[href="/first"]');

    if (!trigger || !panel || !firstLink) throw new Error('Expected trigger, panel, and first link');

    fireClick(trigger);
    trigger.focus();

    const tabIntoPanel = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Tab' });
    trigger.dispatchEvent(tabIntoPanel);

    expect(tabIntoPanel.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(firstLink);

    const tabBackToTrigger = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key: 'Tab',
      shiftKey: true,
    });
    firstLink.dispatchEvent(tabBackToTrigger);

    expect(tabBackToTrigger.defaultPrevented).toBe(true);
    expect(item.shadowRoot?.activeElement).toBe(trigger);
  });

  it('skips focusable descendants in aria-hidden shadow hosts', async () => {
    fixture = await mount('ore-navigation-menu', {
      html: `
        <ore-navigation-menu-item value="products">Products</ore-navigation-menu-item>
        <ore-navigation-menu-panel for="products">
          <ore-navigation-menu-link aria-hidden="true" href="/hidden">Hidden</ore-navigation-menu-link>
          <a href="/visible">Visible</a>
        </ore-navigation-menu-panel>
      `,
    });

    const item = fixture.element.querySelector<HTMLElement>('ore-navigation-menu-item');
    const trigger = item?.shadowRoot?.querySelector<HTMLButtonElement>('.trigger');
    const panel = fixture.element.querySelector<HTMLElement>('ore-navigation-menu-panel');
    const hiddenHost = panel?.querySelector<HTMLElement>('ore-navigation-menu-link');
    const visibleLink = panel?.querySelector<HTMLAnchorElement>('a[href="/visible"]');

    if (!trigger || !panel || !hiddenHost || !visibleLink) throw new Error('Expected trigger and panel links');

    fireClick(trigger);
    trigger.focus();

    const tabIntoPanel = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Tab' });
    trigger.dispatchEvent(tabIntoPanel);

    expect(tabIntoPanel.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(visibleLink);
    expect(hiddenHost.shadowRoot?.activeElement).toBeNull();
  });

  it('moves Tab from the last panel link to the next trigger and closes the old panel', async () => {
    fixture = await mount('ore-navigation-menu', {
      html: `
        <ore-navigation-menu-item value="products">Products</ore-navigation-menu-item>
        <ore-navigation-menu-item value="resources">Resources</ore-navigation-menu-item>
        <ore-navigation-menu-panel for="products"><a href="/products">Products</a></ore-navigation-menu-panel>
        <ore-navigation-menu-panel for="resources"><a href="/resources">Resources</a></ore-navigation-menu-panel>
      `,
    });

    const items = fixture.element.querySelectorAll<HTMLElement>('ore-navigation-menu-item');
    const trigger = items[0]?.shadowRoot?.querySelector<HTMLButtonElement>('.trigger');
    const nextTrigger = items[1]?.shadowRoot?.querySelector<HTMLButtonElement>('.trigger');
    const panel = fixture.element.querySelector<HTMLElement>('ore-navigation-menu-panel[for="products"]');
    const link = panel?.querySelector<HTMLAnchorElement>('a');

    if (!trigger || !nextTrigger || !panel || !link) throw new Error('Expected both triggers and the first panel link');

    fireClick(trigger);
    link.focus();

    const tabToNextTrigger = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Tab' });
    link.dispatchEvent(tabToNextTrigger);
    await Promise.resolve();

    expect(tabToNextTrigger.defaultPrevented).toBe(true);
    expect(items[1]?.shadowRoot?.activeElement).toBe(nextTrigger);
    expect(panel.hidden).toBe(true);
  });

  it('closes on Escape and restores focus to the active trigger', async () => {
    fixture = await mount('ore-navigation-menu', {
      html: '<ore-navigation-menu-item value="products">Products</ore-navigation-menu-item><ore-navigation-menu-panel for="products"><a href="/products">Products</a></ore-navigation-menu-panel>',
    });

    const item = fixture.element.querySelector<HTMLElement>('ore-navigation-menu-item');
    const trigger = item?.shadowRoot?.querySelector<HTMLButtonElement>('.trigger');
    const panel = fixture.element.querySelector<HTMLElement>('ore-navigation-menu-panel');
    const link = panel?.querySelector<HTMLAnchorElement>('a');

    if (!trigger || !item || !panel || !link) throw new Error('Expected trigger, panel, and panel link');

    fireClick(trigger);
    link.focus();
    link.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, composed: true, key: 'Escape' }),
    );

    expect(panel.hidden).toBe(true);
    expect(item.shadowRoot?.activeElement).toBe(trigger);
  });

  it('renders the active panel inline when requested', async () => {
    fixture = await mount('ore-navigation-menu', {
      attrs: { inline: '' },
      html: '<ore-navigation-menu-item value="products">Products</ore-navigation-menu-item><ore-navigation-menu-panel for="products">Products</ore-navigation-menu-panel>',
    });

    const trigger = fixture.element
      .querySelector<HTMLElement>('ore-navigation-menu-item')
      ?.shadowRoot?.querySelector<HTMLButtonElement>('.trigger');
    const panel = fixture.element.querySelector<HTMLElement>('ore-navigation-menu-panel');

    if (!trigger || !panel) throw new Error('Expected trigger and panel');

    fireClick(trigger);

    expect(fixture.element.hasAttribute('data-inline')).toBe(true);
    expect(panel.hasAttribute('data-inline')).toBe(true);
    expect(panel.hidden).toBe(false);
    expect(panel.matches(':popover-open')).toBe(false);
  });

  it('closes the active panel when focus leaves its trigger and panel', async () => {
    fixture = await mount('ore-navigation-menu', {
      html: '<ore-navigation-menu-item value="products">Products</ore-navigation-menu-item><ore-navigation-menu-panel for="products"><a href="/products">Products</a></ore-navigation-menu-panel>',
    });

    const trigger = fixture.element
      .querySelector<HTMLElement>('ore-navigation-menu-item')
      ?.shadowRoot?.querySelector<HTMLButtonElement>('.trigger');
    const panel = fixture.element.querySelector<HTMLElement>('ore-navigation-menu-panel');
    const outside = document.createElement('button');
    outside.textContent = 'Outside';
    fixture.element.after(outside);

    try {
      if (!trigger || !panel) throw new Error('Expected trigger and panel');

      fireClick(trigger);
      trigger.focus();
      outside.focus();
      await Promise.resolve();

      expect(panel.hidden).toBe(true);
    } finally {
      outside.remove();
    }
  });

  it('moves the trigger focus in the writing direction', async () => {
    fixture = await mount('ore-navigation-menu', {
      attrs: { dir: 'rtl' },
      html: `
        <ore-navigation-menu-item value="products">Products</ore-navigation-menu-item>
        <ore-navigation-menu-item value="resources">Resources</ore-navigation-menu-item>
        <ore-navigation-menu-item value="blog">Blog</ore-navigation-menu-item>
        <ore-navigation-menu-panel for="products">Products</ore-navigation-menu-panel>
        <ore-navigation-menu-panel for="resources">Resources</ore-navigation-menu-panel>
        <ore-navigation-menu-panel for="blog">Blog</ore-navigation-menu-panel>
      `,
    });

    const items = fixture.element.querySelectorAll<HTMLElement>('ore-navigation-menu-item');
    const middleTrigger = items[1]?.shadowRoot?.querySelector<HTMLButtonElement>('.trigger');
    const lastTrigger = items[2]?.shadowRoot?.querySelector<HTMLButtonElement>('.trigger');

    if (!middleTrigger || !lastTrigger) throw new Error('Expected middle and last trigger buttons');

    middleTrigger.focus();
    middleTrigger.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'ArrowLeft' }));

    expect(items[2]?.shadowRoot?.activeElement).toBe(lastTrigger);
  });

  it('uses an inherited panel column count when columns is not set', async () => {
    fixture = await mount('ore-navigation-menu', {
      attrs: { style: '--navigation-menu-panel-columns: 3;' },
      html: '<ore-navigation-menu-item value="products">Products</ore-navigation-menu-item><ore-navigation-menu-panel for="products">Products</ore-navigation-menu-panel>',
    });

    const trigger = fixture.element
      .querySelector<HTMLElement>('ore-navigation-menu-item')
      ?.shadowRoot?.querySelector<HTMLElement>('.trigger');

    if (!trigger) throw new Error('Expected navigation trigger button');

    fireClick(trigger);

    expect(fixture.element.style.getPropertyValue('--navigation-menu-panel-columns')).toBe('3');
    expect(
      fixture.element
        .querySelector<HTMLElement>('ore-navigation-menu-panel')
        ?.style.getPropertyValue('--navigation-menu-panel-columns'),
    ).toBe('');
  });

  it('prefers the configured column count over an inherited value', async () => {
    fixture = await mount('ore-navigation-menu', {
      attrs: { columns: '3', style: '--navigation-menu-panel-columns: 4;' },
      html: '<ore-navigation-menu-item value="products">Products</ore-navigation-menu-item><ore-navigation-menu-panel for="products">Products</ore-navigation-menu-panel>',
    });

    const trigger = fixture.element
      .querySelector<HTMLElement>('ore-navigation-menu-item')
      ?.shadowRoot?.querySelector<HTMLElement>('.trigger');

    if (!trigger) throw new Error('Expected navigation trigger button');

    fireClick(trigger);

    expect(
      fixture.element
        .querySelector<HTMLElement>('ore-navigation-menu-panel')
        ?.style.getPropertyValue('--navigation-menu-panel-columns'),
    ).toBe('3');
  });
});

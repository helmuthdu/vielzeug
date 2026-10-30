import { fireClick } from '@vielzeug/assay';
import { type Fixture, mount } from '@vielzeug/ore/testing';

describe('ore-navigation-menu', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    if (!HTMLElement.prototype.showPopover) {
      HTMLElement.prototype.showPopover = function () {
        this.setAttribute('popover-open', '');
      };
    }

    if (!HTMLElement.prototype.hidePopover) {
      HTMLElement.prototype.hidePopover = function () {
        this.removeAttribute('popover-open');
      };
    }

    await import('./navigation-menu');
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

  it('connects each trigger to its matching panel', async () => {
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
    const firstTrigger = items[0]?.shadowRoot?.querySelector<HTMLElement>('.trigger');
    const secondTrigger = items[1]?.shadowRoot?.querySelector<HTMLElement>('.trigger');

    expect(firstTrigger?.getAttribute('aria-controls')).toBe(panels[0]?.id);
    expect(secondTrigger?.getAttribute('aria-controls')).toBe(panels[1]?.id);
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

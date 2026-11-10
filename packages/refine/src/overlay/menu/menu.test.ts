import { fireClick, fireKeyDown, installPopoverPolyfill } from '@vielzeug/assay';
import { type Fixture, mount } from '@vielzeug/ore/testing';

import type { OreMenuItemProps } from './menu';

type MenuItemElement = HTMLElement & OreMenuItemProps;

describe('ore-menu', () => {
  let fixture: Fixture<HTMLElement>;
  let uninstallPopover: (() => void) | undefined;

  beforeAll(async () => {
    // Submenu flyouts are `popover="manual"`. jsdom has no Popover API and its selector engine never
    // matches `:popover-open`, so without the shim the component's own
    // `if (panel.matches(':popover-open')) panel.hidePopover()` guard makes closing unreachable, and
    // the UA sheet's `display: none` makes every item inside an open flyout un-focusable.
    uninstallPopover = installPopoverPolyfill();

    await import('./menu');
  });

  afterAll(() => {
    uninstallPopover?.();
  });

  afterEach(() => {
    fixture?.dispose();
  });

  describe('Core Functionality', () => {
    it('opens menu when trigger is clicked', async () => {
      fixture = await mount('ore-menu', {
        html: `
          <button slot="trigger">Open</button>
          <ore-menu-item value="edit">Edit</ore-menu-item>
        `,
      });

      const onOpen = vi.fn();

      fixture.element.addEventListener('open-change', onOpen);

      fireClick(fixture.element.querySelector<HTMLElement>('button[slot="trigger"]')!);

      expect(fixture.query('.menu-panel')?.hasAttribute('data-open')).toBe(true);
      expect((onOpen.mock.calls[0][0] as CustomEvent).detail).toEqual({ open: true, reason: 'click' });
    });

    it('initializes an uncontrolled menu with default-open', async () => {
      fixture = await mount('ore-menu', {
        attrs: { 'default-open': '' },
        html: '<button slot="trigger">Open</button><ore-menu-item value="edit">Edit</ore-menu-item>',
      });

      expect(fixture.query('.menu-panel')?.hasAttribute('data-open')).toBe(true);
    });

    it('emits select and closes for normal menu items', async () => {
      fixture = await mount('ore-menu', {
        html: `
          <button slot="trigger">Open</button>
          <ore-menu-item value="edit">Edit</ore-menu-item>
        `,
      });

      const onSelect = vi.fn();
      const onClose = vi.fn();

      fixture.element.addEventListener('select', onSelect);
      fixture.element.addEventListener('open-change', onClose);

      fireClick(fixture.element.querySelector<HTMLElement>('button[slot="trigger"]')!);
      fireClick(fixture.element.querySelector<MenuItemElement>('[value="edit"]')!);

      expect(onSelect).toHaveBeenCalledTimes(1);
      expect((onSelect.mock.calls[0][0] as CustomEvent).detail.value).toBe('edit');
      expect(fixture.query('.menu-panel')?.hasAttribute('data-open')).toBe(false);
      expect((onClose.mock.calls.at(-1)?.[0] as CustomEvent).detail).toEqual({ open: false, reason: 'select' });
    });

    it('toggles checkbox menu item without closing menu', async () => {
      fixture = await mount('ore-menu', {
        html: `
          <button slot="trigger">Open</button>
          <ore-menu-item value="show-ids" type="checkbox">Show IDs</ore-menu-item>
        `,
      });

      fireClick(fixture.element.querySelector<HTMLElement>('button[slot="trigger"]')!);

      const item = fixture.element.querySelector<MenuItemElement>('[value="show-ids"]')!;

      fireClick(item);

      expect(item.hasAttribute('checked')).toBe(true);
      expect(fixture.query('.menu-panel')?.hasAttribute('data-open')).toBe(true);
    });

    it('updates the internal checked UI for checkbox menu items', async () => {
      fixture = await mount('ore-menu', {
        html: `
          <button slot="trigger">Open</button>
          <ore-menu-item value="show-ids" type="checkbox">Show IDs</ore-menu-item>
        `,
      });

      fireClick(fixture.element.querySelector<HTMLElement>('button[slot="trigger"]')!);

      const item = fixture.element.querySelector<MenuItemElement>('[value="show-ids"]')!;
      const initialCheck = item.shadowRoot?.querySelector<HTMLElement>('.item-check');
      const initialItem = item.shadowRoot?.querySelector<HTMLElement>('.item');

      expect(initialItem?.getAttribute('role')).toBe('menuitemcheckbox');
      expect(initialItem?.getAttribute('aria-checked')).toBe('false');
      expect(initialCheck).toBeTruthy();

      fireClick(item);

      const internalItem = item.shadowRoot?.querySelector<HTMLElement>('.item');
      const internalCheck = item.shadowRoot?.querySelector<HTMLElement>('.item-check');

      expect(item.hasAttribute('checked')).toBe(true);
      expect(internalItem?.getAttribute('aria-checked')).toBe('true');
      expect(internalItem?.getAttribute('role')).toBe('menuitemcheckbox');
      expect(internalCheck).toBeTruthy();
    });

    it('renders the documented item parts: item, icon-slot, item-label', async () => {
      fixture = await mount('ore-menu', {
        html: '<button slot="trigger">Actions</button><ore-menu-item value="edit">Edit</ore-menu-item>',
      });
      await fixture.flush();

      const item = fixture.element.querySelector<MenuItemElement>('[value="edit"]')!;
      const parts = {
        icon: item.shadowRoot?.querySelector('[part="icon-slot"]'),
        item: item.shadowRoot?.querySelector('[part="item"]'),
        label: item.shadowRoot?.querySelector('[part="item-label"]'),
      };

      expect(parts.item).toBeTruthy();
      expect(parts.icon).toBeTruthy();
      expect(parts.label).toBeTruthy();
    });
  });

  describe('Sizing', () => {
    const sizes = ['sm', 'md', 'lg'] as const;

    sizes.forEach((size) => {
      it(`applies size="${size}"`, async () => {
        fixture = await mount('ore-menu', {
          attrs: { size },
          html: `
            <button slot="trigger">Open</button>
            <ore-menu-item value="edit">Edit</ore-menu-item>
          `,
        });

        expect(fixture.element.getAttribute('size')).toBe(size);
      });
    });

    it('updates size dynamically', async () => {
      fixture = await mount('ore-menu', {
        attrs: { size: 'sm' },
        html: `
          <button slot="trigger">Open</button>
          <ore-menu-item value="edit">Edit</ore-menu-item>
        `,
      });

      await fixture.attr('size', 'lg');
      expect(fixture.element.getAttribute('size')).toBe('lg');
    });
  });

  describe('Accessibility', () => {
    it('sets trigger aria-haspopup and aria-expanded', async () => {
      fixture = await mount('ore-menu', {
        html: `
          <button slot="trigger">Open</button>
          <ore-menu-item value="edit">Edit</ore-menu-item>
        `,
      });

      const trigger = fixture.element.querySelector<HTMLElement>('button[slot="trigger"]')!;

      expect(trigger.getAttribute('aria-haspopup')).toBe('menu');
      expect(trigger.getAttribute('aria-expanded')).toBe('false');

      fireClick(trigger);
      expect(trigger.getAttribute('aria-expanded')).toBe('true');
    });

    it('uses semantic menu role on panel', async () => {
      fixture = await mount('ore-menu', {
        html: `
          <button slot="trigger">Open</button>
          <ore-menu-item value="edit">Edit</ore-menu-item>
        `,
      });

      expect(fixture.query('.menu-panel')?.getAttribute('role')).toBe('menu');
    });

    it('uses checkable menuitemcheckbox role for checkbox items', async () => {
      fixture = await mount('ore-menu-item', { attrs: { type: 'checkbox' }, html: 'Show IDs' });

      expect(fixture.query('.item')?.getAttribute('role')).toBe('menuitemcheckbox');
      expect(fixture.query('.item')?.getAttribute('aria-checked')).toBe('false');
    });

    it('supports keyboard open using ArrowDown on trigger', async () => {
      fixture = await mount('ore-menu', {
        html: `
          <button slot="trigger">Open</button>
          <ore-menu-item value="edit">Edit</ore-menu-item>
          <ore-menu-item value="delete">Delete</ore-menu-item>
        `,
      });

      const trigger = fixture.element.querySelector<HTMLElement>('button[slot="trigger"]')!;

      fireKeyDown(trigger, { key: 'ArrowDown' });

      expect(fixture.query('.menu-panel')?.hasAttribute('data-open')).toBe(true);
    });

    it('supports keyboard open using Enter on trigger', async () => {
      fixture = await mount('ore-menu', {
        html: `
          <button slot="trigger">Open</button>
          <ore-menu-item value="edit">Edit</ore-menu-item>
          <ore-menu-item value="delete">Delete</ore-menu-item>
        `,
      });

      const onOpen = vi.fn();

      fixture.element.addEventListener('open-change', onOpen);

      const trigger = fixture.element.querySelector<HTMLElement>('button[slot="trigger"]')!;

      fireKeyDown(trigger, { key: 'Enter' });

      expect(fixture.query('.menu-panel')?.hasAttribute('data-open')).toBe(true);
      expect((onOpen.mock.calls[0][0] as CustomEvent).detail.reason).toBe('keyboard');
    });

    it('supports keyboard open using Space on trigger', async () => {
      fixture = await mount('ore-menu', {
        html: `
          <button slot="trigger">Open</button>
          <ore-menu-item value="edit">Edit</ore-menu-item>
          <ore-menu-item value="delete">Delete</ore-menu-item>
        `,
      });

      const trigger = fixture.element.querySelector<HTMLElement>('button[slot="trigger"]')!;

      fireKeyDown(trigger, { key: ' ' });

      expect(fixture.query('.menu-panel')?.hasAttribute('data-open')).toBe(true);
    });

    it('focuses the first item when the list opens from the keyboard', async () => {
      fixture = await mount('ore-menu', {
        html: `
          <button slot="trigger">Open</button>
          <ore-menu-item value="edit" disabled>Edit</ore-menu-item>
          <ore-menu-item value="copy">Copy</ore-menu-item>
        `,
      });

      const trigger = fixture.element.querySelector<HTMLElement>('button[slot="trigger"]')!;

      fireKeyDown(trigger, { key: 'ArrowDown' });
      await fixture.flush();

      const items = fixture.element.querySelectorAll<MenuItemElement>('ore-menu-item');

      expect(items[1]?.shadowRoot?.activeElement).toBe(items[1]?.shadowRoot?.querySelector('[role="menuitem"]'));
    });

    it('focuses the first usable card when the grid opens from the keyboard', async () => {
      fixture = await mount('ore-menu', {
        attrs: { layout: 'grid' },
        html: `
          <button slot="trigger">Open</button>
          <ore-menu-item value="a" disabled>A</ore-menu-item>
          <ore-menu-item value="b">B</ore-menu-item>
        `,
      });

      const trigger = fixture.element.querySelector<HTMLElement>('button[slot="trigger"]')!;

      fireKeyDown(trigger, { key: 'ArrowDown' });
      await fixture.flush();

      const items = fixture.element.querySelectorAll<MenuItemElement>('ore-menu-item');

      expect(items[1]?.shadowRoot?.activeElement).toBe(items[1]?.shadowRoot?.querySelector('[role="menuitem"]'));
    });

    it('emits escape close reason when dismissed via Escape key', async () => {
      fixture = await mount('ore-menu', {
        html: `
          <button slot="trigger">Open</button>
          <ore-menu-item value="edit">Edit</ore-menu-item>
        `,
      });

      const onClose = vi.fn();

      fixture.element.addEventListener('open-change', onClose);

      fireClick(fixture.element.querySelector<HTMLElement>('button[slot="trigger"]')!);
      fireKeyDown(fixture.query('.menu-panel')!, { key: 'Escape' });

      expect((onClose.mock.calls.at(-1)?.[0] as CustomEvent).detail).toEqual({ open: false, reason: 'escape' });
    });

    it('moves focus to the next menu item with ArrowDown', async () => {
      fixture = await mount('ore-menu', {
        html: `
          <button slot="trigger">Open</button>
          <ore-menu-item value="edit">Edit</ore-menu-item>
          <ore-menu-item value="delete">Delete</ore-menu-item>
        `,
      });

      const trigger = fixture.element.querySelector<HTMLElement>('button[slot="trigger"]')!;

      fireKeyDown(trigger, { key: 'ArrowDown' });
      await fixture.flush();
      fireKeyDown(fixture.query('.menu-panel')!, { key: 'ArrowDown' });
      await fixture.flush();

      const items = fixture.element.querySelectorAll<MenuItemElement>('ore-menu-item');
      const secondInternal = items[1]?.shadowRoot?.querySelector<HTMLElement>('[role="menuitem"]');

      expect(items[1]?.shadowRoot?.activeElement).toBe(secondInternal);
    });

    it('activates the focused menu item with Enter', async () => {
      fixture = await mount('ore-menu', {
        html: `
          <button slot="trigger">Open</button>
          <ore-menu-item value="edit">Edit</ore-menu-item>
          <ore-menu-item value="delete">Delete</ore-menu-item>
        `,
      });

      const onSelect = vi.fn();

      fixture.element.addEventListener('select', onSelect);

      const trigger = fixture.element.querySelector<HTMLElement>('button[slot="trigger"]')!;

      fireKeyDown(trigger, { key: 'ArrowDown' });
      await fixture.flush();
      fireKeyDown(fixture.query('.menu-panel')!, { key: 'ArrowDown' });
      await fixture.flush();
      fireKeyDown(fixture.query('.menu-panel')!, { key: 'Enter' });
      await fixture.flush();

      expect(onSelect).toHaveBeenCalledTimes(1);
      expect((onSelect.mock.calls[0][0] as CustomEvent).detail.value).toBe('delete');
    });

    it('activates the focused menu item with Space', async () => {
      fixture = await mount('ore-menu', {
        html: `
          <button slot="trigger">Open</button>
          <ore-menu-item value="edit">Edit</ore-menu-item>
          <ore-menu-item value="delete">Delete</ore-menu-item>
        `,
      });

      const onSelect = vi.fn();

      fixture.element.addEventListener('select', onSelect);

      const trigger = fixture.element.querySelector<HTMLElement>('button[slot="trigger"]')!;

      fireKeyDown(trigger, { key: 'ArrowDown' });
      await fixture.flush();
      fireKeyDown(fixture.query('.menu-panel')!, { key: 'ArrowDown' });
      await fixture.flush();
      fireKeyDown(fixture.query('.menu-panel')!, { key: ' ' });
      await fixture.flush();

      expect(onSelect).toHaveBeenCalledTimes(1);
      expect((onSelect.mock.calls[0][0] as CustomEvent).detail.value).toBe('delete');
    });
  });

  describe('Grid layout', () => {
    it('marks items as cards when the menu uses grid layout', async () => {
      fixture = await mount('ore-menu', {
        attrs: { layout: 'grid' },
        html: `
          <button slot="trigger">Open</button>
          <ore-menu-item value="edit">Edit</ore-menu-item>
          <ore-menu-item value="delete">Delete</ore-menu-item>
        `,
      });

      const items = fixture.element.querySelectorAll<MenuItemElement>('ore-menu-item');

      expect(items[0]?.shadowRoot?.querySelector('.item')?.classList.contains('is-grid')).toBe(true);
      expect(items[1]?.shadowRoot?.querySelector('.item')?.classList.contains('is-grid')).toBe(true);
    });

    it('leaves standalone items as list rows', async () => {
      fixture = await mount('ore-menu-item', { html: 'Edit' });

      expect(fixture.query('.item')?.classList.contains('is-grid')).toBe(false);
    });

    it('reflects an explicit columns prop as a panel style', async () => {
      fixture = await mount('ore-menu', {
        attrs: { columns: '2', layout: 'grid' },
        html: `
          <button slot="trigger">Open</button>
          <ore-menu-item value="edit">Edit</ore-menu-item>
        `,
      });

      expect(fixture.element.style.getPropertyValue('--menu-panel-columns')).toBe('2');
    });

    it('defaults the panel to three columns', async () => {
      fixture = await mount('ore-menu', {
        attrs: { layout: 'grid' },
        html: `
          <button slot="trigger">Open</button>
          <ore-menu-item value="edit">Edit</ore-menu-item>
        `,
      });

      expect(fixture.element.style.getPropertyValue('--menu-panel-columns')).toBe('3');
    });

    it('walks columns with ArrowRight and rows with ArrowDown', async () => {
      fixture = await mount('ore-menu', {
        attrs: { columns: '2', layout: 'grid' },
        html: `
          <button slot="trigger">Open</button>
          <ore-menu-item value="a">A</ore-menu-item>
          <ore-menu-item value="b">B</ore-menu-item>
          <ore-menu-item value="c">C</ore-menu-item>
          <ore-menu-item value="d">D</ore-menu-item>
        `,
      });

      const trigger = fixture.element.querySelector<HTMLElement>('button[slot="trigger"]')!;

      fireKeyDown(trigger, { key: 'ArrowDown' });
      await fixture.flush();

      const items = fixture.element.querySelectorAll<MenuItemElement>('ore-menu-item');
      const focusedValue = () =>
        [...items]
          .find((item) => item.shadowRoot?.activeElement === item.shadowRoot?.querySelector('[role="menuitem"]'))
          ?.getAttribute('value');

      expect(focusedValue()).toBe('a');

      fireKeyDown(fixture.query('.menu-panel')!, { key: 'ArrowRight' });
      await fixture.flush();
      expect(focusedValue()).toBe('b');

      fireKeyDown(fixture.query('.menu-panel')!, { key: 'ArrowDown' });
      await fixture.flush();
      expect(focusedValue()).toBe('d');

      fireKeyDown(fixture.query('.menu-panel')!, { key: 'ArrowLeft' });
      await fixture.flush();
      expect(focusedValue()).toBe('c');
    });

    it('steps over a disabled card to keep row alignment', async () => {
      fixture = await mount('ore-menu', {
        attrs: { columns: '2', layout: 'grid' },
        html: `
          <button slot="trigger">Open</button>
          <ore-menu-item value="a">A</ore-menu-item>
          <ore-menu-item value="b" disabled>B</ore-menu-item>
          <ore-menu-item value="c">C</ore-menu-item>
        `,
      });

      const trigger = fixture.element.querySelector<HTMLElement>('button[slot="trigger"]')!;

      fireKeyDown(trigger, { key: 'ArrowDown' });
      await fixture.flush();

      const items = fixture.element.querySelectorAll<MenuItemElement>('ore-menu-item');

      fireKeyDown(fixture.query('.menu-panel')!, { key: 'ArrowRight' });
      await fixture.flush();

      expect(items[1]?.shadowRoot?.activeElement).toBe(items[1]?.shadowRoot?.querySelector('[role="menuitem"]'));
    });

    it('refuses to activate a disabled card with Enter', async () => {
      fixture = await mount('ore-menu', {
        attrs: { columns: '1', layout: 'grid' },
        html: `
          <button slot="trigger">Open</button>
          <ore-menu-item value="a" disabled>A</ore-menu-item>
        `,
      });

      const onSelect = vi.fn();

      fixture.element.addEventListener('select', onSelect);

      const trigger = fixture.element.querySelector<HTMLElement>('button[slot="trigger"]')!;

      fireKeyDown(trigger, { key: 'ArrowDown' });
      await fixture.flush();
      fireKeyDown(fixture.query('.menu-panel')!, { key: 'Enter' });
      await fixture.flush();

      expect(onSelect).not.toHaveBeenCalled();
    });

    it('activates the focused card with Enter', async () => {
      fixture = await mount('ore-menu', {
        attrs: { columns: '2', layout: 'grid' },
        html: `
          <button slot="trigger">Open</button>
          <ore-menu-item value="a">A</ore-menu-item>
          <ore-menu-item value="b">B</ore-menu-item>
        `,
      });

      const onSelect = vi.fn();

      fixture.element.addEventListener('select', onSelect);

      const trigger = fixture.element.querySelector<HTMLElement>('button[slot="trigger"]')!;

      fireKeyDown(trigger, { key: 'ArrowDown' });
      await fixture.flush();
      fireKeyDown(fixture.query('.menu-panel')!, { key: 'ArrowRight' });
      await fixture.flush();
      fireKeyDown(fixture.query('.menu-panel')!, { key: 'Enter' });
      await fixture.flush();

      expect((onSelect.mock.calls[0]?.[0] as CustomEvent).detail.value).toBe('b');
    });

    it('passes axe checks when open in grid layout', async () => {
      fixture = await mount('ore-menu', {
        attrs: { 'default-open': '', layout: 'grid' },
        html: `<button slot="trigger">Open</button>
               <ore-menu-item value="a">A</ore-menu-item>
               <ore-menu-item value="b">B</ore-menu-item>`,
      });

      const results = await axeCheck(fixture.element);

      expect(results.violations).toHaveLength(0);
    });
  });

  describe('Contextmenu trigger', () => {
    const fireContextMenu = (target: EventTarget, clientX = 120, clientY = 240): boolean => {
      const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX, clientY });

      target.dispatchEvent(event);

      return event.defaultPrevented;
    };

    it('opens on right-click with the contextmenu reason', async () => {
      fixture = await mount('ore-menu', {
        attrs: { trigger: 'contextmenu' },
        html: `<p slot="trigger">Target</p>
               <ore-menu-item value="copy">Copy</ore-menu-item>`,
      });

      const onOpen = vi.fn();

      fixture.element.addEventListener('open-change', onOpen);

      const prevented = fireContextMenu(fixture.element.querySelector<HTMLElement>('[slot="trigger"]')!);

      expect(prevented).toBe(true);
      expect(fixture.query('.menu-panel')?.hasAttribute('data-open')).toBe(true);
      expect((onOpen.mock.calls[0][0] as CustomEvent).detail).toEqual({ open: true, reason: 'contextmenu' });
    });

    it('ignores a left-click in contextmenu mode', async () => {
      fixture = await mount('ore-menu', {
        attrs: { trigger: 'contextmenu' },
        html: `<p slot="trigger">Target</p>
               <ore-menu-item value="copy">Copy</ore-menu-item>`,
      });

      fireClick(fixture.element.querySelector<HTMLElement>('[slot="trigger"]')!);

      expect(fixture.query('.menu-panel')?.hasAttribute('data-open')).toBe(false);
    });

    it('leaves the native context menu alone in click mode', async () => {
      fixture = await mount('ore-menu', {
        html: `<button slot="trigger">Open</button>
               <ore-menu-item value="copy">Copy</ore-menu-item>`,
      });

      const prevented = fireContextMenu(fixture.element.querySelector<HTMLElement>('button[slot="trigger"]')!);

      expect(prevented).toBe(false);
      expect(fixture.query('.menu-panel')?.hasAttribute('data-open')).toBe(false);
    });

    it('does not open when disabled', async () => {
      fixture = await mount('ore-menu', {
        attrs: { disabled: '', trigger: 'contextmenu' },
        html: `<p slot="trigger">Target</p>
               <ore-menu-item value="copy">Copy</ore-menu-item>`,
      });

      fireContextMenu(fixture.element.querySelector<HTMLElement>('[slot="trigger"]')!);

      expect(fixture.query('.menu-panel')?.hasAttribute('data-open')).toBe(false);
    });

    it('closes on Escape after a right-click open', async () => {
      fixture = await mount('ore-menu', {
        attrs: { trigger: 'contextmenu' },
        html: `<p slot="trigger">Target</p>
               <ore-menu-item value="copy">Copy</ore-menu-item>`,
      });

      fireContextMenu(fixture.element.querySelector<HTMLElement>('[slot="trigger"]')!);

      const onClose = vi.fn();

      fixture.element.addEventListener('open-change', onClose);
      fireKeyDown(fixture.query('.menu-panel')!, { key: 'Escape' });

      expect(fixture.query('.menu-panel')?.hasAttribute('data-open')).toBe(false);
      expect((onClose.mock.calls[0][0] as CustomEvent).detail).toEqual({ open: false, reason: 'escape' });
    });

    it('still opens from the keyboard in contextmenu mode', async () => {
      fixture = await mount('ore-menu', {
        attrs: { trigger: 'contextmenu' },
        html: `<button slot="trigger">Target</button>
               <ore-menu-item value="copy">Copy</ore-menu-item>`,
      });

      const onOpen = vi.fn();

      fixture.element.addEventListener('open-change', onOpen);
      fireKeyDown(fixture.element.querySelector<HTMLElement>('button[slot="trigger"]')!, { key: 'Enter' });

      expect(fixture.query('.menu-panel')?.hasAttribute('data-open')).toBe(true);
      expect((onOpen.mock.calls[0][0] as CustomEvent).detail).toEqual({ open: true, reason: 'keyboard' });
    });

    it('stays open on a second right-click without re-emitting', async () => {
      fixture = await mount('ore-menu', {
        attrs: { trigger: 'contextmenu' },
        html: `<p slot="trigger">Target</p>
               <ore-menu-item value="copy">Copy</ore-menu-item>`,
      });

      const trigger = fixture.element.querySelector<HTMLElement>('[slot="trigger"]')!;
      const onOpen = vi.fn();

      fixture.element.addEventListener('open-change', onOpen);
      fireContextMenu(trigger, 100, 100);
      fireContextMenu(trigger, 300, 400);

      expect(fixture.query('.menu-panel')?.hasAttribute('data-open')).toBe(true);
      expect(onOpen).toHaveBeenCalledTimes(1);
    });
  });

  describe('Submenu', () => {
    // A submenu trigger is any item with content in its `submenu` slot. The flyout lives in the
    // item's own shadow root (`.submenu-panel`), so each test reaches it through that item.
    const innerRow = (item: HTMLElement): HTMLElement => item.shadowRoot!.querySelector<HTMLElement>('.item')!;
    const panelOf = (item: HTMLElement): HTMLElement => item.shadowRoot!.querySelector<HTMLElement>('.submenu-panel')!;

    // Hardware input events are always composed, and the submenu's handlers sit on the item's own
    // row and on the flyout panel — both inside a shadow root. Assay's `fireKeyDown`/`fireClick`
    // default to `composed: false`, so an event fired on an inner row stops at the shadow boundary
    // and never reaches the menu host that owns activation. These two mirror the real thing.
    const press = (target: EventTarget, key: string): void => {
      target.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, composed: true, key }));
    };

    const tap = (target: EventTarget): void => {
      target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, composed: true }));
    };

    const focusedItem = (items: HTMLElement[]): HTMLElement | undefined =>
      items.find((item) => item.shadowRoot?.activeElement === item.shadowRoot?.querySelector('[role^="menuitem"]'));

    // A submenu parent is deliberately not selectable, so it carries no `value`: tests that walk the
    // root rows label it by its id instead.
    const labelOf = (item: HTMLElement | undefined): string | undefined => item?.getAttribute('value') ?? item?.id;

    // A closed menu ignores activation (its panel is inert), so anything that clicks a child has to
    // open it first — exactly what a pointer does in a browser.
    const openMenu = async (f: Fixture<HTMLElement>): Promise<void> => {
      fireClick(f.element.querySelector<HTMLElement>('button[slot="trigger"]')!);
      await f.flush();
    };

    const submenuFixture = async (attrs: Record<string, string> = {}) => {
      const f = await mount('ore-menu', {
        attrs,
        html: `
          <button slot="trigger">File</button>
          <ore-menu-item value="new">New</ore-menu-item>
          <ore-menu-item id="share">
            Share
            <ore-menu-item slot="submenu" value="mail">Email</ore-menu-item>
            <ore-menu-item slot="submenu" value="link">Copy link</ore-menu-item>
          </ore-menu-item>
          <ore-menu-item value="print">Print</ore-menu-item>
        `,
      });

      await f.flush();

      return f;
    };

    it('marks a slotted item as a submenu trigger', async () => {
      fixture = await submenuFixture();

      const share = fixture.element.querySelector<HTMLElement>('#share')!;
      const row = innerRow(share);

      expect(share.shadowRoot!.querySelector('.submenu-arrow')).not.toBeNull();
      expect(row.getAttribute('aria-haspopup')).toBe('menu');
      expect(row.getAttribute('aria-expanded')).toBe('false');
    });

    it('leaves a plain item without submenu affordances', async () => {
      fixture = await submenuFixture();

      const row = innerRow(fixture.element.querySelector<HTMLElement>('[value="new"]')!);

      expect(row.hasAttribute('aria-haspopup')).toBe(false);
      expect(row.hasAttribute('aria-expanded')).toBe(false);
    });

    it('opens on ArrowRight and focuses the first child, without selecting', async () => {
      fixture = await submenuFixture();
      const onSelect = vi.fn();

      fixture.element.addEventListener('select', onSelect);

      const share = fixture.element.querySelector<HTMLElement>('#share')!;

      press(innerRow(share), 'ArrowRight');
      await fixture.flush();

      expect(panelOf(share).hasAttribute('data-open')).toBe(true);
      expect(innerRow(share).getAttribute('aria-expanded')).toBe('true');
      expect(onSelect).not.toHaveBeenCalled();

      const children = [...share.querySelectorAll<HTMLElement>('ore-menu-item')];

      expect(focusedItem(children)?.getAttribute('value')).toBe('mail');
    });

    it('opens on a click and does not emit select', async () => {
      fixture = await submenuFixture();
      const onSelect = vi.fn();

      fixture.element.addEventListener('select', onSelect);

      const share = fixture.element.querySelector<HTMLElement>('#share')!;

      tap(innerRow(share));
      await fixture.flush();

      expect(panelOf(share).hasAttribute('data-open')).toBe(true);
      expect(onSelect).not.toHaveBeenCalled();
    });

    it('keeps nested children out of the parent menu arrow navigation', async () => {
      fixture = await submenuFixture();

      const trigger = fixture.element.querySelector<HTMLElement>('button[slot="trigger"]')!;

      fireKeyDown(trigger, { key: 'ArrowDown' });
      await fixture.flush();

      // Root rows are New / Share / Print only; the two Share children must never be visited.
      const rootRows = [...fixture.element.querySelectorAll<HTMLElement>(':scope > ore-menu-item')];
      const focusedLabel = () => labelOf(focusedItem(rootRows));

      expect(focusedLabel()).toBe('new');

      fireKeyDown(fixture.query('.menu-panel')!, { key: 'ArrowDown' });
      await fixture.flush();
      expect(focusedLabel()).toBe('share');

      fireKeyDown(fixture.query('.menu-panel')!, { key: 'ArrowDown' });
      await fixture.flush();
      expect(focusedLabel()).toBe('print');
    });

    it('navigates within the submenu with ArrowDown', async () => {
      fixture = await submenuFixture();

      const share = fixture.element.querySelector<HTMLElement>('#share')!;

      press(innerRow(share), 'ArrowRight');
      await fixture.flush();

      const children = [...share.querySelectorAll<HTMLElement>('ore-menu-item')];

      press(innerRow(children[0]!), 'ArrowDown');
      await fixture.flush();

      expect(focusedItem(children)?.getAttribute('value')).toBe('link');
    });

    it('closes on Escape and returns focus to the trigger, keeping the menu open', async () => {
      fixture = await submenuFixture();

      await openMenu(fixture);

      const share = fixture.element.querySelector<HTMLElement>('#share')!;

      press(innerRow(share), 'ArrowRight');
      await fixture.flush();

      const mail = share.querySelector<HTMLElement>('[value="mail"]')!;

      press(innerRow(mail), 'Escape');
      await fixture.flush();

      expect(panelOf(share).hasAttribute('data-open')).toBe(false);
      expect(innerRow(share).getAttribute('aria-expanded')).toBe('false');
      expect(share.shadowRoot!.activeElement).toBe(innerRow(share));
      expect(fixture.query('.menu-panel')?.hasAttribute('data-open')).toBe(true);
    });

    it('closes on ArrowLeft from a child', async () => {
      fixture = await submenuFixture();

      const share = fixture.element.querySelector<HTMLElement>('#share')!;

      press(innerRow(share), 'ArrowRight');
      await fixture.flush();

      const mail = share.querySelector<HTMLElement>('[value="mail"]')!;

      press(innerRow(mail), 'ArrowLeft');
      await fixture.flush();

      expect(panelOf(share).hasAttribute('data-open')).toBe(false);
    });

    it('emits select for a nested child and closes the whole chain', async () => {
      fixture = await submenuFixture();
      const onSelect = vi.fn();

      fixture.element.addEventListener('select', onSelect);

      await openMenu(fixture);

      const share = fixture.element.querySelector<HTMLElement>('#share')!;

      press(innerRow(share), 'ArrowRight');
      await fixture.flush();

      const link = share.querySelector<HTMLElement>('[value="link"]')!;

      tap(innerRow(link));
      await fixture.flush();

      expect((onSelect.mock.calls[0][0] as CustomEvent).detail.value).toBe('link');
      expect(fixture.query('.menu-panel')?.hasAttribute('data-open')).toBe(false);
      expect(panelOf(share).hasAttribute('data-open')).toBe(false);
    });

    it('activates a focused child with Enter from inside the submenu', async () => {
      fixture = await submenuFixture();
      const onSelect = vi.fn();

      fixture.element.addEventListener('select', onSelect);

      await openMenu(fixture);

      const share = fixture.element.querySelector<HTMLElement>('#share')!;

      press(innerRow(share), 'ArrowRight');
      await fixture.flush();

      const mail = share.querySelector<HTMLElement>('[value="mail"]')!;

      press(innerRow(mail), 'Enter');
      await fixture.flush();

      expect((onSelect.mock.calls[0][0] as CustomEvent).detail.value).toBe('mail');
    });

    it('closes a sibling submenu when another opens', async () => {
      fixture = await mount('ore-menu', {
        html: `
          <button slot="trigger">File</button>
          <ore-menu-item id="a">A<ore-menu-item slot="submenu" value="a1">A1</ore-menu-item></ore-menu-item>
          <ore-menu-item id="b">B<ore-menu-item slot="submenu" value="b1">B1</ore-menu-item></ore-menu-item>
        `,
      });
      await fixture.flush();

      const a = fixture.element.querySelector<HTMLElement>('#a')!;
      const b = fixture.element.querySelector<HTMLElement>('#b')!;

      press(innerRow(a), 'ArrowRight');
      await fixture.flush();
      expect(panelOf(a).hasAttribute('data-open')).toBe(true);

      press(innerRow(b), 'ArrowRight');
      await fixture.flush();

      expect(panelOf(a).hasAttribute('data-open')).toBe(false);
      expect(panelOf(b).hasAttribute('data-open')).toBe(true);
    });

    it('closes an open submenu when the whole menu closes', async () => {
      fixture = await submenuFixture();

      await openMenu(fixture);

      const share = fixture.element.querySelector<HTMLElement>('#share')!;

      press(innerRow(share), 'ArrowRight');
      await fixture.flush();
      expect(panelOf(share).hasAttribute('data-open')).toBe(true);

      fireKeyDown(fixture.query('.menu-panel')!, { key: 'Escape' });
      await fixture.flush();

      expect(fixture.query('.menu-panel')?.hasAttribute('data-open')).toBe(false);
      expect(panelOf(share).hasAttribute('data-open')).toBe(false);
    });

    it('opens on hover after the dwell delay', async () => {
      // Mount before faking: `flush()` awaits a real animation frame, which fake timers never fire.
      fixture = await submenuFixture();

      vi.useFakeTimers();
      try {
        const share = fixture.element.querySelector<HTMLElement>('#share')!;

        innerRow(share).dispatchEvent(new Event('pointerenter'));
        expect(panelOf(share).hasAttribute('data-open')).toBe(false);

        vi.advanceTimersByTime(120);

        expect(panelOf(share).hasAttribute('data-open')).toBe(true);
      } finally {
        vi.useRealTimers();
      }
    });

    it('groups radios within the submenu, not the root menu', async () => {
      fixture = await mount('ore-menu', {
        html: `
          <button slot="trigger">View</button>
          <ore-menu-item type="radio" value="root">Root radio</ore-menu-item>
          <ore-menu-item id="orient">
            Orientation
            <ore-menu-item slot="submenu" type="radio" value="land">Landscape</ore-menu-item>
            <ore-menu-item slot="submenu" type="radio" value="port">Portrait</ore-menu-item>
          </ore-menu-item>
        `,
      });
      await fixture.flush();

      await openMenu(fixture);

      const orient = fixture.element.querySelector<HTMLElement>('#orient')!;

      press(innerRow(orient), 'ArrowRight');
      await fixture.flush();

      const land = orient.querySelector<HTMLElement>('[value="land"]')!;
      const port = orient.querySelector<HTMLElement>('[value="port"]')!;
      const root = fixture.element.querySelector<HTMLElement>('[value="root"]')!;

      tap(innerRow(land));
      await fixture.flush();
      expect(land.hasAttribute('checked')).toBe(true);

      tap(innerRow(port));

      expect(port.hasAttribute('checked')).toBe(true);
      expect(land.hasAttribute('checked')).toBe(false);
      expect(root.hasAttribute('checked')).toBe(false);
    });

    it('toggles a submenu checkbox without closing the menu', async () => {
      fixture = await mount('ore-menu', {
        html: `
          <button slot="trigger">View</button>
          <ore-menu-item id="opts">
            Options
            <ore-menu-item slot="submenu" type="checkbox" value="grid">Show grid</ore-menu-item>
          </ore-menu-item>
        `,
      });
      await fixture.flush();

      await openMenu(fixture);

      const opts = fixture.element.querySelector<HTMLElement>('#opts')!;

      press(innerRow(opts), 'ArrowRight');
      await fixture.flush();

      const grid = opts.querySelector<HTMLElement>('[value="grid"]')!;

      tap(innerRow(grid));
      await fixture.flush();

      expect(grid.hasAttribute('checked')).toBe(true);
      expect(fixture.query('.menu-panel')?.hasAttribute('data-open')).toBe(true);
      expect(panelOf(opts).hasAttribute('data-open')).toBe(true);
    });

    it('nests a submenu inside a submenu', async () => {
      fixture = await mount('ore-menu', {
        html: `
          <button slot="trigger">File</button>
          <ore-menu-item id="outer">
            Outer
            <ore-menu-item slot="submenu" id="inner">
              Inner
              <ore-menu-item slot="submenu" value="deep">Deep</ore-menu-item>
            </ore-menu-item>
          </ore-menu-item>
        `,
      });
      await fixture.flush();

      const outer = fixture.element.querySelector<HTMLElement>('#outer')!;
      const inner = fixture.element.querySelector<HTMLElement>('#inner')!;

      press(innerRow(outer), 'ArrowRight');
      await fixture.flush();
      press(innerRow(inner), 'ArrowRight');
      await fixture.flush();

      expect(panelOf(outer).hasAttribute('data-open')).toBe(true);
      expect(panelOf(inner).hasAttribute('data-open')).toBe(true);

      const deep = fixture.element.querySelector<HTMLElement>('[value="deep"]')!;

      tap(innerRow(deep));

      expect(fixture.query('.menu-panel')?.hasAttribute('data-open')).toBe(false);
    });

    it('passes axe checks with a submenu present', async () => {
      fixture = await submenuFixture();

      const results = await axeCheck(fixture.element);

      expect(results.violations).toHaveLength(0);
    });
  });

  describe('Accessibility (axe)', () => {
    it('passes axe checks when closed', async () => {
      fixture = await mount('ore-menu', {
        html: `<button slot="trigger">Open</button>
               <ore-menu-item value="edit">Edit</ore-menu-item>
               <ore-menu-item value="delete">Delete</ore-menu-item>`,
      });

      const results = await axeCheck(fixture.element);

      expect(results.violations).toHaveLength(0);
    });
  });

  describe('Group captions and end slots', () => {
    it('renders a presentational caption that stays out of keyboard navigation', async () => {
      fixture = await mount('ore-menu', {
        html: `<button slot="trigger">Open</button>
               <ore-menu-label>Switch account</ore-menu-label>
               <ore-menu-item value="ada">Ada</ore-menu-item>`,
      });
      await fixture.flush();

      const label = fixture.element.querySelector('ore-menu-label')!;

      expect(label.getAttribute('role')).toBe('presentation');
      expect(label.textContent).toContain('Switch account');
      expect(label.shadowRoot!.querySelector('.label slot')).not.toBeNull();

      // Keyboard navigation enumerates only ore-menu-item elements.
      const navTargets = fixture.element.querySelectorAll('ore-menu-item');

      expect(navTargets).toHaveLength(1);
    });

    it('renders trailing content in an end slot and omits the wrapper when empty', async () => {
      fixture = await mount('ore-menu', {
        html: `<button slot="trigger">Open</button>
               <ore-menu-item value="profile">Profile<kbd slot="end">⌘P</kbd></ore-menu-item>
               <ore-menu-item value="docs">Docs</ore-menu-item>`,
      });
      await fixture.flush();

      const [withEnd, withoutEnd] = Array.from(fixture.element.querySelectorAll('ore-menu-item'));

      const endSlot = withEnd.shadowRoot!.querySelector('.end-slot');

      expect(endSlot).not.toBeNull();
      expect(endSlot!.querySelector('slot')).not.toBeNull();
      expect(withEnd.querySelector('[slot="end"]')?.textContent).toBe('⌘P');
      expect(withoutEnd.shadowRoot!.querySelector('.end-slot')!.hasAttribute('hidden')).toBe(true);
    });
  });
});

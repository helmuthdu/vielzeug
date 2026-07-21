import { type Fixture, mount, user } from '@vielzeug/ore/testing';

import type { OreMenuItemProps } from './menu';

type MenuItemElement = HTMLElement & OreMenuItemProps;

describe('ore-menu', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('./menu');
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

      fixture.element.addEventListener('open', onOpen);

      await user.click(fixture.element.querySelector<HTMLElement>('button[slot="trigger"]')!);

      expect(fixture.query('.menu-panel')?.hasAttribute('data-open')).toBe(true);
      expect((onOpen.mock.calls[0][0] as CustomEvent).detail).toEqual({ reason: 'click' });
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
      fixture.element.addEventListener('close', onClose);

      await user.click(fixture.element.querySelector<HTMLElement>('button[slot="trigger"]')!);
      await user.click(fixture.element.querySelector<MenuItemElement>('[value="edit"]')!);

      expect(onSelect).toHaveBeenCalledTimes(1);
      expect((onSelect.mock.calls[0][0] as CustomEvent).detail.value).toBe('edit');
      expect(fixture.query('.menu-panel')?.hasAttribute('data-open')).toBe(false);
      expect((onClose.mock.calls[0][0] as CustomEvent).detail).toEqual({ reason: 'programmatic' });
    });

    it('toggles checkbox menu item without closing menu', async () => {
      fixture = await mount('ore-menu', {
        html: `
          <button slot="trigger">Open</button>
          <ore-menu-item value="show-ids" type="checkbox">Show IDs</ore-menu-item>
        `,
      });

      await user.click(fixture.element.querySelector<HTMLElement>('button[slot="trigger"]')!);

      const item = fixture.element.querySelector<MenuItemElement>('[value="show-ids"]')!;

      await user.click(item);

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

      await user.click(fixture.element.querySelector<HTMLElement>('button[slot="trigger"]')!);

      const item = fixture.element.querySelector<MenuItemElement>('[value="show-ids"]')!;
      const initialCheck = item.shadowRoot?.querySelector<HTMLElement>('.item-check');
      const initialItem = item.shadowRoot?.querySelector<HTMLElement>('.item');

      expect(initialItem?.getAttribute('role')).toBe('menuitemcheckbox');
      expect(initialItem?.getAttribute('aria-checked')).toBe('false');
      expect(initialCheck).toBeTruthy();

      await user.click(item);

      const internalItem = item.shadowRoot?.querySelector<HTMLElement>('.item');
      const internalCheck = item.shadowRoot?.querySelector<HTMLElement>('.item-check');

      expect(item.hasAttribute('checked')).toBe(true);
      expect(internalItem?.getAttribute('aria-checked')).toBe('true');
      expect(internalItem?.getAttribute('role')).toBe('menuitemcheckbox');
      expect(internalCheck).toBeTruthy();
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

      await user.click(trigger);
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

      await user.press(trigger, 'ArrowDown');

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

      fixture.element.addEventListener('open', onOpen);

      const trigger = fixture.element.querySelector<HTMLElement>('button[slot="trigger"]')!;

      await user.press(trigger, 'Enter');

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

      await user.press(trigger, ' ');

      expect(fixture.query('.menu-panel')?.hasAttribute('data-open')).toBe(true);
    });

    it('emits escape close reason when dismissed via Escape key', async () => {
      fixture = await mount('ore-menu', {
        html: `
          <button slot="trigger">Open</button>
          <ore-menu-item value="edit">Edit</ore-menu-item>
        `,
      });

      const onClose = vi.fn();

      fixture.element.addEventListener('close', onClose);

      await user.click(fixture.element.querySelector<HTMLElement>('button[slot="trigger"]')!);
      await user.press(fixture.query('.menu-panel')!, 'Escape');

      expect((onClose.mock.calls[0][0] as CustomEvent).detail).toEqual({ reason: 'escape' });
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

      await user.press(trigger, 'ArrowDown');
      await fixture.flush();
      await user.press(fixture.query('.menu-panel')!, 'ArrowDown');
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

      await user.press(trigger, 'ArrowDown');
      await fixture.flush();
      await user.press(fixture.query('.menu-panel')!, 'ArrowDown');
      await fixture.flush();
      await user.press(fixture.query('.menu-panel')!, 'Enter');
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

      await user.press(trigger, 'ArrowDown');
      await fixture.flush();
      await user.press(fixture.query('.menu-panel')!, 'ArrowDown');
      await fixture.flush();
      await user.press(fixture.query('.menu-panel')!, ' ');
      await fixture.flush();

      expect(onSelect).toHaveBeenCalledTimes(1);
      expect((onSelect.mock.calls[0][0] as CustomEvent).detail.value).toBe('delete');
    });
  });

  describe('Accessibility', () => {
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
});

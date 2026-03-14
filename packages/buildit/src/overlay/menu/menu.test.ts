import { type Fixture, mount, user } from '@vielzeug/craftit/test';

describe('bit-menu', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('./menu');
  });

  afterEach(() => {
    fixture?.destroy();
  });

  describe('Core Functionality', () => {
    it('opens menu when trigger is clicked', async () => {
      fixture = await mount('bit-menu', {
        html: `
          <button slot="trigger">Open</button>
          <bit-menu-item value="edit">Edit</bit-menu-item>
        `,
      });

      await user.click(fixture.element.querySelector<HTMLElement>('button[slot="trigger"]')!);

      expect(fixture.query('.menu-panel')?.hasAttribute('data-open')).toBe(true);
    });

    it('emits bit-select and closes for normal menu items', async () => {
      fixture = await mount('bit-menu', {
        html: `
          <button slot="trigger">Open</button>
          <bit-menu-item value="edit">Edit</bit-menu-item>
        `,
      });

      const onSelect = vi.fn();

      fixture.element.addEventListener('bit-select', onSelect);

      await user.click(fixture.element.querySelector<HTMLElement>('button[slot="trigger"]')!);
      await user.click(fixture.element.querySelector<HTMLElement>('bit-menu-item')!);

      expect(onSelect).toHaveBeenCalledTimes(1);
      expect((onSelect.mock.calls[0][0] as CustomEvent).detail.value).toBe('edit');
      expect(fixture.query('.menu-panel')?.hasAttribute('data-open')).toBe(false);
    });

    it('toggles checkbox menu item without closing menu', async () => {
      fixture = await mount('bit-menu', {
        html: `
          <button slot="trigger">Open</button>
          <bit-menu-item value="show-ids" type="checkbox">Show IDs</bit-menu-item>
        `,
      });

      await user.click(fixture.element.querySelector<HTMLElement>('button[slot="trigger"]')!);

      const item = fixture.element.querySelector<HTMLElement>('bit-menu-item')!;

      await user.click(item);

      expect(item.hasAttribute('checked')).toBe(true);
      expect(fixture.query('.menu-panel')?.hasAttribute('data-open')).toBe(true);
    });
  });

  describe('Accessibility', () => {
    it('sets trigger aria-haspopup and aria-expanded', async () => {
      fixture = await mount('bit-menu', {
        html: `
          <button slot="trigger">Open</button>
          <bit-menu-item value="edit">Edit</bit-menu-item>
        `,
      });

      const trigger = fixture.element.querySelector<HTMLElement>('button[slot="trigger"]')!;

      expect(trigger.getAttribute('aria-haspopup')).toBe('menu');
      expect(trigger.getAttribute('aria-expanded')).toBe('false');

      await user.click(trigger);
      expect(trigger.getAttribute('aria-expanded')).toBe('true');
    });

    it('uses semantic menu role on panel', async () => {
      fixture = await mount('bit-menu', {
        html: `
          <button slot="trigger">Open</button>
          <bit-menu-item value="edit">Edit</bit-menu-item>
        `,
      });

      expect(fixture.query('.menu-panel')?.getAttribute('role')).toBe('menu');
    });

    it('uses checkable menuitemcheckbox role for checkbox items', async () => {
      fixture = await mount('bit-menu-item', { attrs: { type: 'checkbox' }, html: 'Show IDs' });

      expect(fixture.query('.item')?.getAttribute('role')).toBe('menuitemcheckbox');
      expect(fixture.query('.item')?.getAttribute('aria-checked')).toBe('false');
    });

    it('supports keyboard open using ArrowDown on trigger', async () => {
      fixture = await mount('bit-menu', {
        html: `
          <button slot="trigger">Open</button>
          <bit-menu-item value="edit">Edit</bit-menu-item>
          <bit-menu-item value="delete">Delete</bit-menu-item>
        `,
      });

      const trigger = fixture.element.querySelector<HTMLElement>('button[slot="trigger"]')!;

      await user.press(trigger, 'ArrowDown');

      expect(fixture.query('.menu-panel')?.hasAttribute('data-open')).toBe(true);
    });
  });
});

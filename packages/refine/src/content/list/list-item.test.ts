import { type Fixture, mount } from '@vielzeug/ore/testing';

const pointer = { bubbles: true, composed: true, isPrimary: true, pointerType: 'touch' } as const;

describe('ore-list-item', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('./list-item');
    // Needed for the `Selection` describe block below — selection is entirely context-driven
    // (an item's `selected` state is derived from its parent `ore-list`'s `value`), so exercising
    // it means mounting a real `ore-list` parent, not just the item in isolation.
    await import('./list');
  });

  afterEach(() => {
    fixture?.dispose();
  });

  describe('Rendering', () => {
    it('renders the row and title slot content', async () => {
      fixture = await mount('ore-list-item', { html: 'Inbox' });

      expect(fixture.query('.row')).toBeTruthy();
      expect(fixture.element.textContent?.trim()).toBe('Inbox');
    });

    it('renders leading/trailing/description slots', async () => {
      fixture = await mount('ore-list-item', {
        html: '<span slot="leading">L</span>Title<span slot="description">D</span><span slot="trailing">T</span>',
      });

      expect(fixture.element.querySelector('[slot="leading"]')).toBeTruthy();
      expect(fixture.element.querySelector('[slot="description"]')).toBeTruthy();
      expect(fixture.element.querySelector('[slot="trailing"]')).toBeTruthy();
    });
  });

  describe('Props', () => {
    it('role is listitem by default', async () => {
      fixture = await mount('ore-list-item');

      expect(fixture.element.getAttribute('role')).toBe('listitem');
    });

    it('reflects disabled as aria-disabled and removes the row from tab order', async () => {
      fixture = await mount('ore-list-item', { attrs: { disabled: '' } });

      expect(fixture.element.getAttribute('aria-disabled')).toBe('true');
      expect(fixture.query('.row')?.getAttribute('tabindex')).toBe('-1');
    });

    it('the row is tabbable by default', async () => {
      fixture = await mount('ore-list-item');

      expect(fixture.query('.row')?.getAttribute('tabindex')).toBe('0');
    });
  });

  describe('Selection', () => {
    it('does nothing on click without a parent ore-list (no selectable context)', async () => {
      fixture = await mount('ore-list-item', { attrs: { value: 'a' } });

      fixture.query<HTMLElement>('.row')?.click();
      await fixture.flush();

      expect(fixture.element.hasAttribute('selected')).toBe(false);
    });

    // `selected` is derived from the parent `ore-list`'s `value`, not an independently settable
    // prop — exercising select/deselect means driving that value, not the item's own attribute.
    it("emits select when the parent list is given this item's value", async () => {
      fixture = await mount('ore-list', {
        attrs: { selectable: '' },
        html: '<ore-list-item value="a">A</ore-list-item>',
      });

      const item = fixture.element.querySelector('ore-list-item')!;
      const onSelect = vi.fn();

      item.addEventListener('select', onSelect);

      await fixture.attr('value', 'a');

      expect(onSelect).toHaveBeenCalledTimes(1);
      expect(onSelect.mock.calls[0][0].detail).toMatchObject({ item, value: 'a' });
      expect(item.hasAttribute('selected')).toBe(true);
    });

    it('emits deselect when the parent list clears its value', async () => {
      fixture = await mount('ore-list', {
        attrs: { selectable: '', value: 'a' },
        html: '<ore-list-item value="a">A</ore-list-item>',
      });

      const item = fixture.element.querySelector('ore-list-item')!;
      const onDeselect = vi.fn();

      item.addEventListener('deselect', onDeselect);

      await fixture.attr('value', false);

      expect(onDeselect).toHaveBeenCalledTimes(1);
      expect(item.hasAttribute('selected')).toBe(false);
    });
  });

  describe('Swipe reveal', () => {
    it('does not capture the pointer while revealing actions', async () => {
      fixture = await mount('ore-list-item', {
        html: 'Title<button slot="actions-right">Delete</button>',
      });
      await fixture.flush();

      const row = fixture.query<HTMLElement>('.row')!;
      const setPointerCapture = vi.fn();

      Object.defineProperty(row, 'setPointerCapture', { configurable: true, value: setPointerCapture });

      row.dispatchEvent(new PointerEvent('pointerdown', { ...pointer, clientX: 0, pointerId: 1 }));
      row.dispatchEvent(new PointerEvent('pointermove', { ...pointer, clientX: -100, pointerId: 1 }));

      expect(setPointerCapture).not.toHaveBeenCalled();
    });

    it('reveals the right action panel on a leftward swipe past the reveal threshold', async () => {
      fixture = await mount('ore-list-item', {
        html: 'Title<button slot="actions-right">Delete</button>',
      });
      await fixture.flush();

      const row = fixture.query<HTMLElement>('.row')!;

      row.dispatchEvent(new PointerEvent('pointerdown', { ...pointer, clientX: 0, pointerId: 1 }));
      row.dispatchEvent(new PointerEvent('pointermove', { ...pointer, clientX: -100, pointerId: 1 }));
      row.dispatchEvent(new PointerEvent('pointerup', { ...pointer, clientX: -100, pointerId: 1 }));
      await fixture.flush();

      expect(fixture.element.getAttribute('revealed')).toBe('right');
    });

    it('auto-confirms by clicking the slotted action when swiped all the way through', async () => {
      fixture = await mount('ore-list-item', {
        html: 'Title<button slot="actions-right" id="del">Delete</button>',
      });
      await fixture.flush();

      const row = fixture.query<HTMLElement>('.row')!;
      const onClick = vi.fn();
      const onConfirm = vi.fn();

      fixture.element.querySelector<HTMLElement>('#del')?.addEventListener('click', onClick);
      fixture.element.addEventListener('confirm', onConfirm);

      row.dispatchEvent(new PointerEvent('pointerdown', { ...pointer, clientX: 0, pointerId: 1 }));
      row.dispatchEvent(new PointerEvent('pointermove', { ...pointer, clientX: -300, pointerId: 1 }));
      await fixture.flush();

      expect(onConfirm).toHaveBeenCalledTimes(1);
      expect(onConfirm.mock.calls[0][0].detail).toMatchObject({ item: fixture.element, side: 'right' });
      expect(onClick).toHaveBeenCalledTimes(1);
      // The full-swipe-through gesture closes on its own — it doesn't leave the panel revealed.
      expect(fixture.element.hasAttribute('revealed')).toBe(false);
    });

    it('does not auto-confirm a side with no slotted actions, even swiped all the way through', async () => {
      fixture = await mount('ore-list-item', { html: 'Title' });
      await fixture.flush();

      const row = fixture.query<HTMLElement>('.row')!;

      row.dispatchEvent(new PointerEvent('pointerdown', { ...pointer, clientX: 0, pointerId: 1 }));
      row.dispatchEvent(new PointerEvent('pointermove', { ...pointer, clientX: -300, pointerId: 1 }));
      await fixture.flush();

      expect(fixture.element.hasAttribute('revealed')).toBe(false);
    });

    it('does not reveal a side with no slotted actions', async () => {
      fixture = await mount('ore-list-item', { html: 'Title' });
      await fixture.flush();

      const row = fixture.query<HTMLElement>('.row')!;

      row.dispatchEvent(new PointerEvent('pointerdown', { ...pointer, clientX: 0, pointerId: 1 }));
      row.dispatchEvent(new PointerEvent('pointermove', { ...pointer, clientX: -100, pointerId: 1 }));
      row.dispatchEvent(new PointerEvent('pointerup', { ...pointer, clientX: -100, pointerId: 1 }));
      await fixture.flush();

      expect(fixture.element.hasAttribute('revealed')).toBe(false);
    });

    it('snaps back without revealing when the swipe does not cross the reveal threshold', async () => {
      fixture = await mount('ore-list-item', {
        html: 'Title<button slot="actions-right">Delete</button>',
      });
      await fixture.flush();

      const row = fixture.query<HTMLElement>('.row')!;

      row.dispatchEvent(new PointerEvent('pointerdown', { ...pointer, clientX: 0, pointerId: 1 }));
      row.dispatchEvent(new PointerEvent('pointermove', { ...pointer, clientX: -5, pointerId: 1 }));
      row.dispatchEvent(new PointerEvent('pointerup', { ...pointer, clientX: -5, pointerId: 1 }));
      await fixture.flush();

      expect(fixture.element.hasAttribute('revealed')).toBe(false);
    });

    it('closes on click when already revealed, without toggling selection', async () => {
      fixture = await mount('ore-list-item', {
        attrs: { revealed: 'right' },
        html: 'Title<button slot="actions-right">Delete</button>',
      });
      await fixture.flush();

      fixture.query<HTMLElement>('.row')?.click();
      await fixture.flush();

      expect(fixture.element.hasAttribute('revealed')).toBe(false);
    });

    it('emits reveal and conceal', async () => {
      fixture = await mount('ore-list-item', {
        html: 'Title<button slot="actions-left">Archive</button>',
      });
      await fixture.flush();

      const onReveal = vi.fn();
      const onConceal = vi.fn();

      fixture.element.addEventListener('reveal', onReveal);
      fixture.element.addEventListener('conceal', onConceal);

      await fixture.attr('revealed', 'left');
      expect(onReveal).toHaveBeenCalledTimes(1);
      expect(onReveal.mock.calls[0][0].detail).toMatchObject({ item: fixture.element, side: 'left' });

      await fixture.attr('revealed', false);
      expect(onConceal).toHaveBeenCalledTimes(1);
    });

    it('ignores swipe gestures while disabled', async () => {
      fixture = await mount('ore-list-item', {
        attrs: { disabled: '' },
        html: 'Title<button slot="actions-right">Delete</button>',
      });
      await fixture.flush();

      const row = fixture.query<HTMLElement>('.row')!;

      row.dispatchEvent(new PointerEvent('pointerdown', { ...pointer, clientX: 0, pointerId: 1 }));
      row.dispatchEvent(new PointerEvent('pointermove', { ...pointer, clientX: -100, pointerId: 1 }));
      row.dispatchEvent(new PointerEvent('pointerup', { ...pointer, clientX: -100, pointerId: 1 }));
      await fixture.flush();

      expect(fixture.element.hasAttribute('revealed')).toBe(false);
    });
  });

  describe('Accessibility', () => {
    // `role="listitem"` requires an ancestor with `role="list"` — real usage always nests
    // `ore-list-item` inside `ore-list` (see list.test.ts's Accessibility suite for that
    // combination), so the standalone mount here disables the rule the same way
    // `ore-tab-item.test.ts` does for its own required-parent-role case.
    it('passes axe checks as a plain list item', async () => {
      fixture = await mount('ore-list-item', { html: 'Inbox' });

      const results = await axeCheck(fixture.element, { rules: { 'aria-required-parent': { enabled: false } } });

      expect(results.violations).toHaveLength(0);
    });

    it('passes axe checks with revealed actions', async () => {
      fixture = await mount('ore-list-item', {
        attrs: { revealed: 'right' },
        html: 'Title<button slot="actions-right">Delete</button>',
      });

      const results = await axeCheck(fixture.element, { rules: { 'aria-required-parent': { enabled: false } } });

      expect(results.violations).toHaveLength(0);
    });
  });
});

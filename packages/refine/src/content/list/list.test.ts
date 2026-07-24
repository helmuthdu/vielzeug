import { type Fixture, mount } from '@vielzeug/ore/testing';

const dispatchRowKeydown = (row: Element, key: string): void => {
  // `composed: true` matches a real hardware keydown crossing the `ore-list-item` shadow
  // boundary up to `ore-list`'s keydown listener — the test-helper `fire`/`user.press`
  // shorthands default `composed` to `false`, which never reaches a light-DOM ancestor.
  row.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, composed: true, key }));
};

describe('ore-list', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('./list');
    await import('./list-item');
  });

  afterEach(() => {
    fixture?.dispose();
  });

  describe('Rendering', () => {
    it('renders the list element', async () => {
      fixture = await mount('ore-list');

      expect(fixture.element).toBeTruthy();
    });

    it('renders slotted ore-list-item children', async () => {
      fixture = await mount('ore-list', {
        html: '<ore-list-item>First</ore-list-item><ore-list-item>Second</ore-list-item>',
      });

      expect(fixture.element.querySelectorAll('ore-list-item')).toHaveLength(2);
    });
  });

  describe('Props', () => {
    it('applies variant', async () => {
      fixture = await mount('ore-list', { attrs: { variant: 'bordered' } });

      expect(fixture.element.getAttribute('variant')).toBe('bordered');
    });

    it('applies size', async () => {
      fixture = await mount('ore-list', { attrs: { size: 'lg' } });

      expect(fixture.element.getAttribute('size')).toBe('lg');
    });

    it('defaults to role="list"', async () => {
      fixture = await mount('ore-list');

      expect(fixture.element.getAttribute('role')).toBe('list');
    });

    it('uses role="listbox" when selectable', async () => {
      fixture = await mount('ore-list', { attrs: { selectable: '' } });

      expect(fixture.element.getAttribute('role')).toBe('listbox');
    });

    it('reflects disabled as aria-disabled', async () => {
      fixture = await mount('ore-list', { attrs: { disabled: '' } });

      expect(fixture.element.getAttribute('aria-disabled')).toBe('true');
    });
  });

  describe('Selection', () => {
    it('selects an item on click when selectable', async () => {
      fixture = await mount('ore-list', {
        attrs: { selectable: '' },
        html: '<ore-list-item value="a">A</ore-list-item><ore-list-item value="b">B</ore-list-item>',
      });

      const items = fixture.element.querySelectorAll('ore-list-item');
      const row = items[0].shadowRoot?.querySelector<HTMLElement>('.row');

      row?.click();
      await fixture.flush();

      expect(items[0].hasAttribute('selected')).toBe(true);
    });

    it('deselects the previously-selected sibling (single-select)', async () => {
      fixture = await mount('ore-list', {
        attrs: { selectable: '', value: 'a' },
        html: '<ore-list-item value="a">A</ore-list-item><ore-list-item value="b">B</ore-list-item>',
      });

      const items = fixture.element.querySelectorAll('ore-list-item');
      const secondRow = items[1].shadowRoot?.querySelector<HTMLElement>('.row');

      secondRow?.click();
      await fixture.flush();

      expect(items[0].hasAttribute('selected')).toBe(false);
      expect(items[1].hasAttribute('selected')).toBe(true);
    });

    it('re-clicking the selected item deselects it', async () => {
      fixture = await mount('ore-list', {
        attrs: { selectable: '', value: 'a' },
        html: '<ore-list-item value="a">A</ore-list-item>',
      });

      const item = fixture.element.querySelector('ore-list-item')!;

      item.shadowRoot?.querySelector<HTMLElement>('.row')?.click();
      await fixture.flush();

      expect(item.hasAttribute('selected')).toBe(false);
      expect(fixture.element.getAttribute('value')).toBeNull();
    });

    it('emits change with the new value', async () => {
      fixture = await mount('ore-list', {
        attrs: { selectable: '' },
        html: '<ore-list-item value="a">A</ore-list-item>',
      });

      const onChange = vi.fn();

      fixture.element.addEventListener('change', onChange);

      const item = fixture.element.querySelector('ore-list-item')!;

      item.shadowRoot?.querySelector<HTMLElement>('.row')?.click();
      await fixture.flush();

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange.mock.calls[0][0].detail).toEqual({ value: 'a' });
      expect(fixture.element.getAttribute('value')).toBe('a');
    });

    it('a list-item without a value cannot be selected', async () => {
      fixture = await mount('ore-list', {
        attrs: { selectable: '' },
        html: '<ore-list-item>No value</ore-list-item>',
      });

      const item = fixture.element.querySelector('ore-list-item')!;

      item.shadowRoot?.querySelector<HTMLElement>('.row')?.click();
      await fixture.flush();

      expect(item.hasAttribute('selected')).toBe(false);
      expect(fixture.element.hasAttribute('value')).toBe(false);
    });

    it('does not select on click when not selectable', async () => {
      fixture = await mount('ore-list', {
        html: '<ore-list-item value="a">A</ore-list-item>',
      });

      const item = fixture.element.querySelector('ore-list-item')!;

      item.shadowRoot?.querySelector<HTMLElement>('.row')?.click();
      await fixture.flush();

      expect(item.hasAttribute('selected')).toBe(false);
    });

    it('ignores selection on a disabled item', async () => {
      fixture = await mount('ore-list', {
        attrs: { selectable: '' },
        html: '<ore-list-item value="a" disabled>A</ore-list-item>',
      });

      const item = fixture.element.querySelector('ore-list-item')!;

      item.shadowRoot?.querySelector<HTMLElement>('.row')?.click();
      await fixture.flush();

      expect(item.hasAttribute('selected')).toBe(false);
    });

    // `value` is the single source of truth — setting it externally (or programmatically) must
    // select the matching item without any click ever happening, and without any per-item
    // "selected" attribute for it to have set independently.
    it('setting value programmatically selects the matching item', async () => {
      fixture = await mount('ore-list', {
        attrs: { selectable: '' },
        html: '<ore-list-item value="a">A</ore-list-item><ore-list-item value="b">B</ore-list-item>',
      });

      const items = fixture.element.querySelectorAll('ore-list-item');

      await fixture.attr('value', 'b');

      expect(items[0].hasAttribute('selected')).toBe(false);
      expect(items[1].hasAttribute('selected')).toBe(true);
    });

    it('clearing value deselects every item', async () => {
      fixture = await mount('ore-list', {
        attrs: { selectable: '', value: 'a' },
        html: '<ore-list-item value="a">A</ore-list-item>',
      });

      const item = fixture.element.querySelector('ore-list-item')!;

      expect(item.hasAttribute('selected')).toBe(true);

      await fixture.attr('value', false);

      expect(item.hasAttribute('selected')).toBe(false);
    });
  });

  describe('Keyboard Navigation', () => {
    it('ArrowDown moves focus to the next item when selectable', async () => {
      fixture = await mount('ore-list', {
        attrs: { selectable: '' },
        html: '<ore-list-item value="a">A</ore-list-item><ore-list-item value="b">B</ore-list-item>',
      });

      const items = fixture.element.querySelectorAll('ore-list-item');
      const firstRow = items[0].shadowRoot!.querySelector<HTMLElement>('.row')!;
      const secondRow = items[1].shadowRoot!.querySelector<HTMLElement>('.row')!;

      firstRow.focus();
      dispatchRowKeydown(firstRow, 'ArrowDown');
      await fixture.flush();

      expect(fixture.element.shadowRoot).toBeDefined();
      expect(document.activeElement === items[1] || items[1].shadowRoot?.activeElement === secondRow).toBe(true);
    });

    it('ignores arrow keys when not selectable', async () => {
      fixture = await mount('ore-list', {
        html: '<ore-list-item value="a">A</ore-list-item><ore-list-item value="b">B</ore-list-item>',
      });

      const items = fixture.element.querySelectorAll('ore-list-item');
      const firstRow = items[0].shadowRoot!.querySelector<HTMLElement>('.row')!;

      firstRow.focus();
      dispatchRowKeydown(firstRow, 'ArrowDown');
      await fixture.flush();

      expect(items[1].shadowRoot?.activeElement).toBeNull();
    });

    it('Enter selects the focused item when selectable', async () => {
      fixture = await mount('ore-list', {
        attrs: { selectable: '' },
        html: '<ore-list-item value="a">A</ore-list-item>',
      });

      const item = fixture.element.querySelector('ore-list-item')!;
      const row = item.shadowRoot!.querySelector<HTMLElement>('.row')!;

      row.focus();
      row.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Enter' }));
      await fixture.flush();

      expect(item.hasAttribute('selected')).toBe(true);
    });
  });

  describe('Swipe Coordination', () => {
    it('closes a previously-revealed item when another item reveals', async () => {
      fixture = await mount('ore-list', {
        html:
          '<ore-list-item revealed="left">A<span slot="actions-left">Archive</span></ore-list-item>' +
          '<ore-list-item>B<span slot="actions-left">Archive</span></ore-list-item>',
      });

      const items = fixture.element.querySelectorAll('ore-list-item');

      items[1].setAttribute('revealed', 'left');
      await fixture.flush();

      expect(items[0].hasAttribute('revealed')).toBe(false);
      expect(items[1].hasAttribute('revealed')).toBe(true);
    });

    it('closes a revealed item on outside pointerdown', async () => {
      fixture = await mount('ore-list', {
        html: '<ore-list-item revealed="left">A<span slot="actions-left">Archive</span></ore-list-item>',
      });

      const item = fixture.element.querySelector('ore-list-item')!;

      document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }));
      await fixture.flush();

      expect(item.hasAttribute('revealed')).toBe(false);
    });
  });

  describe('Accessibility', () => {
    it('passes axe checks as a plain list', async () => {
      fixture = await mount('ore-list', {
        html: '<ore-list-item>First</ore-list-item><ore-list-item>Second</ore-list-item>',
      });

      const results = await axeCheck(fixture.element);

      expect(results.violations).toHaveLength(0);
    });

    it('passes axe checks as a selectable listbox', async () => {
      // role="listbox" needs an accessible name — same as any native listbox/select; ore-list
      // has no dedicated `label` prop (matches ore-menu), consumers set `aria-label` directly.
      fixture = await mount('ore-list', {
        attrs: { 'aria-label': 'Folders', selectable: '', value: 'a' },
        html: '<ore-list-item value="a">First</ore-list-item><ore-list-item value="b">Second</ore-list-item>',
      });

      const results = await axeCheck(fixture.element);

      expect(results.violations).toHaveLength(0);
    });
  });
});

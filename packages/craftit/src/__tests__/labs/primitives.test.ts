import { createListNavigation, createOverlayControl, createSelectionControl } from '../../labs';

describe('craftit/labs primitives', () => {
  describe('createListNavigation', () => {
    it('navigates forward and skips disabled items', () => {
      const items = [{ disabled: false }, { disabled: true }, { disabled: false }];
      let activeIndex = -1;
      const nav = createListNavigation({
        getIndex: () => activeIndex,
        getItems: () => items,
        setIndex: (index) => {
          activeIndex = index;
        },
      });

      expect(nav.first()).toMatchObject({ index: 0, moved: true, reason: 'moved', wrapped: false });
      expect(activeIndex).toBe(0);
      expect(nav.next()).toMatchObject({ index: 2, moved: true, reason: 'moved', wrapped: false });
      expect(activeIndex).toBe(2);
      expect(nav.prev()).toMatchObject({ index: 0, moved: true, reason: 'moved', wrapped: false });
      expect(activeIndex).toBe(0);
    });

    it('supports Home key to jump to first enabled item', () => {
      const items = [{ disabled: true }, { disabled: true }, { disabled: false }, { disabled: false }];
      let activeIndex = 3;
      const nav = createListNavigation({
        getIndex: () => activeIndex,
        getItems: () => items,
        setIndex: (index) => {
          activeIndex = index;
        },
      });

      const result = nav.first();

      expect(result).toMatchObject({ index: 2, moved: true, reason: 'moved', wrapped: false });
      expect(activeIndex).toBe(2);
    });

    it('supports End key to jump to last enabled item', () => {
      const items = [{ disabled: false }, { disabled: false }, { disabled: true }, { disabled: true }];
      let activeIndex = 0;
      const nav = createListNavigation({
        getIndex: () => activeIndex,
        getItems: () => items,
        setIndex: (index) => {
          activeIndex = index;
        },
      });

      const result = nav.last();

      expect(result).toMatchObject({ index: 1, moved: true, reason: 'moved', wrapped: false });
      expect(activeIndex).toBe(1);
    });

    it('wraps to end when loop=true and next() called on last item', () => {
      const items = [{ disabled: false }, { disabled: false }, { disabled: false }];
      let activeIndex = 2;
      const nav = createListNavigation({
        getIndex: () => activeIndex,
        getItems: () => items,
        loop: true,
        setIndex: (index) => {
          activeIndex = index;
        },
      });

      const result = nav.next();

      expect(result).toMatchObject({ index: 0, moved: true, reason: 'moved', wrapped: true });
      expect(activeIndex).toBe(0);
    });

    it('wraps to start when loop=true and prev() called on first item', () => {
      const items = [{ disabled: false }, { disabled: false }, { disabled: false }];
      let activeIndex = 0;
      const nav = createListNavigation({
        getIndex: () => activeIndex,
        getItems: () => items,
        loop: true,
        setIndex: (index) => {
          activeIndex = index;
        },
      });

      const result = nav.prev();

      expect(result).toMatchObject({ index: 2, moved: true, reason: 'moved', wrapped: true });
      expect(activeIndex).toBe(2);
    });

    it('does not wrap when loop=false', () => {
      const items = [{ disabled: false }, { disabled: false }, { disabled: false }];
      let activeIndex = 2;
      const nav = createListNavigation({
        getIndex: () => activeIndex,
        getItems: () => items,
        loop: false,
        setIndex: (index) => {
          activeIndex = index;
        },
      });

      const result = nav.next();

      expect(result).toMatchObject({ index: 2, moved: false, reason: 'unchanged', wrapped: false }); // stays at last
      expect(activeIndex).toBe(2);
    });

    it('skips all disabled items when navigating', () => {
      const items = [{ disabled: false }, { disabled: true }, { disabled: true }, { disabled: false }];
      let activeIndex = 0;
      const nav = createListNavigation({
        getIndex: () => activeIndex,
        getItems: () => items,
        setIndex: (index) => {
          activeIndex = index;
        },
      });

      expect(nav.next()).toMatchObject({ index: 3, moved: true, reason: 'moved', wrapped: false });
      expect(nav.next()).toMatchObject({ index: 3, moved: false, reason: 'unchanged', wrapped: false }); // at end, no more items
      expect(nav.prev()).toMatchObject({ index: 0, moved: true, reason: 'moved', wrapped: false });
      expect(nav.prev()).toMatchObject({ index: 0, moved: false, reason: 'unchanged', wrapped: false }); // at start, no more items
    });

    it('returns -1 when all items are disabled', () => {
      const items = [{ disabled: true }, { disabled: true }, { disabled: true }];
      let activeIndex = -1;
      const nav = createListNavigation({
        getIndex: () => activeIndex,
        getItems: () => items,
        setIndex: (index) => {
          activeIndex = index;
        },
      });

      expect(nav.first()).toMatchObject({ index: -1, moved: false, reason: 'no-enabled-item', wrapped: false });
      expect(nav.last()).toMatchObject({ index: -1, moved: false, reason: 'no-enabled-item', wrapped: false });
      expect(nav.next()).toMatchObject({ index: -1, moved: false, reason: 'no-enabled-item', wrapped: false });
      expect(nav.prev()).toMatchObject({ index: -1, moved: false, reason: 'no-enabled-item', wrapped: false });
    });

    it('handles dynamic enable/disable of items', () => {
      const items = [{ disabled: false }, { disabled: false }, { disabled: false }];
      let activeIndex = 0;
      const nav = createListNavigation({
        getIndex: () => activeIndex,
        getItems: () => items,
        setIndex: (index) => {
          activeIndex = index;
        },
      });

      // Initially item 1 is enabled
      expect(nav.next()).toMatchObject({ index: 1, moved: true, reason: 'moved', wrapped: false });
      expect(activeIndex).toBe(1);

      // Disable item 1 for next navigation
      items[1].disabled = true;
      expect(nav.next()).toMatchObject({ index: 2, moved: true, reason: 'moved', wrapped: false });
      expect(activeIndex).toBe(2);

      // Re-enable item 1
      items[1].disabled = false;
      expect(nav.prev()).toMatchObject({ index: 1, moved: true, reason: 'moved', wrapped: false });
      expect(activeIndex).toBe(1);
    });

    it('gets active item correctly', () => {
      const items = [
        { disabled: false, id: 'a' },
        { disabled: true, id: 'b' },
        { disabled: false, id: 'c' },
      ];
      let activeIndex = 0;
      const nav = createListNavigation({
        getIndex: () => activeIndex,
        getItems: () => items,
        setIndex: (index) => {
          activeIndex = index;
        },
      });

      expect(nav.getActiveItem()).toEqual({ disabled: false, id: 'a' });

      nav.next();
      expect(nav.getActiveItem()).toEqual({ disabled: false, id: 'c' });

      nav.last();
      expect(nav.getActiveItem()).toEqual({ disabled: false, id: 'c' });
    });
  });

  describe('createSelectionControl', () => {
    it('toggles multiple selections and serializes values', () => {
      type Item = { id: string; label: string };

      let selected: Item[] = [];
      const allItems = [
        { id: 'a', label: 'A' },
        { id: 'b', label: 'B' },
      ];
      const controller = createSelectionControl({
        findByKey: (id) => allItems.find((i) => i.id === id),
        getMode: () => 'multiple' as const,
        getSelected: () => selected,
        keyExtractor: (item) => item.id,
        setSelected: (next) => {
          selected = next;
        },
      });

      controller.toggle('a');
      controller.toggle('b');
      expect(controller.serialize(',')).toBe('a,b');
      expect(selected).toEqual([
        { id: 'a', label: 'A' },
        { id: 'b', label: 'B' },
      ]);

      controller.toggle('a');
      expect(controller.serialize(',')).toBe('b');
    });

    it('keeps only one selected value in single mode', () => {
      type Item = { id: string; label: string };

      let selected: Item[] = [];
      const allItems = [
        { id: '1', label: 'First' },
        { id: '2', label: 'Second' },
      ];
      const controller = createSelectionControl({
        findByKey: (id) => allItems.find((i) => i.id === id),
        getMode: () => 'single' as const,
        getSelected: () => selected,
        keyExtractor: (item) => item.id,
        setSelected: (next) => {
          selected = next;
        },
      });

      controller.select('1');
      controller.select('2');

      expect(controller.serialize(',')).toBe('2');
      expect(selected).toEqual([{ id: '2', label: 'Second' }]);
    });

    it('clears selections', () => {
      type Item = { id: string; label: string };

      let selected: Item[] = [];
      const allItems = [
        { id: 'a', label: 'A' },
        { id: 'b', label: 'B' },
      ];
      const controller = createSelectionControl({
        findByKey: (id) => allItems.find((i) => i.id === id),
        getMode: () => 'multiple' as const,
        getSelected: () => selected,
        keyExtractor: (item) => item.id,
        setSelected: (next) => {
          selected = next;
        },
      });

      controller.select('a');
      controller.select('b');
      expect(selected.length).toBe(2);

      controller.clear();
      expect(selected).toEqual([]);
    });

    it('removes individual selections', () => {
      type Item = { id: string; label: string };

      let selected: Item[] = [];
      const allItems = [
        { id: 'a', label: 'A' },
        { id: 'b', label: 'B' },
        { id: 'c', label: 'C' },
      ];
      const controller = createSelectionControl({
        findByKey: (id) => allItems.find((i) => i.id === id),
        getMode: () => 'multiple' as const,
        getSelected: () => selected,
        keyExtractor: (item) => item.id,
        setSelected: (next) => {
          selected = next;
        },
      });

      controller.select('a');
      controller.select('b');
      controller.select('c');

      controller.remove('b');
      expect(controller.serialize(',')).toBe('a,c');
    });

    it('checks selection by key', () => {
      type Item = { id: string; label: string };

      let selected: Item[] = [];
      const allItems = [{ id: 'a', label: 'A' }];
      const controller = createSelectionControl({
        findByKey: (id) => allItems.find((i) => i.id === id),
        getMode: () => 'multiple' as const,
        getSelected: () => selected,
        keyExtractor: (item) => item.id,
        setSelected: (next) => {
          selected = next;
        },
      });

      controller.select('a');
      expect(controller.isSelected('a')).toBe(true);
      expect(controller.isSelected('b')).toBe(false);
    });

    it('serializes with custom separator', () => {
      type Item = { id: string; label: string };

      let selected: Item[] = [];
      const allItems = [
        { id: 'a', label: 'A' },
        { id: 'b', label: 'B' },
      ];
      const controller = createSelectionControl({
        findByKey: (id) => allItems.find((i) => i.id === id),
        getMode: () => 'multiple' as const,
        getSelected: () => selected,
        keyExtractor: (item) => item.id,
        setSelected: (next) => {
          selected = next;
        },
      });

      controller.select('a');
      controller.select('b');

      expect(controller.serialize('|')).toBe('a|b');
      expect(controller.serialize('; ')).toBe('a; b');
    });
  });

  describe('createOverlayControl', () => {
    it('opens, closes and closes on outside click', () => {
      let open = false;
      const transitions: string[] = [];
      const host = document.createElement('div');
      const panel = document.createElement('div');
      const trigger = document.createElement('button');
      const outside = document.createElement('div');

      host.appendChild(trigger);
      document.body.appendChild(host);
      document.body.appendChild(panel);
      document.body.appendChild(outside);

      const controller = createOverlayControl({
        getBoundaryElement: () => host,
        getPanelElement: () => panel,
        getTriggerElement: () => trigger,
        isOpen: () => open,
        setOpen: (next, context) => {
          open = next;
          transitions.push(`${next ? 'open' : 'close'}:${context.reason}`);
        },
      });

      const cleanup = controller.bindOutsideClick(document);

      controller.open();
      expect(open).toBe(true);

      outside.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(open).toBe(false);
      expect(transitions).toEqual(['open:programmatic', 'close:outside-click']);

      cleanup();
      host.remove();
      panel.remove();
      outside.remove();
    });

    it('toggles open state', () => {
      let open = false;
      const controller = createOverlayControl({
        getBoundaryElement: () => document.body,
        isOpen: () => open,
        setOpen: (next) => {
          open = next;
        },
      });

      controller.toggle();
      expect(open).toBe(true);

      controller.toggle();
      expect(open).toBe(false);
    });

    it('respects disabled state', () => {
      let open = false;
      let disabled = true;
      const controller = createOverlayControl({
        getBoundaryElement: () => document.body,
        isDisabled: () => disabled,
        isOpen: () => open,
        setOpen: (next) => {
          open = next;
        },
      });

      controller.open();
      expect(open).toBe(false); // should not open when disabled

      disabled = false;
      controller.open();
      expect(open).toBe(true); // should open when enabled
    });

    it('calls onOpen and onClose callbacks', () => {
      let open = false;
      const callbacks = { onClose: vi.fn(), onOpen: vi.fn() };
      const controller = createOverlayControl({
        getBoundaryElement: () => document.body,
        isOpen: () => open,
        onClose: callbacks.onClose,
        onOpen: callbacks.onOpen,
        setOpen: (next) => {
          open = next;
        },
      });

      controller.open();
      expect(callbacks.onOpen).toHaveBeenCalledWith('programmatic');

      controller.close();
      expect(callbacks.onClose).toHaveBeenCalledWith('programmatic');
    });

    it('uses toggle reason when toggled', () => {
      let open = false;
      const transitions: string[] = [];
      const controller = createOverlayControl({
        getBoundaryElement: () => document.body,
        isOpen: () => open,
        setOpen: (next, context) => {
          open = next;
          transitions.push(`${next ? 'open' : 'close'}:${context.reason}`);
        },
      });

      controller.toggle();
      controller.toggle();

      expect(transitions).toEqual(['open:toggle', 'close:toggle']);
    });

    it('restores focus to trigger on close', () => {
      let open = false;
      const trigger = document.createElement('button');

      document.body.appendChild(trigger);

      const controller = createOverlayControl({
        getBoundaryElement: () => document.body,
        getTriggerElement: () => trigger,
        isOpen: () => open,
        restoreFocus: true,
        setOpen: (next) => {
          open = next;
        },
      });

      controller.open();
      controller.close();

      expect(document.activeElement).toBe(trigger);

      trigger.remove();
    });

    it('respects restoreFocus option', () => {
      let open = false;
      const trigger = document.createElement('button');
      const other = document.createElement('input');

      document.body.appendChild(trigger);
      document.body.appendChild(other);

      // Don't restore focus
      const controller = createOverlayControl({
        getBoundaryElement: () => document.body,
        getTriggerElement: () => trigger,
        isOpen: () => open,
        restoreFocus: false,
        setOpen: (next) => {
          open = next;
        },
      });

      controller.open();
      other.focus();
      controller.close();

      expect(document.activeElement).toBe(other); // focus not restored

      trigger.remove();
      other.remove();
    });
  });
});

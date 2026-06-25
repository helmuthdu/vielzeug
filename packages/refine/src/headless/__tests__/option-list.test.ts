import { html } from '@vielzeug/ore';
import { mount } from '@vielzeug/ore/testing';
import { describe, expect, it, vi } from 'vitest';

import { createOptionList, type OptionListOptions } from '../option-list';

type Item = { label: string; value: string };

const ITEMS: Item[] = [
  { label: 'Apple', value: 'apple' },
  { label: 'Banana', value: 'banana' },
  { label: 'Cherry', value: 'cherry' },
];

function makeHandle(overrides: Partial<OptionListOptions<Item>> = {}) {
  let boundary!: HTMLElement;
  let panel!: HTMLElement;
  let reference!: HTMLElement;
  let handle!: ReturnType<typeof createOptionList<Item>>;

  const setup = () => {
    boundary = document.createElement('div');
    panel = document.createElement('ul');
    reference = document.createElement('button');
    document.body.appendChild(boundary);
    document.body.appendChild(panel);
    document.body.appendChild(reference);

    handle = createOptionList<Item>({
      getBoundary: () => boundary,
      getItems: () => ITEMS,
      getPanel: () => panel,
      getReference: () => reference,
      signal: new AbortController().signal,
      ...overrides,
    });
  };

  return { get: () => handle, setup };
}

describe('createOptionList()', () => {
  describe('initial state', () => {
    it('starts closed with no focused item', async () => {
      const { get, setup } = makeHandle();

      await mount(() => {
        setup();

        return html`<div></div>`;
      }, {});

      const handle = get();

      expect(handle.isOpen.value).toBe(false);
      expect(handle.focusedIndex.value).toBe(-1);
    });

    it('returns undefined for getActiveItem when closed', async () => {
      const { get, setup } = makeHandle();

      await mount(() => {
        setup();

        return html`<div></div>`;
      }, {});

      expect(get().getActiveItem()).toBeUndefined();
    });
  });

  describe('open / close / toggle', () => {
    it('open() sets isOpen to true', async () => {
      const { get, setup } = makeHandle();

      await mount(() => {
        setup();

        return html`<div></div>`;
      }, {});

      get().open();
      expect(get().isOpen.value).toBe(true);
    });

    it('close() sets isOpen to false', async () => {
      const { get, setup } = makeHandle();

      await mount(() => {
        setup();

        return html`<div></div>`;
      }, {});

      get().open();
      get().close();
      expect(get().isOpen.value).toBe(false);
    });

    it('toggle() alternates the open state', async () => {
      const { get, setup } = makeHandle();

      await mount(() => {
        setup();

        return html`<div></div>`;
      }, {});

      get().toggle();
      expect(get().isOpen.value).toBe(true);

      get().toggle();
      expect(get().isOpen.value).toBe(false);
    });

    it('open() is a no-op when disabled', async () => {
      const { get, setup } = makeHandle({ isDisabled: () => true });

      await mount(() => {
        setup();

        return html`<div></div>`;
      }, {});

      get().open();
      expect(get().isOpen.value).toBe(false);
    });

    it('toggle() is a no-op when disabled', async () => {
      const { get, setup } = makeHandle({ isDisabled: () => true });

      await mount(() => {
        setup();

        return html`<div></div>`;
      }, {});

      get().toggle();
      expect(get().isOpen.value).toBe(false);
    });

    it('invokes onOpen callback', async () => {
      const onOpen = vi.fn();
      const { get, setup } = makeHandle({ onOpen });

      await mount(() => {
        setup();

        return html`<div></div>`;
      }, {});

      get().open('click');
      expect(onOpen).toHaveBeenCalledWith('click');
    });

    it('invokes onClose callback', async () => {
      const onClose = vi.fn();
      const { get, setup } = makeHandle({ onClose });

      await mount(() => {
        setup();

        return html`<div></div>`;
      }, {});

      get().open();
      get().close('escape');
      expect(onClose).toHaveBeenCalledWith('escape');
    });
  });

  describe('keyboard navigation', () => {
    it('Home key moves to first item (focusedIndex 0)', async () => {
      const { get, setup } = makeHandle();

      await mount(() => {
        setup();

        return html`<div></div>`;
      }, {});

      get().open();
      get().handleKeydown(new KeyboardEvent('keydown', { key: 'Home' }));
      expect(get().focusedIndex.value).toBe(0);
    });

    it('End key moves to last item', async () => {
      const { get, setup } = makeHandle();

      await mount(() => {
        setup();

        return html`<div></div>`;
      }, {});

      get().open();
      get().handleKeydown(new KeyboardEvent('keydown', { key: 'End' }));
      expect(get().focusedIndex.value).toBe(ITEMS.length - 1);
    });

    it('ArrowDown advances focusedIndex', async () => {
      const { get, setup } = makeHandle();

      await mount(() => {
        setup();

        return html`<div></div>`;
      }, {});

      get().open();
      get().set(0);
      get().handleKeydown(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
      expect(get().focusedIndex.value).toBe(1);
    });

    it('ArrowUp decrements focusedIndex', async () => {
      const { get, setup } = makeHandle();

      await mount(() => {
        setup();

        return html`<div></div>`;
      }, {});

      get().open();
      get().set(ITEMS.length - 1);
      get().handleKeydown(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
      expect(get().focusedIndex.value).toBe(ITEMS.length - 2);
    });

    it('set(-1) resets focusedIndex to -1', async () => {
      const { get, setup } = makeHandle();

      await mount(() => {
        setup();

        return html`<div></div>`;
      }, {});

      get().open();
      get().set(0);
      get().set(-1);
      expect(get().focusedIndex.value).toBe(-1);
    });

    it('set() directly assigns focusedIndex', async () => {
      const { get, setup } = makeHandle();

      await mount(() => {
        setup();

        return html`<div></div>`;
      }, {});

      get().open();
      get().set(2);
      expect(get().focusedIndex.value).toBe(2);
    });

    it('getActiveItem() returns the item at focusedIndex', async () => {
      const { get, setup } = makeHandle();

      await mount(() => {
        setup();

        return html`<div></div>`;
      }, {});

      get().open();
      get().set(1);
      expect(get().getActiveItem()).toEqual(ITEMS[1]);
    });

    it('handleKeydown() handles ArrowDown', async () => {
      const { get, setup } = makeHandle();

      await mount(() => {
        setup();

        return html`<div></div>`;
      }, {});

      get().open();
      get().set(0);

      const event = new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowDown' });
      const handled = get().handleKeydown(event);

      expect(handled).toBe(true);
      expect(get().focusedIndex.value).toBe(1);
    });
  });

  describe('toggle close reason', () => {
    it('toggle uses click open and trigger close by default', async () => {
      const onOpen = vi.fn();
      const onClose = vi.fn();
      const { get, setup } = makeHandle({ onClose, onOpen });

      await mount(() => {
        setup();

        return html`<div></div>`;
      }, {});

      get().toggle();
      expect(onOpen).toHaveBeenCalledWith('click');

      get().toggle();
      expect(onClose).toHaveBeenCalledWith('trigger');
    });

    it('toggle forwards explicit open and close reasons', async () => {
      const onOpen = vi.fn();
      const onClose = vi.fn();
      const { get, setup } = makeHandle({ onClose, onOpen });

      await mount(() => {
        setup();

        return html`<div></div>`;
      }, {});

      get().toggle('keyboard', 'escape');
      expect(onOpen).toHaveBeenCalledWith('keyboard');

      get().toggle('keyboard', 'escape');
      expect(onClose).toHaveBeenCalledWith('escape');
    });
  });

  describe('Escape key handling', () => {
    it('handleKeydown intercepts Escape and closes with reason "escape"', async () => {
      const onClose = vi.fn();
      const { get, setup } = makeHandle({ onClose });

      await mount(() => {
        setup();

        return html`<div></div>`;
      }, {});

      get().open();
      expect(get().isOpen.value).toBe(true);

      const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Escape' });
      const handled = get().handleKeydown(event);

      expect(handled).toBe(true);
      expect(event.defaultPrevented).toBe(true);
      expect(get().isOpen.value).toBe(false);
      expect(onClose).toHaveBeenCalledWith('escape');
    });

    it('handleKeydown ignores Escape when closed', async () => {
      const onClose = vi.fn();
      const { get, setup } = makeHandle({ onClose });

      await mount(() => {
        setup();

        return html`<div></div>`;
      }, {});

      // Closed: handleKeydown should return false for Escape.
      const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Escape' });
      const handled = get().handleKeydown(event);

      expect(handled).toBe(false);
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('focusedIndex reset on close', () => {
    it('resets focusedIndex to -1 when the list closes', async () => {
      const { get, setup } = makeHandle();

      await mount(() => {
        setup();

        return html`<div></div>`;
      }, {});

      get().open();
      get().set(1);
      expect(get().focusedIndex.value).toBe(1);

      get().close();
      expect(get().focusedIndex.value).toBe(-1);
    });

    it('focusedIndex starts at -1 on reopen after close', async () => {
      const { get, setup } = makeHandle();

      await mount(() => {
        setup();

        return html`<div></div>`;
      }, {});

      get().open();
      get().set(2);
      get().close();

      get().open();
      expect(get().focusedIndex.value).toBe(-1);
    });
  });

  describe('ARIA signals', () => {
    it('ariaExpanded reflects open/closed state as a string signal', async () => {
      const { get, setup } = makeHandle();

      await mount(() => {
        setup();

        return html`<div></div>`;
      }, {});

      const handle = get();

      expect(handle.ariaExpanded.value).toBe('false');

      handle.open();
      expect(handle.ariaExpanded.value).toBe('true');

      handle.close();
      expect(handle.ariaExpanded.value).toBe('false');
    });

    it('ariaActiveDescendant is null when no item is focused', async () => {
      const { get, setup } = makeHandle({
        getOptionId: (index) => `opt-${index}`,
      });

      await mount(() => {
        setup();

        return html`<div></div>`;
      }, {});

      const handle = get();

      handle.open();
      expect(handle.ariaActiveDescendant.value).toBeNull();
    });

    it('ariaActiveDescendant reflects the focused option id when open', async () => {
      const { get, setup } = makeHandle({
        getOptionId: (index) => `opt-${index}`,
      });

      await mount(() => {
        setup();

        return html`<div></div>`;
      }, {});

      const handle = get();

      handle.open();
      handle.set(1);
      expect(handle.ariaActiveDescendant.value).toBe('opt-1');

      handle.set(-1);
      expect(handle.ariaActiveDescendant.value).toBeNull();

      handle.close();
      expect(handle.ariaActiveDescendant.value).toBeNull();
    });

    it('ariaActiveDescendant is null when getOptionId is not provided', async () => {
      const { get, setup } = makeHandle();

      await mount(() => {
        setup();

        return html`<div></div>`;
      }, {});

      const handle = get();

      handle.open();
      handle.set(0);
      expect(handle.ariaActiveDescendant.value).toBeNull();
    });
  });

  describe('signal lifecycle teardown', () => {
    it('AbortSignal abort() closes the list and disposes effects', async () => {
      const controller = new AbortController();
      let handle!: ReturnType<typeof createOptionList<Item>>;

      await mount(() => {
        const boundary = document.createElement('div');
        const panel = document.createElement('ul');
        const reference = document.createElement('button');

        document.body.appendChild(boundary);
        document.body.appendChild(panel);
        document.body.appendChild(reference);

        handle = createOptionList<Item>({
          getBoundary: () => boundary,
          getItems: () => ITEMS,
          getPanel: () => panel,
          getReference: () => reference,
          signal: controller.signal,
        });

        return html`<div></div>`;
      }, {});

      handle.open();
      expect(handle.isOpen.value).toBe(true);

      controller.abort();

      // After abort the list should be closed
      expect(handle.isOpen.value).toBe(false);
    });
  });
});

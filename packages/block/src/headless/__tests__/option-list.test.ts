import { describe, expect, it, vi } from 'vitest';

import { type OptionListOptions, createOptionList } from '../option-list';

import { html } from '@vielzeug/craft';
import { mount } from '@vielzeug/craft/testing';

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
    it('first() sets focusedIndex to 0', async () => {
      const { get, setup } = makeHandle();

      await mount(() => {
        setup();

        return html`<div></div>`;
      }, {});

      get().open();
      get().first();
      expect(get().focusedIndex.value).toBe(0);
    });

    it('last() sets focusedIndex to items.length - 1', async () => {
      const { get, setup } = makeHandle();

      await mount(() => {
        setup();

        return html`<div></div>`;
      }, {});

      get().open();
      get().last();
      expect(get().focusedIndex.value).toBe(ITEMS.length - 1);
    });

    it('next() advances focusedIndex', async () => {
      const { get, setup } = makeHandle();

      await mount(() => {
        setup();

        return html`<div></div>`;
      }, {});

      get().open();
      get().first();
      get().next();
      expect(get().focusedIndex.value).toBe(1);
    });

    it('prev() decrements focusedIndex', async () => {
      const { get, setup } = makeHandle();

      await mount(() => {
        setup();

        return html`<div></div>`;
      }, {});

      get().open();
      get().last();
      get().prev();
      expect(get().focusedIndex.value).toBe(ITEMS.length - 2);
    });

    it('reset() sets focusedIndex back to -1', async () => {
      const { get, setup } = makeHandle();

      await mount(() => {
        setup();

        return html`<div></div>`;
      }, {});

      get().open();
      get().first();
      get().reset();
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
      get().first();

      const event = new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowDown' });
      const handled = get().handleKeydown(event);

      expect(handled).toBe(true);
      expect(get().focusedIndex.value).toBe(1);
    });
  });

  describe('cleanup', () => {
    it('cleanup() does not throw', async () => {
      const { get, setup } = makeHandle();

      await mount(() => {
        setup();

        return html`<div></div>`;
      }, {});

      expect(() => get().cleanup()).not.toThrow();
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

  describe('ARIA management', () => {
    it('sets aria-expanded on trigger element when getTrigger is provided', async () => {
      let trigger!: HTMLElement;
      let handle!: ReturnType<typeof createOptionList<Item>>;

      await mount(() => {
        trigger = document.createElement('button');
        document.body.appendChild(trigger);

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
          getTrigger: () => trigger,
        });

        return html`<div></div>`;
      }, {});

      // Trigger fires only when isOpen changes (initial null state before first event).
      handle.open();
      expect(trigger.getAttribute('aria-expanded')).toBe('true');

      handle.close();
      expect(trigger.getAttribute('aria-expanded')).toBe('false');

      trigger.remove();
    });

    it('does not set aria-expanded when manageAriaExpanded is false', async () => {
      let trigger!: HTMLElement;
      let handle!: ReturnType<typeof createOptionList<Item>>;

      await mount(() => {
        trigger = document.createElement('button');
        document.body.appendChild(trigger);

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
          getTrigger: () => trigger,
          manageAriaExpanded: false,
        });

        return html`<div></div>`;
      }, {});

      handle.open();
      expect(trigger.hasAttribute('aria-expanded')).toBe(false);

      trigger.remove();
    });

    it('sets aria-activedescendant when getOptionId is provided and item is focused', async () => {
      let trigger!: HTMLElement;
      let handle!: ReturnType<typeof createOptionList<Item>>;

      await mount(() => {
        trigger = document.createElement('button');
        document.body.appendChild(trigger);

        const boundary = document.createElement('div');
        const panel = document.createElement('ul');
        const reference = document.createElement('button');

        document.body.appendChild(boundary);
        document.body.appendChild(panel);
        document.body.appendChild(reference);

        handle = createOptionList<Item>({
          getBoundary: () => boundary,
          getItems: () => ITEMS,
          getOptionId: (index) => `opt-${index}`,
          getPanel: () => panel,
          getReference: () => reference,
          getTrigger: () => trigger,
          manageAriaExpanded: false,
        });

        return html`<div></div>`;
      }, {});

      handle.open();
      handle.set(1);
      expect(trigger.getAttribute('aria-activedescendant')).toBe('opt-1');

      handle.reset();
      expect(trigger.hasAttribute('aria-activedescendant')).toBe(false);

      handle.close();
      expect(trigger.hasAttribute('aria-activedescendant')).toBe(false);

      trigger.remove();
    });
  });
});

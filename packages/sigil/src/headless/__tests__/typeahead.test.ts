import { describe, expect, it, vi } from 'vitest';

import { createTypeahead } from '../typeahead';

type Item = { disabled?: boolean; label: string };

const ITEMS: Item[] = [
  { label: 'Apple' },
  { label: 'Avocado' },
  { label: 'Banana' },
  { label: 'Cherry' },
  { label: 'Apricot' },
];

function key(char: string, mods: Partial<KeyboardEvent> = {}): KeyboardEvent {
  return new KeyboardEvent('keydown', { bubbles: true, key: char, ...mods });
}

function makeTypeahead(overrides: Partial<Parameters<typeof createTypeahead<Item>>[0]> = {}) {
  let _index = -1;
  const onNavigate = vi.fn((i: number) => {
    _index = i;
  });

  const typeahead = createTypeahead<Item>({
    getIndex: () => _index,
    getItemLabel: (item) => item.label,
    getItems: () => ITEMS,
    onNavigate,
    ...overrides,
  });

  return { getIndex: () => _index, onNavigate, typeahead };
}

describe('createTypeahead()', () => {
  describe('basic matching', () => {
    it('matches the first item starting with the pressed key', () => {
      const { onNavigate, typeahead } = makeTypeahead();

      typeahead.handleKeydown(key('b'));

      expect(onNavigate).toHaveBeenCalledWith(2, expect.any(KeyboardEvent));
    });

    it('matches case-insensitively', () => {
      const { onNavigate, typeahead } = makeTypeahead();

      typeahead.handleKeydown(key('B'));

      expect(onNavigate).toHaveBeenCalledWith(2, expect.any(KeyboardEvent));
    });

    it('returns true when a match is found', () => {
      const { typeahead } = makeTypeahead();

      expect(typeahead.handleKeydown(key('a'))).toBe(true);
    });

    it('returns false when no match is found', () => {
      const { typeahead } = makeTypeahead();

      expect(typeahead.handleKeydown(key('z'))).toBe(false);
    });
  });

  describe('buffer accumulation', () => {
    it('accumulates characters for multi-character prefix matching', () => {
      const { onNavigate, typeahead } = makeTypeahead();

      // 'a' → Apple (index 0, starts at -1+1=0)
      typeahead.handleKeydown(key('a'));
      expect(onNavigate).toHaveBeenLastCalledWith(0, expect.any(KeyboardEvent));

      // 'ap' → now searches forward from 0+1=1: Avocado❌, Banana❌, Cherry❌, Apricot✓ (index 4)
      typeahead.handleKeydown(key('p'));
      expect(onNavigate).toHaveBeenLastCalledWith(4, expect.any(KeyboardEvent));
    });

    it('narrows match as more characters are typed', () => {
      const { onNavigate, typeahead } = makeTypeahead();

      // 'apr' → first match is Apricot (index 4)
      typeahead.handleKeydown(key('a'));
      typeahead.handleKeydown(key('p'));
      typeahead.handleKeydown(key('r'));

      expect(onNavigate).toHaveBeenLastCalledWith(4, expect.any(KeyboardEvent));
    });
  });

  describe('forward search from current item', () => {
    it('searches forward from current + 1, wrapping around', () => {
      const { onNavigate, typeahead } = makeTypeahead();

      typeahead.handleKeydown(key('a'));
      expect(onNavigate).toHaveBeenLastCalledWith(0, expect.any(KeyboardEvent));

      typeahead.reset();
      typeahead.handleKeydown(key('a'));
      expect(onNavigate).toHaveBeenLastCalledWith(1, expect.any(KeyboardEvent));

      typeahead.reset();
      typeahead.handleKeydown(key('a'));
      expect(onNavigate).toHaveBeenLastCalledWith(4, expect.any(KeyboardEvent));
    });
  });

  describe('disabled items', () => {
    it('skips disabled items during search', () => {
      const ITEMS_WITH_DISABLED: Item[] = [{ disabled: true, label: 'Banana' }, { label: 'Blueberry' }];
      const { onNavigate, typeahead } = makeTypeahead({
        getItems: () => ITEMS_WITH_DISABLED,
        isItemDisabled: (item) => !!item.disabled,
      });

      typeahead.handleKeydown(key('b'));

      expect(onNavigate).toHaveBeenCalledWith(1, expect.any(KeyboardEvent));
    });

    it('returns false when all matching items are disabled', () => {
      const DISABLED: Item[] = [{ disabled: true, label: 'Banana' }];
      const { typeahead } = makeTypeahead({
        getItems: () => DISABLED,
        isItemDisabled: (item) => !!item.disabled,
      });

      expect(typeahead.handleKeydown(key('b'))).toBe(false);
    });
  });

  describe('modifier keys', () => {
    it('ignores Ctrl+key combos', () => {
      const { onNavigate, typeahead } = makeTypeahead();

      typeahead.handleKeydown(key('a', { ctrlKey: true }));

      expect(onNavigate).not.toHaveBeenCalled();
    });

    it('ignores Alt+key combos', () => {
      const { onNavigate, typeahead } = makeTypeahead();

      typeahead.handleKeydown(key('a', { altKey: true }));

      expect(onNavigate).not.toHaveBeenCalled();
    });

    it('ignores Meta+key combos', () => {
      const { onNavigate, typeahead } = makeTypeahead();

      typeahead.handleKeydown(key('a', { metaKey: true }));

      expect(onNavigate).not.toHaveBeenCalled();
    });

    it('ignores multi-character keys (e.g. ArrowDown)', () => {
      const { onNavigate, typeahead } = makeTypeahead();

      typeahead.handleKeydown(key('ArrowDown'));

      expect(onNavigate).not.toHaveBeenCalled();
    });
  });

  describe('reset()', () => {
    it('clears the buffer so the next key starts fresh', () => {
      const { onNavigate, typeahead } = makeTypeahead();

      // Navigate to Apple (index 0)
      typeahead.handleKeydown(key('a'));
      expect(onNavigate).toHaveBeenLastCalledWith(0, expect.any(KeyboardEvent));

      // Reset buffer; current index is still 0
      typeahead.reset();

      // 'a' again → searches forward from 0+1=1 → Avocado (index 1)
      typeahead.handleKeydown(key('a'));
      expect(onNavigate).toHaveBeenLastCalledWith(1, expect.any(KeyboardEvent));
    });
  });
});

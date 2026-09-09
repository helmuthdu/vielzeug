import { describe, expect, it } from 'vitest';

import { findShortcutConflicts } from '../conflicts';
import { createKeymap } from '../keymap';
import { mockHandler } from './_fixtures';

describe('findShortcutConflicts', () => {
  it('returns an exact duplicate', () => {
    const map = createKeymap([{ handler: mockHandler(), id: 'save', shortcut: 'ctrl+k' }]);

    expect(findShortcutConflicts('ctrl+k', map.listBindings())).toHaveLength(1);
  });

  it('returns a shorter binding that would be shadowed as a chord prefix', () => {
    const map = createKeymap([{ handler: mockHandler(), id: 'top', shortcut: 'g' }]);

    const conflicts = findShortcutConflicts('g g', map.listBindings());

    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]?.shortcut).toHaveLength(1);
  });

  it('returns a longer binding that the proposed shortcut would itself shadow', () => {
    const map = createKeymap([{ handler: mockHandler(), id: 'top', shortcut: 'g g' }]);

    const conflicts = findShortcutConflicts('g', map.listBindings());

    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]?.shortcut).toHaveLength(2);
  });

  it('returns an empty array when there is no relationship', () => {
    const map = createKeymap([{ handler: mockHandler(), id: 'save', shortcut: 'ctrl+s' }]);

    expect(findShortcutConflicts('ctrl+k', map.listBindings())).toEqual([]);
  });

  it('does not report a conflict across different triggers', () => {
    const map = createKeymap([{ handler: mockHandler(), id: 'save', shortcut: 'ctrl+k', trigger: 'keyup' }]);

    expect(findShortcutConflicts('ctrl+k', map.listBindings(), { trigger: 'keydown' })).toEqual([]);
    expect(findShortcutConflicts('ctrl+k', map.listBindings(), { trigger: 'keyup' })).toHaveLength(1);
  });

  it('defaults to comparing against keydown trigger bindings', () => {
    const map = createKeymap([{ handler: mockHandler(), id: 'save', shortcut: 'ctrl+k' }]);

    expect(findShortcutConflicts('ctrl+k', map.listBindings())).toHaveLength(1);
  });

  it('resolves aliases to the same canonical comparison (cmd+k conflicts with meta+k)', () => {
    const map = createKeymap([{ handler: mockHandler(), id: 'save', shortcut: 'meta+k' }]);

    expect(findShortcutConflicts('cmd+k', map.listBindings(), { modKey: 'meta' })).toHaveLength(1);
  });

  it('ignores unrelated bindings when checking a chord for conflicts', () => {
    const map = createKeymap([
      { handler: mockHandler(), id: 'save', shortcut: 'ctrl+s' },
      { handler: mockHandler(), id: 'x', shortcut: 'x' },
    ]);

    expect(findShortcutConflicts('g g', map.listBindings())).toEqual([]);
  });

  it('returns an empty array for an empty/whitespace-only shortcut instead of matching everything', () => {
    const map = createKeymap([
      { handler: mockHandler(), id: 'save', shortcut: 'ctrl+s' },
      { handler: mockHandler(), id: 'x', shortcut: 'x' },
    ]);

    expect(findShortcutConflicts('', map.listBindings())).toEqual([]);
    expect(findShortcutConflicts('   ', map.listBindings())).toEqual([]);
  });

  it('reports conflicts for duplicate shortcuts with different ids', () => {
    const map = createKeymap([
      { handler: mockHandler(), id: 'one', shortcut: 'ctrl+k' },
      { handler: mockHandler(), id: 'two', shortcut: 'ctrl+k' },
    ]);

    expect(findShortcutConflicts('ctrl+k', map.listBindings())).toHaveLength(2);
  });
});

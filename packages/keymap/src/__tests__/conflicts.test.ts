import { describe, expect, it } from 'vitest';

import { findShortcutConflicts } from '../conflicts';
import { createKeymap } from '../keymap';
import { mockHandler } from './_fixtures';

describe('findShortcutConflicts', () => {
  it('returns an exact duplicate', () => {
    const map = createKeymap({ 'ctrl+k': mockHandler() });

    expect(findShortcutConflicts('ctrl+k', map.listBindings())).toHaveLength(1);
  });

  it('returns a shorter binding that would be shadowed as a chord prefix', () => {
    const map = createKeymap({ g: mockHandler() });

    const conflicts = findShortcutConflicts('g g', map.listBindings());

    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]?.shortcut).toHaveLength(1);
  });

  it('returns a longer binding that the proposed shortcut would itself shadow', () => {
    const map = createKeymap({ 'g g': mockHandler() });

    const conflicts = findShortcutConflicts('g', map.listBindings());

    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]?.shortcut).toHaveLength(2);
  });

  it('returns an empty array when there is no relationship', () => {
    const map = createKeymap({ 'ctrl+s': mockHandler() });

    expect(findShortcutConflicts('ctrl+k', map.listBindings())).toEqual([]);
  });

  it('does not report a conflict across different triggers', () => {
    const map = createKeymap({ 'ctrl+k': { handler: mockHandler(), trigger: 'keyup' } });

    expect(findShortcutConflicts('ctrl+k', map.listBindings(), { trigger: 'keydown' })).toEqual([]);
    expect(findShortcutConflicts('ctrl+k', map.listBindings(), { trigger: 'keyup' })).toHaveLength(1);
  });

  it('defaults to comparing against keydown trigger bindings', () => {
    const map = createKeymap({ 'ctrl+k': mockHandler() });

    expect(findShortcutConflicts('ctrl+k', map.listBindings())).toHaveLength(1);
  });

  it('resolves aliases to the same canonical comparison (cmd+k conflicts with meta+k)', () => {
    const map = createKeymap({ 'meta+k': mockHandler() });

    expect(findShortcutConflicts('cmd+k', map.listBindings(), { modKey: 'meta' })).toHaveLength(1);
  });

  it('ignores unrelated bindings when checking a chord for conflicts', () => {
    const map = createKeymap({ 'ctrl+s': mockHandler(), x: mockHandler() });

    expect(findShortcutConflicts('g g', map.listBindings())).toEqual([]);
  });

  it('returns an empty array for an empty/whitespace-only shortcut instead of matching everything', () => {
    const map = createKeymap({ 'ctrl+s': mockHandler(), x: mockHandler() });

    expect(findShortcutConflicts('', map.listBindings())).toEqual([]);
    expect(findShortcutConflicts('   ', map.listBindings())).toEqual([]);
  });
});

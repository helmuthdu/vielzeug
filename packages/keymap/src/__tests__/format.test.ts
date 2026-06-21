import { describe, expect, it, vi } from 'vitest';

import { formatShortcut } from '../format';

describe('formatShortcut', () => {
  describe('Mac style (modKey: meta)', () => {
    it('formats a single key', () => {
      expect(formatShortcut('k', 'meta')).toBe('K');
    });

    it('formats mod+k as ⌘K', () => {
      expect(formatShortcut('mod+k', 'meta')).toBe('⌘K');
    });

    it('formats mod+shift+p as ⇧⌘P (canonical Mac order: ctrl, alt, shift, meta)', () => {
      expect(formatShortcut('mod+shift+p', 'meta')).toBe('⇧⌘P');
    });

    it('formats ctrl+k as ⌃K', () => {
      expect(formatShortcut('ctrl+k', 'meta')).toBe('⌃K');
    });

    it('formats alt+k as ⌥K', () => {
      expect(formatShortcut('alt+k', 'meta')).toBe('⌥K');
    });

    it('formats special keys with symbols', () => {
      expect(formatShortcut('escape', 'meta')).toBe('Esc');
      expect(formatShortcut('space', 'meta')).toBe('Space');
      expect(formatShortcut('up', 'meta')).toBe('↑');
      expect(formatShortcut('down', 'meta')).toBe('↓');
      expect(formatShortcut('left', 'meta')).toBe('←');
      expect(formatShortcut('right', 'meta')).toBe('→');
      expect(formatShortcut('del', 'meta')).toBe('⌦');
      expect(formatShortcut('enter', 'meta')).toBe('↵');
    });

    it('formats chord sequences with space separator', () => {
      expect(formatShortcut('ctrl+k ctrl+s', 'meta')).toBe('⌃K ⌃S');
    });

    it('formats mod+shift+p with consistent modifier order regardless of input order', () => {
      expect(formatShortcut('shift+mod+p', 'meta')).toBe('⇧⌘P');
    });
  });

  describe('non-Mac style (modKey: ctrl)', () => {
    it('formats mod+k as Ctrl+K', () => {
      expect(formatShortcut('mod+k', 'ctrl')).toBe('Ctrl+K');
    });

    it('formats mod+shift+p as Ctrl+Shift+P', () => {
      expect(formatShortcut('mod+shift+p', 'ctrl')).toBe('Ctrl+Shift+P');
    });

    it('formats alt+k as Alt+K', () => {
      expect(formatShortcut('alt+k', 'ctrl')).toBe('Alt+K');
    });

    it('formats meta+k as Win+K', () => {
      expect(formatShortcut('meta+k', 'ctrl')).toBe('Win+K');
    });

    it('formats special keys with labels', () => {
      expect(formatShortcut('escape', 'ctrl')).toBe('Esc');
      expect(formatShortcut('space', 'ctrl')).toBe('Space');
      expect(formatShortcut('up', 'ctrl')).toBe('↑');
    });

    it('formats chord sequences with space separator', () => {
      expect(formatShortcut('ctrl+k ctrl+s', 'ctrl')).toBe('Ctrl+K Ctrl+S');
    });
  });

  describe('invalid / empty inputs', () => {
    it('returns empty string and warns for empty shortcut', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      expect(formatShortcut('', 'meta')).toBe('');
      expect(warnSpy).toHaveBeenCalledOnce();

      warnSpy.mockRestore();
    });

    it('returns empty string and warns for whitespace-only shortcut', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      expect(formatShortcut('   ', 'meta')).toBe('');
      expect(warnSpy).toHaveBeenCalledOnce();

      warnSpy.mockRestore();
    });

    it('returns empty string and warns for modifier-only step (no key)', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      expect(formatShortcut('ctrl+', 'meta')).toBe('');
      expect(warnSpy).toHaveBeenCalledOnce();

      warnSpy.mockRestore();
    });
  });
});

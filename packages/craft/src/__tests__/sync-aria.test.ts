import { signal } from '@vielzeug/ripple';

import { syncAria } from '../aria';
import { html } from '../index';
import { mount } from '../testing';

describe('syncAria()', () => {
  describe('static values', () => {
    it('sets a static role attribute', () => {
      const el = document.createElement('div');

      syncAria(el, { role: 'button' }, { autoCleanup: false });

      expect(el.getAttribute('role')).toBe('button');
    });

    it('sets aria-* attribute from shorthand key', () => {
      const el = document.createElement('button');

      syncAria(el, { label: 'Close dialog' }, { autoCleanup: false });

      expect(el.getAttribute('aria-label')).toBe('Close dialog');
    });

    it('normalises camelCase aria key to aria-kebab-case', () => {
      const el = document.createElement('div');

      syncAria(el, { ariaExpanded: 'true' }, { autoCleanup: false });

      expect(el.getAttribute('aria-expanded')).toBe('true');
    });

    it('removes attribute when value is null', () => {
      const el = document.createElement('div');

      el.setAttribute('aria-hidden', 'true');
      syncAria(el, { hidden: null }, { autoCleanup: false });

      expect(el.hasAttribute('aria-hidden')).toBe(false);
    });

    it('removes attribute when value is false', () => {
      const el = document.createElement('div');

      el.setAttribute('aria-disabled', 'true');
      syncAria(el, { disabled: false }, { autoCleanup: false });

      expect(el.hasAttribute('aria-disabled')).toBe(false);
    });
  });

  describe('getter function values', () => {
    it('sets attribute reactively via getter', async () => {
      const expanded = signal(false);
      const el = document.createElement('div');
      const cleanup = syncAria(el, { expanded: () => expanded.value }, { autoCleanup: false });

      expect(el.getAttribute('aria-expanded')).toBe(null);

      expanded.value = true;
      await Promise.resolve();

      expect(el.getAttribute('aria-expanded')).toBe('true');

      cleanup();
    });
  });

  describe('ReadonlySignal values', () => {
    it('sets attribute reactively via signal', async () => {
      const hidden = signal(false);
      const el = document.createElement('div');
      const cleanup = syncAria(el, { hidden }, { autoCleanup: false });

      expect(el.hasAttribute('aria-hidden')).toBe(false);

      hidden.value = true;
      await Promise.resolve();

      expect(el.getAttribute('aria-hidden')).toBe('true');

      cleanup();
    });

    it('removes attribute when signal value becomes null', async () => {
      const label = signal<string | null>('Close');
      const el = document.createElement('button');
      const cleanup = syncAria(el, { label }, { autoCleanup: false });

      expect(el.getAttribute('aria-label')).toBe('Close');

      label.value = null;
      await Promise.resolve();

      expect(el.hasAttribute('aria-label')).toBe(false);

      cleanup();
    });
  });

  describe('autoCleanup', () => {
    it('returned cleanup function stops reactive updates', async () => {
      const expanded = signal(false);
      const el = document.createElement('div');
      const cleanup = syncAria(el, { expanded: () => expanded.value }, { autoCleanup: false });

      expanded.value = true;
      await Promise.resolve();
      expect(el.getAttribute('aria-expanded')).toBe('true');

      cleanup();

      expanded.value = false;
      await Promise.resolve();

      expect(el.getAttribute('aria-expanded')).toBe('true');
    });

    it('registers autoCleanup inside component setup context', async () => {
      const expanded = signal(false);
      let capturedBtn!: HTMLButtonElement;

      const { act, destroy } = await mount(() => {
        capturedBtn = document.createElement('button');
        syncAria(capturedBtn, { expanded: () => expanded.value });

        return html`<div></div>`;
      });

      await act(() => {
        expanded.value = true;
      });

      expect(capturedBtn.getAttribute('aria-expanded')).toBe('true');

      destroy();
    });
  });
});

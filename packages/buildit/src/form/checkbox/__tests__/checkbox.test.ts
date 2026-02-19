import { createFixture } from '@vielzeug/craftit/testing';
import { beforeAll, describe, expect, it } from 'vitest';

describe('bit-checkbox', () => {
  beforeAll(async () => {
    await import('../checkbox');
  });

  describe('Rendering', () => {
    it('should render with shadow DOM structure', async () => {
      const fixture = await createFixture('bit-checkbox');
      const input = fixture.query('input[type="checkbox"]');
      const box = fixture.query('.box');
      expect(input).toBeTruthy();
      expect(box).toBeTruthy();
      fixture.destroy();
    });

    it('should render label content', async () => {
      const fixture = await createFixture('bit-checkbox');
      fixture.element.textContent = 'Accept terms';
      const slot = fixture.query('slot');
      expect(slot).toBeTruthy();
      fixture.destroy();
    });
  });

  describe('States', () => {
    it('should reflect checked attribute', async () => {
      const fixture = await createFixture('bit-checkbox', { checked: true });
      const input = fixture.query<HTMLInputElement>('input');
      expect(input?.checked).toBe(true);
      expect(fixture.element.hasAttribute('checked')).toBe(true);
      fixture.destroy();
    });

    it('should reflect disabled attribute', async () => {
      const fixture = await createFixture('bit-checkbox', { disabled: true });
      const input = fixture.query<HTMLInputElement>('input');
      expect(input?.disabled).toBe(true);
      expect(fixture.element.hasAttribute('disabled')).toBe(true);
      fixture.destroy();
    });

    it('should reflect indeterminate attribute', async () => {
      const fixture = await createFixture('bit-checkbox', { indeterminate: true });
      const input = fixture.query<HTMLInputElement>('input');
      expect(input?.indeterminate).toBe(true);
      expect(fixture.element.getAttribute('aria-checked')).toBe('mixed');
      fixture.destroy();
    });
  });

  describe('Events', () => {
    it('should emit change event when clicked', async () => {
      const fixture = await createFixture('bit-checkbox');
      let changed = false;
      let checkedValue = false;

      fixture.element.addEventListener('change', (e: any) => {
        changed = true;
        checkedValue = e.detail.checked;
      });

      fixture.element.click();

      expect(changed).toBe(true);
      expect(checkedValue).toBe(true);
      expect(fixture.element.hasAttribute('checked')).toBe(true);
      fixture.destroy();
    });

    it('should not emit change event when disabled', async () => {
      const fixture = await createFixture('bit-checkbox', { disabled: true });
      let changed = false;

      fixture.element.addEventListener('change', () => {
        changed = true;
      });

      fixture.element.click();

      expect(changed).toBe(false);
      expect(fixture.element.hasAttribute('checked')).toBe(false);
      fixture.destroy();
    });
  });
});

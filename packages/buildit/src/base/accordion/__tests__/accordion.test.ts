import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { type ComponentFixture, createFixture } from '../../../utils/trial';

describe('bit-accordion', () => {
  let fixture: ComponentFixture<HTMLElement>;

  beforeAll(async () => {
    await import('../accordion');
    await import('../../accordion-item/accordion-item');
  });

  afterEach(() => {
    fixture?.destroy();
  });

  describe('Rendering', () => {
    it('should render with slot', async () => {
      fixture = await createFixture('bit-accordion');

      const slot = fixture.query('slot');
      expect(slot).toBeTruthy();
    });

    it('should render multiple accordion items', async () => {
      fixture = await createFixture('bit-accordion');
      fixture.element.innerHTML = `
        <bit-accordion-item>Item 1</bit-accordion-item>
        <bit-accordion-item>Item 2</bit-accordion-item>
        <bit-accordion-item>Item 3</bit-accordion-item>
      `;

      const items = fixture.element.querySelectorAll('bit-accordion-item');
      expect(items.length).toBe(3);
    });
  });

  describe('Selection Mode', () => {
    it('should default to multiple mode', async () => {
      fixture = await createFixture('bit-accordion');

      expect(fixture.element.getAttribute('selection-mode')).toBeNull();
    });

    it('should allow multiple items expanded in multiple mode', async () => {
      fixture = await createFixture('bit-accordion');
      fixture.element.innerHTML = `
        <bit-accordion-item id="item1" expanded>Item 1</bit-accordion-item>
        <bit-accordion-item id="item2" expanded>Item 2</bit-accordion-item>
      `;

      await fixture.update();

      const items = fixture.element.querySelectorAll('bit-accordion-item');
      expect(items[0].hasAttribute('expanded')).toBe(true);
      expect(items[1].hasAttribute('expanded')).toBe(true);
    });

    it('should collapse other items in single mode', async () => {
      fixture = await createFixture('bit-accordion', { 'selection-mode': 'single' });

      const item1 = document.createElement('bit-accordion-item');
      item1.id = 'item1';
      const item2 = document.createElement('bit-accordion-item');
      item2.id = 'item2';

      fixture.element.appendChild(item1);
      fixture.element.appendChild(item2);
      await fixture.update();

      item1.setAttribute('expanded', '');
      item1.dispatchEvent(new CustomEvent('expand', { bubbles: true, composed: true }));

      expect(item1.hasAttribute('expanded')).toBe(true);
      expect(item2.hasAttribute('expanded')).toBe(false);

      item2.setAttribute('expanded', '');
      item2.dispatchEvent(new CustomEvent('expand', { bubbles: true, composed: true }));

      expect(item1.hasAttribute('expanded')).toBe(false);
      expect(item2.hasAttribute('expanded')).toBe(true);
    });

    it('should emit change event in single mode', async () => {
      fixture = await createFixture('bit-accordion', { 'selection-mode': 'single' });

      const item1 = document.createElement('bit-accordion-item');
      fixture.element.appendChild(item1);
      await fixture.update();

      const changeSpy = vi.fn();
      fixture.element.addEventListener('change', changeSpy);

      item1.setAttribute('expanded', '');
      item1.dispatchEvent(new CustomEvent('expand', { bubbles: true, composed: true }));

      expect(changeSpy).toHaveBeenCalledOnce();
      expect(changeSpy.mock.calls[0][0].detail.expandedItem).toBe(item1);
    });

    it('should not emit change event in multiple mode', async () => {
      fixture = await createFixture('bit-accordion');

      const item1 = document.createElement('bit-accordion-item');
      fixture.element.appendChild(item1);
      await fixture.update();

      const changeSpy = vi.fn();
      fixture.element.addEventListener('change', changeSpy);

      item1.setAttribute('expanded', '');
      item1.dispatchEvent(new CustomEvent('expand', { bubbles: true, composed: true }));

      expect(changeSpy).not.toHaveBeenCalled();
    });
  });

  describe('Size Propagation', () => {
    it('should propagate size to all items on init', async () => {
      fixture = await createFixture('bit-accordion', { size: 'sm' });
      fixture.element.innerHTML = `
        <bit-accordion-item>Item 1</bit-accordion-item>
        <bit-accordion-item>Item 2</bit-accordion-item>
      `;

      await fixture.update();

      const items = fixture.element.querySelectorAll('bit-accordion-item');
      items.forEach((item) => {
        expect(item.getAttribute('size')).toBe('sm');
      });
    });

    it('should update item sizes when accordion size changes', async () => {
      fixture = await createFixture('bit-accordion', { size: 'sm' });
      fixture.element.innerHTML = `
        <bit-accordion-item>Item 1</bit-accordion-item>
        <bit-accordion-item>Item 2</bit-accordion-item>
      `;

      await fixture.update();
      await fixture.setAttribute('size', 'lg');

      const items = fixture.element.querySelectorAll('bit-accordion-item');
      items.forEach((item) => {
        expect(item.getAttribute('size')).toBe('lg');
      });
    });

    it('should apply size to dynamically added items', async () => {
      fixture = await createFixture('bit-accordion', { size: 'lg' });

      const item = document.createElement('bit-accordion-item');
      fixture.element.appendChild(item);

      const slot = fixture.query('slot');
      slot?.dispatchEvent(new Event('slotchange'));

      await fixture.update();

      expect(item.getAttribute('size')).toBe('lg');
    });
  });

  describe('Variant Propagation', () => {
    it('should propagate variant to all items on init', async () => {
      fixture = await createFixture('bit-accordion', { variant: 'ghost' });

      const item1 = document.createElement('bit-accordion-item');
      fixture.element.appendChild(item1);

      await fixture.update();

      expect(item1.getAttribute('variant')).toBe('ghost');
    });

    it('should update item variants when accordion variant changes', async () => {
      fixture = await createFixture('bit-accordion', { variant: 'solid' });

      const item1 = document.createElement('bit-accordion-item');
      fixture.element.appendChild(item1);

      await fixture.update();
      expect(item1.getAttribute('variant')).toBe('solid');

      await fixture.setAttribute('variant', 'bordered');
      expect(item1.getAttribute('variant')).toBe('bordered');
    });

    it('should support all variant types', async () => {
      const variants = ['solid', 'flat', 'bordered', 'outline', 'ghost', 'text', 'glass', 'frost'];

      for (const variant of variants) {
        fixture = await createFixture('bit-accordion', { variant });

        const item = document.createElement('bit-accordion-item');
        fixture.element.appendChild(item);
        await fixture.update();

        expect(item.getAttribute('variant')).toBe(variant);
        fixture.destroy();
      }
    });
  });

  describe('Combined Attributes', () => {
    it('should propagate both size and variant', async () => {
      fixture = await createFixture('bit-accordion', { size: 'lg', variant: 'ghost' });

      const item = document.createElement('bit-accordion-item');
      fixture.element.appendChild(item);
      await fixture.update();

      expect(item.getAttribute('size')).toBe('lg');
      expect(item.getAttribute('variant')).toBe('ghost');
    });

    it('should handle multiple attributes with selection mode', async () => {
      fixture = await createFixture('bit-accordion', {
        'selection-mode': 'single',
        size: 'sm',
        variant: 'bordered',
      });

      const item1 = document.createElement('bit-accordion-item');
      const item2 = document.createElement('bit-accordion-item');
      fixture.element.appendChild(item1);
      fixture.element.appendChild(item2);
      await fixture.update();

      expect(item1.getAttribute('size')).toBe('sm');
      expect(item1.getAttribute('variant')).toBe('bordered');
      expect(fixture.element.getAttribute('selection-mode')).toBe('single');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty accordion', async () => {
      fixture = await createFixture('bit-accordion');

      const slot = fixture.query('slot');
      expect(slot).toBeTruthy();
    });

    it('should handle single item', async () => {
      fixture = await createFixture('bit-accordion', { 'selection-mode': 'single' });

      const item = document.createElement('bit-accordion-item');
      fixture.element.appendChild(item);
      await fixture.update();

      item.setAttribute('expanded', '');
      item.dispatchEvent(new CustomEvent('expand', { bubbles: true, composed: true }));

      expect(item.hasAttribute('expanded')).toBe(true);
    });

    it('should handle items without attributes', async () => {
      fixture = await createFixture('bit-accordion');
      fixture.element.innerHTML = `
        <bit-accordion-item>Item without attributes</bit-accordion-item>
      `;

      await fixture.update();

      const item = fixture.element.querySelector('bit-accordion-item');
      expect(item).toBeTruthy();
    });

    it('should not affect non-accordion-item children', async () => {
      fixture = await createFixture('bit-accordion', { size: 'lg' });

      const div = document.createElement('div');
      div.textContent = 'Regular div';
      fixture.element.appendChild(div);

      await fixture.update();

      expect(div.hasAttribute('size')).toBe(false);
    });
  });
});

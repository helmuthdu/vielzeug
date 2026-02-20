import { createFixture, type ComponentFixture } from '@vielzeug/craftit/testing';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

describe('bit-accordion', () => {
  let fixture: ComponentFixture<HTMLElement>;

  beforeAll(async () => {
    await import('../accordion');
    await import('../../accordion-item/accordion-item');
  });

  afterEach(() => {
    fixture?.destroy();
  });

  describe('Attributes', () => {
    it('should sync size to accordion items', async () => {
      fixture = await createFixture('bit-accordion', { size: 'sm' });
      fixture.element.innerHTML = `
        <bit-accordion-item>Item 1</bit-accordion-item>
        <bit-accordion-item>Item 2</bit-accordion-item>
      `;

      await fixture.update();

      const items = fixture.element.querySelectorAll('bit-accordion-item');
      expect(items[0].getAttribute('size')).toBe('sm');
      expect(items[1].getAttribute('size')).toBe('sm');
    });

    it('should update size dynamically', async () => {
      fixture = await createFixture('bit-accordion', { size: 'sm' });
      fixture.element.innerHTML = `
        <bit-accordion-item>Item 1</bit-accordion-item>
        <bit-accordion-item>Item 2</bit-accordion-item>
      `;

      await fixture.update();

      await fixture.setAttribute('size', 'lg');

      const itemsAfter = fixture.element.querySelectorAll('bit-accordion-item');
      expect(itemsAfter[0].getAttribute('size')).toBe('lg');
      expect(itemsAfter[1].getAttribute('size')).toBe('lg');
    });

    it('should sync variant to accordion items', async () => {
      fixture = await createFixture('bit-accordion', { variant: 'ghost' });

      const item1 = document.createElement('bit-accordion-item');
      fixture.element.appendChild(item1);

      await fixture.update();

      expect(item1.getAttribute('variant')).toBe('ghost');
    });

    it('should update variant dynamically', async () => {
      fixture = await createFixture('bit-accordion', { variant: 'solid' });

      const item1 = document.createElement('bit-accordion-item');
      fixture.element.appendChild(item1);

      await fixture.update();
      expect(item1.getAttribute('variant')).toBe('solid');

      await fixture.setAttribute('variant', 'bordered');
      expect(item1.getAttribute('variant')).toBe('bordered');
    });
  });

  describe('Coordination', () => {
    it('should allow multiple items to be expanded in multiple mode', async () => {
      fixture = await createFixture('bit-accordion');

      const item1 = document.createElement('bit-accordion-item');
      item1.id = 'item1';
      item1.innerText = 'Title 1';
      const item2 = document.createElement('bit-accordion-item');
      item2.id = 'item2';
      item2.innerText = 'Title 2';

      fixture.element.appendChild(item1);
      fixture.element.appendChild(item2);

      await fixture.update();

      item1.setAttribute('expanded', '');
      item2.setAttribute('expanded', '');

      expect(item1.hasAttribute('expanded')).toBe(true);
      expect(item2.hasAttribute('expanded')).toBe(true);
    });

    it('should only allow one item to be expanded in single mode', async () => {
      fixture = await createFixture('bit-accordion', { 'selection-mode': 'single' });

      const item1 = document.createElement('bit-accordion-item');
      item1.id = 'item1';
      const item2 = document.createElement('bit-accordion-item');
      item2.id = 'item2';

      fixture.element.appendChild(item1);
      fixture.element.appendChild(item2);

      await fixture.update();

      // Expand first item
      item1.setAttribute('expanded', '');
      item1.dispatchEvent(new CustomEvent('expand', { bubbles: true, composed: true }));

      // Expand second item
      item2.setAttribute('expanded', '');
      item2.dispatchEvent(new CustomEvent('expand', { bubbles: true, composed: true }));

      expect(item1.hasAttribute('expanded')).toBe(false);
      expect(item2.hasAttribute('expanded')).toBe(true);
    });
  });
});

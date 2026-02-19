import { describe, it, expect, beforeAll } from 'vitest';
import { createFixture } from '@vielzeug/craftit/testing';

describe('bit-radio', () => {
  beforeAll(async () => {
    await import('../radio');
  });

  describe('Rendering', () => {
    it('should render with shadow DOM structure', async () => {
      const fixture = await createFixture('bit-radio');
      const circle = fixture.query('.circle');
      expect(circle).toBeTruthy();
      fixture.destroy();
    });

    it('should render label content', async () => {
      const fixture = await createFixture('bit-radio');
      fixture.element.textContent = 'Option 1';

      // Wait for slot to update
      await new Promise(resolve => setTimeout(resolve, 0));

      const label = fixture.query('.label');
      const slot = label?.querySelector('slot');
      const assignedNodes = slot?.assignedNodes();

      expect(assignedNodes?.length).toBeGreaterThan(0);
      fixture.destroy();
    });
  });

  describe('Colors', () => {
    it('should apply all color variants', async () => {
      const colors = ['primary', 'secondary', 'success', 'warning', 'error'];
      for (const color of colors) {
        const fixture = await createFixture('bit-radio', { color });
        expect(fixture.element.getAttribute('color')).toBe(color);
        fixture.destroy();
      }
    });
  });

  describe('Sizes', () => {
    it('should apply all size variants', async () => {
      const sizes = ['sm', 'md', 'lg'];
      for (const size of sizes) {
        const fixture = await createFixture('bit-radio', { size });
        expect(fixture.element.getAttribute('size')).toBe(size);
        fixture.destroy();
      }
    });
  });

  describe('States', () => {
    it('should be unchecked by default', async () => {
      const fixture = await createFixture('bit-radio');
      expect(fixture.element.hasAttribute('checked')).toBe(false);
      fixture.destroy();
    });

    it('should be checked when attribute is set', async () => {
      const fixture = await createFixture('bit-radio', { checked: true });
      expect(fixture.element.hasAttribute('checked')).toBe(true);
      fixture.destroy();
    });

    it('should be disabled when attribute is set', async () => {
      const fixture = await createFixture('bit-radio', { disabled: true });
      expect(fixture.element.hasAttribute('disabled')).toBe(true);
      fixture.destroy();
    });
  });

  describe('Form Integration', () => {
    it('should have name attribute', async () => {
      const fixture = await createFixture('bit-radio', { name: 'choice', value: 'option1' });
      const input = fixture.query('input');
      expect(input?.getAttribute('name')).toBe('choice');
      expect(input?.getAttribute('value')).toBe('option1');
      fixture.destroy();
    });
  });

  describe('Events', () => {
    it('should emit change event when clicked', async () => {
      const fixture = await createFixture('bit-radio', { name: 'test', value: 'yes' });

      let eventFired = false;
      let eventDetail: any = null;

      fixture.element.addEventListener('change', ((e: CustomEvent) => {
        eventFired = true;
        eventDetail = e.detail;
      }) as EventListener);

      fixture.element.click();

      expect(eventFired).toBe(true);
      expect(eventDetail.checked).toBe(true);
      expect(eventDetail.value).toBe('yes');

      fixture.destroy();
    });

    it('should not emit change event when disabled', async () => {
      const fixture = await createFixture('bit-radio', { disabled: true });

      let eventFired = false;
      fixture.element.addEventListener('change', () => {
        eventFired = true;
      });

      fixture.element.click();
      expect(eventFired).toBe(false);

      fixture.destroy();
    });

    it('should not emit change event when already checked', async () => {
      const fixture = await createFixture('bit-radio', { checked: true });

      let eventCount = 0;
      fixture.element.addEventListener('change', () => {
        eventCount++;
      });

      fixture.element.click();
      expect(eventCount).toBe(0);

      fixture.destroy();
    });
  });

  describe('Radio Group Behavior', () => {
    it('should uncheck other radios in the same group when checked', async () => {
      const fixture1 = await createFixture('bit-radio', { name: 'group1', value: 'option1' });
      const fixture2 = await createFixture('bit-radio', { name: 'group1', value: 'option2' });

      document.body.appendChild(fixture1.element);
      document.body.appendChild(fixture2.element);

      // Check first radio
      fixture1.element.click();
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(fixture1.element.hasAttribute('checked')).toBe(true);
      expect(fixture2.element.hasAttribute('checked')).toBe(false);

      // Check second radio - should uncheck first
      fixture2.element.click();
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(fixture1.element.hasAttribute('checked')).toBe(false);
      expect(fixture2.element.hasAttribute('checked')).toBe(true);

      fixture1.destroy();
      fixture2.destroy();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should check on Space key', async () => {
      const fixture = await createFixture('bit-radio', { name: 'test' });

      const event = new KeyboardEvent('keydown', { key: ' ' });
      fixture.element.dispatchEvent(event);

      expect(fixture.element.hasAttribute('checked')).toBe(true);

      fixture.destroy();
    });

    it('should check on Enter key', async () => {
      const fixture = await createFixture('bit-radio', { name: 'test' });

      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      fixture.element.dispatchEvent(event);

      expect(fixture.element.hasAttribute('checked')).toBe(true);

      fixture.destroy();
    });
  });

  describe('Attribute Updates', () => {
    it('should update checked state when attribute changes', async () => {
      const fixture = await createFixture('bit-radio');

      expect(fixture.element.hasAttribute('checked')).toBe(false);

      fixture.element.setAttribute('checked', '');

      expect(fixture.element.hasAttribute('checked')).toBe(true);

      fixture.destroy();
    });
  });
});






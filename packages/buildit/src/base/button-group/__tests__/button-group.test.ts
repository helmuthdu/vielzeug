import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { type ComponentFixture, createFixture } from '../../../utils/testing';

describe('bit-button-group', () => {
  let fixture: ComponentFixture<HTMLElement>;

  beforeAll(async () => {
    await import('../button-group');
    await import('../../button/button');
  });

  afterEach(() => {
    fixture?.destroy();
  });

  describe('Rendering', () => {
    it('should render with shadow DOM structure', async () => {
      fixture = await createFixture('bit-button-group');

      const group = fixture.query('.button-group');
      const slot = fixture.query('slot');

      expect(group).toBeTruthy();
      expect(slot).toBeTruthy();
      expect(group?.getAttribute('role')).toBe('group');
    });

    it('should render child buttons', async () => {
      fixture = await createFixture('bit-button-group');
      fixture.element.innerHTML = `
        <bit-button>Button 1</bit-button>
        <bit-button>Button 2</bit-button>
        <bit-button>Button 3</bit-button>
      `;

      const buttons = fixture.element.querySelectorAll('bit-button');
      expect(buttons.length).toBe(3);
    });
  });

  describe('Orientation', () => {
    it('should default to horizontal orientation', async () => {
      fixture = await createFixture('bit-button-group');

      expect(fixture.element.hasAttribute('orientation')).toBe(false);
    });

    it('should apply vertical orientation', async () => {
      fixture = await createFixture('bit-button-group', { orientation: 'vertical' });

      expect(fixture.element.getAttribute('orientation')).toBe('vertical');
    });

    it('should update orientation dynamically', async () => {
      fixture = await createFixture('bit-button-group', { orientation: 'horizontal' });

      await fixture.setAttribute('orientation', 'vertical');

      expect(fixture.element.getAttribute('orientation')).toBe('vertical');
    });
  });

  describe('Attached Mode', () => {
    it('should not be attached by default', async () => {
      fixture = await createFixture('bit-button-group');

      expect(fixture.element.hasAttribute('attached')).toBe(false);
    });

    it('should apply attached mode', async () => {
      fixture = await createFixture('bit-button-group', { attached: true });

      expect(fixture.element.hasAttribute('attached')).toBe(true);
    });

    it('should toggle attached mode', async () => {
      fixture = await createFixture('bit-button-group', { attached: true });

      await fixture.setAttribute('attached', false);

      expect(fixture.element.hasAttribute('attached')).toBe(false);
    });
  });

  describe('Full Width', () => {
    it('should not be fullwidth by default', async () => {
      fixture = await createFixture('bit-button-group');

      expect(fixture.element.hasAttribute('fullwidth')).toBe(false);
    });

    it('should apply fullwidth mode', async () => {
      fixture = await createFixture('bit-button-group', { fullwidth: true });

      expect(fixture.element.hasAttribute('fullwidth')).toBe(true);
    });

    it('should toggle fullwidth mode', async () => {
      fixture = await createFixture('bit-button-group', { fullwidth: true });

      await fixture.setAttribute('fullwidth', false);

      expect(fixture.element.hasAttribute('fullwidth')).toBe(false);
    });
  });

  describe('Size Propagation', () => {
    it('should propagate size to child buttons on init', async () => {
      fixture = await createFixture('bit-button-group', { size: 'lg' });
      fixture.element.innerHTML = `
        <bit-button>Button 1</bit-button>
        <bit-button>Button 2</bit-button>
      `;

      await fixture.update();

      const buttons = fixture.element.querySelectorAll('bit-button');
      buttons.forEach((button) => {
        expect(button.getAttribute('size')).toBe('lg');
      });
    });

    it('should update child button sizes when group size changes', async () => {
      fixture = await createFixture('bit-button-group', { size: 'sm' });
      fixture.element.innerHTML = `
        <bit-button>Button 1</bit-button>
        <bit-button>Button 2</bit-button>
      `;

      await fixture.update();
      await fixture.setAttribute('size', 'lg');

      const buttons = fixture.element.querySelectorAll('bit-button');
      buttons.forEach((button) => {
        expect(button.getAttribute('size')).toBe('lg');
      });
    });

    it('should apply size to all size variants', async () => {
      const sizes = ['sm', 'md', 'lg'] as const;

      for (const size of sizes) {
        fixture = await createFixture('bit-button-group', { size });
        fixture.element.innerHTML = '<bit-button>Test</bit-button>';

        await fixture.update();

        const button = fixture.element.querySelector('bit-button');
        expect(button?.getAttribute('size')).toBe(size);

        fixture.destroy();
      }
    });
  });

  describe('Variant Propagation', () => {
    it('should propagate variant to child buttons on init', async () => {
      fixture = await createFixture('bit-button-group', { variant: 'outline' });
      fixture.element.innerHTML = `
        <bit-button>Button 1</bit-button>
        <bit-button>Button 2</bit-button>
      `;

      await fixture.update();

      const buttons = fixture.element.querySelectorAll('bit-button');
      buttons.forEach((button) => {
        expect(button.getAttribute('variant')).toBe('outline');
      });
    });

    it('should update child button variants when group variant changes', async () => {
      fixture = await createFixture('bit-button-group', { variant: 'solid' });
      fixture.element.innerHTML = `
        <bit-button>Button 1</bit-button>
        <bit-button>Button 2</bit-button>
      `;

      await fixture.update();
      await fixture.setAttribute('variant', 'ghost');

      const buttons = fixture.element.querySelectorAll('bit-button');
      buttons.forEach((button) => {
        expect(button.getAttribute('variant')).toBe('ghost');
      });
    });

    it('should support all variant types', async () => {
      const variants = ['solid', 'flat', 'bordered', 'outline', 'ghost', 'text', 'frost'] as const;

      for (const variant of variants) {
        fixture = await createFixture('bit-button-group', { variant });
        fixture.element.innerHTML = '<bit-button>Test</bit-button>';

        await fixture.update();

        const button = fixture.element.querySelector('bit-button');
        expect(button?.getAttribute('variant')).toBe(variant);

        fixture.destroy();
      }
    });
  });

  describe('Color Propagation', () => {
    it('should propagate color to child buttons on init', async () => {
      fixture = await createFixture('bit-button-group', { color: 'secondary' });
      fixture.element.innerHTML = `
        <bit-button>Button 1</bit-button>
        <bit-button>Button 2</bit-button>
      `;

      await fixture.update();

      const buttons = fixture.element.querySelectorAll('bit-button');
      buttons.forEach((button) => {
        expect(button.getAttribute('color')).toBe('secondary');
      });
    });

    it('should update child button colors when group color changes', async () => {
      fixture = await createFixture('bit-button-group', { color: 'primary' });
      fixture.element.innerHTML = `
        <bit-button>Button 1</bit-button>
        <bit-button>Button 2</bit-button>
      `;

      await fixture.update();
      await fixture.setAttribute('color', 'error');

      const buttons = fixture.element.querySelectorAll('bit-button');
      buttons.forEach((button) => {
        expect(button.getAttribute('color')).toBe('error');
      });
    });

    it('should support all color types', async () => {
      const colors = ['primary', 'secondary', 'success', 'warning', 'error'] as const;

      for (const color of colors) {
        fixture = await createFixture('bit-button-group', { color });
        fixture.element.innerHTML = '<bit-button>Test</bit-button>';

        await fixture.update();

        const button = fixture.element.querySelector('bit-button');
        expect(button?.getAttribute('color')).toBe(color);

        fixture.destroy();
      }
    });
  });

  describe('Combined Attributes', () => {
    it('should handle multiple attributes together', async () => {
      fixture = await createFixture('bit-button-group', {
        attached: true,
        fullwidth: true,
        orientation: 'vertical',
      });

      expect(fixture.element.getAttribute('orientation')).toBe('vertical');
      expect(fixture.element.hasAttribute('attached')).toBe(true);
      expect(fixture.element.hasAttribute('fullwidth')).toBe(true);
    });

    it('should propagate all attributes to children', async () => {
      fixture = await createFixture('bit-button-group', {
        color: 'success',
        size: 'lg',
        variant: 'outline',
      });
      fixture.element.innerHTML = `
        <bit-button>Button 1</bit-button>
        <bit-button>Button 2</bit-button>
      `;

      await fixture.update();

      const buttons = fixture.element.querySelectorAll('bit-button');
      buttons.forEach((button) => {
        expect(button.getAttribute('size')).toBe('lg');
        expect(button.getAttribute('variant')).toBe('outline');
        expect(button.getAttribute('color')).toBe('success');
      });
    });

    it('should update multiple attributes simultaneously', async () => {
      fixture = await createFixture('bit-button-group');
      fixture.element.innerHTML = '<bit-button>Test</bit-button>';

      await fixture.update();
      await fixture.setAttributes({
        color: 'error',
        size: 'lg',
        variant: 'outline',
      });

      const button = fixture.element.querySelector('bit-button');
      expect(button?.getAttribute('size')).toBe('lg');
      expect(button?.getAttribute('variant')).toBe('outline');
      expect(button?.getAttribute('color')).toBe('error');
    });
  });

  describe('Dynamic Children', () => {
    it('should apply attributes to dynamically added buttons', async () => {
      fixture = await createFixture('bit-button-group', { color: 'primary', size: 'lg' });
      fixture.element.innerHTML = '<bit-button>Button 1</bit-button>';

      await fixture.update();

      const newButton = document.createElement('bit-button');
      newButton.textContent = 'Button 2';
      fixture.element.appendChild(newButton);

      const slot = fixture.query('slot');
      slot?.dispatchEvent(new Event('slotchange'));
      await fixture.update();

      const buttons = fixture.element.querySelectorAll('bit-button');
      expect(buttons.length).toBe(2);
      buttons.forEach((button) => {
        expect(button.getAttribute('size')).toBe('lg');
        expect(button.getAttribute('color')).toBe('primary');
      });
    });

    it('should handle buttons removed dynamically', async () => {
      fixture = await createFixture('bit-button-group', { size: 'sm' });
      fixture.element.innerHTML = `
        <bit-button>Button 1</bit-button>
        <bit-button>Button 2</bit-button>
      `;

      await fixture.update();

      const firstButton = fixture.element.querySelector('bit-button');
      firstButton?.remove();

      const remainingButtons = fixture.element.querySelectorAll('bit-button');
      expect(remainingButtons.length).toBe(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty button group', async () => {
      fixture = await createFixture('bit-button-group');

      const group = fixture.query('.button-group');
      expect(group).toBeTruthy();
    });

    it('should handle single button', async () => {
      fixture = await createFixture('bit-button-group', { attached: true });
      fixture.element.innerHTML = '<bit-button>Only Button</bit-button>';

      await fixture.update();

      const button = fixture.element.querySelector('bit-button');
      expect(button).toBeTruthy();
    });

    it('should override individual button attributes', async () => {
      fixture = await createFixture('bit-button-group', { color: 'error', size: 'lg' });
      fixture.element.innerHTML = `
        <bit-button size="sm" color="primary">Button 1</bit-button>
        <bit-button>Button 2</bit-button>
      `;

      await fixture.update();

      const buttons = fixture.element.querySelectorAll('bit-button');
      buttons.forEach((button) => {
        expect(button.getAttribute('size')).toBe('lg');
        expect(button.getAttribute('color')).toBe('error');
      });
    });

    it('should not affect non-button children', async () => {
      fixture = await createFixture('bit-button-group', { size: 'lg' });

      const div = document.createElement('div');
      div.textContent = 'Regular div';
      fixture.element.appendChild(div);

      await fixture.update();

      expect(div.hasAttribute('size')).toBe(false);
    });

    it('should handle mixed content', async () => {
      fixture = await createFixture('bit-button-group', { size: 'md' });
      fixture.element.innerHTML = `
        <bit-button>Button 1</bit-button>
        <span>Some text</span>
        <bit-button>Button 2</bit-button>
      `;

      await fixture.update();

      const buttons = fixture.element.querySelectorAll('bit-button');
      expect(buttons.length).toBe(2);
      buttons.forEach((button) => {
        expect(button.getAttribute('size')).toBe('md');
      });
    });
  });

  describe('Accessibility', () => {
    it('should have role="group" on container', async () => {
      fixture = await createFixture('bit-button-group');

      const group = fixture.query('.button-group');
      expect(group?.getAttribute('role')).toBe('group');
    });

    it('should maintain button accessibility in attached mode', async () => {
      fixture = await createFixture('bit-button-group', { attached: true });
      fixture.element.innerHTML = `
        <bit-button>Button 1</bit-button>
        <bit-button>Button 2</bit-button>
      `;

      await fixture.update();

      const buttons = fixture.element.querySelectorAll('bit-button');
      expect(buttons.length).toBe(2);
      buttons.forEach((button) => {
        expect(button.tagName).toBe('BIT-BUTTON');
      });
    });
  });
});

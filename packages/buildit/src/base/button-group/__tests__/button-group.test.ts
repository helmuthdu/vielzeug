import { createFixture } from '@vielzeug/craftit/testing';

describe('bit-button-group', () => {
  beforeAll(async () => {
    await import('../button-group');
    await import('../../button/button');
  });

  describe('Rendering', () => {
    it('should render with shadow DOM structure', async () => {
      const fixture = await createFixture('bit-button-group');
      fixture.element.innerHTML = `
        <bit-button>Button 1</bit-button>
        <bit-button>Button 2</bit-button>
      `;

      const group = fixture.query('.button-group');
      const slot = fixture.query('slot');

      expect(group).toBeTruthy();
      expect(slot).toBeTruthy();
      expect(group?.getAttribute('role')).toBe('group');

      fixture.destroy();
    });

    it('should render child buttons', async () => {
      const fixture = await createFixture('bit-button-group');
      fixture.element.innerHTML = `
        <bit-button>Button 1</bit-button>
        <bit-button>Button 2</bit-button>
        <bit-button>Button 3</bit-button>
      `;

      await new Promise(resolve => setTimeout(resolve, 0));

      const buttons = fixture.element.querySelectorAll('bit-button');
      expect(buttons.length).toBe(3);

      fixture.destroy();
    });
  });

  describe('Orientation', () => {
    it('should default to horizontal orientation', async () => {
      const fixture = await createFixture('bit-button-group');

      expect(fixture.element.hasAttribute('orientation')).toBe(false);

      fixture.destroy();
    });

    it('should apply vertical orientation', async () => {
      const fixture = await createFixture('bit-button-group', { orientation: 'vertical' });

      expect(fixture.element.getAttribute('orientation')).toBe('vertical');

      fixture.destroy();
    });

    it('should update orientation dynamically', async () => {
      const fixture = await createFixture('bit-button-group', { orientation: 'horizontal' });

      await fixture.setAttribute('orientation', 'vertical');

      expect(fixture.element.getAttribute('orientation')).toBe('vertical');

      fixture.destroy();
    });
  });

  describe('Attached Mode', () => {
    it('should not be attached by default', async () => {
      const fixture = await createFixture('bit-button-group');

      expect(fixture.element.hasAttribute('attached')).toBe(false);

      fixture.destroy();
    });

    it('should apply attached mode', async () => {
      const fixture = await createFixture('bit-button-group', { attached: true });

      expect(fixture.element.hasAttribute('attached')).toBe(true);

      fixture.destroy();
    });

    it('should toggle attached mode', async () => {
      const fixture = await createFixture('bit-button-group', { attached: true });

      await fixture.setAttribute('attached', false);

      expect(fixture.element.hasAttribute('attached')).toBe(false);

      fixture.destroy();
    });
  });

  describe('Full Width', () => {
    it('should not be full-width by default', async () => {
      const fixture = await createFixture('bit-button-group');

      expect(fixture.element.hasAttribute('full-width')).toBe(false);

      fixture.destroy();
    });

    it('should apply full-width mode', async () => {
      const fixture = await createFixture('bit-button-group', { 'full-width': true });

      expect(fixture.element.hasAttribute('full-width')).toBe(true);

      fixture.destroy();
    });

    it('should toggle full-width mode', async () => {
      const fixture = await createFixture('bit-button-group', { 'full-width': true });

      await fixture.setAttribute('full-width', false);

      expect(fixture.element.hasAttribute('full-width')).toBe(false);

      fixture.destroy();
    });
  });

  describe('Size Propagation', () => {
    it('should propagate size to child buttons', async () => {
      const fixture = await createFixture('bit-button-group', { size: 'lg' });
      fixture.element.innerHTML = `
        <bit-button>Button 1</bit-button>
        <bit-button>Button 2</bit-button>
      `;

      await new Promise(resolve => setTimeout(resolve, 10));

      const buttons = fixture.element.querySelectorAll('bit-button');
      buttons.forEach(button => {
        expect(button.getAttribute('size')).toBe('lg');
      });

      fixture.destroy();
    });

    it('should update child button sizes when group size changes', async () => {
      const fixture = await createFixture('bit-button-group', { size: 'sm' });
      fixture.element.innerHTML = `
        <bit-button>Button 1</bit-button>
        <bit-button>Button 2</bit-button>
      `;

      await new Promise(resolve => setTimeout(resolve, 10));
      await fixture.setAttribute('size', 'lg');
      await new Promise(resolve => setTimeout(resolve, 10));

      const buttons = fixture.element.querySelectorAll('bit-button');
      buttons.forEach(button => {
        expect(button.getAttribute('size')).toBe('lg');
      });

      fixture.destroy();
    });
  });

  describe('Variant Propagation', () => {
    it('should propagate variant to child buttons', async () => {
      const fixture = await createFixture('bit-button-group', { variant: 'outline' });
      fixture.element.innerHTML = `
        <bit-button>Button 1</bit-button>
        <bit-button>Button 2</bit-button>
      `;

      await new Promise(resolve => setTimeout(resolve, 10));

      const buttons = fixture.element.querySelectorAll('bit-button');
      buttons.forEach(button => {
        expect(button.getAttribute('variant')).toBe('outline');
      });

      fixture.destroy();
    });

    it('should update child button variants when group variant changes', async () => {
      const fixture = await createFixture('bit-button-group', { variant: 'solid' });
      fixture.element.innerHTML = `
        <bit-button>Button 1</bit-button>
        <bit-button>Button 2</bit-button>
      `;

      await new Promise(resolve => setTimeout(resolve, 10));
      await fixture.setAttribute('variant', 'ghost');
      await new Promise(resolve => setTimeout(resolve, 10));

      const buttons = fixture.element.querySelectorAll('bit-button');
      buttons.forEach(button => {
        expect(button.getAttribute('variant')).toBe('ghost');
      });

      fixture.destroy();
    });
  });

  describe('Color Propagation', () => {
    it('should propagate color to child buttons', async () => {
      const fixture = await createFixture('bit-button-group', { color: 'secondary' });
      fixture.element.innerHTML = `
        <bit-button>Button 1</bit-button>
        <bit-button>Button 2</bit-button>
      `;

      await new Promise(resolve => setTimeout(resolve, 10));

      const buttons = fixture.element.querySelectorAll('bit-button');
      buttons.forEach(button => {
        expect(button.getAttribute('color')).toBe('secondary');
      });

      fixture.destroy();
    });

    it('should update child button colors when group color changes', async () => {
      const fixture = await createFixture('bit-button-group', { color: 'primary' });
      fixture.element.innerHTML = `
        <bit-button>Button 1</bit-button>
        <bit-button>Button 2</bit-button>
      `;

      await new Promise(resolve => setTimeout(resolve, 10));
      await fixture.setAttribute('color', 'error');
      await new Promise(resolve => setTimeout(resolve, 10));

      const buttons = fixture.element.querySelectorAll('bit-button');
      buttons.forEach(button => {
        expect(button.getAttribute('color')).toBe('error');
      });

      fixture.destroy();
    });
  });

  describe('Combined Attributes', () => {
    it('should handle multiple attributes together', async () => {
      const fixture = await createFixture('bit-button-group', {
        orientation: 'vertical',
        attached: true,
        'full-width': true,
      });

      expect(fixture.element.getAttribute('orientation')).toBe('vertical');
      expect(fixture.element.hasAttribute('attached')).toBe(true);
      expect(fixture.element.hasAttribute('full-width')).toBe(true);

      fixture.destroy();
    });

    it('should propagate all attributes to children', async () => {
      const fixture = await createFixture('bit-button-group', {
        size: 'lg',
        variant: 'outline',
        color: 'success',
      });
      fixture.element.innerHTML = `
        <bit-button>Button 1</bit-button>
        <bit-button>Button 2</bit-button>
      `;

      await new Promise(resolve => setTimeout(resolve, 10));

      const buttons = fixture.element.querySelectorAll('bit-button');
      buttons.forEach(button => {
        expect(button.getAttribute('size')).toBe('lg');
        expect(button.getAttribute('variant')).toBe('outline');
        expect(button.getAttribute('color')).toBe('success');
      });

      fixture.destroy();
    });
  });

  describe('Dynamic Children', () => {
    it('should apply attributes to dynamically added buttons', async () => {
      const fixture = await createFixture('bit-button-group', { size: 'lg' });
      fixture.element.innerHTML = `<bit-button>Button 1</bit-button>`;

      await new Promise(resolve => setTimeout(resolve, 10));

      // Add another button
      const newButton = document.createElement('bit-button');
      newButton.textContent = 'Button 2';
      fixture.element.appendChild(newButton);

      await new Promise(resolve => setTimeout(resolve, 10));

      const buttons = fixture.element.querySelectorAll('bit-button');
      expect(buttons.length).toBe(2);
      buttons.forEach(button => {
        expect(button.getAttribute('size')).toBe('lg');
      });

      fixture.destroy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty button group', async () => {
      const fixture = await createFixture('bit-button-group');

      const group = fixture.query('.button-group');
      expect(group).toBeTruthy();

      fixture.destroy();
    });

    it('should handle single button', async () => {
      const fixture = await createFixture('bit-button-group', { attached: true });
      fixture.element.innerHTML = `<bit-button>Only Button</bit-button>`;

      await new Promise(resolve => setTimeout(resolve, 10));

      const button = fixture.element.querySelector('bit-button');
      expect(button).toBeTruthy();

      fixture.destroy();
    });

    it('should handle buttons with existing attributes', async () => {
      const fixture = await createFixture('bit-button-group', { size: 'lg' });
      fixture.element.innerHTML = `
        <bit-button size="sm">Button 1</bit-button>
        <bit-button>Button 2</bit-button>
      `;

      await new Promise(resolve => setTimeout(resolve, 10));

      // Group size should override individual button sizes
      const buttons = fixture.element.querySelectorAll('bit-button');
      buttons.forEach(button => {
        expect(button.getAttribute('size')).toBe('lg');
      });

      fixture.destroy();
    });
  });

  describe('Batch Attribute Updates', () => {
    it('should update multiple attributes at once', async () => {
      const fixture = await createFixture('bit-button-group');

      await fixture.setAttributes({
        orientation: 'vertical',
        attached: true,
        size: 'lg',
      });

      expect(fixture.element.getAttribute('orientation')).toBe('vertical');
      expect(fixture.element.hasAttribute('attached')).toBe(true);
      expect(fixture.element.getAttribute('size')).toBe('lg');

      fixture.destroy();
    });
  });
});


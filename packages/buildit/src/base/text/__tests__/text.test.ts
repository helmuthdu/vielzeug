import { type ComponentFixture, createFixture } from '@vielzeug/craftit/testing';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

describe('bit-text', () => {
  let fixture: ComponentFixture<HTMLElement>;

  beforeAll(async () => {
    await import('../text');
  });

  afterEach(() => {
    fixture?.destroy();
  });

  describe('Rendering', () => {
    it('should render with shadow DOM structure', async () => {
      fixture = await createFixture('bit-text');
      fixture.element.textContent = 'Hello World';

      const slot = fixture.query('slot');
      expect(slot).toBeTruthy();
      expect(fixture.element.textContent).toBe('Hello World');
    });

    it('should default to inline display', async () => {
      fixture = await createFixture('bit-text');

      const computed = window.getComputedStyle(fixture.element);
      expect(computed.display).toBe('inline');
    });
  });

  describe('Variants', () => {
    const variants = ['body', 'heading', 'label', 'caption', 'overline', 'code'] as const;

    it('should default to body variant', async () => {
      fixture = await createFixture('bit-text');

      expect(fixture.element.hasAttribute('variant')).toBe(false);
    });

    variants.forEach((variant) => {
      it(`should apply ${variant} variant`, async () => {
        fixture = await createFixture('bit-text', { variant });

        expect(fixture.element.getAttribute('variant')).toBe(variant);
      });
    });

    it('should update variant dynamically', async () => {
      fixture = await createFixture('bit-text', { variant: 'body' });

      await fixture.setAttribute('variant', 'heading');
      expect(fixture.element.getAttribute('variant')).toBe('heading');
    });
  });

  describe('Sizes', () => {
    const sizes = ['xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl', '7xl', '8xl', '9xl'] as const;

    sizes.forEach((size) => {
      it(`should apply ${size} size`, async () => {
        fixture = await createFixture('bit-text', { size });

        expect(fixture.element.getAttribute('size')).toBe(size);
      });
    });

    it('should update size dynamically', async () => {
      fixture = await createFixture('bit-text', { size: 'sm' });

      await fixture.setAttribute('size', 'xl');
      expect(fixture.element.getAttribute('size')).toBe('xl');
    });
  });

  describe('Weights', () => {
    const weights = ['normal', 'medium', 'semibold', 'bold'] as const;

    weights.forEach((weight) => {
      it(`should apply ${weight} weight`, async () => {
        fixture = await createFixture('bit-text', { weight });

        expect(fixture.element.getAttribute('weight')).toBe(weight);
      });
    });

    it('should update weight dynamically', async () => {
      fixture = await createFixture('bit-text', { weight: 'normal' });

      await fixture.setAttribute('weight', 'bold');
      expect(fixture.element.getAttribute('weight')).toBe('bold');
    });
  });

  describe('Colors', () => {
    const colors = ['primary', 'secondary', 'success', 'warning', 'error', 'heading', 'body', 'muted', 'disabled'] as const;

    colors.forEach((color) => {
      it(`should apply ${color} color`, async () => {
        fixture = await createFixture('bit-text', { color });

        expect(fixture.element.getAttribute('color')).toBe(color);
      });
    });

    it('should update color dynamically', async () => {
      fixture = await createFixture('bit-text', { color: 'body' });

      await fixture.setAttribute('color', 'primary');
      expect(fixture.element.getAttribute('color')).toBe('primary');
    });
  });

  describe('Alignment', () => {
    const alignments = ['left', 'center', 'right', 'justify'] as const;

    alignments.forEach((align) => {
      it(`should apply ${align} alignment`, async () => {
        fixture = await createFixture('bit-text', { align });

        expect(fixture.element.getAttribute('align')).toBe(align);
      });
    });

    it('should update alignment dynamically', async () => {
      fixture = await createFixture('bit-text', { align: 'left' });

      await fixture.setAttribute('align', 'center');
      expect(fixture.element.getAttribute('align')).toBe('center');
    });
  });

  describe('Truncate', () => {
    it('should not truncate by default', async () => {
      fixture = await createFixture('bit-text');

      expect(fixture.element.hasAttribute('truncate')).toBe(false);
    });

    it('should apply truncate attribute', async () => {
      fixture = await createFixture('bit-text', { truncate: true });

      expect(fixture.element.hasAttribute('truncate')).toBe(true);
    });

    it('should apply truncate styles', async () => {
      fixture = await createFixture('bit-text', { truncate: true });

      expect(fixture.element.hasAttribute('truncate')).toBe(true);
    });

    it('should toggle truncate mode', async () => {
      fixture = await createFixture('bit-text', { truncate: true });

      fixture.element.removeAttribute('truncate');
      await fixture.update();

      expect(fixture.element.hasAttribute('truncate')).toBe(false);
    });
  });

  describe('Italic', () => {
    it('should not be italic by default', async () => {
      fixture = await createFixture('bit-text');

      expect(fixture.element.hasAttribute('italic')).toBe(false);
    });

    it('should apply italic attribute', async () => {
      fixture = await createFixture('bit-text', { italic: true });

      expect(fixture.element.hasAttribute('italic')).toBe(true);
    });

    it('should toggle italic mode', async () => {
      fixture = await createFixture('bit-text', { italic: true });

      fixture.element.removeAttribute('italic');
      await fixture.update();

      expect(fixture.element.hasAttribute('italic')).toBe(false);
    });
  });

  describe('Semantic HTML Tags (as attribute)', () => {
    const blockTags = ['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const;
    const inlineTags = ['span', 'label', 'code'] as const;

    blockTags.forEach((tag) => {
      it(`should apply "${tag}" tag attribute`, async () => {
        fixture = await createFixture('bit-text', { as: tag });

        expect(fixture.element.getAttribute('as')).toBe(tag);
      });
    });

    inlineTags.forEach((tag) => {
      it(`should support "${tag}" tag`, async () => {
        fixture = await createFixture('bit-text', { as: tag });

        expect(fixture.element.getAttribute('as')).toBe(tag);
      });
    });

    it('should update as attribute dynamically', async () => {
      fixture = await createFixture('bit-text', { as: 'span' });

      await fixture.setAttribute('as', 'p');
      expect(fixture.element.getAttribute('as')).toBe('p');
    });
  });

  describe('Combined Attributes', () => {
    it('should handle multiple attributes together', async () => {
      fixture = await createFixture('bit-text', {
        variant: 'heading',
        size: '2xl',
        weight: 'bold',
        color: 'primary',
        align: 'center',
      });

      expect(fixture.element.getAttribute('variant')).toBe('heading');
      expect(fixture.element.getAttribute('size')).toBe('2xl');
      expect(fixture.element.getAttribute('weight')).toBe('bold');
      expect(fixture.element.getAttribute('color')).toBe('primary');
      expect(fixture.element.getAttribute('align')).toBe('center');
    });

    it('should handle truncate with alignment', async () => {
      fixture = await createFixture('bit-text', {
        truncate: true,
        align: 'center',
      });

      expect(fixture.element.hasAttribute('truncate')).toBe(true);
      expect(fixture.element.getAttribute('align')).toBe('center');
    });

    it('should handle italic with weight and size', async () => {
      fixture = await createFixture('bit-text', {
        italic: true,
        weight: 'bold',
        size: 'lg',
      });

      expect(fixture.element.hasAttribute('italic')).toBe(true);
      expect(fixture.element.getAttribute('weight')).toBe('bold');
      expect(fixture.element.getAttribute('size')).toBe('lg');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty content', async () => {
      fixture = await createFixture('bit-text');

      expect(fixture.element).toBeTruthy();
      expect(fixture.element.textContent).toBe('');
    });

    it('should handle HTML content in slot', async () => {
      fixture = await createFixture('bit-text');
      fixture.element.innerHTML = '<strong>Bold</strong> and <em>italic</em>';

      const strong = fixture.element.querySelector('strong');
      const em = fixture.element.querySelector('em');

      expect(strong?.textContent).toBe('Bold');
      expect(em?.textContent).toBe('italic');
    });

    it('should handle long text content', async () => {
      fixture = await createFixture('bit-text');
      const longText = 'Lorem ipsum '.repeat(100);
      fixture.element.textContent = longText;

      expect(fixture.element.textContent).toBe(longText);
    });

    it('should handle special characters', async () => {
      fixture = await createFixture('bit-text');
      fixture.element.textContent = '< > & " \' ™ © ® €';

      expect(fixture.element.textContent).toContain('™');
      expect(fixture.element.textContent).toContain('©');
    });

    it('should update multiple attributes at once', async () => {
      fixture = await createFixture('bit-text');

      await fixture.setAttributes({
        variant: 'heading',
        size: 'xl',
        weight: 'bold',
        color: 'primary',
      });

      expect(fixture.element.getAttribute('variant')).toBe('heading');
      expect(fixture.element.getAttribute('size')).toBe('xl');
      expect(fixture.element.getAttribute('weight')).toBe('bold');
      expect(fixture.element.getAttribute('color')).toBe('primary');
    });
  });

  describe('Hidden Attribute', () => {
    it('should support hidden attribute', async () => {
      fixture = await createFixture('bit-text', { hidden: true });

      expect(fixture.element.hasAttribute('hidden')).toBe(true);
    });
  });
});






import { type Fixture, mount } from '@vielzeug/craftit/test';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

describe('bit-textarea', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('../textarea');
  });

  afterEach(() => {
    fixture?.destroy();
  });

  describe('Rendering', () => {
    it('should render with required shadow DOM elements', async () => {
      fixture = await mount('bit-textarea');

      expect(fixture.query('.textarea-wrapper')).toBeTruthy();
      expect(fixture.query('.field')).toBeTruthy();
      expect(fixture.query('textarea')).toBeTruthy();
    });

    it('should render label elements', async () => {
      fixture = await mount('bit-textarea', { attrs: { label: 'Message' } });

      expect(fixture.query('.label-inset')).toBeTruthy();
      expect(fixture.query('.label-outside')).toBeTruthy();
    });
  });

  describe('Value Attribute', () => {
    it('should set initial value', async () => {
      fixture = await mount('bit-textarea', { attrs: { value: 'Hello world' } });
      // value is synced via onMount/effect
      expect(fixture.element.getAttribute('value')).toBe('Hello world');
    });

    it('should update value attribute dynamically', async () => {
      fixture = await mount('bit-textarea', { attrs: { value: 'Initial' } });
      await fixture.attr('value', 'Updated');

      expect(fixture.element.getAttribute('value')).toBe('Updated');
    });
  });

  describe('Name and Placeholder', () => {
    it('should set name attribute', async () => {
      fixture = await mount('bit-textarea', { attrs: { name: 'message' } });
      expect(fixture.element.getAttribute('name')).toBe('message');
    });

    it('should set placeholder attribute', async () => {
      fixture = await mount('bit-textarea', { attrs: { placeholder: 'Enter your message...' } });
      expect(fixture.element.getAttribute('placeholder')).toBe('Enter your message...');
    });

    it('should update placeholder dynamically', async () => {
      fixture = await mount('bit-textarea');
      await fixture.attr('placeholder', 'New placeholder');

      expect(fixture.element.getAttribute('placeholder')).toBe('New placeholder');
    });
  });

  describe('Label', () => {
    it('should set label attribute', async () => {
      fixture = await mount('bit-textarea', { attrs: { label: 'Description' } });
      expect(fixture.element.getAttribute('label')).toBe('Description');
    });

    it('should support inset label placement', async () => {
      fixture = await mount('bit-textarea', { attrs: { label: 'Bio', 'label-placement': 'inset' } });
      expect(fixture.element.getAttribute('label-placement')).toBe('inset');
    });

    it('should support outside label placement', async () => {
      fixture = await mount('bit-textarea', { attrs: { label: 'Bio', 'label-placement': 'outside' } });
      expect(fixture.element.getAttribute('label-placement')).toBe('outside');
    });
  });

  describe('Helper and Error Text', () => {
    it('should set helper text', async () => {
      fixture = await mount('bit-textarea', { attrs: { helper: 'Max 500 characters' } });
      expect(fixture.element.getAttribute('helper')).toBe('Max 500 characters');
    });

    it('should set error text', async () => {
      fixture = await mount('bit-textarea', { attrs: { error: 'This field is required' } });
      expect(fixture.element.getAttribute('error')).toBe('This field is required');
    });

    it('should update error dynamically', async () => {
      fixture = await mount('bit-textarea');
      await fixture.attr('error', 'Too long');

      expect(fixture.element.getAttribute('error')).toBe('Too long');
    });
  });

  describe('Rows and Maxlength', () => {
    it('should set rows attribute', async () => {
      fixture = await mount('bit-textarea', { attrs: { rows: 6 } });
      expect(fixture.element.getAttribute('rows')).toBe('6');
    });

    it('should set maxlength attribute', async () => {
      fixture = await mount('bit-textarea', { attrs: { maxlength: 200 } });
      expect(fixture.element.getAttribute('maxlength')).toBe('200');
    });

    it('should show counter when maxlength is set', async () => {
      fixture = await mount('bit-textarea', { attrs: { maxlength: 160 } });

      const counter = fixture.query('.counter');
      expect(counter).toBeTruthy();
    });
  });

  describe('States', () => {
    it('should handle disabled state', async () => {
      fixture = await mount('bit-textarea', { attrs: { disabled: true } });

      expect(fixture.element.hasAttribute('disabled')).toBe(true);
    });

    it('should toggle disabled state', async () => {
      fixture = await mount('bit-textarea');
      await fixture.attr('disabled', true);
      expect(fixture.element.hasAttribute('disabled')).toBe(true);

      await fixture.attr('disabled', false);
      expect(fixture.element.hasAttribute('disabled')).toBe(false);
    });

    it('should handle readonly state', async () => {
      fixture = await mount('bit-textarea', { attrs: { readonly: true } });
      expect(fixture.element.hasAttribute('readonly')).toBe(true);
    });

    it('should handle required state', async () => {
      fixture = await mount('bit-textarea', { attrs: { required: true } });
      expect(fixture.element.hasAttribute('required')).toBe(true);
    });
  });

  describe('Resize Options', () => {
    it('should apply no-resize attribute', async () => {
      fixture = await mount('bit-textarea', { attrs: { 'no-resize': true } });
      expect(fixture.element.hasAttribute('no-resize')).toBe(true);
    });

    it('should apply auto-resize attribute', async () => {
      fixture = await mount('bit-textarea', { attrs: { 'auto-resize': true } });
      expect(fixture.element.hasAttribute('auto-resize')).toBe(true);
    });

    it('should apply resize direction attribute', async () => {
      fixture = await mount('bit-textarea', { attrs: { resize: 'horizontal' } });
      expect(fixture.element.getAttribute('resize')).toBe('horizontal');
    });
  });

  describe('Variants', () => {
    const variants = ['solid', 'flat', 'outline', 'bordered', 'ghost', 'frost'] as const;

    variants.forEach((variant) => {
      it(`should apply ${variant} variant`, async () => {
        fixture = await mount('bit-textarea', { attrs: { variant } });
        expect(fixture.element.getAttribute('variant')).toBe(variant);
      });
    });

    it('should update variant dynamically', async () => {
      fixture = await mount('bit-textarea', { attrs: { variant: 'solid' } });
      await fixture.attr('variant', 'outline');
      expect(fixture.element.getAttribute('variant')).toBe('outline');
    });
  });

  describe('Colors', () => {
    const colors = ['default', 'primary', 'secondary', 'success', 'warning', 'error', 'info'] as const;

    colors.forEach((color) => {
      it(`should apply ${color} color`, async () => {
        fixture = await mount('bit-textarea', { attrs: { color } });
        expect(fixture.element.getAttribute('color')).toBe(color);
      });
    });

    it('should update color dynamically', async () => {
      fixture = await mount('bit-textarea', { attrs: { color: 'primary' } });
      await fixture.attr('color', 'error');
      expect(fixture.element.getAttribute('color')).toBe('error');
    });
  });

  describe('Sizes', () => {
    const sizes = ['sm', 'md', 'lg'] as const;

    sizes.forEach((size) => {
      it(`should apply ${size} size`, async () => {
        fixture = await mount('bit-textarea', { attrs: { size } });
        expect(fixture.element.getAttribute('size')).toBe(size);
      });
    });

    it('should update size dynamically', async () => {
      fixture = await mount('bit-textarea', { attrs: { size: 'sm' } });
      await fixture.attr('size', 'lg');
      expect(fixture.element.getAttribute('size')).toBe('lg');
    });
  });

  describe('Events', () => {
    it('should fire native input event on the textarea element', async () => {
      fixture = await mount('bit-textarea');
      const ta = fixture.query<HTMLTextAreaElement>('textarea');

      const inputHandler = vi.fn();
      ta!.addEventListener('input', inputHandler);

      ta!.value = 'H';
      ta!.dispatchEvent(new InputEvent('input', { bubbles: true }));
      await fixture.flush();

      expect(inputHandler).toHaveBeenCalled();
    });

    it('should fire native change event on the textarea element', async () => {
      fixture = await mount('bit-textarea');
      const ta = fixture.query<HTMLTextAreaElement>('textarea');

      const changeHandler = vi.fn();
      ta!.addEventListener('change', changeHandler);

      ta!.value = 'some text';
      ta!.dispatchEvent(new Event('change', { bubbles: true }));
      await fixture.flush();

      expect(changeHandler).toHaveBeenCalled();
    });
  });

  describe('Form Integration', () => {
    it('should expose name attribute', async () => {
      fixture = await mount('bit-textarea', { attrs: { name: 'description' } });
      expect(fixture.element.getAttribute('name')).toBe('description');
    });
  });
});

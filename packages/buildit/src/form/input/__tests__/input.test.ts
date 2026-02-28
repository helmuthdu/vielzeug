import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { type ComponentFixture, createFixture, userEvent } from '../../../utils/trial';

describe('bit-input', () => {
  let fixture: ComponentFixture<HTMLElement>;

  beforeAll(async () => {
    await import('../input');
  });

  afterEach(() => {
    fixture?.destroy();
  });

  describe('Rendering', () => {
    it('should render with correct structure', async () => {
      fixture = await createFixture('bit-input');

      const wrapper = fixture.query('.input-wrapper');
      const field = fixture.query('.field');
      const input = fixture.query('input');

      expect(wrapper).toBeTruthy();
      expect(field).toBeTruthy();
      expect(input).toBeTruthy();
    });

    it('should render with default type text', async () => {
      fixture = await createFixture('bit-input');
      const input = fixture.query<HTMLInputElement>('input');

      expect(input?.type).toBe('text');
    });

    it('should render prefix and suffix slots', async () => {
      fixture = await createFixture('bit-input');

      const prefixSlot = fixture.query('slot[name="prefix"]');
      const suffixSlot = fixture.query('slot[name="suffix"]');

      expect(prefixSlot).toBeTruthy();
      expect(suffixSlot).toBeTruthy();
    });
  });

  describe('Type Attribute', () => {
    it('should set input type', async () => {
      fixture = await createFixture('bit-input', { type: 'email' });
      const input = fixture.query<HTMLInputElement>('input');

      expect(input?.type).toBe('email');
    });

    it('should support all valid input types', async () => {
      const types = ['text', 'email', 'password', 'search', 'url', 'tel', 'number'];

      for (const type of types) {
        fixture = await createFixture('bit-input', { type });
        const input = fixture.query<HTMLInputElement>('input');

        expect(input?.type).toBe(type);
        fixture.destroy();
      }
    });

    it('should fallback to text for invalid types', async () => {
      fixture = await createFixture('bit-input', { type: 'invalid' });
      const input = fixture.query<HTMLInputElement>('input');

      expect(input?.type).toBe('text');
    });

    it('should update type dynamically', async () => {
      fixture = await createFixture('bit-input', { type: 'text' });
      const input = fixture.query<HTMLInputElement>('input');

      expect(input?.type).toBe('text');

      await fixture.setAttribute('type', 'email');
      expect(input?.type).toBe('email');
    });
  });

  describe('Value Attribute', () => {
    it('should set initial value', async () => {
      fixture = await createFixture('bit-input', { value: 'test value' });
      const input = fixture.query<HTMLInputElement>('input');

      expect(input?.value).toBe('test value');
    });

    it('should update value when attribute changes', async () => {
      fixture = await createFixture('bit-input', { value: 'initial' });
      const input = fixture.query<HTMLInputElement>('input');

      expect(input?.value).toBe('initial');

      await fixture.setAttribute('value', 'updated');
      expect(input?.value).toBe('updated');
    });

    it('should handle empty value', async () => {
      fixture = await createFixture('bit-input', { value: '' });
      const input = fixture.query<HTMLInputElement>('input');

      expect(input?.value).toBe('');
    });
  });

  describe('Name and Placeholder', () => {
    it('should set name attribute', async () => {
      fixture = await createFixture('bit-input', { name: 'email' });
      const input = fixture.query<HTMLInputElement>('input');

      expect(input?.name).toBe('email');
    });

    it('should update name dynamically', async () => {
      fixture = await createFixture('bit-input');
      const input = fixture.query<HTMLInputElement>('input');

      await fixture.setAttribute('name', 'username');
      expect(input?.name).toBe('username');
    });

    it('should set placeholder', async () => {
      fixture = await createFixture('bit-input', { placeholder: 'Enter email' });
      const input = fixture.query<HTMLInputElement>('input');

      expect(input?.placeholder).toBe('Enter email');
    });

    it('should update placeholder dynamically', async () => {
      fixture = await createFixture('bit-input');
      const input = fixture.query<HTMLInputElement>('input');

      await fixture.setAttribute('placeholder', 'Enter username');
      expect(input?.placeholder).toBe('Enter username');
    });
  });

  describe('States', () => {
    it('should handle disabled state', async () => {
      fixture = await createFixture('bit-input', { disabled: true });
      const input = fixture.query<HTMLInputElement>('input');

      expect(fixture.element.hasAttribute('disabled')).toBe(true);
      expect(input?.disabled).toBe(true);
    });

    it('should toggle disabled state', async () => {
      fixture = await createFixture('bit-input');
      const input = fixture.query<HTMLInputElement>('input');

      expect(input?.disabled).toBe(false);

      await fixture.setAttribute('disabled', true);
      expect(input?.disabled).toBe(true);

      await fixture.setAttribute('disabled', false);
      expect(input?.disabled).toBe(false);
    });

    it('should handle readonly state', async () => {
      fixture = await createFixture('bit-input', { readonly: true });
      const input = fixture.query<HTMLInputElement>('input');

      expect(input?.readOnly).toBe(true);
    });

    it('should toggle readonly state', async () => {
      fixture = await createFixture('bit-input');
      const input = fixture.query<HTMLInputElement>('input');

      expect(input?.readOnly).toBe(false);

      await fixture.setAttribute('readonly', true);
      expect(input?.readOnly).toBe(true);
    });

    it('should handle required state', async () => {
      fixture = await createFixture('bit-input', { required: true });
      const input = fixture.query<HTMLInputElement>('input');

      expect(input?.required).toBe(true);
    });

    it('should toggle required state', async () => {
      fixture = await createFixture('bit-input');
      const input = fixture.query<HTMLInputElement>('input');

      expect(input?.required).toBe(false);

      await fixture.setAttribute('required', true);
      expect(input?.required).toBe(true);
    });
  });

  describe('Sizes', () => {
    it('should apply sm size', async () => {
      fixture = await createFixture('bit-input', { size: 'sm' });

      expect(fixture.element.getAttribute('size')).toBe('sm');
    });

    it('should apply md size (default)', async () => {
      fixture = await createFixture('bit-input');

      expect(fixture.element.hasAttribute('size')).toBe(false);
    });

    it('should apply lg size', async () => {
      fixture = await createFixture('bit-input', { size: 'lg' });

      expect(fixture.element.getAttribute('size')).toBe('lg');
    });

    it('should change size dynamically', async () => {
      fixture = await createFixture('bit-input', { size: 'sm' });

      expect(fixture.element.getAttribute('size')).toBe('sm');

      await fixture.setAttribute('size', 'lg');
      expect(fixture.element.getAttribute('size')).toBe('lg');
    });
  });

  describe('Variants', () => {
    const variants = ['solid', 'flat', 'bordered', 'outline', 'ghost', 'text'] as const;

    variants.forEach((variant) => {
      it(`should apply ${variant} variant`, async () => {
        fixture = await createFixture('bit-input', { variant });

        expect(fixture.element.getAttribute('variant')).toBe(variant);
      });
    });

    it('should change variant dynamically', async () => {
      fixture = await createFixture('bit-input', { variant: 'solid' });

      expect(fixture.element.getAttribute('variant')).toBe('solid');

      await fixture.setAttribute('variant', 'outline');
      expect(fixture.element.getAttribute('variant')).toBe('outline');
    });
  });

  describe('Colors', () => {
    const colors = ['primary', 'success', 'warning', 'error'] as const;

    colors.forEach((color) => {
      it(`should apply ${color} color`, async () => {
        fixture = await createFixture('bit-input', { color });

        expect(fixture.element.getAttribute('color')).toBe(color);
      });
    });

    it('should change color dynamically', async () => {
      fixture = await createFixture('bit-input', { color: 'primary' });

      expect(fixture.element.getAttribute('color')).toBe('primary');

      await fixture.setAttribute('color', 'error');
      expect(fixture.element.getAttribute('color')).toBe('error');
    });
  });

  describe('Rounded Mode', () => {
    it('should apply rounded attribute as boolean (default full)', async () => {
      fixture = await createFixture('bit-input', { rounded: '' });

      expect(fixture.element.hasAttribute('rounded')).toBe(true);
      expect(fixture.element.getAttribute('rounded')).toBe('');
    });

    it('should apply rounded with specific theme values', async () => {
      const values = ['sm', 'md', 'lg', 'xl', '2xl', '3xl', 'full'];

      for (const value of values) {
        fixture = await createFixture('bit-input', { rounded: value });
        expect(fixture.element.getAttribute('rounded')).toBe(value);
        fixture.destroy();
      }
    });

    it('should update rounded value dynamically', async () => {
      fixture = await createFixture('bit-input', { rounded: 'lg' });

      await fixture.setAttribute('rounded', 'xl');

      expect(fixture.element.getAttribute('rounded')).toBe('xl');
    });

    it('should remove rounded attribute', async () => {
      fixture = await createFixture('bit-input', { rounded: '' });

      await fixture.element.removeAttribute('rounded');

      expect(fixture.element.hasAttribute('rounded')).toBe(false);
    });
  });

  describe('Events', () => {
    it('should emit input event with details', async () => {
      fixture = await createFixture('bit-input');
      const input = fixture.query<HTMLInputElement>('input');

      const inputHandler = vi.fn();
      fixture.element.addEventListener('input', inputHandler);

      await userEvent.type(input!, 'a');

      expect(inputHandler).toHaveBeenCalled();
      const event = inputHandler.mock.calls[0][0] as CustomEvent;
      expect(event.detail.value).toBe('a');
      expect(event.detail.originalEvent).toBeDefined();
    });

    it('should emit change event with details', async () => {
      fixture = await createFixture('bit-input');
      const input = fixture.query<HTMLInputElement>('input');

      const changeHandler = vi.fn();
      fixture.element.addEventListener('change', changeHandler);

      input!.value = 'test';
      input!.dispatchEvent(new Event('change', { bubbles: true }));

      expect(changeHandler).toHaveBeenCalled();
      const event = changeHandler.mock.calls[0][0] as CustomEvent;
      expect(event.detail.value).toBe('test');
      expect(event.detail.originalEvent).toBeDefined();
    });

    it('should sync host value attribute on input', async () => {
      fixture = await createFixture('bit-input');
      const input = fixture.query<HTMLInputElement>('input');

      input!.value = 'new value';
      input!.dispatchEvent(new Event('input', { bubbles: true }));

      expect(fixture.element.getAttribute('value')).toBe('new value');
    });

    it('should sync host value attribute on change', async () => {
      fixture = await createFixture('bit-input');
      const input = fixture.query<HTMLInputElement>('input');

      input!.value = 'changed value';
      input!.dispatchEvent(new Event('change', { bubbles: true }));

      expect(fixture.element.getAttribute('value')).toBe('changed value');
    });
  });

  describe('Multiple Attributes', () => {
    it('should handle multiple attributes simultaneously', async () => {
      fixture = await createFixture('bit-input');

      await fixture.setAttributes({
        placeholder: 'Enter email',
        required: true,
        size: 'lg',
        type: 'email',
      });

      const input = fixture.query<HTMLInputElement>('input');
      expect(input?.type).toBe('email');
      expect(input?.placeholder).toBe('Enter email');
      expect(input?.required).toBe(true);
      expect(fixture.element.getAttribute('size')).toBe('lg');
    });

    it('should handle all attributes together', async () => {
      fixture = await createFixture('bit-input', {
        color: 'primary',
        disabled: false,
        name: 'password',
        placeholder: 'Enter password',
        readonly: false,
        required: true,
        size: 'md',
        type: 'password',
        value: 'secret',
        variant: 'bordered',
      });

      const input = fixture.query<HTMLInputElement>('input');
      expect(input?.type).toBe('password');
      expect(input?.name).toBe('password');
      expect(input?.value).toBe('secret');
      expect(input?.placeholder).toBe('Enter password');
      expect(input?.disabled).toBe(false);
      expect(input?.readOnly).toBe(false);
      expect(input?.required).toBe(true);
      expect(fixture.element.getAttribute('size')).toBe('md');
      expect(fixture.element.getAttribute('variant')).toBe('bordered');
      expect(fixture.element.getAttribute('color')).toBe('primary');
    });
  });
});

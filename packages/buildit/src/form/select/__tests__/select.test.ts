import { type Fixture, mount, user } from '@vielzeug/craftit/test';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

const OPTIONS_HTML = `
  <option value="apple">Apple</option>
  <option value="banana">Banana</option>
  <option value="cherry">Cherry</option>
`;

const OPTIONS_WITH_DISABLED_HTML = `
  <option value="apple">Apple</option>
  <option value="banana" disabled>Banana</option>
  <option value="cherry">Cherry</option>
`;

const OPTIONS_WITH_GROUPS_HTML = `
  <optgroup label="Fruits">
    <option value="apple">Apple</option>
    <option value="banana">Banana</option>
  </optgroup>
  <optgroup label="Vegetables">
    <option value="carrot">Carrot</option>
  </optgroup>
`;

describe('bit-select', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('../select');
  });

  afterEach(() => {
    fixture?.destroy();
  });

  describe('Rendering', () => {
    it('should render with required shadow DOM elements', async () => {
      fixture = await mount('bit-select', { html: OPTIONS_HTML });

      expect(fixture.query('.select-wrapper')).toBeTruthy();
      expect(fixture.query('.field')).toBeTruthy();
      expect(fixture.query('.trigger-row')).toBeTruthy();
      expect(fixture.query('.trigger-value')).toBeTruthy();
    });

    it('should render dropdown', async () => {
      fixture = await mount('bit-select', { html: OPTIONS_HTML });

      expect(fixture.query('.dropdown')).toBeTruthy();
    });

    it('should hide dropdown by default', async () => {
      fixture = await mount('bit-select', { html: OPTIONS_HTML });

      const dropdown = fixture.query('.dropdown');
      expect(dropdown?.hasAttribute('data-open')).toBe(false);
    });

    it('should not have open attribute on host by default', async () => {
      fixture = await mount('bit-select', { html: OPTIONS_HTML });

      expect(fixture.element.hasAttribute('open')).toBe(false);
    });
  });

  describe('Label', () => {
    it('should set label attribute', async () => {
      fixture = await mount('bit-select', { attrs: { label: 'Fruit' }, html: OPTIONS_HTML });
      expect(fixture.element.getAttribute('label')).toBe('Fruit');
    });

    it('should support inset label placement', async () => {
      fixture = await mount('bit-select', {
        attrs: { label: 'Fruit', 'label-placement': 'inset' },
        html: OPTIONS_HTML,
      });
      expect(fixture.element.getAttribute('label-placement')).toBe('inset');
    });

    it('should support outside label placement', async () => {
      fixture = await mount('bit-select', {
        attrs: { label: 'Fruit', 'label-placement': 'outside' },
        html: OPTIONS_HTML,
      });
      expect(fixture.element.getAttribute('label-placement')).toBe('outside');
    });
  });

  describe('Placeholder', () => {
    it('should show placeholder when no value is selected', async () => {
      fixture = await mount('bit-select', {
        attrs: { placeholder: 'Pick a fruit' },
        html: OPTIONS_HTML,
      });

      const triggerValue = fixture.query('.trigger-value');
      expect(triggerValue?.textContent?.trim()).toBe('Pick a fruit');
    });
  });

  describe('Value Attribute', () => {
    it('should set initial selected value', async () => {
      fixture = await mount('bit-select', { attrs: { value: 'banana' }, html: OPTIONS_HTML });

      const triggerValue = fixture.query('.trigger-value');
      expect(triggerValue?.textContent?.trim()).toBe('Banana');
    });

    it('should show matching option label for value', async () => {
      fixture = await mount('bit-select', { attrs: { value: 'apple' }, html: OPTIONS_HTML });

      const triggerValue = fixture.query('.trigger-value');
      expect(triggerValue?.textContent?.trim()).toBe('Apple');
    });
  });

  describe('Open / Close', () => {
    it('should open dropdown on trigger click', async () => {
      fixture = await mount('bit-select', { html: OPTIONS_HTML });
      const field = fixture.query<HTMLElement>('.field');

      await user.click(field!);

      expect(fixture.element.hasAttribute('open')).toBe(true);
      expect(fixture.query('.dropdown')?.hasAttribute('data-open')).toBe(true);
    });

    it('should close dropdown on second trigger click', async () => {
      fixture = await mount('bit-select', { html: OPTIONS_HTML });
      const field = fixture.query<HTMLElement>('.field');

      await user.click(field!);
      await user.click(field!);

      expect(fixture.element.hasAttribute('open')).toBe(false);
    });

    it('should close dropdown on Escape key', async () => {
      fixture = await mount('bit-select', { html: OPTIONS_HTML });
      const field = fixture.query<HTMLElement>('.field');

      await user.click(field!);
      expect(fixture.element.hasAttribute('open')).toBe(true);

      await user.press(field!, 'Escape');

      expect(fixture.element.hasAttribute('open')).toBe(false);
    });

    it('should not open when disabled', async () => {
      fixture = await mount('bit-select', { attrs: { disabled: true }, html: OPTIONS_HTML });
      const field = fixture.query<HTMLElement>('.field');

      await user.click(field!);

      expect(fixture.element.hasAttribute('open')).toBe(false);
    });
  });

  describe('Option Selection', () => {
    it('should render options in dropdown', async () => {
      fixture = await mount('bit-select', { html: OPTIONS_HTML });
      const field = fixture.query<HTMLElement>('.field');

      await user.click(field!);

      const optionEls = fixture.queryAll('.option');
      expect(optionEls.length).toBe(3);
    });

    it('should mark clicked option as selected', async () => {
      fixture = await mount('bit-select', { html: OPTIONS_HTML });
      const field = fixture.query<HTMLElement>('.field');

      await user.click(field!);

      const options = fixture.queryAll<HTMLElement>('.option');
      await user.click(options[0]!);

      const triggerValue = fixture.query('.trigger-value');
      expect(triggerValue?.textContent?.trim()).toBe('Apple');
    });

    it('should close dropdown after single selection', async () => {
      fixture = await mount('bit-select', { html: OPTIONS_HTML });
      const field = fixture.query<HTMLElement>('.field');

      await user.click(field!);

      const options = fixture.queryAll<HTMLElement>('.option');
      await user.click(options[1]!);

      expect(fixture.element.hasAttribute('open')).toBe(false);
    });
  });

  describe('Multiple Mode', () => {
    it('should keep dropdown open after selection in multiple mode', async () => {
      fixture = await mount('bit-select', { attrs: { multiple: true }, html: OPTIONS_HTML });
      const field = fixture.query<HTMLElement>('.field');

      await user.click(field!);

      const options = fixture.queryAll<HTMLElement>('.option');
      await user.click(options[0]!);

      expect(fixture.element.hasAttribute('open')).toBe(true);
    });

    it('should show count when multiple values selected', async () => {
      fixture = await mount('bit-select', {
        attrs: { multiple: true, value: 'apple,banana' },
        html: OPTIONS_HTML,
      });

      const triggerValue = fixture.query('.trigger-value');
      expect(triggerValue?.textContent?.trim()).toBe('2 selected');
    });
  });

  describe('Keyboard Navigation', () => {
    it('should open dropdown on ArrowDown key', async () => {
      fixture = await mount('bit-select', { html: OPTIONS_HTML });
      const field = fixture.query<HTMLElement>('.field');

      await user.press(field!, 'ArrowDown');

      expect(fixture.element.hasAttribute('open')).toBe(true);
    });

    it('should open dropdown on Enter key', async () => {
      fixture = await mount('bit-select', { html: OPTIONS_HTML });
      const field = fixture.query<HTMLElement>('.field');

      await user.press(field!, 'Enter');

      expect(fixture.element.hasAttribute('open')).toBe(true);
    });

    it('should move focus down with ArrowDown', async () => {
      fixture = await mount('bit-select', { html: OPTIONS_HTML });
      const field = fixture.query<HTMLElement>('.field');

      await user.press(field!, 'ArrowDown'); // opens and focuses first
      await user.press(field!, 'ArrowDown'); // moves to second

      const focused = fixture.query('[data-focused]');
      expect(focused).toBeTruthy();
    });

    it('should select focused option with Enter key', async () => {
      fixture = await mount('bit-select', { html: OPTIONS_HTML });
      const field = fixture.query<HTMLElement>('.field');

      await user.press(field!, 'ArrowDown'); // opens and focuses first option
      await user.press(field!, 'Enter'); // selects first option

      const triggerValue = fixture.query('.trigger-value');
      expect(triggerValue?.textContent?.trim()).toBe('Apple');
    });
  });

  describe('Disabled Options', () => {
    it('should mark disabled options with data-disabled', async () => {
      fixture = await mount('bit-select', { html: OPTIONS_WITH_DISABLED_HTML });
      const field = fixture.query<HTMLElement>('.field');

      await user.click(field!);

      const disabledOpts = fixture.queryAll('[data-disabled]');
      expect(disabledOpts.length).toBe(1);
    });
  });

  describe('Option Groups', () => {
    it('should render optgroup labels', async () => {
      fixture = await mount('bit-select', { html: OPTIONS_WITH_GROUPS_HTML });
      const field = fixture.query<HTMLElement>('.field');

      await user.click(field!);

      const groupLabels = fixture.queryAll('.optgroup-label');
      expect(groupLabels.length).toBe(2);
    });
  });

  describe('Events', () => {
    it('should emit change event on option selection', async () => {
      fixture = await mount('bit-select', { html: OPTIONS_HTML });
      const field = fixture.query<HTMLElement>('.field');

      const changeHandler = vi.fn();
      fixture.element.addEventListener('change', changeHandler);

      await user.click(field!);
      const options = fixture.queryAll<HTMLElement>('.option');
      await user.click(options[0]!);

      expect(changeHandler).toHaveBeenCalledOnce();
    });

    it('should include value and values in change event detail', async () => {
      fixture = await mount('bit-select', { html: OPTIONS_HTML });
      const field = fixture.query<HTMLElement>('.field');

      const changeHandler = vi.fn();
      fixture.element.addEventListener('change', changeHandler);

      await user.click(field!);
      const options = fixture.queryAll<HTMLElement>('.option');
      await user.click(options[0]!);

      const event = changeHandler.mock.calls[0][0] as CustomEvent;
      expect(event.detail.value).toBe('apple');
      expect(Array.isArray(event.detail.values)).toBe(true);
      expect(event.detail.values).toContain('apple');
    });
  });

  describe('Helper and Error Text', () => {
    it('should set helper attribute', async () => {
      fixture = await mount('bit-select', { attrs: { helper: 'Select one option' }, html: OPTIONS_HTML });
      expect(fixture.element.getAttribute('helper')).toBe('Select one option');
    });

    it('should display helper text content', async () => {
      fixture = await mount('bit-select', { attrs: { helper: 'Select one option' }, html: OPTIONS_HTML });
      const helperTextEl = fixture.query('.helper-text');
      expect(helperTextEl?.textContent).toBe('Select one option');
    });
  });

  describe('States', () => {
    it('should handle disabled state', async () => {
      fixture = await mount('bit-select', { attrs: { disabled: true }, html: OPTIONS_HTML });
      expect(fixture.element.hasAttribute('disabled')).toBe(true);
    });

    it('should handle required state', async () => {
      fixture = await mount('bit-select', { attrs: { required: true }, html: OPTIONS_HTML });
      expect(fixture.element.hasAttribute('required')).toBe(true);
    });

    it('should handle fullwidth state', async () => {
      fixture = await mount('bit-select', { attrs: { fullwidth: true }, html: OPTIONS_HTML });
      expect(fixture.element.hasAttribute('fullwidth')).toBe(true);
    });
  });

  describe('Variants', () => {
    const variants = ['solid', 'flat', 'outline', 'bordered', 'ghost'] as const;

    variants.forEach((variant) => {
      it(`should apply ${variant} variant`, async () => {
        fixture = await mount('bit-select', { attrs: { variant }, html: OPTIONS_HTML });
        expect(fixture.element.getAttribute('variant')).toBe(variant);
      });
    });
  });

  describe('Colors', () => {
    const colors = ['default', 'primary', 'secondary', 'success', 'warning', 'error', 'info'] as const;

    colors.forEach((color) => {
      it(`should apply ${color} color`, async () => {
        fixture = await mount('bit-select', { attrs: { color }, html: OPTIONS_HTML });
        expect(fixture.element.getAttribute('color')).toBe(color);
      });
    });
  });

  describe('Sizes', () => {
    const sizes = ['sm', 'md', 'lg'] as const;

    sizes.forEach((size) => {
      it(`should apply ${size} size`, async () => {
        fixture = await mount('bit-select', { attrs: { size }, html: OPTIONS_HTML });
        expect(fixture.element.getAttribute('size')).toBe(size);
      });
    });
  });

  describe('ARIA Attributes', () => {
    it('should have role="combobox" on trigger field', async () => {
      fixture = await mount('bit-select', { html: OPTIONS_HTML });

      const field = fixture.query('.field');
      expect(field?.getAttribute('role')).toBe('combobox');
    });

    it('should set aria-expanded="false" when closed', async () => {
      fixture = await mount('bit-select', { html: OPTIONS_HTML });

      const field = fixture.query('.field');
      expect(field?.getAttribute('aria-expanded')).toBe('false');
    });

    it('should set aria-expanded="true" when open', async () => {
      fixture = await mount('bit-select', { html: OPTIONS_HTML });
      const field = fixture.query<HTMLElement>('.field');

      await user.click(field!);

      expect(field?.getAttribute('aria-expanded')).toBe('true');
    });

    it('should have role="listbox" on dropdown', async () => {
      fixture = await mount('bit-select', { html: OPTIONS_HTML });

      const dropdown = fixture.query('.dropdown');
      expect(dropdown?.getAttribute('role')).toBe('listbox');
    });

    it('should have role="option" on each option', async () => {
      fixture = await mount('bit-select', { html: OPTIONS_HTML });
      const field = fixture.query<HTMLElement>('.field');

      await user.click(field!);

      const optionEls = fixture.queryAll('.option');
      for (const opt of optionEls) {
        expect(opt.getAttribute('role')).toBe('option');
      }
    });

  });

  describe('Form Integration', () => {
    it('should expose name attribute', async () => {
      fixture = await mount('bit-select', { attrs: { name: 'fruit' }, html: OPTIONS_HTML });
      expect(fixture.element.getAttribute('name')).toBe('fruit');
    });
  });
});

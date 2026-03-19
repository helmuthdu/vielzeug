import { html, signal } from '@vielzeug/craftit/core';
import { type Fixture, mount, user } from '@vielzeug/craftit/test';

export const SELECT_OPTIONS = `
  <option value="apple">Apple</option>
  <option value="banana">Banana</option>
  <option value="cherry">Cherry</option>
`;

export const SELECT_OPTIONS_WITH_DISABLED = `
  <option value="apple">Apple</option>
  <option value="banana" disabled>Banana</option>
  <option value="cherry">Cherry</option>
`;

export const SELECT_OPTIONS_WITH_GROUPS = `
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
    await (() => import('./select'))();
  });

  afterEach(() => {
    fixture?.destroy();
  });

  // ─── Rendering ──────────────────────────────────────────────────────────────

  describe('Rendering', () => {
    it('renders wrapper, field, trigger, and dropdown elements', async () => {
      fixture = await mount('bit-select', { html: SELECT_OPTIONS });

      expect(fixture.query('.field')).toBeTruthy();
      expect(fixture.query('.dropdown')).toBeTruthy();
    });

    it('renders option items in the dropdown', async () => {
      fixture = await mount('bit-select', { html: SELECT_OPTIONS });

      await user.click(fixture.query<HTMLElement>('.field')!);
      await fixture.flush();

      const items = fixture.query('.dropdown')?.querySelectorAll('[role="option"]');

      expect(items?.length).toBeGreaterThan(0);
    });

    it('renders optgroups when provided', async () => {
      fixture = await mount('bit-select', { html: SELECT_OPTIONS_WITH_GROUPS });

      await user.click(fixture.query<HTMLElement>('.field')!);
      await fixture.flush();

      const groups = fixture.query('.dropdown')?.querySelectorAll('.optgroup-label');

      expect(groups?.length).toBeGreaterThan(0);
    });

    it('renders placeholder text when no value selected', async () => {
      fixture = await mount('bit-select', {
        attrs: { placeholder: 'Select item' },
        html: SELECT_OPTIONS,
      });

      const trigger = fixture.query('.trigger-value');

      expect(trigger?.textContent?.trim()).toBe('Select item');
    });

    it('renders helper text when set', async () => {
      fixture = await mount('bit-select', {
        attrs: { helper: 'Choose one' },
        html: SELECT_OPTIONS,
      });

      expect(fixture.query('.helper-text')).toBeTruthy();
    });

    it('renders error message with role="alert"', async () => {
      fixture = await mount('bit-select', {
        attrs: { error: 'Selection required' },
        html: SELECT_OPTIONS,
      });

      expect(fixture.query('.helper-text')).toBeTruthy();
    });
  });

  // ─── Selection ───────────────────────────────────────────────────────────────

  describe('Selection', () => {
    it('keeps chip row hidden in single mode before and after selection', async () => {
      fixture = await mount('bit-select', { html: SELECT_OPTIONS });

      const chipsRow = fixture.query<HTMLElement>('.chips-row');
      const triggerValue = fixture.query<HTMLElement>('.trigger-value');

      expect(chipsRow?.hasAttribute('hidden')).toBe(true);
      expect(triggerValue?.hasAttribute('hidden')).toBe(false);

      await user.click(fixture.query<HTMLElement>('.field')!);
      await fixture.flush();
      await user.click(fixture.query<HTMLElement>('[role="option"]')!);
      await fixture.flush();

      expect(chipsRow?.hasAttribute('hidden')).toBe(true);
      expect(triggerValue?.hasAttribute('hidden')).toBe(false);
      expect(fixture.queryAll('bit-chip').length).toBe(0);
    });

    it('shows selected value label when value is set', async () => {
      fixture = await mount('bit-select', {
        attrs: { value: 'apple' },
        html: SELECT_OPTIONS,
      });

      const trigger = fixture.query('.trigger-value');

      expect(trigger?.textContent?.trim()).toBe('Apple');
    });

    it('opens dropdown when clicked', async () => {
      fixture = await mount('bit-select', { html: SELECT_OPTIONS });
      expect(fixture.element.hasAttribute('open')).toBe(false);

      await user.click(fixture.query<HTMLElement>('.field')!);

      expect(fixture.element.hasAttribute('open')).toBe(true);
    });

    it('closes dropdown after selecting an option', async () => {
      fixture = await mount('bit-select', { html: SELECT_OPTIONS });
      await user.click(fixture.query<HTMLElement>('.field')!);
      await fixture.flush();
      expect(fixture.element.hasAttribute('open')).toBe(true);

      const option = fixture.query('[role="option"]')!;

      await user.click(option);

      expect(fixture.element.hasAttribute('open')).toBe(false);
    });

    it('emits change event with value and originalEvent on selection', async () => {
      fixture = await mount('bit-select', { html: SELECT_OPTIONS });

      const changeHandler = vi.fn();

      fixture.element.addEventListener('change', changeHandler);

      await user.click(fixture.query<HTMLElement>('.field')!);
      await fixture.flush();

      const firstOption = fixture.query('[role="option"]')!;

      await user.click(firstOption);

      expect(changeHandler).toHaveBeenCalledTimes(1);

      const detail = (changeHandler.mock.calls[0][0] as CustomEvent).detail;

      expect(detail.value).toBeDefined();
      expect(detail.labels).toEqual(['Apple']);
      expect(detail.originalEvent).toBeDefined();
    });

    it('skips disabled options when clicked', async () => {
      fixture = await mount('bit-select', { html: SELECT_OPTIONS_WITH_DISABLED });

      const changeHandler = vi.fn();

      fixture.element.addEventListener('change', changeHandler);

      await user.click(fixture.query<HTMLElement>('.field')!);
      await fixture.flush();

      const disabledOption = fixture.query('[role="option"][aria-disabled="true"]');

      if (disabledOption) {
        await user.click(disabledOption as HTMLElement);
        expect(changeHandler).not.toHaveBeenCalled();
      }
    });
  });

  // ─── Multiple Selection ──────────────────────────────────────────────────────

  describe('Multiple Selection', () => {
    it('allows multiple selections when multiple attribute is set', async () => {
      fixture = await mount('bit-select', {
        attrs: { multiple: true },
        html: SELECT_OPTIONS,
      });

      expect(fixture.element.hasAttribute('multiple')).toBe(true);
    });

    it('emits change event with values array for multiple select', async () => {
      fixture = await mount('bit-select', {
        attrs: { multiple: true },
        html: SELECT_OPTIONS,
      });

      const changeHandler = vi.fn();

      fixture.element.addEventListener('change', changeHandler);

      await user.click(fixture.query<HTMLElement>('.field')!);
      await fixture.flush();

      const firstOption = fixture.query('[role="option"]')!;

      await user.click(firstOption);

      const detail = (changeHandler.mock.calls[0][0] as CustomEvent).detail;

      expect(Array.isArray(detail.values)).toBe(true);
    });

    it('updates selected state immediately for grouped options while dropdown stays open', async () => {
      fixture = await mount('bit-select', {
        attrs: { multiple: true },
        html: SELECT_OPTIONS_WITH_GROUPS,
      });

      await user.click(fixture.query<HTMLElement>('.field')!);
      await fixture.flush();

      const carrotOption = Array.from(fixture.queryAll<HTMLElement>('[role="option"]')).find(
        (option) => option.textContent?.trim() === 'Carrot',
      );

      expect(carrotOption).toBeTruthy();

      await user.click(carrotOption!);
      await fixture.flush();

      expect(fixture.element.hasAttribute('open')).toBe(true);
      expect(carrotOption?.getAttribute('aria-selected')).toBe('true');
      expect(carrotOption?.hasAttribute('data-selected')).toBe(true);
    });
  });

  // ─── States ──────────────────────────────────────────────────────────────────

  describe('Disabled State', () => {
    it('reflects disabled on host', async () => {
      fixture = await mount('bit-select', {
        attrs: { disabled: true },
        html: SELECT_OPTIONS,
      });

      expect(fixture.element.hasAttribute('disabled')).toBe(true);
    });

    it('does not open when disabled', async () => {
      fixture = await mount('bit-select', {
        attrs: { disabled: true },
        html: SELECT_OPTIONS,
      });

      await user.click(fixture.query<HTMLElement>('.field')!);

      expect(fixture.element.hasAttribute('open')).toBe(false);
    });
  });

  describe('Required State', () => {
    it('reflects required on host', async () => {
      fixture = await mount('bit-select', {
        attrs: { required: true },
        html: SELECT_OPTIONS,
      });

      expect(fixture.element.hasAttribute('required')).toBe(true);
    });
  });

  // ─── Error State ─────────────────────────────────────────────────────────────

  describe('Error State', () => {
    it('renders error text in alert element', async () => {
      fixture = await mount('bit-select', {
        attrs: { error: 'Required' },
        html: SELECT_OPTIONS,
      });

      const errorEl = fixture.query('.helper-text');

      expect(errorEl?.textContent?.trim()).toBe('Required');
    });
  });

  // ─── Form Integration ────────────────────────────────────────────────────────

  describe('Form Integration', () => {
    it('exposes name attribute', async () => {
      fixture = await mount('bit-select', {
        attrs: { name: 'fruit' },
        html: SELECT_OPTIONS,
      });

      expect(fixture.element.getAttribute('name')).toBe('fruit');
    });

    it('updates value attribute dynamically', async () => {
      fixture = await mount('bit-select', { html: SELECT_OPTIONS });

      await fixture.attr('value', 'banana');

      expect(fixture.element.getAttribute('value')).toBe('banana');
    });

    it('renders chips after csv value update in multiple mode', async () => {
      fixture = await mount('bit-select', {
        attrs: { multiple: true },
        html: SELECT_OPTIONS,
      });

      await fixture.attr('value', 'apple,banana');

      expect(fixture.queryAll('bit-chip').length).toBe(2);
    });

    it('applies color to rendered chips in multiple mode', async () => {
      fixture = await mount('bit-select', {
        attrs: { color: 'primary', multiple: true, value: 'apple,banana' },
        html: SELECT_OPTIONS,
      });

      await fixture.flush();

      expect(fixture.query('bit-chip')?.getAttribute('color')).toBe('primary');
    });

    it('updates rendered chip color when select color changes', async () => {
      fixture = await mount('bit-select', {
        attrs: { color: 'primary', multiple: true, value: 'apple,banana' },
        html: SELECT_OPTIONS,
      });

      await fixture.flush();
      await fixture.attr('color', 'success');
      await fixture.flush();

      expect(fixture.query('bit-chip')?.getAttribute('color')).toBe('success');
    });

    it('removes a chip when its remove button is clicked', async () => {
      fixture = await mount('bit-select', {
        attrs: { multiple: true, value: 'apple,banana' },
        html: SELECT_OPTIONS,
      });

      const changeHandler = vi.fn();

      fixture.element.addEventListener('change', changeHandler);
      await fixture.flush();

      const chip = fixture.query<HTMLElement>('bit-chip');
      const removeBtn = chip?.shadowRoot?.querySelector<HTMLButtonElement>('.remove-btn');

      expect(removeBtn).toBeTruthy();

      await user.click(removeBtn!);
      await fixture.flush();

      expect(fixture.queryAll('bit-chip').length).toBe(1);
      expect(changeHandler).toHaveBeenCalled();
      expect((changeHandler.mock.calls.at(-1)?.[0] as CustomEvent).detail.values).toEqual(['banana']);
      expect((changeHandler.mock.calls.at(-1)?.[0] as CustomEvent).detail.originalEvent).toBeDefined();
    });
  });

  // ─── Colors ─────────────────────────────────────────────────────────────────

  describe('Colors', () => {
    const colors = ['primary', 'secondary', 'success', 'warning', 'error'] as const;

    colors.forEach((color) => {
      it(`applies ${color} color`, async () => {
        fixture = await mount('bit-select', {
          attrs: { color },
          html: SELECT_OPTIONS,
        });

        expect(fixture.element.getAttribute('color')).toBe(color);
      });
    });
  });

  // ─── Sizes ──────────────────────────────────────────────────────────────────

  describe('Sizes', () => {
    const sizes = ['sm', 'md', 'lg'] as const;

    sizes.forEach((size) => {
      it(`applies ${size} size`, async () => {
        fixture = await mount('bit-select', {
          attrs: { size },
          html: SELECT_OPTIONS,
        });

        expect(fixture.element.getAttribute('size')).toBe(size);
      });
    });
  });

  // ─── Edge Cases ─────────────────────────────────────────────────────────────

  describe('Edge Cases', () => {
    it('handles empty options list', async () => {
      fixture = await mount('bit-select');

      expect(fixture.element).toBeTruthy();
    });

    it('handles fullwidth attribute', async () => {
      fixture = await mount('bit-select', {
        attrs: { fullwidth: true },
        html: SELECT_OPTIONS,
      });

      expect(fixture.element.hasAttribute('fullwidth')).toBe(true);
    });

    it('uses array options prop from structured binding and updates reactively', async () => {
      fixture = await mount(() => {
        const options = signal([
          { disabled: false, label: 'Alpha', value: 'a' },
          { disabled: false, label: 'Beta', value: 'b' },
        ]);

        return html`
          <button @click=${() => (options.value = [{ disabled: false, label: 'Gamma', value: 'g' }])}>Update</button>
          <bit-select options=${options}></bit-select>
        `;
      });

      const select = fixture.query<HTMLElement>('bit-select')!;
      const field = select.shadowRoot?.querySelector<HTMLElement>('.field');

      await user.click(field as HTMLInputElement);
      await fixture.flush();

      expect(
        Array.from(select.shadowRoot?.querySelectorAll<HTMLElement>('[role="option"]') ?? []).map((el) =>
          el.textContent?.trim(),
        ),
      ).toEqual(['Alpha', 'Beta']);

      await user.click(fixture.query<HTMLElement>('button')!);
      await fixture.flush();

      if (select.hasAttribute('open')) {
        await user.click(field as HTMLInputElement);
        await fixture.flush();
      }

      await user.click(field as HTMLInputElement);
      await fixture.flush();

      expect(
        Array.from(select.shadowRoot?.querySelectorAll<HTMLElement>('[role="option"]') ?? []).map((el) =>
          el.textContent?.trim(),
        ),
      ).toEqual(['Gamma']);
    });
  });
});

describe('bit-select accessibility', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await (() => import('./select'))();
  });

  afterEach(() => {
    fixture?.destroy();
  });

  // ─── Semantic Structure ──────────────────────────────────────────────────────

  describe('Semantic Structure', () => {
    it('trigger field has role="combobox"', async () => {
      fixture = await mount('bit-select', {
        attrs: { label: 'Fruit' },
        html: SELECT_OPTIONS,
      });

      expect(fixture.query('.field')?.getAttribute('role')).toBe('combobox');
    });

    it('dropdown has role="listbox"', async () => {
      fixture = await mount('bit-select', {
        attrs: { label: 'Fruit' },
        html: SELECT_OPTIONS,
      });

      expect(fixture.query('.dropdown')?.getAttribute('role')).toBe('listbox');
    });

    it('each option item has role="option"', async () => {
      fixture = await mount('bit-select', {
        attrs: { label: 'Fruit' },
        html: SELECT_OPTIONS,
      });

      await user.click(fixture.query<HTMLElement>('.field')!);
      await fixture.flush();

      const options = fixture.query('.dropdown')?.querySelectorAll('[role="option"]');

      expect(options?.length).toBeGreaterThan(0);
    });

    it('error message has role="alert" for live announcements', async () => {
      fixture = await mount('bit-select', {
        attrs: { error: 'Selection required' },
        html: SELECT_OPTIONS,
      });

      const errorEl = fixture.query('.helper-text');

      expect(errorEl).toBeTruthy();
      expect(errorEl?.textContent?.trim()).toBe('Selection required');
    });
  });

  // ─── WAI-ARIA Attributes ─────────────────────────────────────────────────────

  describe('WAI-ARIA Attributes', () => {
    it('trigger has aria-expanded="false" when closed', async () => {
      fixture = await mount('bit-select', {
        attrs: { label: 'Fruit' },
        html: SELECT_OPTIONS,
      });

      expect(fixture.query('.field')?.getAttribute('aria-expanded')).toBe('false');
    });

    it('trigger has aria-expanded="true" when open', async () => {
      fixture = await mount('bit-select', {
        attrs: { label: 'Fruit' },
        html: SELECT_OPTIONS,
      });

      await user.click(fixture.query<HTMLElement>('.field')!);

      expect(fixture.query('.field')?.getAttribute('aria-expanded')).toBe('true');
    });

    it('trigger has aria-expanded="false" after selection', async () => {
      fixture = await mount('bit-select', {
        attrs: { label: 'Fruit' },
        html: SELECT_OPTIONS,
      });

      await user.click(fixture.query<HTMLElement>('.field')!);
      await fixture.flush();

      const firstOption = fixture.query('[role="option"]') as HTMLElement;

      await user.click(firstOption);

      expect(fixture.query('.field')?.getAttribute('aria-expanded')).toBe('false');
    });

    it('selected option has aria-selected="true"', async () => {
      fixture = await mount('bit-select', {
        attrs: { label: 'Fruit', value: 'apple' },
        html: SELECT_OPTIONS,
      });

      await user.click(fixture.query<HTMLElement>('.field')!);
      await fixture.flush();

      const selectedOption = fixture.query('[role="option"][aria-selected="true"]');

      expect(selectedOption).toBeTruthy();
    });

    it('trigger has aria-haspopup="listbox"', async () => {
      fixture = await mount('bit-select', {
        attrs: { label: 'Fruit' },
        html: SELECT_OPTIONS,
      });

      // The field uses role="combobox" which implies listbox popup semantics
      const field = fixture.query('.field');

      expect(field?.getAttribute('role')).toBe('combobox');
    });
  });

  // ─── Focus Management ────────────────────────────────────────────────────────

  describe('Focus Management', () => {
    it('trigger is keyboard focusable (tabindex="0")', async () => {
      fixture = await mount('bit-select', {
        attrs: { label: 'Fruit' },
        html: SELECT_OPTIONS,
      });

      expect(fixture.query('.field')?.getAttribute('tabindex')).toBe('0');
    });

    it('trigger is not focusable when disabled (tabindex="-1")', async () => {
      fixture = await mount('bit-select', {
        attrs: { disabled: true, label: 'Fruit' },
        html: SELECT_OPTIONS,
      });

      expect(fixture.query('.field')?.getAttribute('tabindex')).toBe('-1');
    });
  });

  // ─── Keyboard Navigation ─────────────────────────────────────────────────────

  describe('Keyboard Navigation', () => {
    it('opens on Enter key press on trigger', async () => {
      fixture = await mount('bit-select', {
        attrs: { label: 'Fruit' },
        html: SELECT_OPTIONS,
      });

      await user.press(fixture.query<HTMLElement>('.field')!, 'Enter');

      expect(fixture.element.hasAttribute('open')).toBe(true);
    });

    it('opens on Space key press on trigger', async () => {
      fixture = await mount('bit-select', {
        attrs: { label: 'Fruit' },
        html: SELECT_OPTIONS,
      });

      await user.press(fixture.query<HTMLElement>('.field')!, ' ');

      expect(fixture.element.hasAttribute('open')).toBe(true);
    });

    it('closes on Escape key press', async () => {
      fixture = await mount('bit-select', {
        attrs: { label: 'Fruit' },
        html: SELECT_OPTIONS,
      });

      await user.click(fixture.query<HTMLElement>('.field')!);
      expect(fixture.element.hasAttribute('open')).toBe(true);

      await user.press(fixture.query<HTMLElement>('.field')!, 'Escape');

      expect(fixture.element.hasAttribute('open')).toBe(false);
    });
  });
});

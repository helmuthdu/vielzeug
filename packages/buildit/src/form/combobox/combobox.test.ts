import { type Fixture, mount, user } from '@vielzeug/craftit/test';

describe('bit-combobox', () => {
  let fixture: Fixture<HTMLElement>;

  beforeAll(async () => {
    await import('./combobox');
  });

  afterEach(() => {
    fixture?.destroy();
  });

  const optionsHtml = `
    <bit-combobox-option value="us">United States</bit-combobox-option>
    <bit-combobox-option value="gb">United Kingdom</bit-combobox-option>
    <bit-combobox-option value="de">Germany</bit-combobox-option>
  `;

  describe('Core Functionality', () => {
    it('renders combobox input and listbox', async () => {
      fixture = await mount('bit-combobox', {
        attrs: { label: 'Country', placeholder: 'Search' },
        html: optionsHtml,
      });

      expect(fixture.query('input[role="combobox"]')).toBeTruthy();
      expect(fixture.query('[role="listbox"]')).toBeTruthy();
    });

    it('emits search while typing', async () => {
      fixture = await mount('bit-combobox', {
        attrs: { label: 'Country' },
        html: optionsHtml,
      });

      const onInput = vi.fn();

      fixture.element.addEventListener('search', onInput);

      await user.type(fixture.query<HTMLInputElement>('input')!, 'uni');

      expect(onInput).toHaveBeenCalled();
      expect((onInput.mock.calls.at(-1)?.[0] as CustomEvent).detail.query).toContain('uni');
    });

    it('emits change when an option is selected', async () => {
      fixture = await mount('bit-combobox', {
        attrs: { label: 'Country' },
        html: optionsHtml,
      });
      await fixture.flush();

      const onChange = vi.fn();

      fixture.element.addEventListener('change', onChange);

      const input = fixture.query<HTMLInputElement>('input[role="combobox"]');

      expect(input).toBeTruthy();
      await user.click(input!);
      await fixture.flush();
      await new Promise((r) => setTimeout(r, 20));

      const firstOption = fixture.query<HTMLElement>('.option');

      expect(firstOption).toBeTruthy();
      await user.click(firstOption!);

      expect(onChange).toHaveBeenCalled();

      const detail = (onChange.mock.calls.at(-1)?.[0] as CustomEvent).detail;

      expect(Array.isArray(detail.values)).toBe(true);
      expect(detail.value).toBe('us');
    });
  });

  describe('Accessibility', () => {
    it('uses proper combobox and listbox roles', async () => {
      fixture = await mount('bit-combobox', {
        attrs: { label: 'Country' },
        html: optionsHtml,
      });

      expect(fixture.query('input')?.getAttribute('role')).toBe('combobox');
      expect(fixture.query('[role="listbox"]')).toBeTruthy();
    });

    it('updates aria-expanded when dropdown opens', async () => {
      fixture = await mount('bit-combobox', {
        attrs: { label: 'Country' },
        html: optionsHtml,
      });

      const input = fixture.query<HTMLInputElement>('input')!;

      expect(input.getAttribute('aria-expanded')).toBe('false');

      await user.click(input);
      await fixture.flush();

      expect(input.getAttribute('aria-expanded')).toBe('true');
    });

    it('provides clear button with screen reader label', async () => {
      fixture = await mount('bit-combobox', {
        attrs: { clearable: '', label: 'Country', value: 'us' },
        html: optionsHtml,
      });

      expect(fixture.query('.clear-btn')?.getAttribute('aria-label')).toBe('Clear');
    });

    it('announces helper or error text via polite live region', async () => {
      fixture = await mount('bit-combobox', {
        attrs: { helper: 'Use arrow keys', label: 'Country' },
        html: optionsHtml,
      });

      expect(fixture.query('.helper-text')?.getAttribute('aria-live')).toBe('polite');
      expect(fixture.query('.helper-text')?.textContent).toContain('Use arrow keys');
    });

    it('supports keyboard selection with Enter after ArrowDown', async () => {
      fixture = await mount('bit-combobox', {
        attrs: { label: 'Country' },
        html: optionsHtml,
      });

      const onChange = vi.fn();

      fixture.element.addEventListener('change', onChange);

      const input = fixture.query<HTMLInputElement>('input')!;

      input.focus();
      await user.press(input, 'ArrowDown');
      await user.press(input, 'Enter');

      expect(onChange).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('shows create row when creatable and query has no matches', async () => {
      fixture = await mount('bit-combobox', {
        attrs: { creatable: '', label: 'Country' },
        html: optionsHtml,
      });

      const input = fixture.query<HTMLInputElement>('input')!;

      await user.type(input, 'Atlantis');
      await fixture.flush();
      await new Promise((r) => setTimeout(r, 20));

      expect(fixture.query('.no-results-create')?.textContent).toContain('Create "Atlantis"');
    });

    it('renders selected chips in multiple mode', async () => {
      fixture = await mount('bit-combobox', {
        attrs: { label: 'Country', multiple: '', value: 'us,gb' },
        html: optionsHtml,
      });
      await fixture.flush();

      expect(fixture.queryAll('bit-chip').length).toBeGreaterThan(0);
    });

    it('applies color to rendered chips in multiple mode', async () => {
      fixture = await mount('bit-combobox', {
        attrs: { color: 'primary', label: 'Country', multiple: '', value: 'us,gb' },
        html: optionsHtml,
      });
      await fixture.flush();

      expect(fixture.query('bit-chip')?.getAttribute('color')).toBe('primary');
    });

    it('updates rendered chip color when combobox color changes', async () => {
      fixture = await mount('bit-combobox', {
        attrs: { color: 'primary', label: 'Country', multiple: '', value: 'us,gb' },
        html: optionsHtml,
      });
      await fixture.flush();

      await fixture.attr('color', 'success');
      await fixture.flush();

      expect(fixture.query('bit-chip')?.getAttribute('color')).toBe('success');
    });

    it('removes a chip when its remove button is clicked', async () => {
      fixture = await mount('bit-combobox', {
        attrs: { label: 'Country', multiple: '', value: 'us,gb' },
        html: optionsHtml,
      });

      const onChange = vi.fn();

      fixture.element.addEventListener('change', onChange);
      await fixture.flush();

      const chip = fixture.query<HTMLElement>('bit-chip');
      const removeBtn = chip?.shadowRoot?.querySelector<HTMLButtonElement>('.remove-btn');

      expect(removeBtn).toBeTruthy();

      await user.click(removeBtn!);
      await fixture.flush();

      expect(fixture.queryAll('bit-chip').length).toBe(1);
      expect(onChange).toHaveBeenCalled();
      expect((onChange.mock.calls.at(-1)?.[0] as CustomEvent).detail.values).toEqual(['gb']);
    });

    it('updates option selected state immediately in multiple mode without reopening', async () => {
      fixture = await mount('bit-combobox', {
        attrs: { label: 'Country', multiple: '' },
        html: optionsHtml,
      });

      const input = fixture.query<HTMLInputElement>('input[role="combobox"]');

      expect(input).toBeTruthy();

      await user.click(input!);
      await fixture.flush();
      await new Promise((r) => setTimeout(r, 20));

      const usOption = fixture
        .queryAll<HTMLElement>('.option')
        .find((opt) => opt.textContent?.includes('United States')) as HTMLElement;
      const gbOption = fixture
        .queryAll<HTMLElement>('.option')
        .find((opt) => opt.textContent?.includes('United Kingdom')) as HTMLElement;

      expect(usOption).toBeTruthy();
      expect(gbOption).toBeTruthy();

      await user.click(usOption);
      await fixture.flush();

      expect(fixture.element.hasAttribute('open')).toBe(true);
      expect(usOption.hasAttribute('data-selected')).toBe(true);

      await user.click(gbOption);
      await fixture.flush();

      expect(usOption.hasAttribute('data-selected')).toBe(true);
      expect(gbOption.hasAttribute('data-selected')).toBe(true);
      expect(fixture.queryAll('.option[data-selected]').length).toBe(2);

      await user.click(usOption);
      await fixture.flush();

      expect(usOption.hasAttribute('data-selected')).toBe(false);
      expect(gbOption.hasAttribute('data-selected')).toBe(true);
      expect(fixture.queryAll('.option[data-selected]').length).toBe(1);
    });

    it('normalizes csv values in single mode to the first value', async () => {
      fixture = await mount('bit-combobox', {
        attrs: { label: 'Country', value: 'us,gb' },
        html: optionsHtml,
      });
      await fixture.flush();

      const input = fixture.query<HTMLInputElement>('input[role="combobox"]');

      expect(input?.value).toBe('United States');
    });
  });
});

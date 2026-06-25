import { html } from '@vielzeug/ore';
import { type Fixture, mount, user } from '@vielzeug/ore/testing';
import { signal } from '@vielzeug/ripple';

describe('ore-combobox', () => {
  let fixture: Fixture<HTMLElement>;

  type ComboboxHost = HTMLElement & { value?: string };

  beforeAll(async () => {
    await (() => import('./combobox'))();
  });

  afterEach(() => {
    fixture?.destroy();
  });

  /**
   * The raw <input> lives inside ore-input's shadow DOM, which is itself inside
   * the combobox shadow DOM. This helper pierces both levels.
   */
  const getInput = (root: ShadowRoot | null | undefined = fixture.element.shadowRoot) =>
    root?.querySelector('ore-input.trigger')?.shadowRoot?.querySelector<HTMLInputElement>('input') ?? null;

  const optionsHtml = `
    <ore-combobox-option value="us">United States</ore-combobox-option>
    <ore-combobox-option value="gb">United Kingdom</ore-combobox-option>
    <ore-combobox-option value="de">Germany</ore-combobox-option>
  `;

  describe('Core Functionality', () => {
    it('renders combobox input and listbox', async () => {
      fixture = await mount('ore-combobox', {
        attrs: { label: 'Country', placeholder: 'Search' },
        html: optionsHtml,
      });

      expect(getInput()).toBeTruthy();
      expect(fixture.query('[role="listbox"]')).toBeTruthy();
    });

    it('emits search while typing', async () => {
      fixture = await mount('ore-combobox', {
        attrs: { label: 'Country' },
        html: optionsHtml,
      });

      const onInput = vi.fn();

      fixture.element.addEventListener('search', onInput);

      await user.type(getInput()!, 'uni');

      expect(onInput).toHaveBeenCalled();
      expect((onInput.mock.calls.at(-1)?.[0] as CustomEvent).detail.query).toContain('uni');
    });

    it('emits open/close events with reason details', async () => {
      fixture = await mount('ore-combobox', {
        attrs: { label: 'Country' },
        html: optionsHtml,
      });

      const onOpen = vi.fn();
      const onClose = vi.fn();

      fixture.element.addEventListener('open', onOpen);
      fixture.element.addEventListener('close', onClose);

      const input = getInput()!;

      await user.click(input);
      await fixture.flush();
      await user.press(input, 'Escape');
      await fixture.flush();

      expect(onOpen).toHaveBeenCalled();
      expect((onOpen.mock.calls.at(-1)?.[0] as CustomEvent).detail.reason).toBe('click');
      expect(onClose).toHaveBeenCalled();
      expect((onClose.mock.calls.at(-1)?.[0] as CustomEvent).detail.reason).toBe('escape');
    });

    it('emits trigger open reason when Enter opens a closed combobox', async () => {
      fixture = await mount('ore-combobox', {
        attrs: { label: 'Country' },
        html: optionsHtml,
      });

      const onOpen = vi.fn();

      fixture.element.addEventListener('open', onOpen);

      const input = getInput()!;

      await user.press(input, 'Enter');
      await fixture.flush();

      expect((onOpen.mock.calls.at(-1)?.[0] as CustomEvent).detail.reason).toBe('keyboard');
    });

    it('emits outsideClick close reason when clicking away from the popup', async () => {
      fixture = await mount('ore-combobox', {
        attrs: { label: 'Country' },
        html: optionsHtml,
      });

      const onClose = vi.fn();

      fixture.element.addEventListener('close', onClose);

      const input = getInput()!;

      await user.click(input);
      await fixture.flush();

      document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }));
      await fixture.flush();

      expect((onClose.mock.calls.at(-1)?.[0] as CustomEvent).detail.reason).toBe('outsideClick');
    });

    it('emits programmatic close reason after selecting an option in single mode', async () => {
      fixture = await mount('ore-combobox', {
        attrs: { label: 'Country' },
        html: optionsHtml,
      });

      const onClose = vi.fn();

      fixture.element.addEventListener('close', onClose);

      const input = getInput()!;

      await user.click(input);
      await fixture.flush();
      await new Promise((resolve) => setTimeout(resolve, 20));
      await user.click(fixture.query<HTMLElement>('.option')!);
      await fixture.flush();

      expect((onClose.mock.calls.at(-1)?.[0] as CustomEvent).detail.reason).toBe('programmatic');
    });

    it('emits change when an option is selected', async () => {
      fixture = await mount('ore-combobox', {
        attrs: { label: 'Country' },
        html: optionsHtml,
      });
      await fixture.flush();

      const onChange = vi.fn();

      fixture.element.addEventListener('change', onChange);

      const input = getInput();

      expect(input).toBeTruthy();
      await user.click(input!);
      await fixture.flush();
      await new Promise((resolve) => setTimeout(resolve, 20));

      const firstOption = fixture.query<HTMLElement>('.option');

      expect(firstOption).toBeTruthy();
      await user.click(firstOption!);

      expect(onChange).toHaveBeenCalled();

      const detail = (onChange.mock.calls.at(-1)?.[0] as CustomEvent).detail;

      expect(Array.isArray(detail.values)).toBe(true);
      expect(detail.labels).toEqual(['United States']);
      expect(detail.values?.[0]).toBe('us');
    });

    it('shows all options when reopened after a selection', async () => {
      fixture = await mount('ore-combobox', {
        attrs: { label: 'Country' },
        html: optionsHtml,
      });
      await fixture.flush();

      const input = getInput()!;

      // Open and select first option
      await user.click(input);
      await fixture.flush();
      await new Promise((resolve) => setTimeout(resolve, 20));
      await user.click(fixture.query<HTMLElement>('.option')!);
      await fixture.flush();

      // Reopen
      await user.click(input);
      await fixture.flush();
      await new Promise((resolve) => setTimeout(resolve, 20));

      const options = fixture.queryAll<HTMLElement>('.option');

      expect(options.length).toBe(3);
    });

    it('keeps selected value and visible input text after reopen + escape close', async () => {
      fixture = await mount('ore-combobox', {
        attrs: { label: 'Country' },
        html: optionsHtml,
      });
      await fixture.flush();

      const input = getInput()!;

      await user.click(input);
      await fixture.flush();
      await new Promise((resolve) => setTimeout(resolve, 20));
      await user.click(fixture.queryAll<HTMLElement>('.option')[0]!);
      await fixture.flush();

      expect(input.value).toBe('United States');
      expect((fixture.element as ComboboxHost).value).toBe('us');

      await user.click(input);
      await fixture.flush();
      await user.press(input, 'Escape');
      await fixture.flush();

      expect((fixture.element as ComboboxHost).value).toBe('us');
      expect(input.value).toBe('United States');
    });

    it('keeps selected value and visible input text after reopen + outside click close', async () => {
      fixture = await mount('ore-combobox', {
        attrs: { label: 'Country' },
        html: optionsHtml,
      });
      await fixture.flush();

      const input = getInput()!;

      await user.click(input);
      await fixture.flush();
      await new Promise((resolve) => setTimeout(resolve, 20));
      await user.click(fixture.queryAll<HTMLElement>('.option')[0]!);
      await fixture.flush();

      await user.click(input);
      await fixture.flush();

      document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }));
      await fixture.flush();

      expect((fixture.element as ComboboxHost).value).toBe('us');
      expect(input.value).toBe('United States');
    });

    it('keeps previous selection when typing without committing a new option', async () => {
      fixture = await mount('ore-combobox', {
        attrs: { label: 'Country' },
        html: optionsHtml,
      });
      await fixture.flush();

      const input = getInput()!;

      await user.click(input);
      await fixture.flush();
      await new Promise((resolve) => setTimeout(resolve, 20));
      await user.click(fixture.queryAll<HTMLElement>('.option')[0]!);
      await fixture.flush();

      expect((fixture.element as ComboboxHost).value).toBe('us');

      await user.click(input);
      await fixture.flush();
      await user.type(input, 'Ger');
      await fixture.flush();

      expect((fixture.element as ComboboxHost).value).toBe('us');

      document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }));
      await fixture.flush();

      expect((fixture.element as ComboboxHost).value).toBe('us');
      expect(input.value).toBe('United States');
    });
  });

  describe('Accessibility', () => {
    it('uses inset label placement by default', async () => {
      fixture = await mount('ore-combobox', {
        attrs: { label: 'Country' },
        html: optionsHtml,
      });

      const label = fixture.element.shadowRoot
        ?.querySelector('ore-input.trigger')
        ?.shadowRoot?.querySelector<HTMLElement>('.label');

      expect(label?.hidden).toBe(false);
    });

    it('shows label when label-placement is outside', async () => {
      fixture = await mount('ore-combobox', {
        attrs: { label: 'Country', 'label-placement': 'outside' },
        html: optionsHtml,
      });

      const label = fixture.element.shadowRoot
        ?.querySelector('ore-input.trigger')
        ?.shadowRoot?.querySelector<HTMLElement>('.label');

      expect(label?.hidden).toBe(false);
    });

    it('uses proper combobox and listbox roles', async () => {
      fixture = await mount('ore-combobox', {
        attrs: { label: 'Country' },
        html: optionsHtml,
      });

      expect(getInput()?.getAttribute('role')).toBe('combobox');
      expect(fixture.query('[role="listbox"]')).toBeTruthy();
    });

    it('updates aria-expanded when dropdown opens', async () => {
      fixture = await mount('ore-combobox', {
        attrs: { label: 'Country' },
        html: optionsHtml,
      });

      const input = getInput()!;

      expect(input.getAttribute('aria-expanded')).toBe('false');

      await user.click(input);
      await fixture.flush();

      expect(input.getAttribute('aria-expanded')).toBe('true');
    });

    it('provides clear button with screen reader label', async () => {
      fixture = await mount('ore-combobox', {
        attrs: { clearable: '', label: 'Country', value: 'us' },
        html: optionsHtml,
      });

      expect(fixture.query('.clear-btn')?.getAttribute('aria-label')).toBe('Clear');
    });

    it('announces helper or error text via polite live region', async () => {
      fixture = await mount('ore-combobox', {
        attrs: { helper: 'Use arrow keys', label: 'Country' },
        html: optionsHtml,
      });

      const helperEl = fixture.element.shadowRoot
        ?.querySelector('ore-input.trigger')
        ?.shadowRoot?.querySelector<HTMLElement>('.helper-text');

      expect(helperEl?.getAttribute('aria-live')).toBe('polite');
      expect(helperEl?.textContent).toContain('Use arrow keys');
    });

    it('supports keyboard selection with Enter after ArrowDown', async () => {
      fixture = await mount('ore-combobox', {
        attrs: { label: 'Country' },
        html: optionsHtml,
      });

      const onChange = vi.fn();

      fixture.element.addEventListener('change', onChange);

      const input = getInput()!;

      input.focus();
      await user.press(input, 'ArrowDown');
      await user.press(input, 'Enter');

      expect(onChange).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('shows create row when creatable and query has no matches', async () => {
      fixture = await mount('ore-combobox', {
        attrs: { creatable: '', label: 'Country' },
        html: optionsHtml,
      });

      const input = getInput()!;

      // Open the dropdown first, then type a query with no matches.
      await user.click(input);
      await fixture.flush();
      await new Promise((resolve) => setTimeout(resolve, 20));

      // Type a non-matching query to trigger the creatable row.
      // Use direct DOM manipulation + dispatching events to ensure the handler fires.
      input.value = 'Atlantis';
      input.dispatchEvent(new InputEvent('input', { bubbles: true, data: 'Atlantis', inputType: 'insertText' }));
      await fixture.flush();
      await new Promise((resolve) => setTimeout(resolve, 30));
      await fixture.flush();

      expect(fixture.query('.no-results-create')?.textContent).toContain('Create "Atlantis"');
    });

    it('renders selected chips in multiple mode', async () => {
      fixture = await mount('ore-combobox', {
        attrs: { label: 'Country', multiple: '', value: 'us,gb' },
        html: optionsHtml,
      });
      await fixture.flush();

      expect(fixture.queryAll('ore-chip').length).toBeGreaterThan(0);
    });

    it('filters options while typing in multiple mode', async () => {
      fixture = await mount('ore-combobox', {
        attrs: { label: 'Country', multiple: '' },
        html: optionsHtml,
      });

      const input = getInput()!;

      await user.click(input);
      await user.type(input, 'ger');
      await fixture.flush();
      await new Promise((resolve) => setTimeout(resolve, 20));

      const optionTexts = fixture.queryAll<HTMLElement>('.option').map((option) => option.textContent ?? '');

      expect(optionTexts.some((text) => text.includes('Germany'))).toBe(true);
      expect(optionTexts.some((text) => text.includes('United States'))).toBe(false);
    });

    it('shrinks list height when search narrows results', async () => {
      fixture = await mount('ore-combobox', {
        attrs: { label: 'Country' },
        html: `
          <ore-combobox-option value="us">United States</ore-combobox-option>
          <ore-combobox-option value="gb">United Kingdom</ore-combobox-option>
          <ore-combobox-option value="de">Germany</ore-combobox-option>
          <ore-combobox-option value="ca">Canada</ore-combobox-option>
          <ore-combobox-option value="jp">Japan</ore-combobox-option>
          <ore-combobox-option value="br">Brazil</ore-combobox-option>
        `,
      });

      const input = getInput()!;

      await user.click(input);
      await fixture.flush();
      await new Promise((resolve) => setTimeout(resolve, 20));

      const listbox = fixture.query<HTMLElement>('[role="listbox"]')!;
      const initialHeight = Number.parseFloat(listbox.style.height || '0');

      expect(initialHeight).toBeGreaterThan(0);

      await user.type(input, 'ger');
      await fixture.flush();
      await new Promise((resolve) => setTimeout(resolve, 20));

      const filteredHeight = Number.parseFloat(listbox.style.height || '0');

      expect(fixture.queryAll<HTMLElement>('.option').length).toBe(1);
      expect(filteredHeight).toBeLessThan(initialHeight);
      expect(filteredHeight).toBe(36);
    });

    it('repositions filtered results to the top when the match was originally later in the list', async () => {
      fixture = await mount('ore-combobox', {
        attrs: { label: 'Country' },
        html: `
          <ore-combobox-option value="us">United States</ore-combobox-option>
          <ore-combobox-option value="gb">United Kingdom</ore-combobox-option>
          <ore-combobox-option value="de">Germany</ore-combobox-option>
          <ore-combobox-option value="ca">Canada</ore-combobox-option>
        `,
      });

      const input = getInput()!;

      await user.click(input);
      await fixture.flush();
      await new Promise((resolve) => setTimeout(resolve, 20));

      await user.type(input, 'king');
      await fixture.flush();
      await new Promise((resolve) => setTimeout(resolve, 20));

      const options = fixture.queryAll<HTMLElement>('.option');

      expect(options).toHaveLength(1);
      expect(options[0]?.textContent).toContain('United Kingdom');
      expect(options[0]?.style.transform).toContain('translateY(0px)');
    });

    it('continues searching in the docs multiselect flow after selecting the first item', async () => {
      fixture = await mount('ore-combobox', {
        attrs: { label: 'Technologies', multiple: '', placeholder: 'Search…' },
        html: `
          <ore-combobox-option value="ts">TypeScript</ore-combobox-option>
          <ore-combobox-option value="rust">Rust</ore-combobox-option>
          <ore-combobox-option value="go">Go</ore-combobox-option>
          <ore-combobox-option value="python">Python</ore-combobox-option>
          <ore-combobox-option value="java">Java</ore-combobox-option>
        `,
      });

      const input = getInput()!;

      await user.click(input);
      await fixture.flush();
      await new Promise((resolve) => setTimeout(resolve, 20));

      const firstOption = fixture
        .queryAll<HTMLElement>('.option')
        .find((opt) => opt.textContent?.includes('TypeScript')) as HTMLElement;

      expect(firstOption).toBeTruthy();

      await user.click(firstOption);
      await fixture.flush();
      await new Promise((resolve) => setTimeout(resolve, 20));

      await user.click(fixture.query<HTMLElement>('ore-input.trigger')!);
      await user.type(input, 'ru');
      await fixture.flush();
      await new Promise((resolve) => setTimeout(resolve, 20));

      const optionTexts = fixture.queryAll<HTMLElement>('.option').map((option) => option.textContent ?? '');

      expect(input.getAttribute('placeholder')).toBe('');
      expect(optionTexts.some((text) => text.includes('Rust'))).toBe(true);
      expect(optionTexts.some((text) => text.includes('TypeScript'))).toBe(false);
    });

    it('restores focus to the live input after multiselect chip re-render', async () => {
      fixture = await mount('ore-combobox', {
        attrs: { label: 'Technologies', multiple: '', placeholder: 'Search...' },
        html: `
          <ore-combobox-option value="ts">TypeScript</ore-combobox-option>
          <ore-combobox-option value="rust">Rust</ore-combobox-option>
          <ore-combobox-option value="go">Go</ore-combobox-option>
        `,
      });

      const getLocalInput = () =>
        fixture.element.shadowRoot
          ?.querySelector('ore-input.trigger')
          ?.shadowRoot?.querySelector<HTMLInputElement>('input') ?? null;

      const initialInput = getLocalInput();

      if (!initialInput) throw new Error('Expected combobox input to exist before first click');

      await user.click(initialInput);
      await fixture.flush();
      await new Promise((resolve) => setTimeout(resolve, 20));

      await user.click(fixture.queryAll<HTMLElement>('.option')[0]!);
      await fixture.flush();
      await new Promise((resolve) => setTimeout(resolve, 20));

      await user.click(fixture.query<HTMLElement>('ore-input.trigger')!);
      await fixture.flush();

      const liveInput = getLocalInput();

      if (!liveInput) throw new Error('Expected combobox input to exist after chip re-render');

      expect(fixture.element.shadowRoot?.querySelector('ore-input.trigger')?.shadowRoot?.activeElement).toBe(liveInput);

      await user.type(liveInput, 'ru');
      await fixture.flush();

      const optionTexts = fixture.queryAll<HTMLElement>('.option').map((option) => option.textContent ?? '');

      expect(optionTexts.some((text) => text.includes('Rust'))).toBe(true);
    });

    it('selects filtered results with Enter after the first multiselect value', async () => {
      fixture = await mount('ore-combobox', {
        attrs: { label: 'Country', multiple: '' },
        html: optionsHtml,
      });

      const onChange = vi.fn();

      fixture.element.addEventListener('change', onChange);

      const input = getInput()!;

      await user.click(input);
      await fixture.flush();
      await new Promise((resolve) => setTimeout(resolve, 20));

      await user.click(fixture.queryAll<HTMLElement>('.option')[0]!);
      await fixture.flush();

      await user.type(input, 'ger');
      await user.press(input, 'Enter');
      await fixture.flush();

      const detail = (onChange.mock.calls.at(-1)?.[0] as CustomEvent).detail;

      expect(detail.values).toContain('us');
      expect(detail.values).toContain('de');
    });

    it('applies color to rendered chips in multiple mode', async () => {
      fixture = await mount('ore-combobox', {
        attrs: { color: 'primary', label: 'Country', multiple: '', value: 'us,gb' },
        html: optionsHtml,
      });
      await fixture.flush();

      expect(fixture.query('ore-chip')?.getAttribute('color')).toBe('primary');
    });

    it('updates rendered chip color when combobox color changes', async () => {
      fixture = await mount('ore-combobox', {
        attrs: { color: 'primary', label: 'Country', multiple: '', value: 'us,gb' },
        html: optionsHtml,
      });
      await fixture.flush();

      await fixture.attr('color', 'success');
      await fixture.flush();

      expect(fixture.query('ore-chip')?.getAttribute('color')).toBe('success');
    });

    it('removes a chip when its remove button is clicked', async () => {
      fixture = await mount('ore-combobox', {
        attrs: { label: 'Country', multiple: '', value: 'us,gb' },
        html: optionsHtml,
      });

      const onChange = vi.fn();

      fixture.element.addEventListener('change', onChange);
      await fixture.flush();

      const chip = fixture.query<HTMLElement>('ore-chip');

      const removeBtn = chip?.shadowRoot?.querySelector<HTMLButtonElement>('[part="remove-btn"]');

      expect(removeBtn).toBeTruthy();

      await user.click(removeBtn!);
      await fixture.flush();

      expect(fixture.queryAll('ore-chip').length).toBe(1);
      expect(onChange).toHaveBeenCalled();
      expect((onChange.mock.calls.at(-1)?.[0] as CustomEvent).detail.values).toEqual(['gb']);
      expect((onChange.mock.calls.at(-1)?.[0] as CustomEvent).detail.originalEvent).toBeDefined();
    });

    it('emits change with originalEvent when cleared via clear button', async () => {
      fixture = await mount('ore-combobox', {
        attrs: { clearable: '', label: 'Country', value: 'us' },
        html: optionsHtml,
      });

      const onChange = vi.fn();

      fixture.element.addEventListener('change', onChange);

      await user.click(fixture.query<HTMLElement>('.clear-btn')!);
      await fixture.flush();

      const detail = (onChange.mock.calls.at(-1)?.[0] as CustomEvent).detail;

      expect(detail.values).toEqual([]);
      expect(detail.originalEvent).toBeDefined();
    });

    it('filters already-selected options from multiselect results without reopening', async () => {
      fixture = await mount('ore-combobox', {
        attrs: { label: 'Country', multiple: '' },
        html: optionsHtml,
      });

      const input = getInput();

      expect(input).toBeTruthy();

      await user.click(input!);
      await fixture.flush();
      await new Promise((resolve) => setTimeout(resolve, 20));

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
      expect(fixture.queryAll<HTMLElement>('.option').some((opt) => opt.textContent?.includes('United States'))).toBe(
        false,
      );
      expect(fixture.queryAll('.option')).toHaveLength(2);

      const updatedGbOption = fixture
        .queryAll<HTMLElement>('.option')
        .find((opt) => opt.textContent?.includes('United Kingdom')) as HTMLElement;

      expect(updatedGbOption).toBeTruthy();

      await user.click(updatedGbOption);
      await fixture.flush();

      const remainingOptionTexts = fixture.queryAll<HTMLElement>('.option').map((opt) => opt.textContent ?? '');

      expect(remainingOptionTexts.some((text) => text.includes('United States'))).toBe(false);
      expect(remainingOptionTexts.some((text) => text.includes('United Kingdom'))).toBe(false);
      expect(remainingOptionTexts.some((text) => text.includes('Germany'))).toBe(true);
      expect(fixture.queryAll('.option')).toHaveLength(1);
    });

    it('pre-focuses the selected option when reopening the dropdown in single-select mode', async () => {
      fixture = await mount('ore-combobox', {
        attrs: { label: 'Country', value: 'gb' },
        html: optionsHtml,
      });
      await fixture.flush();

      const input = getInput()!;

      await user.click(input);
      await fixture.flush();
      await new Promise((resolve) => setTimeout(resolve, 20));

      const focused = fixture.query<HTMLElement>('.option[data-focused]');

      expect(focused).toBeTruthy();
      expect(focused?.textContent).toContain('United Kingdom');
    });

    it('keeps the selected option visually marked when reopening in single-select mode', async () => {
      fixture = await mount('ore-combobox', {
        attrs: { label: 'Country' },
        html: optionsHtml,
      });
      await fixture.flush();

      const input = getInput()!;

      await user.click(input);
      await fixture.flush();
      await new Promise((resolve) => setTimeout(resolve, 20));
      await user.click(fixture.queryAll<HTMLElement>('.option')[1]!);
      await fixture.flush();

      await user.click(input);
      await fixture.flush();
      await new Promise((resolve) => setTimeout(resolve, 20));

      const selectedOption = fixture
        .queryAll<HTMLElement>('.option')
        .find((option) => option.textContent?.includes('United Kingdom'));

      expect(selectedOption).toBeTruthy();
      expect(selectedOption?.getAttribute('aria-selected')).toBe('true');
      expect(selectedOption?.hasAttribute('data-selected')).toBe(true);
    });

    it('normalizes csv values in single mode to the first value', async () => {
      fixture = await mount('ore-combobox', {
        attrs: { label: 'Country', value: 'us,gb' },
        html: optionsHtml,
      });
      await fixture.flush();

      const input = getInput();

      expect(input?.value).toBe('United States');
    });

    it('uses array options prop from structured binding and updates reactively', async () => {
      let optionsRef: ReturnType<typeof signal<Array<{ label: string; value: string }>>> | undefined;

      fixture = await mount(() => {
        const options = signal([
          { label: 'Alpha', value: 'a' },
          { label: 'Beta', value: 'b' },
        ]);

        optionsRef = options;

        return html`<ore-combobox options=${options}></ore-combobox>`;
      });

      const combobox = fixture.query<HTMLElement>('ore-combobox')!;
      const input =
        combobox.shadowRoot?.querySelector('ore-input.trigger')?.shadowRoot?.querySelector<HTMLInputElement>('input') ??
        null;

      await user.click(input as HTMLInputElement);
      await fixture.flush();

      expect(
        Array.from(combobox.shadowRoot?.querySelectorAll<HTMLElement>('.option') ?? []).map((el) =>
          el.textContent?.replace(/\s+/g, ' ').trim(),
        ),
      ).toEqual(['Alpha', 'Beta']);

      optionsRef!.value = [{ label: 'Gamma', value: 'g' }];
      await fixture.flush();
      await user.click(input as HTMLInputElement);
      await fixture.flush();

      expect(
        Array.from(combobox.shadowRoot?.querySelectorAll<HTMLElement>('.option') ?? []).map((el) =>
          el.textContent?.replace(/\s+/g, ' ').trim(),
        ),
      ).toEqual(['Gamma']);
    });

    it('defaults JS option labels to their value when label is omitted', async () => {
      fixture = await mount(() => {
        const options = signal([{ value: 'alpha' }]);

        return html`<ore-combobox options=${options}></ore-combobox>`;
      });

      const combobox = fixture.query<HTMLElement>('ore-combobox')!;
      const input =
        combobox.shadowRoot?.querySelector('ore-input.trigger')?.shadowRoot?.querySelector<HTMLInputElement>('input') ??
        null;

      await user.click(input as HTMLInputElement);
      await fixture.flush();
      await new Promise((resolve) => setTimeout(resolve, 20));

      expect(
        Array.from(combobox.shadowRoot?.querySelectorAll<HTMLElement>('.option') ?? []).map((el) =>
          el.textContent?.replace(/\s+/g, ' ').trim(),
        ),
      ).toEqual(['alpha']);
    });
  });

  describe('Accessibility', () => {
    it('passes axe checks when closed', async () => {
      fixture = await mount('ore-combobox', {
        attrs: { label: 'Country' },
        html: '<option value="us">United States</option><option value="uk">United Kingdom</option>',
      });

      const results = await axeCheck(fixture.element);

      expect(results.violations).toHaveLength(0);
    });
  });
});

import { fireClick, fireInput, fireKeyDown } from '@vielzeug/assay';
import { html } from '@vielzeug/ore';
import { type Fixture, mount } from '@vielzeug/ore/testing';
import { signal } from '@vielzeug/ripple';

describe('ore-combobox', () => {
  let fixture: Fixture<HTMLElement>;

  type ComboboxHost = HTMLElement & { value?: string };

  beforeAll(async () => {
    await (() => import('./combobox'))();
  });

  afterEach(() => {
    fixture?.dispose();
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

      getInput()!.value += 'uni';
      fireInput(getInput()!);

      expect(onInput).toHaveBeenCalled();
      expect((onInput.mock.calls.at(-1)?.[0] as CustomEvent).detail.query).toContain('uni');
    });

    it('emits open-change events with state and reason details', async () => {
      fixture = await mount('ore-combobox', {
        attrs: { label: 'Country' },
        html: optionsHtml,
      });

      const onOpenChange = vi.fn();

      fixture.element.addEventListener('open-change', onOpenChange);

      const input = getInput()!;

      fireClick(input);
      await fixture.flush();
      fireKeyDown(input, { key: 'Escape' });
      await fixture.flush();

      expect((onOpenChange.mock.calls[0]?.[0] as CustomEvent).detail).toEqual({ open: true, reason: 'click' });
      expect((onOpenChange.mock.calls.at(-1)?.[0] as CustomEvent).detail).toEqual({ open: false, reason: 'escape' });
    });

    it('emits a keyboard open-change when Enter opens a closed combobox', async () => {
      fixture = await mount('ore-combobox', {
        attrs: { label: 'Country' },
        html: optionsHtml,
      });

      const onOpenChange = vi.fn();

      fixture.element.addEventListener('open-change', onOpenChange);

      const input = getInput()!;

      fireKeyDown(input, { key: 'Enter' });
      await fixture.flush();

      expect((onOpenChange.mock.calls.at(-1)?.[0] as CustomEvent).detail).toEqual({ open: true, reason: 'keyboard' });
    });

    it('emits an outsideClick open-change when clicking away from the popup', async () => {
      fixture = await mount('ore-combobox', {
        attrs: { label: 'Country' },
        html: optionsHtml,
      });

      const onOpenChange = vi.fn();

      fixture.element.addEventListener('open-change', onOpenChange);

      const input = getInput()!;

      fireClick(input);
      await fixture.flush();

      document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }));
      await fixture.flush();

      expect((onOpenChange.mock.calls.at(-1)?.[0] as CustomEvent).detail).toEqual({
        open: false,
        reason: 'outsideClick',
      });
    });

    it('emits a programmatic open-change after selecting an option in single mode', async () => {
      fixture = await mount('ore-combobox', {
        attrs: { label: 'Country' },
        html: optionsHtml,
      });

      const onOpenChange = vi.fn();

      fixture.element.addEventListener('open-change', onOpenChange);

      const input = getInput()!;

      fireClick(input);
      await fixture.flush();
      await new Promise((resolve) => setTimeout(resolve, 20));
      fireClick(fixture.query<HTMLElement>('.option')!);
      await fixture.flush();

      expect((onOpenChange.mock.calls.at(-1)?.[0] as CustomEvent).detail).toEqual({
        open: false,
        reason: 'programmatic',
      });
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
      fireClick(input!);
      await fixture.flush();
      await new Promise((resolve) => setTimeout(resolve, 20));

      const firstOption = fixture.query<HTMLElement>('.option');

      expect(firstOption).toBeTruthy();
      fireClick(firstOption!);

      expect(onChange).toHaveBeenCalled();

      const target = (onChange.mock.calls.at(-1)?.[0] as Event).target as HTMLElement & { value: string };

      expect(target.value).toBe('us');
    });

    it('shows all options when reopened after a selection', async () => {
      fixture = await mount('ore-combobox', {
        attrs: { label: 'Country' },
        html: optionsHtml,
      });
      await fixture.flush();

      const input = getInput()!;

      // Open and select first option
      fireClick(input);
      await fixture.flush();
      await new Promise((resolve) => setTimeout(resolve, 20));
      fireClick(fixture.query<HTMLElement>('.option')!);
      await fixture.flush();

      // Reopen
      fireClick(input);
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

      fireClick(input);
      await fixture.flush();
      await new Promise((resolve) => setTimeout(resolve, 20));
      fireClick(fixture.queryAll<HTMLElement>('.option')[0]!);
      await fixture.flush();

      expect(input.value).toBe('United States');
      expect((fixture.element as ComboboxHost).value).toBe('us');

      fireClick(input);
      await fixture.flush();
      fireKeyDown(input, { key: 'Escape' });
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

      fireClick(input);
      await fixture.flush();
      await new Promise((resolve) => setTimeout(resolve, 20));
      fireClick(fixture.queryAll<HTMLElement>('.option')[0]!);
      await fixture.flush();

      fireClick(input);
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

      fireClick(input);
      await fixture.flush();
      await new Promise((resolve) => setTimeout(resolve, 20));
      fireClick(fixture.queryAll<HTMLElement>('.option')[0]!);
      await fixture.flush();

      expect((fixture.element as ComboboxHost).value).toBe('us');

      fireClick(input);
      await fixture.flush();
      input.value += 'Ger';
      fireInput(input);
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

      fireClick(input);
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
      fireKeyDown(input, { key: 'ArrowDown' });
      fireKeyDown(input, { key: 'Enter' });

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
      fireClick(input);
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

      fireClick(input);
      input.value += 'ger';
      fireInput(input);
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

      fireClick(input);
      await fixture.flush();
      await new Promise((resolve) => setTimeout(resolve, 20));

      const listbox = fixture.query<HTMLElement>('[role="listbox"]')!;
      const initialHeight = Number.parseFloat(listbox.style.height || '0');

      expect(initialHeight).toBeGreaterThan(0);

      input.value += 'ger';
      fireInput(input);
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

      fireClick(input);
      await fixture.flush();
      await new Promise((resolve) => setTimeout(resolve, 20));

      input.value += 'king';
      fireInput(input);
      await fixture.flush();
      await new Promise((resolve) => setTimeout(resolve, 20));

      const options = fixture.queryAll<HTMLElement>('.option');

      expect(options).toHaveLength(1);
      expect(options[0]?.textContent).toContain('United Kingdom');
      expect(options[0]?.style.transform).toContain('translateY(0px)');
    });

    it('autocloses after selection in multiple mode if autoclose is set', async () => {
      fixture = await mount('ore-combobox', {
        attrs: { autoclose: '', label: 'Country', multiple: '' },
        html: optionsHtml,
      });

      const input = getInput()!;

      fireClick(input);
      await fixture.flush();
      await new Promise((resolve) => setTimeout(resolve, 20));

      expect(fixture.element.hasAttribute('open')).toBe(true);

      const option = fixture.query('.option'); // Select first option

      fireClick(option!);
      await fixture.flush();
      await new Promise((resolve) => setTimeout(resolve, 20));

      expect(fixture.element.hasAttribute('open')).toBe(false);
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

      fireClick(input);
      await fixture.flush();
      await new Promise((resolve) => setTimeout(resolve, 20));

      const firstOption = fixture
        .queryAll<HTMLElement>('.option')
        .find((opt) => opt.textContent?.includes('TypeScript')) as HTMLElement;

      expect(firstOption).toBeTruthy();

      fireClick(firstOption);
      await fixture.flush();
      await new Promise((resolve) => setTimeout(resolve, 20));

      fireClick(fixture.query<HTMLElement>('ore-input.trigger')!);
      input.value += 'ru';
      fireInput(input);
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

      fireClick(initialInput);
      await fixture.flush();
      await new Promise((resolve) => setTimeout(resolve, 20));

      fireClick(fixture.queryAll<HTMLElement>('.option')[0]!);
      await fixture.flush();
      await new Promise((resolve) => setTimeout(resolve, 20));

      fireClick(fixture.query<HTMLElement>('ore-input.trigger')!);
      await fixture.flush();

      const liveInput = getLocalInput();

      if (!liveInput) throw new Error('Expected combobox input to exist after chip re-render');

      expect(fixture.element.shadowRoot?.querySelector('ore-input.trigger')?.shadowRoot?.activeElement).toBe(liveInput);

      liveInput.value += 'ru';
      fireInput(liveInput);
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

      fireClick(input);
      await fixture.flush();
      await new Promise((resolve) => setTimeout(resolve, 20));

      fireClick(fixture.queryAll<HTMLElement>('.option')[0]!);
      await fixture.flush();

      input.value += 'ger';
      fireInput(input);
      fireKeyDown(input, { key: 'Enter' });
      await fixture.flush();

      const target = (onChange.mock.calls.at(-1)?.[0] as Event).target as HTMLElement & { value: string };

      expect(target.value).toBe('us,de');
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

      fireClick(removeBtn!);
      await fixture.flush();

      expect(fixture.queryAll('ore-chip').length).toBe(1);
      expect(onChange).toHaveBeenCalled();

      const target = (onChange.mock.calls.at(-1)?.[0] as Event).target as HTMLElement & { value: string };

      expect(target.value).toBe('gb');
    });

    it('emits change with originalEvent when cleared via clear button', async () => {
      fixture = await mount('ore-combobox', {
        attrs: { clearable: '', label: 'Country', value: 'us' },
        html: optionsHtml,
      });

      const onChange = vi.fn();

      fixture.element.addEventListener('change', onChange);

      fireClick(fixture.query<HTMLElement>('.clear-btn')!);
      await fixture.flush();

      const target = (onChange.mock.calls.at(-1)?.[0] as Event).target as HTMLElement & { value: string };

      expect(target.value).toBe('');
    });

    it('filters already-selected options from multiselect results without reopening', async () => {
      fixture = await mount('ore-combobox', {
        attrs: { label: 'Country', multiple: '' },
        html: optionsHtml,
      });

      const input = getInput();

      expect(input).toBeTruthy();

      fireClick(input!);
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

      fireClick(usOption);
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

      fireClick(updatedGbOption);
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

      fireClick(input);
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

      fireClick(input);
      await fixture.flush();
      await new Promise((resolve) => setTimeout(resolve, 20));
      fireClick(fixture.queryAll<HTMLElement>('.option')[1]!);
      await fixture.flush();

      fireClick(input);
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

        return html`
          <ore-combobox options=${options}></ore-combobox>
        `;
      });

      const combobox = fixture.query<HTMLElement>('ore-combobox')!;
      const input =
        combobox.shadowRoot?.querySelector('ore-input.trigger')?.shadowRoot?.querySelector<HTMLInputElement>('input') ??
        null;

      fireClick(input as HTMLInputElement);
      await fixture.flush();

      expect(
        Array.from(combobox.shadowRoot?.querySelectorAll<HTMLElement>('.option') ?? []).map((el) =>
          el.textContent?.replace(/\s+/g, ' ').trim(),
        ),
      ).toEqual(['Alpha', 'Beta']);

      optionsRef!.value = [{ label: 'Gamma', value: 'g' }];
      await fixture.flush();
      fireClick(input as HTMLInputElement);
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

        return html`
          <ore-combobox options=${options}></ore-combobox>
        `;
      });

      const combobox = fixture.query<HTMLElement>('ore-combobox')!;
      const input =
        combobox.shadowRoot?.querySelector('ore-input.trigger')?.shadowRoot?.querySelector<HTMLInputElement>('input') ??
        null;

      fireClick(input as HTMLInputElement);
      await fixture.flush();
      await new Promise((resolve) => setTimeout(resolve, 20));

      expect(
        Array.from(combobox.shadowRoot?.querySelectorAll<HTMLElement>('.option') ?? []).map((el) =>
          el.textContent?.replace(/\s+/g, ' ').trim(),
        ),
      ).toEqual(['alpha']);
    });
  });

  describe('Required State', () => {
    it('fails constraint validation while required and empty; passes once an option is selected', async () => {
      fixture = await mount('ore-combobox', { attrs: { required: true }, html: optionsHtml });

      const element = fixture.element as HTMLElement & { checkValidity(): boolean };

      expect(element.checkValidity()).toBe(false);

      fireClick(getInput()!);
      fireClick(fixture.query('.option')!);

      expect(element.checkValidity()).toBe(true);
    });

    it('passes constraint validation when not required, even while empty', async () => {
      fixture = await mount('ore-combobox', { html: optionsHtml });

      expect((fixture.element as HTMLElement & { checkValidity(): boolean }).checkValidity()).toBe(true);
    });
  });

  describe('Form reset', () => {
    it('restores the selection to whatever the ancestor form resets it to', async () => {
      const form = document.createElement('form');

      document.body.appendChild(form);
      fixture = await mount('ore-combobox', { attrs: { value: 'us' }, container: form, html: optionsHtml });

      fireClick(getInput()!);
      fireClick(fixture.queryAll('.option')[1]!); // gb

      form.reset();
      await fixture.flush();

      expect(fixture.element.getAttribute('value')).toBe('us');
      form.remove();
    });
  });

  describe('Success State', () => {
    it('forwards success to the inner ore-input trigger', async () => {
      fixture = await mount('ore-combobox', {
        attrs: { success: true },
        html: optionsHtml,
      });

      expect(fixture.query('ore-input.trigger')?.hasAttribute('success')).toBe(true);
    });

    it('does not forward success while an error is also set', async () => {
      fixture = await mount('ore-combobox', {
        attrs: { error: 'Required', success: true },
        html: optionsHtml,
      });

      expect(fixture.query('ore-input.trigger')?.hasAttribute('success')).toBe(false);
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

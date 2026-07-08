import { type Fixture, mount, user } from '@vielzeug/ore/testing';

import type { CommandPaletteItemInput } from './command-palette.types';

type CommandPaletteHost = HTMLElement & { items?: CommandPaletteItemInput[] };

const items: CommandPaletteItemInput[] = [
  { group: 'File', label: 'New File', shortcut: '⌘+N', value: 'new-file' },
  { group: 'File', label: 'Open File', value: 'open-file' },
  { disabled: true, group: 'File', label: 'Close File', value: 'close-file' },
  { group: 'View', keywords: ['dark', 'light'], label: 'Toggle Theme', value: 'toggle-theme' },
];

const itemsHtml = `
  <ore-command-palette-item value="new-file" group="File" shortcut="⌘+N">New File</ore-command-palette-item>
  <ore-command-palette-item value="open-file" group="File">Open File</ore-command-palette-item>
  <ore-command-palette-item value="close-file" group="File" disabled>Close File</ore-command-palette-item>
  <ore-command-palette-item value="toggle-theme" group="View" keywords="dark,light">Toggle Theme</ore-command-palette-item>
`;

describe('ore-command-palette', () => {
  let fixture: Fixture<CommandPaletteHost>;

  beforeAll(async () => {
    if (!HTMLDialogElement.prototype.showModal) {
      HTMLDialogElement.prototype.showModal = function () {
        this.setAttribute('open', '');
      };
    }

    if (!HTMLDialogElement.prototype.close) {
      HTMLDialogElement.prototype.close = function () {
        this.removeAttribute('open');
        this.dispatchEvent(new Event('close'));
      };
    }

    await import('./command-palette');
  });

  afterEach(() => {
    fixture?.dispose();
  });

  const getInput = () => fixture.query<HTMLInputElement>('.search-input');
  const getRows = () => fixture.queryAll<HTMLElement>('.item');

  describe('Core Functionality', () => {
    it('renders the search input and listbox', async () => {
      fixture = await mount('ore-command-palette', { attrs: { open: '' }, html: itemsHtml });

      expect(getInput()).toBeTruthy();
      expect(fixture.query('[role="listbox"]')).toBeTruthy();
    });

    it('is hidden when not open', async () => {
      fixture = await mount('ore-command-palette', { html: itemsHtml });

      expect(fixture.query('dialog[open]')).toBeNull();
    });

    it('renders items from the `items` prop', async () => {
      fixture = await mount('ore-command-palette', { attrs: { open: '' }, props: { items } });

      expect(getRows()).toHaveLength(4);
    });

    it('renders items from slotted <ore-command-palette-item> elements', async () => {
      fixture = await mount('ore-command-palette', { attrs: { open: '' }, html: itemsHtml });

      expect(getRows()).toHaveLength(4);
      expect(getRows()[0]?.textContent).toContain('New File');
    });

    it('the `items` prop takes precedence over slotted items', async () => {
      fixture = await mount('ore-command-palette', {
        attrs: { open: '' },
        html: itemsHtml,
        props: { items: [{ label: 'Only Item', value: 'only' }] },
      });

      expect(getRows()).toHaveLength(1);
    });

    it('renders group headings', async () => {
      fixture = await mount('ore-command-palette', { attrs: { open: '' }, props: { items } });

      const headings = fixture.queryAll<HTMLElement>('.group-heading').map((el) => el.textContent);

      expect(headings).toEqual(['File', 'View']);
    });

    it('renders one kbd per key in a shortcut hint', async () => {
      fixture = await mount('ore-command-palette', { attrs: { open: '' }, props: { items } });

      const keys = getRows()[0]?.querySelectorAll('.item-shortcut kbd');

      expect(keys).toHaveLength(2);
      expect(keys?.[0]?.textContent).toBe('⌘');
      expect(keys?.[1]?.textContent).toBe('N');
    });

    it('renders a single kbd for a shortcut with no `+` separator', async () => {
      fixture = await mount('ore-command-palette', {
        attrs: { open: '' },
        props: { items: [{ label: 'Save', shortcut: 'F2', value: 'save' }] },
      });

      const keys = getRows()[0]?.querySelectorAll('.item-shortcut kbd');

      expect(keys).toHaveLength(1);
      expect(keys?.[0]?.textContent).toBe('F2');
    });

    it('filters items as the user types', async () => {
      fixture = await mount('ore-command-palette', { attrs: { open: '' }, props: { items } });

      await user.type(getInput()!, 'theme');

      expect(getRows()).toHaveLength(1);
      expect(getRows()[0]?.textContent).toContain('Toggle Theme');
    });

    it('matches against keywords in addition to the label', async () => {
      fixture = await mount('ore-command-palette', { attrs: { open: '' }, props: { items } });

      await user.type(getInput()!, 'dark');

      expect(getRows()).toHaveLength(1);
      expect(getRows()[0]?.textContent).toContain('Toggle Theme');
    });

    it('emits search on every keystroke', async () => {
      fixture = await mount('ore-command-palette', { attrs: { open: '' }, props: { items } });

      const onSearch = vi.fn();

      fixture.element.addEventListener('search', onSearch);

      await user.type(getInput()!, 'new');

      expect(onSearch).toHaveBeenCalled();
      expect((onSearch.mock.calls.at(-1)?.[0] as CustomEvent).detail.query).toBe('new');
    });

    it('`no-filter` disables built-in filtering', async () => {
      fixture = await mount('ore-command-palette', {
        attrs: { 'no-filter': '', open: '' },
        props: { items },
      });

      await user.type(getInput()!, 'zzz-no-match');

      expect(getRows()).toHaveLength(4);
    });

    it('emits select and closes when an item is clicked', async () => {
      fixture = await mount('ore-command-palette', { attrs: { open: '' }, props: { items } });

      const onSelect = vi.fn();
      const onClose = vi.fn();

      fixture.element.addEventListener('select', onSelect);
      fixture.element.addEventListener('close', onClose);

      await user.click(getRows()[0]!);

      expect(onSelect).toHaveBeenCalledTimes(1);
      expect((onSelect.mock.calls[0]?.[0] as CustomEvent).detail).toMatchObject({
        label: 'New File',
        value: 'new-file',
      });
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(fixture.query('dialog[open]')).toBeNull();
    });

    it('clicking a disabled item does not select or close', async () => {
      fixture = await mount('ore-command-palette', { attrs: { open: '' }, props: { items } });

      const onSelect = vi.fn();

      fixture.element.addEventListener('select', onSelect);

      const disabledRow = getRows().find((row) => row.textContent?.includes('Close File'))!;

      await user.click(disabledRow);

      expect(onSelect).not.toHaveBeenCalled();
      expect(fixture.query('dialog[open]')).toBeTruthy();
    });

    it('selects the focused item with Enter', async () => {
      fixture = await mount('ore-command-palette', { attrs: { open: '' }, props: { items } });

      const onSelect = vi.fn();

      fixture.element.addEventListener('select', onSelect);

      // The palette pre-focuses the first item on open, so a single ArrowDown moves to the second.
      await user.press(getInput()!, 'ArrowDown');
      await user.press(getInput()!, 'Enter');

      expect((onSelect.mock.calls[0]?.[0] as CustomEvent).detail.value).toBe('open-file');
    });

    it('pressing Enter with no prior navigation selects the first item', async () => {
      fixture = await mount('ore-command-palette', { attrs: { open: '' }, props: { items } });

      const onSelect = vi.fn();

      fixture.element.addEventListener('select', onSelect);

      await user.press(getInput()!, 'Enter');

      expect((onSelect.mock.calls[0]?.[0] as CustomEvent).detail.value).toBe('new-file');
    });

    it('ArrowDown navigation skips disabled items', async () => {
      fixture = await mount('ore-command-palette', { attrs: { open: '' }, props: { items } });

      await user.press(getInput()!, 'ArrowDown');
      await user.press(getInput()!, 'ArrowDown');
      await user.press(getInput()!, 'ArrowDown');

      const focused = getRows().find((row) => row.hasAttribute('data-focused'));

      expect(focused?.textContent).toContain('Toggle Theme');
    });

    it('`keep-open-on-select` keeps the palette open after selecting', async () => {
      fixture = await mount('ore-command-palette', {
        attrs: { 'keep-open-on-select': '', open: '' },
        props: { items },
      });

      const onClose = vi.fn();

      fixture.element.addEventListener('close', onClose);

      await user.click(getRows()[0]!);

      expect(onClose).not.toHaveBeenCalled();
      expect(fixture.query('dialog[open]')).toBeTruthy();
    });

    it('resets the query when the palette closes and reopens', async () => {
      fixture = await mount('ore-command-palette', { attrs: { open: '' }, props: { items } });

      await user.type(getInput()!, 'theme');
      expect(getRows()).toHaveLength(1);

      await fixture.attr('open', false);
      await fixture.attr('open', true);

      expect(getInput()!.value).toBe('');
      expect(getRows()).toHaveLength(4);
    });

    it('emits open/close events with reason details', async () => {
      fixture = await mount('ore-command-palette', { attrs: { open: '' }, props: { items } });

      const onClose = vi.fn();

      fixture.element.addEventListener('close', onClose);

      await user.press(fixture.query('dialog')!, 'Escape');
      fixture.query('dialog')?.dispatchEvent(new Event('cancel', { bubbles: true, cancelable: true }));
      await fixture.flush();

      expect((onClose.mock.calls.at(-1)?.[0] as CustomEvent).detail.reason).toBe('escape');
    });

    it('updates rendered items when the `items` prop changes dynamically', async () => {
      fixture = await mount('ore-command-palette', { attrs: { open: '' }, props: { items } });

      expect(getRows()).toHaveLength(4);

      await fixture.act(() => {
        fixture.element.items = [{ label: 'Solo', value: 'solo' }];
      });

      expect(getRows()).toHaveLength(1);
    });
  });

  describe('Accessibility', () => {
    it('passes axe checks when open', async () => {
      fixture = await mount('ore-command-palette', {
        attrs: { label: 'Command palette', open: '' },
        props: { items },
      });

      const results = await axeCheck(fixture.element);

      expect(results.violations).toHaveLength(0);
    });

    it('applies label as the dialog aria-label', async () => {
      fixture = await mount('ore-command-palette', { attrs: { label: 'Jump to…', open: '' } });

      expect(fixture.query('dialog')?.getAttribute('aria-label')).toBe('Jump to…');
    });

    it('search input has combobox role wired to the listbox', async () => {
      fixture = await mount('ore-command-palette', { attrs: { open: '' }, props: { items } });

      const input = getInput()!;
      const listbox = fixture.query('[role="listbox"]')!;

      expect(input.getAttribute('role')).toBe('combobox');
      expect(input.getAttribute('aria-controls')).toBe(listbox.id);
    });

    it('reflects keyboard focus via aria-activedescendant and aria-selected', async () => {
      fixture = await mount('ore-command-palette', { attrs: { open: '' }, props: { items } });

      const input = getInput()!;

      await user.press(input, 'ArrowDown');

      const focusedRow = getRows().find((row) => row.hasAttribute('data-focused'))!;

      expect(input.getAttribute('aria-activedescendant')).toBe(focusedRow.id);
      expect(focusedRow.getAttribute('aria-selected')).toBe('true');
    });

    it('marks disabled items with aria-disabled', async () => {
      fixture = await mount('ore-command-palette', { attrs: { open: '' }, props: { items } });

      const disabledRow = getRows().find((row) => row.textContent?.includes('Close File'))!;

      expect(disabledRow.getAttribute('aria-disabled')).toBe('true');
    });

    it('the search input receives focus when the dialog opens', async () => {
      fixture = await mount('ore-command-palette', { attrs: { open: '' }, props: { items } });

      await new Promise((resolve) => requestAnimationFrame(resolve));

      expect(fixture.element.shadowRoot?.activeElement).toBe(getInput());
    });
  });

  describe('Edge Cases', () => {
    it('picks up a slotted item label added after slot assignment (parser race)', async () => {
      // Regression: native `slotchange` fires once when an element is first assigned to a
      // slot — not again when that element's own children mutate afterward. A browser
      // parsing static, inline HTML can assign the last item to its slot before appending
      // that item's text-node child, permanently caching an empty label unless something
      // else re-parses on the follow-up mutation.
      fixture = await mount('ore-command-palette', { attrs: { open: '' }, html: itemsHtml });

      const lateItem = document.createElement('ore-command-palette-item');

      lateItem.setAttribute('value', 'late');
      lateItem.setAttribute('group', 'View');
      fixture.element.appendChild(lateItem); // assigned to the slot with no text child yet
      await fixture.flush();

      lateItem.append('Late Item'); // parser "catches up" and appends the text node
      await fixture.flush();

      const lateRow = getRows().find((row) => row.textContent?.includes('Late Item'));

      expect(lateRow).toBeTruthy();
    });

    it('shows the empty-text message when no items match', async () => {
      fixture = await mount('ore-command-palette', {
        attrs: { 'empty-text': 'Nothing here', open: '' },
        props: { items },
      });

      await user.type(getInput()!, 'zzzznomatch');

      expect(fixture.query('.empty')?.hasAttribute('hidden')).toBe(false);
      expect(fixture.query('.empty')?.textContent?.trim()).toBe('Nothing here');
    });

    it('hides the empty message while items are present', async () => {
      fixture = await mount('ore-command-palette', { attrs: { open: '' }, props: { items } });

      expect(fixture.query('.empty')?.hasAttribute('hidden')).toBe(true);
    });

    it('handles an empty item list gracefully', async () => {
      fixture = await mount('ore-command-palette', { attrs: { open: '' }, props: { items: [] } });

      expect(getRows()).toHaveLength(0);
      expect(fixture.query('.empty')?.hasAttribute('hidden')).toBe(false);
    });

    it('shows a loading indicator when `loading` is set', async () => {
      fixture = await mount('ore-command-palette', { attrs: { loading: '', open: '' } });

      expect(fixture.query('.search-loader')?.hasAttribute('hidden')).toBe(false);
    });

    it('falls back to the value when no label is provided', async () => {
      fixture = await mount('ore-command-palette', {
        attrs: { open: '' },
        props: { items: [{ value: 'raw-value' }] },
      });

      expect(getRows()[0]?.textContent).toContain('raw-value');
    });

    it('warns and ignores an invalid `shortcut` value instead of throwing', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      fixture = await mount('ore-command-palette', { attrs: { shortcut: 'a+b' } });

      expect(warnSpy).toHaveBeenCalled();

      warnSpy.mockRestore();
    });

    it('toggles open via the global keyboard shortcut', async () => {
      fixture = await mount('ore-command-palette', { attrs: { shortcut: 'ctrl+k' }, props: { items } });

      expect(fixture.query('dialog[open]')).toBeNull();

      window.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ctrlKey: true, key: 'k' }));
      await fixture.flush();

      expect(fixture.query('dialog[open]')).toBeTruthy();
    });

    it('disabling the shortcut (empty string) does not register a global binding', async () => {
      fixture = await mount('ore-command-palette', { attrs: { shortcut: '' }, props: { items } });

      window.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ctrlKey: true, key: 'k' }));
      await fixture.flush();

      expect(fixture.query('dialog[open]')).toBeNull();
    });
  });
});

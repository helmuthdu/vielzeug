import { fireClick, fireInput, fireKeyDown } from '@vielzeug/assay';
import { type Fixture, mount } from '@vielzeug/ore/testing';

import {
  commitToken,
  parseQuery,
  type QueryState,
  type QueryTokenDef,
  removeToken,
  suggestQuery,
} from './query-bar-grammar';

type QueryBarHost = HTMLElement & { state?: QueryState; vocabulary?: QueryTokenDef[] };

/** A representative vocabulary: an issues bar's author + label keys. */
const vocabulary: QueryTokenDef[] = [
  {
    key: 'author',
    label: 'Author',
    options: [
      { label: 'Alice', value: 'alice' },
      { label: 'Bob', value: 'bob' },
    ],
  },
  {
    key: 'label',
    label: 'Label',
    options: [
      { label: 'Bug', value: 'bug' },
      { label: 'Enhancement', value: 'enhancement' },
    ],
  },
];

describe('ore-query-bar', () => {
  let fixture: Fixture<QueryBarHost>;

  beforeAll(async () => {
    await (() => import('./query-bar'))();
  });

  afterEach(() => {
    fixture?.dispose();
  });

  /**
   * The raw <input> lives inside ore-input's shadow DOM, which is itself inside
   * the query-bar shadow DOM. This helper pierces both levels.
   */
  const getInput = (root: ShadowRoot | null | undefined = fixture.element.shadowRoot) =>
    root?.querySelector('ore-input.trigger')?.shadowRoot?.querySelector<HTMLInputElement>('input') ?? null;

  const pills = () =>
    [...(fixture.element.shadowRoot?.querySelectorAll<HTMLElement>('ore-chip') ?? [])].map((chip) =>
      chip.textContent?.trim(),
    );

  const options = () => [...(fixture.element.shadowRoot?.querySelectorAll<HTMLElement>('.option') ?? [])];

  /** Each suggestion row as its label/meta pair, whitespace-free. */
  const offers = () =>
    options().map((option) => ({
      label: option.querySelector('.option-label')?.textContent?.trim() ?? '',
      meta: option.querySelector('.option-meta')?.textContent?.trim() ?? '',
    }));

  async function mountBar(initial?: QueryState): Promise<QueryBarHost> {
    fixture = await mount<QueryBarHost>('ore-query-bar', {
      attrs: { clearable: true, label: 'Search issues', placeholder: 'Title, author or label…' },
      props: initial ? { state: initial, vocabulary } : { vocabulary },
    });

    return fixture.element;
  }

  /** Focuses the field so the suggestion dropdown opens, then flushes. */
  async function focusBar(): Promise<HTMLInputElement> {
    const input = getInput();
    if (!input) throw new Error('expected the inner input');

    input.focus();
    await fixture.flush();

    return input;
  }

  async function typeInto(value: string): Promise<void> {
    const input = await focusBar();

    input.value = value;
    fireInput(input);
    await fixture.flush();
  }

  async function clickOption(label: string): Promise<void> {
    const option = options().find((row) => row.querySelector('.option-label')?.textContent?.trim() === label);
    if (!option) throw new Error(`expected an option labeled "${label}"`);

    fireClick(option);
    await fixture.flush();
  }

  describe('Grammar', () => {
    it('treats plain words as free text', () => {
      expect(parseQuery('bug regression', vocabulary)).toEqual({ draft: null, text: 'bug regression', tokens: [] });
    });

    it('commits complete key:value fragments as tokens and keeps the rest as text', () => {
      expect(parseQuery('author:alice bug', vocabulary)).toEqual({
        draft: null,
        text: 'bug',
        tokens: [{ key: 'author', value: 'alice' }],
      });
    });

    it('resolves values case-insensitively by value or label', () => {
      expect(parseQuery('author:ALICE label:Bug', vocabulary).tokens).toEqual([
        { key: 'author', value: 'alice' },
        { key: 'label', value: 'bug' },
      ]);
    });

    it('normalizes whitespace in the free text', () => {
      expect(parseQuery('  bug   regression  ', vocabulary).text).toBe('bug regression');
    });

    it('keeps an unfinished trailing key fragment as a draft, out of the text', () => {
      expect(parseQuery('bug author:al', vocabulary)).toEqual({
        draft: { key: 'author', valuePrefix: 'al' },
        text: 'bug',
        tokens: [],
      });
    });

    it('treats a key fragment as complete once the input ends in whitespace', () => {
      expect(parseQuery('author:al ', vocabulary)).toEqual({ draft: null, text: 'author:al', tokens: [] });
    });

    it('commits a resolved trailing fragment immediately, without waiting for a space', () => {
      expect(parseQuery('author:alice', vocabulary)).toEqual({
        draft: null,
        text: '',
        tokens: [{ key: 'author', value: 'alice' }],
      });
    });

    it('replaces an earlier token for the same key in place', () => {
      expect(parseQuery('label:bug label:enhancement', vocabulary).tokens).toEqual([
        { key: 'label', value: 'enhancement' },
      ]);
    });

    it('degrades unknown keys to free text and keeps an unresolved known key as a draft', () => {
      expect(parseQuery('repo:demo author:zebra', vocabulary)).toEqual({
        draft: { key: 'author', valuePrefix: 'zebra' },
        text: 'repo:demo',
        tokens: [],
      });
    });

    it('degrades an abandoned draft in the middle of the field to free text', () => {
      expect(parseQuery('author:al bug', vocabulary)).toEqual({ draft: null, text: 'author:al bug', tokens: [] });
    });

    it('parses the empty and whitespace-only field to the neutral state', () => {
      expect(parseQuery('', vocabulary)).toEqual({ draft: null, text: '', tokens: [] });
      expect(parseQuery('   ', vocabulary)).toEqual({ draft: null, text: '', tokens: [] });
    });

    it('lists every vocabulary key for the empty field', () => {
      expect(suggestQuery('', vocabulary)).toEqual([
        { key: 'author', kind: 'key', label: 'Author' },
        { key: 'label', kind: 'key', label: 'Label' },
      ]);
    });

    it('offers the matching options while a key draft is being composed', () => {
      expect(suggestQuery('author:', vocabulary)).toEqual([
        { key: 'author', kind: 'value', label: 'Alice', value: 'alice' },
        { key: 'author', kind: 'value', label: 'Bob', value: 'bob' },
      ]);
      expect(suggestQuery('author:al', vocabulary)).toEqual([
        { key: 'author', kind: 'value', label: 'Alice', value: 'alice' },
      ]);
    });

    it('offers the keys whose name matches the word being typed', () => {
      expect(suggestQuery('au', vocabulary)).toEqual([{ key: 'author', kind: 'key', label: 'Author' }]);
    });

    it('offers options across every key when a plain word reads like a value', () => {
      expect(suggestQuery('bu', vocabulary)).toEqual([{ key: 'label', kind: 'value', label: 'Bug', value: 'bug' }]);
    });

    it('returns nothing for a word that matches neither keys nor values', () => {
      expect(suggestQuery('zz', vocabulary)).toEqual([]);
    });

    it('suggests against the last word only', () => {
      expect(suggestQuery('bug en', vocabulary)).toEqual([
        { key: 'label', kind: 'value', label: 'Enhancement', value: 'enhancement' },
      ]);
    });

    it('lists the vocabulary keys again once the field ends in whitespace', () => {
      expect(suggestQuery('bug ', vocabulary)).toEqual([
        { key: 'author', kind: 'key', label: 'Author' },
        { key: 'label', kind: 'key', label: 'Label' },
      ]);
    });

    it('commitToken appends a new key and replaces a known key in place', () => {
      const state: QueryState = { text: 'bug', tokens: [{ key: 'author', value: 'alice' }] };

      expect(commitToken(state, 'label', 'bug').tokens).toEqual([
        { key: 'author', value: 'alice' },
        { key: 'label', value: 'bug' },
      ]);
      expect(commitToken(state, 'author', 'bob').tokens).toEqual([{ key: 'author', value: 'bob' }]);
    });

    it('removeToken drops one key', () => {
      expect(removeToken({ text: 'bug', tokens: [{ key: 'author', value: 'alice' }] }, 'author')).toEqual({
        text: 'bug',
        tokens: [],
      });
    });
  });

  describe('Query state', () => {
    it('renders committed tokens as removable pills', async () => {
      await mountBar(commitToken({ text: 'bug', tokens: [] }, 'author', 'alice'));

      expect(pills()).toEqual(['Author: Alice']);
    });

    it('keeps free text in the state as it is typed', async () => {
      const host = await mountBar();

      await typeInto('bug');
      expect(host.state).toEqual({ text: 'bug', tokens: [] });
    });

    it('commits a complete typed token to a pill and rewrites it out of the field', async () => {
      const host = await mountBar();

      await typeInto('bug author:alice');
      expect(host.state).toEqual({ text: 'bug', tokens: [{ key: 'author', value: 'alice' }] });
      expect(getInput()?.value).toBe('bug');
      expect(pills()).toEqual(['Author: Alice']);
    });

    it('keeps an unfinished token out of the search text while it is composed', async () => {
      const host = await mountBar();

      await typeInto('bug author:al');
      expect(host.state).toEqual({ text: 'bug', tokens: [] });
    });

    it('a value picked from a typed word consumes that word instead of searching it', async () => {
      const host = await mountBar();

      await typeInto('bug al');
      await clickOption('Alice');
      expect(host.state).toEqual({ text: 'bug', tokens: [{ key: 'author', value: 'alice' }] });
      expect(getInput()?.value).toBe('bug');
    });

    it('external state writes rewrite the field to the state text', async () => {
      const initial: QueryState = { text: 'bug', tokens: [] };
      const host = await mountBar(initial);

      host.state = commitToken(initial, 'author', 'alice');
      await fixture.flush();
      expect(getInput()?.value).toBe('bug');
    });
  });

  describe('Suggestions', () => {
    it('lists the vocabulary keys for the focused empty field', async () => {
      await mountBar();

      await focusBar();
      expect(offers()).toEqual([
        { label: 'Author', meta: 'author:' },
        { label: 'Label', meta: 'label:' },
      ]);
    });

    it('offers typed-value matches across keys', async () => {
      await mountBar();

      await typeInto('al');
      expect(offers()).toEqual([{ label: 'Alice', meta: 'Author' }]);
    });

    it('picking a key suggestion starts composing, picking a value commits', async () => {
      const host = await mountBar();

      await focusBar();
      await clickOption('Author');
      expect(getInput()?.value).toBe('author:');
      expect(offers()).toEqual([
        { label: 'Alice', meta: 'Author' },
        { label: 'Bob', meta: 'Author' },
      ]);

      await clickOption('Alice');
      expect(host.state).toEqual({ text: '', tokens: [{ key: 'author', value: 'alice' }] });
      expect(getInput()?.value).toBe('');
    });

    it('replaces the pill in place when a second value for the same key is picked', async () => {
      const host = await mountBar(commitToken({ text: '', tokens: [] }, 'author', 'alice'));
      expect(pills()).toEqual(['Author: Alice']);

      await typeInto('author:');
      await clickOption('Bob');
      expect(host.state?.tokens).toEqual([{ key: 'author', value: 'bob' }]);
      expect(pills()).toEqual(['Author: Bob']);
    });

    it('ArrowDown highlights the first suggestion and Enter commits it', async () => {
      const host = await mountBar();

      await typeInto('author:');
      fireKeyDown(getInput()!, { key: 'ArrowDown' });
      await fixture.flush();

      const highlighted = options().find((option) => option.hasAttribute('data-focused'));
      expect(highlighted?.textContent).toContain('Alice');
      const input = getInput() as (HTMLInputElement & { ariaActiveDescendantElement?: Element | null }) | null;
      expect(
        input?.getAttribute('aria-activedescendant') === highlighted?.id ||
          input?.ariaActiveDescendantElement === highlighted,
      ).toBe(true);

      fireKeyDown(getInput()!, { key: 'Enter' });
      await fixture.flush();
      expect(host.state).toEqual({ text: '', tokens: [{ key: 'author', value: 'alice' }] });
    });

    it('ArrowUp from no highlight wraps to the last suggestion', async () => {
      await mountBar();

      await typeInto('author:');
      fireKeyDown(getInput()!, { key: 'ArrowUp' });
      await fixture.flush();

      const highlighted = options().find((option) => option.hasAttribute('data-focused'));
      expect(highlighted?.textContent).toContain('Bob');
    });

    it('typing after Escape reopens the dropdown', async () => {
      const host = await mountBar();

      await focusBar();
      fireKeyDown(getInput()!, { key: 'Escape' });
      await fixture.flush();
      expect(options()).toEqual([]);

      getInput()!.value = 'al';
      fireInput(getInput()!);
      await fixture.flush();
      expect(options().length).toBe(1);
      expect(getInput()?.getAttribute('aria-expanded')).toBe('true');
      expect(host.state?.text).toBe('al');
    });

    it('an unresolvable draft shows a dead-draft row instead of closing', async () => {
      const host = await mountBar();

      await typeInto('author:zzz');
      expect(getInput()?.getAttribute('aria-expanded')).toBe('true');
      expect(fixture.element.shadowRoot?.querySelector('.no-match')?.textContent).toContain('No matching Author');
      // The dead draft never enters the search text while composing.
      expect(host.state?.text).toBe('');
    });

    it('hovering an option moves the keyboard highlight', async () => {
      await mountBar();

      await typeInto('author:');
      const rows = options();
      rows[1]?.dispatchEvent(new PointerEvent('pointermove', { bubbles: true }));
      await fixture.flush();

      expect(rows[1]?.hasAttribute('data-focused')).toBe(true);
    });

    it('Escape closes the dropdown and emits open-change with the reason', async () => {
      const host = await mountBar();
      const events: Array<{ open: boolean; reason: string }> = [];
      host.addEventListener('open-change', (event) => {
        events.push((event as CustomEvent<{ open: boolean; reason: string }>).detail);
      });

      await focusBar();
      fireKeyDown(getInput()!, { key: 'Escape' });
      await fixture.flush();

      expect(events.at(-1)).toEqual({ open: false, reason: 'escape' });
      expect(options()).toEqual([]);
    });
  });

  describe('Pill removal', () => {
    it('backspace on the empty field removes the last pill', async () => {
      const host = await mountBar({
        text: '',
        tokens: [
          { key: 'author', value: 'alice' },
          { key: 'label', value: 'bug' },
        ],
      });

      await focusBar();
      fireKeyDown(getInput()!, { key: 'Backspace' });
      await fixture.flush();

      expect(host.state?.tokens).toEqual([{ key: 'author', value: 'alice' }]);
    });

    it('the pill remove button drops its token from the state', async () => {
      const host = await mountBar(commitToken({ text: '', tokens: [] }, 'author', 'alice'));

      const chip = fixture.element.shadowRoot?.querySelector<HTMLElement>('ore-chip');
      chip?.dispatchEvent(new CustomEvent('remove', { bubbles: true, detail: { value: 'author' } }));
      await fixture.flush();

      expect(host.state?.tokens).toEqual([]);
    });

    it('removing a pill returns focus to the field', async () => {
      await mountBar(commitToken({ text: '', tokens: [] }, 'author', 'alice'));

      await focusBar();
      // The real regression: focus sits on the pill's remove button, not the field.
      const chip = fixture.element.shadowRoot?.querySelector<HTMLElement>('ore-chip');
      chip?.shadowRoot?.querySelector<HTMLElement>('[part="remove-btn"]')?.focus();
      expect(fixture.element.shadowRoot?.activeElement?.tagName).toBe('ORE-CHIP');

      chip?.dispatchEvent(new CustomEvent('remove', { bubbles: true, detail: { value: 'author' } }));
      await fixture.flush();

      expect(fixture.element.shadowRoot?.activeElement?.tagName).toBe('ORE-INPUT');
    });

    it('blur reverts a bare key draft without residue', async () => {
      const host = await mountBar();

      await typeInto('author:');
      getInput()!.blur();
      getInput()!.dispatchEvent(new FocusEvent('focusout', { bubbles: true, composed: true }));
      await fixture.flush();

      expect(getInput()?.value).toBe('');
      expect(host.state?.text).toBe('');
    });

    it('blur degrades a dead draft into the searched text', async () => {
      const host = await mountBar();

      await typeInto('author:zzz');
      getInput()!.blur();
      getInput()!.dispatchEvent(new FocusEvent('focusout', { bubbles: true, composed: true }));
      await fixture.flush();

      expect(getInput()?.value).toBe('author:zzz');
      expect(host.state?.text).toBe('author:zzz');
    });

    it('blur keeps a live draft composing for the next focus', async () => {
      const host = await mountBar();

      await typeInto('author:al');
      getInput()!.blur();
      getInput()!.dispatchEvent(new FocusEvent('focusout', { bubbles: true, composed: true }));
      await fixture.flush();

      expect(getInput()?.value).toBe('author:al');
      expect(host.state?.text).toBe('');
    });

    it('two removals in the same tick both apply', async () => {
      const host = await mountBar({
        text: '',
        tokens: [
          { key: 'author', value: 'alice' },
          { key: 'label', value: 'bug' },
        ],
      });

      // Both removals land before any consumer round-trip: neither may compute
      // from a stale snapshot, or the second removal resurrects the first pill.
      for (const key of ['author', 'label']) {
        fixture.element.shadowRoot
          ?.querySelector<HTMLElement>(`ore-chip[value="${key}"]`)
          ?.dispatchEvent(new CustomEvent('remove', { bubbles: true, detail: { value: key } }));
      }
      await fixture.flush();

      expect(host.state?.tokens).toEqual([]);
    });
  });

  describe('Field controls', () => {
    it('the clear button clears the free text and keeps the pills', async () => {
      const host = await mountBar(commitToken({ text: '', tokens: [] }, 'author', 'alice'));

      await typeInto('bug');
      const clear = fixture.element.shadowRoot?.querySelector<HTMLElement>('.clear-btn');
      expect(clear).toBeTruthy();
      fireClick(clear!);
      await fixture.flush();

      expect(host.state).toEqual({ text: '', tokens: [{ key: 'author', value: 'alice' }] });
      expect(getInput()?.value).toBe('');
    });

    it('the clear button stays hidden without the clearable prop, whatever the text', async () => {
      fixture = await mount<QueryBarHost>('ore-query-bar', {
        attrs: { label: 'Search issues' },
        props: { vocabulary },
      });
      await fixture.flush();

      await typeInto('bug');
      const clear = fixture.element.shadowRoot?.querySelector<HTMLElement>('.clear-btn');
      expect(clear?.hasAttribute('hidden')).toBe(true);

      fixture.element.setAttribute('clearable', '');
      await fixture.flush();
      expect(clear?.hasAttribute('hidden')).toBe(false);
    });

    it('hide-label suppresses the visible label and exposes it as the aria-label', async () => {
      fixture = await mount<QueryBarHost>('ore-query-bar', {
        attrs: { 'hide-label': true, label: 'Search issues' },
        props: { vocabulary },
      });
      await fixture.flush();

      const field = fixture.element.shadowRoot?.querySelector('ore-input');
      expect(field?.getAttribute('label')).toBe('');
      expect(field?.shadowRoot?.querySelector('.label')?.hasAttribute('hidden')).toBe(true);
      expect(getInput()?.getAttribute('aria-label')).toBe('Search issues');
    });
  });

  describe('Accessibility', () => {
    it('carries combobox semantics on the focused input', async () => {
      await mountBar();

      const input = getInput()!;
      expect(input.getAttribute('role')).toBe('combobox');
      expect(input.getAttribute('aria-haspopup')).toBe('listbox');
      expect(input.getAttribute('aria-controls')).toBeTruthy();
    });

    it('reflects aria-expanded and activedescendant while open', async () => {
      await mountBar();

      const input = await focusBar();
      expect(input.getAttribute('aria-expanded')).toBe('true');

      fireKeyDown(input, { key: 'ArrowDown' });
      await fixture.flush();

      const focused = options().find((option) => option.hasAttribute('data-focused'));
      const reflected = (input as HTMLInputElement & { ariaActiveDescendantElement?: Element | null })
        .ariaActiveDescendantElement;
      expect(input.getAttribute('aria-activedescendant') === focused?.id || reflected === focused).toBe(true);
    });

    it('passes axe checks closed and open', async () => {
      await mountBar(commitToken({ text: 'bug', tokens: [] }, 'author', 'alice'));

      expect((await axeCheck(fixture.element)).violations).toHaveLength(0);

      await focusBar();
      expect((await axeCheck(fixture.element)).violations).toHaveLength(0);
    });
  });
});

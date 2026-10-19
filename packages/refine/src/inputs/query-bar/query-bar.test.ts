import { fireClick, fireInput, fireKeyDown } from '@vielzeug/assay';
import { type Fixture, mount } from '@vielzeug/ore/testing';
import type { OreQueryBarEvents, OreQueryBarProps } from './query-bar.types';
import {
  clearTokens,
  commitToken,
  parseQuery,
  type QueryState,
  type QueryTokenDef,
  removeToken,
  suggestQuery,
  tokenValues,
} from './query-bar-grammar';

type QueryBarHost = HTMLElement & OreQueryBarProps;

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

const fruitVocabulary: QueryTokenDef[] = [
  {
    key: 'fruit',
    label: 'Fruit',
    options: [
      { label: 'Apple', value: 'apple' },
      { label: 'Banana', value: 'banana' },
      { label: 'Mixed fruit', value: 'apple, pear' },
    ],
    selection: 'multiple',
  },
  {
    key: 'sort',
    label: 'Sort',
    options: [
      { label: 'Name', value: 'name' },
      { label: 'Recent', value: 'recent' },
    ],
  },
];

describe('ore-query-bar', () => {
  let fixture: Fixture<QueryBarHost>;

  beforeAll(async () => {
    HTMLDialogElement.prototype.showModal ??= function () {
      this.setAttribute('open', '');
    };
    HTMLDialogElement.prototype.close ??= function () {
      this.removeAttribute('open');
      this.dispatchEvent(new Event('close'));
    };
    await (() => import('./query-bar'))();
  });

  beforeEach(() => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: false })),
    );
  });

  afterEach(() => {
    fixture?.dispose();
    vi.unstubAllGlobals();
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

      expect(commitToken(state, { key: 'label', value: 'bug' }).tokens).toEqual([
        { key: 'author', value: 'alice' },
        { key: 'label', value: 'bug' },
      ]);
      expect(commitToken(state, { key: 'author', value: 'bob' }).tokens).toEqual([{ key: 'author', value: 'bob' }]);
    });

    it('removeToken drops an exact key/value pair', () => {
      expect(
        removeToken({ text: 'bug', tokens: [{ key: 'author', value: 'alice' }] }, { key: 'author', value: 'alice' }),
      ).toEqual({
        text: 'bug',
        tokens: [],
      });
    });

    it('parses repeated keys according to each vocabulary selection mode', () => {
      expect(parseQuery('fresh fruit:apple fruit:banana fruit:apple sort:name sort:recent', fruitVocabulary)).toEqual({
        draft: null,
        text: 'fresh',
        tokens: [
          { key: 'fruit', value: 'apple' },
          { key: 'fruit', value: 'banana' },
          { key: 'sort', value: 'recent' },
        ],
      });
    });

    it('adds unique values without changing insertion order', () => {
      const state = { text: 'fresh', tokens: [{ key: 'fruit', value: 'apple' }] };
      const next = commitToken(state, { key: 'fruit', value: 'banana' }, 'multiple');
      expect(tokenValues(next, 'fruit')).toEqual(['apple', 'banana']);
      expect(tokenValues(next, 'missing')).toEqual([]);
      expect(commitToken(next, { key: 'fruit', value: 'apple' }, 'multiple')).toBe(next);
      expect(state.tokens).toEqual([{ key: 'fruit', value: 'apple' }]);
    });

    it('removes one value or clears a whole group without touching other restrictions', () => {
      const state = {
        text: 'fresh',
        tokens: [
          { key: 'fruit', value: 'apple' },
          { key: 'sort', value: 'name' },
          { key: 'fruit', value: 'banana' },
        ],
      };
      expect(removeToken(state, { key: 'fruit', value: 'apple' })).toEqual({
        text: 'fresh',
        tokens: [
          { key: 'sort', value: 'name' },
          { key: 'fruit', value: 'banana' },
        ],
      });
      expect(clearTokens(state, 'fruit')).toEqual({
        text: 'fresh',
        tokens: [{ key: 'sort', value: 'name' }],
      });
      expect(commitToken(state, { key: 'fruit', value: 'banana' })).toEqual({
        text: 'fresh',
        tokens: [
          { key: 'fruit', value: 'banana' },
          { key: 'sort', value: 'name' },
        ],
      });
    });
  });

  describe('Multiple selection', () => {
    it('renders decorative option icons in both selection modes without changing token data', async () => {
      const host = await mountBar();
      host.vocabulary = [
        {
          key: 'fruit',
          label: 'Fruit',
          options: [
            { icon: 'search', label: 'Apple', value: 'apple' },
            { label: 'Banana', value: 'banana' },
          ],
          selection: 'multiple',
        },
        { key: 'sort', label: 'Sort', options: [{ icon: 'filter', label: 'Recent', value: 'recent' }] },
      ];
      await fixture.flush();
      fireClick(fixture.query<HTMLElement>('.filter-button')!);
      await fixture.flush();
      const checkboxIcon = fixture.query('ore-checkbox .choice-label ore-icon');
      const radioIcon = fixture.query('ore-radio .choice-label ore-icon');
      expect(checkboxIcon?.getAttribute('name')).toBe('search');
      expect(radioIcon?.getAttribute('name')).toBe('filter');
      for (const icon of [checkboxIcon, radioIcon]) expect(icon?.getAttribute('aria-hidden')).toBe('true');
      expect(fixture.queryAll('ore-checkbox')[1].querySelector('ore-icon')).toBeNull();
      fireClick(fixture.queryAll<HTMLElement>('ore-checkbox')[0]);
      await fixture.flush();
      fireClick(fixture.query<HTMLElement>('.filter-actions ore-button:last-child')!);
      await fixture.flush();
      expect(host.state).toEqual({ text: '', tokens: [{ key: 'fruit', value: 'apple' }] });
      expect(parseQuery('sort:recent', host.vocabulary!).tokens).toEqual([{ key: 'sort', value: 'recent' }]);
    });

    async function mountFruits(initial?: QueryState): Promise<QueryBarHost> {
      const host = await mountBar(initial);
      host.vocabulary = fruitVocabulary;
      await fixture.flush();
      return host;
    }

    async function click(selector: string): Promise<void> {
      const target = fixture.query<HTMLElement>(selector);
      if (!target) throw new Error(`Missing ${selector}`);
      fireClick(target);
      await fixture.flush();
    }

    it('adds typed and suggested values without duplicates or no-op events', async () => {
      const host = await mountFruits();
      const change = vi.fn();
      host.addEventListener('change', change);
      await typeInto('fruit:apple fruit:banana');
      expect(host.state?.tokens).toEqual([
        { key: 'fruit', value: 'apple' },
        { key: 'fruit', value: 'banana' },
      ]);
      await typeInto('fruit:apple');
      expect(change).toHaveBeenCalledTimes(1);
      await typeInto('fruit:');
      await clickOption('Mixed fruit');
      expect(host.state?.tokens.at(-1)).toEqual({ key: 'fruit', value: 'apple, pear' });
      expect(change).toHaveBeenCalledTimes(2);
    });

    it('removes exact pills and backspaces one value rather than the entire group', async () => {
      const host = await mountFruits({
        text: '',
        tokens: [
          { key: 'fruit', value: 'apple' },
          { key: 'fruit', value: 'banana' },
        ],
      });
      fixture.queryAll('.applied ore-chip')[0].dispatchEvent(new CustomEvent('remove', { bubbles: true }));
      await fixture.flush();
      expect(host.state?.tokens).toEqual([{ key: 'fruit', value: 'banana' }]);
      await typeInto('fruit:apple');
      fireKeyDown(getInput()!, { key: 'Backspace' });
      await fixture.flush();
      expect(host.state?.tokens).toEqual([{ key: 'fruit', value: 'banana' }]);
      expect(fixture.query('.filter-button')?.getAttribute('aria-label')).toBe('Filters (1)');
    });

    it('quick toggles add and remove only their exact value', async () => {
      const host = await mountFruits({ text: 'fresh', tokens: [{ key: 'fruit', value: 'banana' }] });
      host['quick-filters'] = [{ key: 'fruit', label: 'Apples', value: 'apple' }];
      await fixture.flush();
      fireClick(fixture.query('.quick-filters ore-chip')!.shadowRoot!.querySelector<HTMLElement>('.chip-btn')!);
      await fixture.flush();
      expect(host.state?.tokens).toEqual([
        { key: 'fruit', value: 'banana' },
        { key: 'fruit', value: 'apple' },
      ]);
      fireClick(fixture.query('.quick-filters ore-chip')!.shadowRoot!.querySelector<HTMLElement>('.chip-btn')!);
      await fixture.flush();
      expect(host.state).toEqual({ text: 'fresh', tokens: [{ key: 'fruit', value: 'banana' }] });
    });

    it('stages checkbox edits and group clearing without touching applied state until Apply', async () => {
      const host = await mountFruits({
        text: 'fresh',
        tokens: [
          { key: 'fruit', value: 'apple' },
          { key: 'sort', value: 'name' },
        ],
      });
      const change = vi.fn();
      host.addEventListener('change', change);
      await click('.filter-button');
      expect(fixture.queryAll('ore-checkbox')).toHaveLength(3);
      expect(fixture.queryAll('ore-radio-group')).toHaveLength(1);
      expect(fixture.query('ore-checkbox')?.hasAttribute('checked')).toBe(true);
      await click('ore-checkbox:nth-child(2)');
      expect(fixture.query('.filter-group-heading .filter-count')?.textContent?.trim()).toBe('2');
      expect(change).not.toHaveBeenCalled();
      await click('.filter-actions ore-button:last-child');
      expect(tokenValues(host.state!, 'fruit')).toEqual(['apple', 'banana']);
      expect(change).toHaveBeenCalledTimes(1);
      expect(fixture.query('.filter-button')?.getAttribute('aria-label')).toBe('Filters (2)');

      await click('.filter-button');
      await click('.filter-group-heading ore-button');
      expect(fixture.queryAll('ore-checkbox[checked]')).toHaveLength(0);
      expect(tokenValues(host.state!, 'fruit')).toHaveLength(2);
      await click('.filter-actions ore-button:last-child');
      expect(host.state).toEqual({ text: 'fresh', tokens: [{ key: 'sort', value: 'name' }] });
      expect(change).toHaveBeenCalledTimes(2);
    });

    it('cancels multiple selection drafts and localizes their actions and counts', async () => {
      const host = await mountFruits({ text: '', tokens: [{ key: 'fruit', value: 'apple' }] });
      host.labels = { clearFilter: '{filter} löschen', selected: '{count} gewählt' };
      await fixture.flush();
      await click('.filter-button');
      await click('ore-checkbox:nth-child(2)');
      expect(fixture.query('.filter-group-heading ore-button')?.textContent).toContain('Fruit löschen');
      // The visible badge is aria-hidden: a generic span's aria-label is ignored by
      // AT, so the localized count lives in a screen-reader-only sibling instead.
      expect(fixture.query('.filter-group-heading .filter-count')?.getAttribute('aria-hidden')).toBe('true');
      expect(fixture.query('.filter-group-heading .sr-only')?.textContent?.trim()).toBe('2 gewählt');
      await click('.filter-actions ore-button:nth-child(2)');
      await click('.filter-button');
      expect(fixture.queryAll('ore-checkbox[checked]')).toHaveLength(1);
      expect(tokenValues(host.state!, 'fruit')).toEqual(['apple']);
    });
  });

  describe('Query state', () => {
    it('renders committed tokens as removable pills', async () => {
      await mountBar(commitToken({ text: 'bug', tokens: [] }, { key: 'author', value: 'alice' }));

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

    it('announces only committed query changes while composing and selecting tokens', async () => {
      const host = await mountBar();
      const input = vi.fn();
      const change = vi.fn();
      host.addEventListener('input', input);
      host.addEventListener('change', change);

      await focusBar();
      await clickOption('Author');
      await typeInto('author:al');
      expect(input).not.toHaveBeenCalled();
      expect(change).not.toHaveBeenCalled();

      await clickOption('Alice');
      expect(input).toHaveBeenCalledTimes(1);
      expect(change).toHaveBeenCalledTimes(1);

      await typeInto('author:alice');
      expect(input).toHaveBeenCalledTimes(1);
      expect(change).toHaveBeenCalledTimes(1);

      await typeInto('bug');
      expect(input).toHaveBeenCalledTimes(2);
      expect(change).toHaveBeenCalledTimes(2);
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

      host.state = commitToken(initial, { key: 'author', value: 'alice' });
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
      const host = await mountBar(commitToken({ text: '', tokens: [] }, { key: 'author', value: 'alice' }));
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
      expect(fixture.element.shadowRoot?.querySelector('.no-match')?.textContent).toContain('No matching options');
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
      const events: OreQueryBarEvents['open-change'][] = [];
      host.addEventListener('open-change', (event) => {
        events.push((event as CustomEvent<OreQueryBarEvents['open-change']>).detail);
      });

      await focusBar();
      fireKeyDown(getInput()!, { key: 'Escape' });
      await fixture.flush();

      expect(events.at(-1)).toEqual({ open: false, reason: 'escape', surface: 'suggestions' });
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
      const host = await mountBar(commitToken({ text: '', tokens: [] }, { key: 'author', value: 'alice' }));

      const chip = fixture.element.shadowRoot?.querySelector<HTMLElement>('ore-chip');
      chip?.dispatchEvent(new CustomEvent('remove', { bubbles: true, detail: { value: 'author' } }));
      await fixture.flush();

      expect(host.state?.tokens).toEqual([]);
    });

    it('removing a pill returns focus to Filters without reopening the keyboard', async () => {
      await mountBar(commitToken({ text: '', tokens: [] }, { key: 'author', value: 'alice' }));

      await focusBar();
      // The real regression: focus sits on the pill's remove button, not the field.
      const chip = fixture.element.shadowRoot?.querySelector<HTMLElement>('ore-chip');
      chip?.shadowRoot?.querySelector<HTMLElement>('[part="remove-btn"]')?.focus();
      expect(fixture.element.shadowRoot?.activeElement?.tagName).toBe('ORE-CHIP');

      chip?.dispatchEvent(new CustomEvent('remove', { bubbles: true, detail: { value: 'author' } }));
      await fixture.flush();

      expect(fixture.element.shadowRoot?.activeElement).toBe(fixture.query('.filter-button'));
    });

    describe('Filter drawer and quick filters', () => {
      const click = async (selector: string): Promise<void> => {
        const target = fixture.query<HTMLElement>(selector);
        if (!target) throw new Error(`Missing ${selector}`);
        fireClick(target);
        await fixture.flush();
      };
      const choose = async (group: number, value: string): Promise<void> => {
        fixture
          .queryAll('ore-radio-group')
          [group]?.dispatchEvent(
            new CustomEvent('change', { bubbles: true, composed: true, detail: { labels: [], values: [value] } }),
          );
        await fixture.flush();
      };

      it('stages multiple selections and emits one change only when applied', async () => {
        const host = await mountBar({ text: 'regression', tokens: [] });
        const change = vi.fn();
        const input = vi.fn();
        host.addEventListener('change', change);
        host.addEventListener('input', input);
        await click('.filter-button');
        expect(fixture.query('ore-drawer')?.hasAttribute('open')).toBe(true);
        await choose(0, '1');
        await choose(1, '2');
        expect(host.state).toEqual({ text: 'regression', tokens: [] });
        expect(change).not.toHaveBeenCalled();
        expect(input).not.toHaveBeenCalled();
        await click('.filter-actions ore-button:last-child');
        expect(host.state).toEqual({
          text: 'regression',
          tokens: [
            { key: 'author', value: 'alice' },
            { key: 'label', value: 'enhancement' },
          ],
        });
        expect(change).toHaveBeenCalledTimes(1);
        expect(input).toHaveBeenCalledTimes(1);
      });

      it('cancels edits and reseeds the drawer from the applied query', async () => {
        const host = await mountBar({ text: 'bug', tokens: [{ key: 'author', value: 'alice' }] });
        await click('.filter-button');
        await choose(0, '2');
        await click('.filter-actions ore-button:nth-child(2)');
        expect(host.state?.tokens).toEqual([{ key: 'author', value: 'alice' }]);
        await click('.filter-button');
        expect(fixture.query('ore-radio-group')?.getAttribute('value')).toBe('1');
      });

      it('resets filters only after Apply and never clears free text', async () => {
        const host = await mountBar({ text: 'bug', tokens: [{ key: 'author', value: 'alice' }] });
        await click('.filter-button');
        await click('.filter-actions ore-button:first-child');
        expect(host.state?.tokens).toHaveLength(1);
        await click('.filter-actions ore-button:last-child');
        expect(host.state).toEqual({ text: 'bug', tokens: [] });
      });

      it('shows pending feedback, protects dirty drafts, and disables empty reset', async () => {
        const host = await mountBar();
        await click('.filter-button');
        expect(fixture.query('.filter-actions ore-button')?.hasAttribute('disabled')).toBe(true);
        expect(fixture.query('.pending-changes')?.textContent).toBe('');
        await choose(0, '1');
        expect(fixture.query('.pending-changes')?.textContent).toBe('Changes not applied');
        expect(fixture.query('.filter-actions ore-button')?.hasAttribute('disabled')).toBe(false);
        for (const reason of ['outsideClick', 'swipe', 'escape', 'trigger']) {
          const request = new CustomEvent('close-request', {
            bubbles: true,
            cancelable: true,
            detail: { reason },
          });
          fixture.query('ore-drawer')?.dispatchEvent(request);
          expect(request.defaultPrevented).toBe(reason === 'outsideClick' || reason === 'swipe');
        }
        expect(host.state?.tokens).toEqual([]);
        await choose(0, 'any');
        expect(fixture.query('.pending-changes')?.textContent).toBe('');
        const request = new CustomEvent('close-request', {
          bubbles: true,
          cancelable: true,
          detail: { reason: 'outsideClick' },
        });
        fixture.query('ore-drawer')?.dispatchEvent(request);
        expect(request.defaultPrevented).toBe(false);
      });

      it('uses a contextual unrestricted option without changing state values', async () => {
        const host = await mountBar();
        host.vocabulary = [{ ...vocabulary[0]!, anyLabel: 'All authors' }];
        await fixture.flush();
        await click('.filter-button');
        expect(fixture.query('ore-radio[value="any"]')?.textContent).toBe('All authors');
        await choose(0, '1');
        await choose(0, 'any');
        await click('.filter-actions ore-button:last-child');
        expect(host.state?.tokens).toEqual([]);
      });

      it('reveals search-hidden selections for both selection modes', async () => {
        const host = await mountBar({
          text: '',
          tokens: [
            { key: 'owner', value: '0' },
            { key: 'tag', value: '1' },
          ],
        });
        const many = Array.from({ length: 10 }, (_, i) => ({ label: `Option ${i}`, value: String(i) }));
        host.vocabulary = [
          { key: 'owner', label: 'Owner', options: many },
          { key: 'tag', label: 'Tag', options: many, selection: 'multiple' },
        ];
        await fixture.flush();
        await click('.filter-button');
        const searches = fixture.queryAll<HTMLElementTagNameMap['ore-input']>('.filter-group ore-input');
        // The option-search field must read as a search field: magnifier prefix.
        for (const search of searches) {
          expect(search.querySelector('ore-icon[slot="prefix"]')?.getAttribute('name')).toBe('search');
        }
        for (const search of searches) {
          search.value = 'Option 9';
          fireInput(search);
        }
        await fixture.flush();
        const summaries = fixture.queryAll('.hidden-selections');
        expect(summaries[0]?.textContent).toContain('Selected: Option 0');
        expect(summaries[1]?.textContent).toContain('Selected: Option 1');
        expect(summaries.every((summary) => !summary.hasAttribute('hidden'))).toBe(true);
        await click('.hidden-selections ore-button');
        expect(fixture.query('.hidden-selections')?.hasAttribute('hidden')).toBe(true);
        expect(fixture.query('ore-radio-group')?.getAttribute('value')).toBe('1');
      });

      it('does not announce a query change when Apply changes nothing', async () => {
        const host = await mountBar();
        const change = vi.fn();
        host.addEventListener('change', change);
        await click('.filter-button');
        await click('.filter-actions ore-button:last-child');
        expect(change).not.toHaveBeenCalled();
      });

      it('uses Any to remove only its own restriction and preserves unknown tokens', async () => {
        const host = await mountBar({
          text: 'bug',
          tokens: [
            { key: 'author', value: 'alice' },
            { key: 'external', value: 'preset' },
          ],
        });
        await click('.filter-button');
        await choose(0, 'any');
        await click('.filter-actions ore-button:last-child');
        expect(host.state).toEqual({ text: 'bug', tokens: [{ key: 'external', value: 'preset' }] });
      });

      it('toggles quick filters immediately while preserving text and unrelated tokens', async () => {
        const host = await mountBar({ text: 'bug', tokens: [{ key: 'label', value: 'bug' }] });
        host['quick-filters'] = [{ key: 'author', label: 'Mine', value: 'alice' }];
        await fixture.flush();
        const quick = () => fixture.query(' .quick-filters ore-chip')!;
        quick().dispatchEvent(new CustomEvent('change', { bubbles: true, detail: { checked: true } }));
        await fixture.flush();
        expect(host.state).toEqual({
          text: 'bug',
          tokens: [
            { key: 'label', value: 'bug' },
            { key: 'author', value: 'alice' },
          ],
        });
        expect(quick().getAttribute('checked')).toBe('true');
        quick().dispatchEvent(new CustomEvent('change', { bubbles: true, detail: { checked: false } }));
        await fixture.flush();
        expect(host.state).toEqual({ text: 'bug', tokens: [{ key: 'label', value: 'bug' }] });
      });

      it('replaces a different value of the same quick-filter key instead of clearing it', async () => {
        const host = await mountBar({ text: '', tokens: [{ key: 'author', value: 'bob' }] });
        host['quick-filters'] = [{ key: 'author', label: 'Mine', value: 'alice' }];
        await fixture.flush();
        fixture.query('.quick-filters ore-chip')?.dispatchEvent(new CustomEvent('change', { bubbles: true }));
        await fixture.flush();
        expect(host.state?.tokens).toEqual([{ key: 'author', value: 'alice' }]);
      });

      it('keeps unavailable quick filters disabled and leaves the query unchanged', async () => {
        const host = await mountBar();
        host['quick-filters'] = [{ key: 'author', label: 'Former owner', value: 'deleted' }];
        await fixture.flush();
        expect(fixture.query('.quick-filters ore-chip')?.hasAttribute('disabled')).toBe(true);
        fixture.query('.quick-filters ore-chip')?.dispatchEvent(new CustomEvent('change', { bubbles: true }));
        await fixture.flush();
        expect(host.state).toEqual({ text: '', tokens: [] });
      });

      it('adopts external text-only changes and dismisses pending drawer edits', async () => {
        const host = await mountBar({ text: 'before', tokens: [] });
        await click('.filter-button');
        await choose(0, '1');
        host.state = { text: 'after', tokens: host.state!.tokens };
        await fixture.flush();
        expect(getInput()?.value).toBe('after');
        expect(fixture.query('ore-drawer')?.hasAttribute('open')).toBe(false);
        expect(host.state).toEqual({ text: 'after', tokens: [] });
      });

      it('preserves composing text for semantically equivalent copied-state echoes', async () => {
        const host = await mountBar();
        await typeInto('bug author:al');
        host.state = { text: host.state!.text, tokens: [...host.state!.tokens] };
        await fixture.flush();
        expect(getInput()?.value).toBe('bug author:al');
      });

      it('disables removals, quick toggles and drawer entry together', async () => {
        const host = await mountBar({ text: '', tokens: [{ key: 'author', value: 'alice' }] });
        host['quick-filters'] = [{ key: 'label', label: 'Bugs', value: 'bug' }];
        host.disabled = true;
        await fixture.flush();
        expect(fixture.query('.filter-button')?.hasAttribute('disabled')).toBe(true);
        for (const chip of fixture.queryAll('ore-chip')) expect(chip.hasAttribute('disabled')).toBe(true);
        fixture
          .query('.applied ore-chip')
          ?.dispatchEvent(new CustomEvent('remove', { bubbles: true, detail: { value: 'author' } }));
        await click('.filter-button');
        expect(fixture.query('ore-drawer')?.hasAttribute('open')).toBe(false);
        expect(host.state?.tokens).toEqual([{ key: 'author', value: 'alice' }]);
      });

      it('renders toolbar-end content at the row end and hides the container when empty', async () => {
        fixture = await mount<QueryBarHost>('ore-query-bar', {
          attrs: { label: 'Search issues' },
          html: '<span slot="toolbar-end" class="count">12 results</span>',
          props: { vocabulary },
        });
        // slotchange arrives as a task after the mount flush settles it.
        await new Promise((resolve) => setTimeout(resolve, 0));
        const end = fixture.query('.toolbar-end');
        expect(end?.hasAttribute('hidden')).toBe(false);
        // Slotted content stays in the light DOM: assert the assignment, not shadow text.
        expect(fixture.element.querySelector('.count')?.textContent).toBe('12 results');
        fixture.dispose();

        await mountBar();
        await new Promise((resolve) => setTimeout(resolve, 0));
        expect(fixture.query('.toolbar-end')?.hasAttribute('hidden')).toBe(true);
      });

      it('dismisses stale edits when the vocabulary changes', async () => {
        const host = await mountBar();
        await click('.filter-button');
        host.vocabulary = [];
        await fixture.flush();
        expect(fixture.query('ore-drawer')?.hasAttribute('open')).toBe(false);
        expect(fixture.query('.toolbar')?.hasAttribute('hidden')).toBe(true);
      });

      it('hides the filter entry without a vocabulary, leaving no space', async () => {
        const host = await mountBar();
        host['quick-filters'] = [{ key: 'author', label: 'Mine', value: 'alice' }];
        host.vocabulary = [];
        await fixture.flush();
        // The row stays for the quick filters, but the dead Filters button is gone.
        expect(fixture.query('.toolbar')?.hasAttribute('hidden')).toBe(false);
        expect(fixture.query('.filter-button')?.hasAttribute('hidden')).toBe(true);
        host.vocabulary = [{ key: 'author', label: 'Author', options: [{ label: 'Alice', value: 'alice' }] }];
        await fixture.flush();
        expect(fixture.query('.filter-button')?.hasAttribute('hidden')).toBe(false);
      });

      it('marks a token as cards only when every option carries an icon', async () => {
        const host = await mountBar();
        host.vocabulary = [
          {
            key: 'element',
            label: 'Element',
            options: [
              { icon: 'element-fire', label: 'Fire', value: 'fire' },
              { icon: 'element-ice', label: 'Ice', value: 'ice' },
            ],
            selection: 'multiple',
          },
          {
            key: 'hunter',
            label: 'Hunter',
            options: [
              { icon: 'hunter-a', label: 'Alice', value: 'alice' },
              { label: 'Bob', value: 'bob' },
            ],
          },
        ];
        await fixture.flush();
        await click('.filter-button');
        // Icon-complete multi-select token: the checkbox grid becomes a card gallery.
        expect(fixture.element.shadowRoot?.querySelector('.filter-choices')?.hasAttribute('data-cards')).toBe(true);
        // A single missing icon keeps the whole token a plain list row layout.
        const radioGroup = fixture.queryAll('ore-radio-group')[0];
        expect(radioGroup?.hasAttribute('data-cards')).toBe(false);
      });

      it('upgrades a single-select token to cards when all options carry icons', async () => {
        const host = await mountBar();
        host.vocabulary = [
          {
            key: 'sort',
            label: 'Sort',
            options: [
              { icon: 'icon-recent', label: 'Recent', value: 'recent' },
              { icon: 'icon-name', label: 'Name', value: 'name' },
            ],
          },
        ];
        await fixture.flush();
        await click('.filter-button');
        expect(fixture.query('ore-radio-group')?.hasAttribute('data-cards')).toBe(true);
      });

      it('localizes filter controls and accessible groups', async () => {
        const host = await mountBar();
        host.labels = { any: 'Alle', applied: 'Aktive Filter', apply: 'Anwenden', filters: 'Filter wählen' };
        await fixture.flush();
        expect(fixture.query('.filter-button')?.textContent).toContain('Filter wählen');
        expect(fixture.query('.applied')?.getAttribute('aria-label')).toBe('Aktive Filter');
        await click('.filter-button');
        expect(fixture.query('.filter-actions ore-button:last-child')?.textContent).toContain('Anwenden');
        expect(fixture.query('ore-radio[value="any"]')?.textContent).toContain('Alle');
      });
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
      for (let index = 0; index < 2; index++) {
        fixture.query('.applied ore-chip')?.dispatchEvent(new CustomEvent('remove', { bubbles: true }));
      }
      await fixture.flush();

      expect(host.state?.tokens).toEqual([]);
    });
  });

  describe('Field controls', () => {
    it('the clear button clears the free text and keeps the pills', async () => {
      const host = await mountBar(commitToken({ text: '', tokens: [] }, { key: 'author', value: 'alice' }));

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
      await mountBar(commitToken({ text: 'bug', tokens: [] }, { key: 'author', value: 'alice' }));

      expect((await axeCheck(fixture.element)).violations).toHaveLength(0);

      await focusBar();
      expect((await axeCheck(fixture.element)).violations).toHaveLength(0);
    });
  });
});

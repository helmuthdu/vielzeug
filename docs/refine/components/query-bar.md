# Query Bar

A unified search field with removable filter pills, a filter drawer, and optional quick-filter toggles. Typed `key:value` suggestions and the drawer use the same vocabulary and query state.

## Basic Usage

Define a vocabulary (the token keys and their accepted values) as a JavaScript property, then read the query from the element's `state` property on every `input`/`change` event.

<ComponentPreview height="620px" vertical>

```html
<div style="display: grid; gap: var(--size-4); width: 100%;">
  <ore-query-bar id="demo" label="Search issues" placeholder="Title, author or label…" clearable>
    <span slot="toolbar-end" id="resultCount" role="status" style="color: var(--text-color-secondary);"></span>
  </ore-query-bar>
  <ore-list id="results" variant="bordered"></ore-list>
  <p id="noResults" hidden>No issues match. Remove a filter or change your search.</p>
</div>
<script>
  demo.vocabulary = [
    { key: 'author', label: 'Author', options: [
      { label: 'Alice', value: 'alice', icon: 'user' },
      { label: 'Bob', value: 'bob', icon: 'user' },
    ] },
    { key: 'label', label: 'Label', selection: 'multiple', options: [
      { label: 'Bug', value: 'bug', icon: 'bug' },
      { label: 'Enhancement', value: 'enhancement', icon: 'sparkles' },
    ] },
    { key: 'sort', label: 'Sort', anyLabel: 'Default order', options: [
      { label: 'Most recent', value: 'recent' },
      { label: 'Name A–Z', value: 'name' },
    ] },
  ];
  demo['quick-filters'] = [
    { key: 'author', value: 'alice', label: 'Assigned to Alice' },
    { key: 'label', value: 'bug', label: 'Bugs' },
  ];
  const issues = [
    { id: 4, title: 'Fix mobile navigation', author: 'alice', label: ['bug'] },
    { id: 3, title: 'Add keyboard shortcuts', author: 'bob', label: ['enhancement'] },
    { id: 2, title: 'Improve filter feedback', author: 'alice', label: ['bug', 'enhancement'] },
    { id: 1, title: 'Correct search highlighting', author: 'bob', label: ['bug'] },
  ];
  function renderResults() {
    const { text, tokens } = demo.state ?? { text: '', tokens: [] };
    const matches = issues.filter((issue) => {
      const content = [issue.title, issue.author, ...issue.label].join(' ').toLowerCase();
      return content.includes(text.toLowerCase()) && ['author', 'label'].every((key) => {
        const values = tokens.filter((token) => token.key === key).map((token) => token.value);
        return !values.length || values.some((value) =>
          key === 'author' ? issue.author === value : issue.label.includes(value));
      });
    });
    const sort = tokens.find((token) => token.key === 'sort')?.value;
    matches.sort((a, b) => sort === 'name' ? a.title.localeCompare(b.title) : b.id - a.id);
    results.replaceChildren(...matches.map((issue) => {
      const row = document.createElement('ore-list-item');
      row.textContent = issue.title;
      const description = document.createElement('span');
      description.slot = 'description';
      description.textContent = `${issue.author} · ${issue.label.join(', ')}`;
      row.append(description);
      return row;
    }));
    resultCount.textContent = `${matches.length} of ${issues.length} issues`;
    results.hidden = matches.length === 0;
    noResults.hidden = matches.length !== 0;
  }
  demo.addEventListener('input', renderResults);
  renderResults();
</script>
```

</ComponentPreview>

Applied filters stay inside the search field and wrap when space is limited. A single secondary row contains **Filters**, its active-group count, optional quick shortcuts, and any `toolbar-end` content (here, the result count). Selecting three values for one key counts as one active group. Removing a value returns focus to Filters rather than reopening the on-screen keyboard. Without a vocabulary, the Filters button is hidden; without a vocabulary, quick filters, or toolbar-end content, the whole secondary row is hidden. Neither takes space when absent.

The example evaluates results in application code: values within a group match with OR, while groups match with AND. Drawer edits leave the results unchanged until Apply; quick filters update them immediately. Clearing the sort choice restores newest-first order.

## Single and Multiple Values

Each vocabulary entry defaults to `selection: 'single'`. Use `selection: 'multiple'` when several values can be selected together; keep mutually exclusive choices such as sort order single-select.

```js
bar.vocabulary = [{
  key: 'fruit',
  label: 'Fruit',
  selection: 'multiple',
  options: [
    { label: 'Apple', value: 'apple' },
    { label: 'Banana', value: 'banana' },
  ],
}];

bar.state = {
  text: '',
  tokens: [
    { key: 'fruit', value: 'apple' },
    { key: 'fruit', value: 'banana' },
  ],
};
```

Values within a key represent **OR**; different keys represent **AND**: `(Apple OR Banana) AND Organic`. No selected values means no restriction, not an empty result set. The component manages the query only; your application applies these matching rules and handles free text and any special-purpose keys such as sort order.

Each `(key, value)` pair is unique. Typing `fruit:apple fruit:banana` adds both values; typing Apple again does not duplicate it or emit an unchanged query. Each applied pill removes only its own value. Backspace on an empty field removes the last individual value. Assign valid, unique tokens when supplying external state, with at most one value for single-selection keys.

## Filter Drawer

Open **Filters** to browse the vocabulary without typing. The drawer opens from the bottom at viewport widths up to `40rem`, and from the right on wider screens. Placement is chosen when you open it; resizing does not remount or discard your edits.

The bottom sheet fits short content and grows up to `90dvh` for longer filter sets. Its scrollable body keeps footer actions reachable. Groups use full-width option rows, except icon-complete groups, which render as the [card gallery](#option-icons) described below.

Each vocabulary key has a labeled section. Single-selection keys use radios, with **Any** to remove the restriction. Set `anyLabel` on a vocabulary entry for contextual copy such as **All authors** or **Default order**; the application defines what the absence of a token means. Multiple-selection keys use checkboxes, a selected-value count, and a **Clear {filter}** action that clears only that draft group. They have no **Any** checkbox: no checked values already means unrestricted.

Choices use quiet, full-width rows with 48px minimum targets rather than nested bordered tiles. Circular radios distinguish single selection from square checkboxes for multiple selection. Selected rows have a tinted surface and a checked indicator; keyboard focus outlines the whole row. In forced-colors mode, selected rows also have a visible system-color border.

Groups with more than eight options have a search field; searching only narrows the available options, not your selection. If search hides selected values, a summary names those values and **Show all options** clears the option search. Values may contain punctuation or spaces because the drawer selects exact vocabulary values rather than constructing query syntax. Clearing a group also removes values that are currently hidden by its search.

**Changes not applied** appears above the footer when selections differ from the applied query. **Reset filters** is disabled when the draft has no filters.

| Action | Effect |
| --- | --- |
| Select an option | Update the drawer draft only |
| Clear a multiple-selection group | Clear that draft group's values only |
| Reset filters | Clear draft filters, preserving free text |
| Apply filters | Commit the draft once and close; discard any unfinished typed token |
| Cancel, close, or Escape | Discard draft changes |
| Backdrop or swipe | Close an unchanged drawer; keep pending edits open |

Opening the drawer focuses its heading, not a search field. Closing returns focus to Filters. The drawer has a muted body, distinct filter sections, and a separate action footer. An actual external state change or vocabulary replacement closes the drawer to prevent stale edits from overwriting application changes. Tokens outside the vocabulary remain visible in the field and are preserved unless you remove or reset them.

### Option Icons

Set an option's `icon` to a registered `ore-icon` name to show it beside the text in the drawer. Both radio and checkbox choices support icons; omit `icon` for text-only options.

```js
bar.vocabulary = [{
  key: 'status',
  label: 'Status',
  options: [
    { label: 'Open', value: 'open', icon: 'circle' },
    { label: 'Closed', value: 'closed', icon: 'check' },
  ],
}];
```

Icons use the shared Refine registry. Register application icons through `registerIcons` as described in the [icon guide](./icon.md); no icon-library dependency is added by the query bar. Names do not refer to image URLs or raw SVG markup.

Text remains visible and supplies the accessible name; icons are decorative and hidden from assistive technology. They do not alter matching, token values, applied pills, quick filters, or typed suggestions. An unregistered name follows the normal `ore-icon` missing-icon behavior, while its option label remains readable.

### Card Gallery

When **every** option of a token carries an `icon`, its group renders as a card gallery instead of list rows: each choice becomes a card with the art centered and the label below it. The card is the real control — clicking anywhere on it toggles the choice, and keyboard, focus, checked, disabled, and forced-colors behavior are unchanged. The grid fits as many columns as the drawer width allows (three across the phone bottom sheet, fewer in narrow side panels), and labels clamp to two lines.

Unchecked cards stay clean: art and name only. A checked card shows a primary tint, a primary border, and a check badge in its top corner, so selection never relies on color alone. Forced-colors mode keeps every tick visible.

The switch is automatic and all-or-nothing per token: one text-only option keeps the whole group a plain list, which is also how lazily loaded art behaves — a group whose icons register after the drawer opens upgrades itself when the vocabulary re-syncs. In single-selection groups, the **Any** row has no art and stays a full-width row above the gallery.

## Quick Filters

Supply a curated list as a JavaScript property:

```js
demo['quick-filters'] = [
  { key: 'author', value: 'alice', label: 'Assigned to Alice' },
  { key: 'label', value: 'bug', label: 'Bugs' },
];
```

Quick filters apply immediately. Each pill is a checkbox-style toggle, selected only when its exact key and value are applied. Selecting one replaces another value for a single-selection key or adds a value for a multiple-selection key, without changing free text or unrelated filters. Deselecting removes only that exact restriction, preserving other values of the same key. A shortcut whose option is no longer in the vocabulary stays visible but disabled.

Quick filters and applied filters have different roles: shortcuts choose a restriction; removable applied pills show the current query. History, storage, result counts, requests, and whole-query presets belong to your application. The component does not record recent searches.

On phones (coarse pointers below `40rem`) the quick-filter group is hidden so the toolbar leaves maximum space for `toolbar-end` content such as result counts. Tablets keep the row. Every quick filter duplicates a drawer control, so phone users reach the same restrictions through **Filters**; selection state and behavior are unchanged.

## Toolbar-End Slot

The toolbar row has one reserved spot at its end for application content, typically a result count beside the Filters button:

```html
<ore-query-bar label="Search issues">
  <span slot="toolbar-end">12 results</span>
</ore-query-bar>
```

The slot sits outside the component's state: the bar never reads or rewrites it, so your application updates it freely as results load. It aligns to the row's end (respecting text direction) and wraps below the controls with them when the row runs out of room. An empty slot renders nothing.

## Suggestions

The dropdown opens while the field holds focus and sits below the complete bar so it does not cover the toolbar. Picking a key suggestion starts composing (`author:`); picking a value commits its filter. Typing a plain word also offers any option that reads like it: `ali` suggests `author:Alice` directly.

Typing a complete `key:value` pair (for example `author:alice`) commits immediately and removes it from the field. Unknown keys stay as free text. Single-selection keys replace their value; multiple-selection keys accumulate distinct values. Backspace on an empty field removes the last individual applied value. Use repeated keys rather than comma-separated syntax; exact values containing spaces can be selected from suggestions or the drawer.

After Escape, typing reopens suggestions. An unresolved draft shows a "searching as text" row. On leaving the component, a bare `key:` reverts and an unmatched draft becomes free text; a matching unfinished draft survives until you resume or apply drawer filters.

## Controlled State

`state` carries `{ text, tokens }`. Each committed user edit emits one `input` and one `change`; read the new query from the element's `state` property. Drawer edits do not emit query events until Apply, and applying an unchanged draft emits nothing. Omit `state` for uncontrolled use.

Assign a new state object to apply external changes, including text-only updates. External writes do not emit query events. Semantically equivalent echoes preserve unfinished typing even if you copy the tokens array. Tokens are compared in order by key and value; array identity is irrelevant.

```js
// A deep link presetting a filter:
bar.state = { text: '', tokens: [{ key: 'author', value: 'alice' }] };

// Reading a filter back:
const author = bar.state.tokens.find((token) => token.key === 'author')?.value;
```

### Grammar Helpers

Import helpers from `@vielzeug/refine/query-bar` to build or inspect the same flat token state:

```js
import { commitToken, removeToken, clearTokens, tokenValues } from '@vielzeug/refine/query-bar';

const withApple = commitToken(bar.state, { key: 'fruit', value: 'apple' }, 'multiple');
const withBoth = commitToken(withApple, { key: 'fruit', value: 'banana' }, 'multiple');
const withoutApple = removeToken(withBoth, { key: 'fruit', value: 'apple' });
const unrestricted = clearTokens(withoutApple, 'fruit');
const fruits = tokenValues(withBoth, 'fruit'); // ['apple', 'banana']
```

| Helper | Contract |
| --- | --- |
| `parseQuery(input, vocabulary)` | Extract text, tokens, and an unfinished draft; respect each key's selection mode |
| `suggestQuery(input, vocabulary)` | Offer matching keys or values |
| `commitToken(state, token, selection = 'single')` | Replace a single-selection key in place, or append a distinct multiple-selection value |
| `removeToken(state, token)` | Remove only the exact key/value pair |
| `clearTokens(state, key)` | Remove every value of one key |
| `tokenValues(state, key)` | Return all values for a key in selection order, or `[]` |
| `hasQueryFilters(state)` | Return whether free text or any tokens are present |

These helpers return state without mutating the supplied object. `commitToken` receives the mode explicitly because state alone does not contain the vocabulary.

## Field Variants

The bar passes `variant`, `size`, and `rounded` through to its internal field. It supports `error`, `helper`, and `hide-label` like other inputs. The keyboard-accessible clear button appears only when `clearable` is set; it clears free text, never filters.

Suggestion rows have a minimum height of `--query-bar-option-height` (`var(--size-11)` by default), and grow for long labels rather than using fixed-height positioning. The dropdown sizes to its content between `--query-bar-dropdown-min-width` (16rem, viewport-capped) and `--query-bar-dropdown-max-width` (28rem, viewport-capped). The secondary row and inline pills wrap with the available container width. On phones (coarse pointers below `40rem`), quick filters are hidden to keep the row compact — every quick filter duplicates its drawer control, so they stay reachable through **Filters**. `disabled` disables the field, clear action, filter entry, quick filters, and removals, and closes pending drawer edits.

<ComponentPreview height="360px">

```html
<ore-query-bar id="err" label="Search issues" placeholder="Title, author or label…" variant="bordered" rounded="md"
  error="Searches are at most 64 characters."></ore-query-bar>
<script>
  err.vocabulary = [
    { key: 'author', label: 'Author', options: [{ label: 'Alice', value: 'alice' }] },
  ];
</script>
```

</ComponentPreview>

## Accessibility

The inner input carries `role="combobox"`, `aria-expanded`, `aria-controls`, and `aria-activedescendant`, with suggestions as a `listbox`. Arrow keys move the highlight, Enter commits it, and Escape dismisses. The drawer uses the native modal dialog, labeled radio or checkbox groups, focus containment, and focus restoration. Use arrows within radio groups; Tab moves between checkboxes and Space toggles a checkbox. Its scrollable body is separate from footer actions.

Quick filters use checkbox semantics and accessible checked states. Applied pills have labeled remove buttons. Secondary controls remain visually compact for pointer use and expand to at least 44px targets on coarse pointers; applied pills keep their slim badge shape there while their remove button keeps the full 44px hit area. Drawer choices always provide 44px rows. Search input editing and dialog interaction do not trigger query changes until a query is actually committed.

## Properties and Events

| Property | Type | Purpose |
| --- | --- | --- |
| `vocabulary` | `QueryTokenDef[]` | Labeled keys, exact option values, and per-key selection mode |
| `state` | `QueryState` | Free text and distinct key/value tokens |
| `quick-filters` | `QueryQuickFilter[]` | Curated single-filter toggles |
| `labels` | `Partial<QueryBarLabels>` | Localized built-in copy |

The types and grammar helpers are exported from `@vielzeug/refine/query-bar`.

```ts
interface QueryTokenDef {
  anyLabel?: string;
  key: string;
  label: string;
  options: { label: string; value: string; icon?: string }[];
  selection?: 'single' | 'multiple';
}

interface QueryQuickFilter {
  key: string;
  value: string;
  label: string;
}
```

`input` and `change` are native-style events with no query payload; read `bar.state`. `open-change` carries `{ open, reason, surface }`, where `surface` is `'suggestions'` or `'filters'`. Events from controls inside the drawer are contained rather than being exposed as query changes.

## Localization and Styling

Override built-in labels without changing locale-stable vocabulary keys:

```js
demo.labels = {
  filters: 'Filter',
  hiddenSelected: '{count} ausgewählte Werte durch Suche ausgeblendet',
  applied: 'Aktive Filter',
  quickFilters: 'Schnellfilter',
  apply: 'Filter anwenden',
  cancel: 'Abbrechen',
  reset: 'Filter zurücksetzen',
  any: 'Alle',
  clear: 'Suchtext löschen',
  clearFilter: '{filter} löschen',
  selected: '{count} ausgewählt',
  noMatch: 'Keine passende Option — wird als Text gesucht',
  noOptions: 'Keine passenden Optionen.',
  pending: 'Änderungen nicht angewendet',
  selectedValues: 'Ausgewählt: {values}',
  showAll: 'Alle Optionen anzeigen',
  searchOptions: '{filter} durchsuchen',
};
```

The `{filter}` placeholder is replaced by the vocabulary label; `{count}` is the selected-value count (`selected`) or the search-hidden selected-value count (`hiddenSelected`). `{values}` lists search-hidden selected labels. Localize vocabulary labels, `anyLabel`, option labels, and quick-filter labels in your application. The shared drawer supplies its own close-button accessible name.

| Part | Surface |
| --- | --- |
| `wrapper` | Search field host |
| `clear-btn` | Clear-text button |
| `toolbar` | Filters button, quick filters, and toolbar-end slot |
| `toolbar-end` | End-aligned container for `toolbar-end` slot content |
| `applied` | Applied-filter group inside the search field |
| `dropdown` | Suggestion panel |

Use Refine design tokens for spacing, type, color, and radii. `--query-bar-min-width` defaults to `0` so narrow containers can shrink the bar. See the [migration guide](../migration.md#query-bar-filter-layout-and-state-echoes) for changed layout and state semantics.

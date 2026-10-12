# Query Bar

A search field that accepts free text and `key:value` tokens together. Committed tokens render as removable pills inside the field; a suggestion dropdown lists the vocabulary's keys and matching values while typing, so touch users never need to type a colon.

## Basic Usage

Define a vocabulary (the token keys and their accepted values) as a JavaScript property, then read the query from the element's `state` property on every `input`/`change` event.

<ComponentPreview height="360px">

```html
<ore-query-bar id="demo" label="Search issues" placeholder="Title, author or label…" clearable></ore-query-bar>
<script>
  demo.vocabulary = [
    { key: 'author', label: 'Author', options: [
      { label: 'Alice', value: 'alice' },
      { label: 'Bob', value: 'bob' },
    ] },
    { key: 'label', label: 'Label', options: [
      { label: 'Bug', value: 'bug' },
      { label: 'Enhancement', value: 'enhancement' },
    ] },
    { key: 'sort', label: 'Sort', options: [
      { label: 'Most recent', value: 'recent' },
      { label: 'Name A–Z', value: 'name' },
    ] },
  ];
  demo.addEventListener('input', () => console.log(demo.state));
</script>
```

</ComponentPreview>

Typing a complete `key:value` pair (for example `author:alice`) commits it to a pill immediately and rewrites it out of the field; unknown keys stay as free text instead of erroring. Backspace on an empty field removes the last pill. The dropdown reopens on typing after Escape, so the bar never reads as stuck. A draft whose value matches nothing shows a "searching as text" row instead of closing; on blur, a bare `key:` fragment reverts and a dead draft degrades into the searched text, so the field never carries silent residue.

## Suggestions

The dropdown opens while the field holds focus. Picking a key suggestion starts composing (`author:`), picking a value commits its pill. Typing a plain word also offers any option that reads like it: `ali` suggests `author:Alice` directly.

## Controlled State

The bar is state-driven: `state` carries `{ text, tokens }`, and every edit emits `input` and `change` with the new state readable from the element's `state` property. Omit `state` for uncontrolled use. External writes — deep-link presets, mode switches — assign a new object with a different `tokens` array; objects whose `tokens` array is identical to the current one are treated as consumer echoes, so a partial `author:al…` draft survives its own round-trip.

```js
// A deep link presetting a filter:
bar.state = { text: '', tokens: [{ key: 'author', value: 'alice' }] };

// Reading a filter back:
const author = bar.state.tokens.find((token) => token.key === 'author')?.value;
```

The grammar helpers (`parseQuery`, `suggestQuery`, `commitToken`, `removeToken`, `tokenValue`, `hasQueryFilters`) are exported from the same module for building vocabularies and reading tokens.

## Field Variants

The bar passes `variant`, `size`, and `rounded` through to its internal field, shows `error` and `helper` text like every input, and `hide-label` swaps the visible label for an `aria-label` on the field for compact placements. The clear (×) button appears only when `clearable` is set; it clears the free text, never the pills. Suggestion rows honor `--query-bar-option-height` (36px default) for touch-target tuning. The dropdown panel sizes to its content between `--query-bar-dropdown-min-width` (16rem default) and `--query-bar-dropdown-max-width` (28rem, viewport-capped) — it never stretches to match the full-width bar.

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

The inner input carries the full combobox semantics: `role="combobox"`, `aria-expanded`, `aria-controls`, and `aria-activedescendant` on the focused element, with the dropdown as its `listbox`. Arrow keys move the highlight, Enter commits it, Escape dismisses. Pills are removable chips with their own accessible remove buttons. The clear button clears the free text only, never the pills.

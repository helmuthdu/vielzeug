---
title: Focus 3.0 Migration
---

# Focus 3.0 Migration

## 3.0

Focus 3.0 makes list navigation a pure in-memory decision primitive. It returns structured changes while framework and component layers own focus effects, reactive state, event listeners, and disposal.

### Replace `onNavigate` with returned changes

```diff
  const nav = createListNavigation({
    getItems: () => items,
-   onNavigate: ({ item }) => item.focus(),
  });

- list.addEventListener('keydown', nav.handleKeydown);
+ const onKeydown = (event: KeyboardEvent) => {
+   const result = nav.handleKeydown(event);
+   result?.change?.item.focus();
+ };
+ list.addEventListener('keydown', onKeydown);
```

Programmatic navigation also returns the operation snapshot:

```ts
nav.navigate('next')?.item.focus();
```

### Inspect keyboard handling explicitly

`handleKeydown()` returns `null` for disabled, already-prevented, composing, or unrecognized events. Recognized keys return:

```ts
{
  handled: true,
  change: ListNavigationChange<T> | null,
}
```

`change` is `null` when a recognized boundary key is consumed without moving. Successful typeahead returns a change; set `typeahead.preventDefault: true` when printable keys should be consumed. Leave it false for editable combobox inputs.

### Remove artificial navigation lifecycle

`createListNavigation()` no longer owns resources, listeners, or timers. Remove:

- `signal`
- `dispose()`
- `disposed`
- `disposalSignal`
- `[Symbol.dispose]()`

The layer that attaches `keydown` owns listener removal. Framework adapters that add reactive state or signals remain disposable at that owning layer.

### Validate navigation configuration

- `set(index)` accepts only integer indexes; invalid or disabled indexes reset to `-1`.
- Conflicting custom key assignments throw `RangeError`.
- `typeahead.delayMs` must be a positive finite number.
- Typeahead timing uses a monotonic clock and ignores IME composition.

### Focus restoration failures use fallbacks

`restoreFocus()` now treats throwing target getters or `focus()` implementations as failed attempts. It tries the configured fallback and returns `false` only when neither target can be restored.

### NodeNext declarations

Published declarations use explicit `.js` relative specifiers and are checked through strict NodeNext and ESM/CJS artifact fixtures.

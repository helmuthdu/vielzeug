---
title: Keymap — Headless keyboard shortcut manager
description: Target-local keyboard shortcut manager with chords, event-aware guards, modifier aliases, and terminal disposal.
package: keymap
category: app-infrastructure
keywords: [keyboard, shortcuts, hotkeys, chord, keybinding, headless, accessibility]
exports:
  [
    canonicalizeShortcut,
    createKeymap,
    detectModKey,
    findShortcutConflicts,
    formatShortcut,
    KeymapError,
    KeymapParseError,
    matchStep,
    parseShortcut,
    parseStep,
  ]
related: [herald, refine, ore]
environments: [browser, node, ssr, deno]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageHero package="keymap" />

## Why Keymap?

Browser keyboard handling needs modifier normalization, chord state, context policy, and listener ownership. Keymap keeps those concerns in one headless, zero-dependency handle.

```ts
// Before
window.addEventListener('keydown', (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key === 's') event.preventDefault();
});

// After
import { createKeymap } from '@vielzeug/keymap';

const map = createKeymap({ 'mod+s': () => console.log('save') });
const unmount = map.mount(document);

unmount();
map.dispose();
```

| Feature             | Raw `addEventListener`                       | Keymap                                       |
| ------------------- | -------------------------------------------- | -------------------------------------------- |
| Bundle size         | 0 B (built-in)                               | <PackageInfo package="keymap" type="size" /> |
| Zero dependencies   | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="check" size="16"></ore-icon> |
| Chord sequences     | <ore-icon name="x" size="16"></ore-icon>     | <ore-icon name="check" size="16"></ore-icon> |
| Modifier aliases    | <ore-icon name="x" size="16"></ore-icon>     | `cmd`, `win`, `option` → canonical           |
| Context guards      | Manual `if` in handler                       | Event-aware `when(event)` predicate          |
| Chord ownership     | Application-managed state                    | Per mounted target                           |
| Disposable          | Manual `removeEventListener`                 | Terminal `dispose()` + `[Symbol.dispose]()`  |

<div class="decision-callout">

**Use Keymap when** you need chord sequences (`g g`, `ctrl+k ctrl+s`), modifier aliases, or context-scoped hotkeys that can be cleanly mounted and unmounted.

**Consider raw `addEventListener` when** you have a single, static, never-removed hotkey and don't need chords.

</div>

## Installation

::: code-group

```sh [pnpm]
pnpm add @vielzeug/keymap
```

```sh [npm]
npm install @vielzeug/keymap
```

```sh [yarn]
yarn add @vielzeug/keymap
```

:::

## Quick Start

Create, mount, then dispose one map owned by your UI scope.

```ts
import { createKeymap } from '@vielzeug/keymap';

const map = createKeymap({
  'mod+k mod+s': () => console.log('save'),
  'mod+shift+p': () => console.log('open palette'),
  'g g': () => window.scrollTo({ top: 0 }),
  escape: () => console.log('close panel'),
});

const unmount = map.mount(document);

unmount();
map.dispose();
```

## Features

<div class="features-grid">

- `createKeymap()` — Create a keymap from a bindings record; mount to any `EventTarget`
- Chord sequences — `"g g"`, `"ctrl+k ctrl+s"` with configurable timeout (default 1 s)
- Modifier aliases — `cmd`/`command`/`win` → `meta`; `opt`/`option` → `alt`; `mod` → platform-aware
- `BindingOptions` — per-binding `{ handler, when?, trigger? }` object syntax
- `modKey` option — explicit platform override for SSR and cross-platform tests
- `formatShortcut()` — platform-aware display (`⇧⌘P` on Mac, `Ctrl+Shift+P` elsewhere)
- `parseShortcut()` / `parseStep()` / `matchStep()` — exposed for building custom matchers or testing
- `canonicalizeShortcut()` — convert any shortcut alias to a stable key for conflict detection
- `detectModKey()` — platform modifier detection (`'meta'` on Mac, `'ctrl'` elsewhere)
- `listBindings()` — snapshot all active bindings (shortcut and trigger) for palette UIs
- `findShortcutConflicts()` — detect prefix/duplicate conflicts before binding a user-customized shortcut
- Disposable — `dispose()` + `[Symbol.dispose]` for `using` declarations

</div>

## Documentation

<div class="doc-links">

- [Usage Guide](./usage.md)
- [API Reference](./api.md)
- [Examples](./examples.md)
- [Migration to 2.0](./migration.md)

</div>

## See Also

<div class="see-also">

- [Herald](/herald/) — Typed event bus; pair with Keymap by publishing shortcut events to a bus instead of calling handlers directly
- [Refine](/refine/) — `ore-command-palette` uses Keymap internally; register your own shortcuts alongside it
- [Ore](/ore/) — Attach a keymap inside a `define()` setup function for component-scoped shortcuts

</div>

<!-- markdownlint-enable MD025 MD033 MD060 -->

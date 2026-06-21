---
title: Keymap — Headless keyboard shortcut manager
description: Chord-aware keyboard shortcut manager with context guards, modifier aliases, and disposable bindings — no DOM assumptions.
package: keymap
category: app-infrastructure
keywords: [keyboard, shortcuts, hotkeys, chord, keybinding, headless, accessibility]
exports: [createKeymap, createKeymapLayer, formatShortcut, matchStep, parseShortcut]
related: [herald, sigil, craft]
environments: [browser, node, ssr, deno]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageHero package="keymap" />

## Why Keymap?

Browser keyboard handling is error-prone: modifier key normalisation, platform differences (`ctrl` vs `meta`), chord sequences, and cleanup all require boilerplate. Keymap handles all of it in a headless, zero-dependency package.

| Feature              | Raw `addEventListener`                       | Keymap                                                    |
| -------------------- | -------------------------------------------- | --------------------------------------------------------- |
| Bundle size          | 0 B (built-in)                               | <PackageInfo package="keymap" type="size" />              |
| Zero dependencies    | <sg-icon name="check" size="16"></sg-icon>   | <sg-icon name="check" size="16"></sg-icon>                |
| Chord sequences      | <sg-icon name="x" size="16"></sg-icon>       | <sg-icon name="check" size="16"></sg-icon>                |
| Modifier aliases     | <sg-icon name="x" size="16"></sg-icon>       | `cmd`, `win`, `option` → canonical                        |
| Context guards       | Manual `if` in handler                       | `when()` predicate per keymap                             |
| Headless / SSR-safe  | DOM required                                 | <sg-icon name="check" size="16"></sg-icon>                |
| Disposable           | Manual `removeEventListener`                 | `dispose()` + `using`                                     |

<div class="decision-callout">

**Use Keymap when** you need chord sequences (`g g`, `ctrl+k ctrl+s`), modifier aliases, or context-scoped hotkeys that can be cleanly mounted and unmounted.

**Stick with raw `addEventListener` when** you have a single, static, never-removed hotkey and don't need chords.

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

```ts
import { createKeymap } from '@vielzeug/keymap';

const map = createKeymap({
  'ctrl+k ctrl+s': () => save(),
  'meta+shift+p':  () => openPalette(),
  'g g':           () => goToTop(),
  'escape':        () => closePanel(),
});

const unmount = map.mount(document);

// Later:
unmount();     // remove from this target only
map.dispose(); // or: using map = createKeymap(…)
```

## Features

<div class="features-grid">

- `createKeymap()` — Create a keymap from a bindings record; mount to any `EventTarget`
- Chord sequences — `"g g"`, `"ctrl+k ctrl+s"` with configurable timeout (default 1 s)
- Modifier aliases — `cmd`/`command`/`win` → `meta`; `opt`/`option` → `alt`; `mod` → platform-aware
- `BindingOptions` — per-binding `{ handler, when?, trigger?, priority? }` object syntax
- `modKey` option — explicit platform override for SSR and cross-platform tests
- `formatShortcut()` — platform-aware display (`⇧⌘P` on Mac, `Ctrl+Shift+P` elsewhere)
- `createKeymapLayer()` — scoped keymap stack with `activate()` / `deactivate()`
- `parseShortcut()` / `matchStep()` — exposed for building custom matchers or testing
- Disposable — `dispose()` + `[Symbol.dispose]` for `using` declarations

</div>

## Documentation

<div class="doc-links">

- [Usage Guide](./usage.md)
- [API Reference](./api.md)
- [Examples](./examples.md)

</div>

## See Also

<div class="see-also">

- [Herald](/herald/) — Typed event bus; pair with Keymap by publishing shortcut events to a bus instead of calling handlers directly
- [Sigil](/sigil/) — `sg-command-palette` uses Keymap internally; register your own shortcuts alongside it
- [Craft](/craft/) — Attach a keymap inside a `define()` setup function for component-scoped shortcuts

</div>

<!-- markdownlint-enable MD025 MD033 MD060 -->

---
title: Versioning
description: 'How @vielzeug packages are versioned and released: CalVer lockstep trains, what the number means, and how to upgrade.'
---

# Versioning

Every `@vielzeug/*` package carries the same version: the release train it last shipped on. The number is CalVer: `YY.MM.N`, the calendar year and month the train shipped plus the train revision. `26.10.0` is October 2026's first train; `26.10.1` its second; November starts fresh at `26.11.0`.

## What the number means

The version answers **when**, never **how big**. There is no major/minor judgment baked into it:

- A breaking change rides the next train like any other change. It says so in that package's changelog entry and in its migration guide (linked from the package's docs).
- Every package rides every train: a train publishes the whole family at its number, so all `@vielzeug/*` versions on npm always line up. A package whose changelog entry for a train says "no code change this train" shipped unchanged: its version moved with the train, its code didn't.
- Because the whole family shares one number, an upgrade is a set move: every `@vielzeug/*` dependency moves to the same train together, and installing `@latest` of any combination of packages always resolves to one copy of each: no duplicated nested versions.

## How to depend on Vielzeug

Pin exact versions rather than caret ranges:

```jsonc
{
  "dependencies": {
    "@vielzeug/ripple": "26.10.0", // not "^26.10.0"
  },
}
```

Exact pinning matters more under CalVer than you might expect: `^26.10.0` means `>=26.10.0 <27.0.0`, which spans *months*: `26.11.x`, `26.12.x` and every later train in 2026 all match. And because a breaking change rides the next train like any other change, a caret range can silently pull a breaking train into your lockfile. Upgrade deliberately: move every `@vielzeug/*` dependency to the same train, read the changed packages' changelog entries, and each changed package's migration guide first.

## Where to read about a train

- **Changelog**: every published version has an entry in the package's changelog listing what rode that train for that package.
- **Migration guide**: `docs/<package>/migration.md` in this site's sidebar for the package. One section per breaking change, old code → new code.
- **The docs site and demos always track `main`**: the latest train, ahead of anything published.

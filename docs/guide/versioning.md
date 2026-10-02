---
title: Versioning
description: How @vielzeug packages are versioned and released — CalVer lockstep trains, what the number means, and how to upgrade.
---

# Versioning

Every `@vielzeug/*` package carries the same version: the release train it last shipped on. The number is CalVer — `YY.MM.N`, the calendar year and month the train shipped plus the train revision. `26.10.0` is October 2026's first train; `26.10.1` its second; November starts fresh at `26.11.0`.

## What the number means

The version answers **when**, never **how big**. There is no major/minor judgment baked into it:

- A breaking change rides the next train like any other change. It says so in that package's changelog entry and in its migration guide (linked from the package's docs).
- Packages still release independently in the sense that matters: a train stamps every package, but only packages that actually changed publish, and unchanged packages keep their previous version on npm. A breaking change in `ward` never forces `ripple` to move.
- So an npm version is "the last train in which that package changed" — two packages on the same version were released together; two packages on different versions simply last rode different trains.

## How to depend on Vielzeug

Pin exact versions rather than caret ranges:

```jsonc
{
  "dependencies": {
    "@vielzeug/ripple": "26.10.0", // not "^26.10.0"
  },
}
```

A caret range stops at the pre-CalVer history by design (`^26.10.0` will never pull a `26.11.x` train), which is the behavior you want: trains you haven't read about shouldn't flow into your lockfile silently. When you do move to a newer train, read the changed packages' changelog entries and each package's migration guide first.

## Where to read about a train

- **Changelog** — every published version has an entry in the package's changelog listing what rode that train for that package.
- **Migration guide** — `docs/<package>/migration.md` in this site's sidebar for the package. One section per breaking change, old code → new code.
- **The docs site and demos always track `main`** — the latest train, ahead of anything published.

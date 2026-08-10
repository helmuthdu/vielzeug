---
title: Necromancer — Lifecycle-owned DOM animations
description: Lifecycle-owned Web Animations API primitives for native playback, groups, and additive FLIP transitions.
package: necromancer
category: ui
keywords: [animation, web-animations-api, waapi, flip, stagger, reduced-motion]
related: [orbit, ore]
exports: [animate, animateEach, captureLayout]
environments: [browser]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageHero package="necromancer" />

## Why Necromancer?

Native Web Animations API calls do not provide lifecycle ownership, reduced-motion policy, grouped playback, or layout transitions. Necromancer retains native keyframes and timing options while making ownership explicit for a component or DOM feature. Its default `180ms` duration makes the smallest call visible without hiding native timing control.

```ts
// Before
const animation = element.animate(keyframes, { duration: 180 });
animation.addEventListener('cancel', removeListeners);

// After
const animation = animate(element, keyframes, { duration: 180 });
animation.dispose();
```

| Feature | Native WAAPI | Necromancer | Motion One |
| --- | --- | --- | --- |
| Bundle size | 0 B | <PackageInfo package="necromancer" type="size" /> | ~18 kB |
| Root dependencies | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="x" size="16"></ore-icon> |
| Lifecycle handle | Manual | `dispose()` | Library-specific controls |
| Reduced motion | Manual | `motion: 'system'` default | Configuration required |
| Layout transitions | Manual FLIP math | `captureLayout().animate()` | Separate API |

<div class="decision-callout">

**Use Necromancer when** you need native browser animations with explicit cancellation, reduced-motion behavior, staggered groups, or positional FLIP transitions.

**Consider CSS transitions when** a static style change needs no playback control, cleanup, or layout measurement.

</div>

## Installation

::: code-group

```sh [pnpm]
pnpm add @vielzeug/necromancer
```

```sh [npm]
npm install @vielzeug/necromancer
```

```sh [yarn]
yarn add @vielzeug/necromancer
```

:::

## Quick Start

Start the animation after its DOM element mounts and release it when its UI owner is removed.

```ts
import { animate } from '@vielzeug/necromancer';

const notice = document.createElement('p');
notice.textContent = 'Saved';
document.body.append(notice);

const animation = animate(
  notice,
  [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'translateY(0)' }],
  { duration: 180, easing: 'ease-out' },
);

await animation.result;
animation.dispose();
```

## Features

<div class="features-grid">

- `animate()` — Native element animation with lifecycle ownership and direct native access
- `animateEach()` — Group ownership with stable keyframe factories and `stagger`
- `captureLayout()` — One-shot FLIP transition with additive `translate` (position) and `scale` (size)
- `motion` — `'system'` reduced-motion support with explicit reduced outcomes
- `interrupt: 'cancel'` — Replace active Necromancer-owned animation on an element
- `signal` — Abort a handle from its parent lifecycle
- `dispose()` — Idempotent cleanup with `[Symbol.dispose]()`

</div>

## Deliberate Scope

Necromancer owns explicit WAAPI keyframes. It does not generate CSS keyframes, observe CSS transitions, watch mutations, simulate springs, interpolate SVG paths, or run a JavaScript tween loop. Use CSS for declarative style changes and choose a dedicated tool when those capabilities are required.

## Documentation

<div class="doc-links">

- [Usage Guide](./usage.md)
- [API Reference](./api.md)
- [Examples](./examples.md)

</div>

## See Also

<div class="see-also">

- [Orbit](/orbit/) — Position floating UI before animating its appearance.
- [Ore](/ore/) — Own Necromancer handles in a custom element's mount and disposal lifecycle.
</div>

<!-- markdownlint-enable MD025 MD033 MD060 -->

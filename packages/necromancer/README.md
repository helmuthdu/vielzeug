# @vielzeug/necromancer

Lifecycle-owned DOM animation primitives built on the Web Animations API.

## Overview

`@vielzeug/necromancer` owns native animations so UI lifecycles can cancel them predictably. It animates one element, coordinates staggered groups, and applies additive FLIP layout transitions.

- `animate()` defaults to `180ms` and returns a lifecycle owner with direct access to its native `Animation`.
- `animateEach()` animates unique elements with optional staggered delays.
- `captureLayout()` returns a one-shot, additive FLIP transition covering both position and size.

## Installation

```sh
pnpm add @vielzeug/necromancer
```

## Basic Usage

Create the element after mount, use the native animation when playback control is needed, and dispose its owner with the UI that created it.

```ts
import { animate } from '@vielzeug/necromancer';

const button = document.createElement('button');
button.textContent = 'Save';
document.body.append(button);

const handle = animate(
  button,
  [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'translateY(0)' }],
  { duration: 180, easing: 'ease-out' },
);

handle.animation.pause();
await handle.result;
handle.dispose();
```

## API Summary

| Export | Purpose |
| --- | --- |
| `animate()` | Animate one element and return an `AnimationHandle`. |
| `animateEach()` | Animate unique elements in iteration order and return an `AnimationGroup`. |
| `captureLayout()` | Capture element positions and sizes and return a one-shot layout transition, including keyed replacement nodes. |
| `NecromancerError` | Base class for Necromancer-originated errors. |

`AnimateOptions` accepts native `KeyframeAnimationOptions`, `interrupt`, `motion`, and `signal`. `duration` defaults to `180` milliseconds; use `interrupt: 'cancel'` to replace active Necromancer-owned animations on one element. `animateEach()` and layout transitions also accept `stagger`. Pass `captureLayout()` a `getKey` function and its transition the committed `elements` to animate framework-rendered replacement nodes from their captured positions.

## Testing

`@vielzeug/necromancer/testing` provides `installFakeAnimations()`, `FakeAnimation`, and `createRect()` for testing code that calls Necromancer without a browser's `Element.animate()`. See the [Usage Guide](https://vielzeug.dev/necromancer/usage#testing).

## Environment

Necromancer is for browser execution and requires the Web Animations API when an animation starts. Its root module is safe to import during SSR; call its functions only from a client mount lifecycle where DOM elements exist.

`motion` defaults to `'system'`, which follows `prefers-reduced-motion`. When motion is reduced, Necromancer preserves the supplied keyframes but normalizes their timing to an instant transition and resolves with `{ status: 'reduced' }`. Set it to `'full'` to animate regardless of that preference or `'reduced'` to always remove movement.

## Peers and Dependencies

Necromancer has no runtime or peer dependencies. It uses browser-provided `Element.animate()`, `AbortSignal`, and `Symbol.dispose`.

## Scope

Necromancer owns explicit Web Animations API keyframes. It does not inject or observe CSS animations, watch DOM mutations, generate springs, interpolate SVG geometry, or provide a JavaScript tween fallback.

## Documentation

- [Overview](https://vielzeug.dev/necromancer/)
- [Usage Guide](https://vielzeug.dev/necromancer/usage)
- [API Reference](https://vielzeug.dev/necromancer/api)
- [Examples](https://vielzeug.dev/necromancer/examples)

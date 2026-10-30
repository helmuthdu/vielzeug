---
title: 'Refine: Animation & Motion'
description: Duration and easing tokens, named animations, utility classes, motion mode, and list reflow motion for Refine.
---

# Animation & Motion

[[toc]]

Every animation and transition in Refine routes through the tokens on this page. Nothing is hardcoded, so one token override retunes the whole library, and [Motion Mode](#motion-mode) can switch all of it off at once.

## Duration & Easing

**Duration scale:**

| Token             | Value  | Zeroed under reduced-motion |
| ----------------- | ------ | --------------------------- |
| `--duration-75`   | 75ms   | Yes                         |
| `--duration-100`  | 100ms  | Yes                         |
| `--duration-150`  | 150ms  | Yes                         |
| `--duration-200`  | 200ms  | Yes                         |
| `--duration-250`  | 250ms  | Yes                         |
| `--duration-300`  | 300ms  | Yes                         |
| `--duration-350`  | 350ms  | Yes                         |
| `--duration-500`  | 500ms  | Yes                         |
| `--duration-600`  | 600ms  | Yes (spinner also stops via the `--_motion-animation` hatch) |
| `--duration-700`  | 700ms  | Yes                         |
| `--duration-1000` | 1000ms | Yes                         |
| `--duration-1200` | 1200ms | Yes (looping indicator stops via the hatch) |
| `--duration-1400` | 1400ms | Yes (looping indicator stops via the hatch) |
| `--duration-1500` | 1500ms | Yes (looping indicator stops via the hatch) |

**Easing:**

| Token              | Value                             | Use                            |
| ------------------ | --------------------------------- | ------------------------------ |
| `--ease-linear`    | `linear`                          |                                |
| `--ease-in`        | `cubic-bezier(0.4, 0, 1, 1)`     |                                |
| `--ease-out`       | `cubic-bezier(0, 0, 0.2, 1)`     |                                |
| `--ease-in-out`    | `cubic-bezier(0.4, 0, 0.2, 1)`   | Default for most transitions   |
| `--ease-spring`    | `cubic-bezier(0.22, 1, 0.36, 1)` | Fast start, soft landing       |
| `--ease-move`      | `cubic-bezier(0.25, 1, 0.5, 1)`  | Drawers, panels, carousels     |
| `--ease-overshoot` | `cubic-bezier(0.34, 1.1, 0.64, 1)` | Toasts, popups               |

**Pre-built transitions:**

| Token                 | Value                          | Use                              |
| --------------------- | ------------------------------ | -------------------------------- |
| `--transition-none`   | `none`                         |                                  |
| `--transition-fast`   | `150ms var(--ease-in-out)`     | Hover states, toggles            |
| `--transition-normal` | `200ms var(--ease-in-out)`     | Default                          |
| `--transition-slow`   | `300ms var(--ease-in-out)`     | Panels, accordions               |
| `--transition-slower` | `500ms var(--ease-in-out)`     |                                  |
| `--transition-spring` | `300ms var(--ease-spring)`     | Bouncy interactions              |
| `--transition-exit`   | `300ms var(--ease-out)`        | Overlay dismiss, alert collapse  |
| `--transition-loader` | `600ms linear`                 | Spinner constant rotation        |

::: warning
`--transition-all` does not exist in Refine. Use explicit property transitions to avoid forcing layout recalculation on every style change:
```css
transition: color var(--transition-fast), background var(--transition-fast);
```
:::

::: tip Top-layer overlays
Overlay enter/exit transitions that carry a `display`/`overlay` `allow-discrete` hold (dialog, drawer, tooltip, popover, menu, navigation-menu panel, tour) time themselves with `--duration-*` tokens, never `--transition-*`. A `--transition-*` token zeroes to `none`, and a single `none` member invalidates the entire `transition` shorthand — which would drop the `allow-discrete` hold and teleport the element out of the top layer mid-exit. A zeroed `--duration-*` stays a valid `0ms` member, so the hold survives and the cross-fade simply becomes instant.
:::

## Named Animations

Keyframe + house timing as one token, composed from the duration/easing scale above so reduced motion governs every one of them. The keyframes ship in `@vielzeug/refine/styles/animation.css` (included in `tokens.css`).

| Token                        | Utility class                  | Keyframe            | Timing                          |
| ---------------------------- | ------------------------------ | ------------------- | ------------------------------- |
| `--animate-fade-in`          | `.animate-fade-in`             | `fade-in`           | `150ms ease-out both`           |
| `--animate-fade-out`         | `.animate-fade-out`            | `fade-out`          | `150ms ease-in both`            |
| `--animate-fade-in-up`       | `.animate-fade-in-up`          | `fade-in-up`        | `300ms ease-move both`          |
| `--animate-scale-in`         | `.animate-scale-in`            | `scale-in`          | `200ms ease-overshoot both`     |
| `--animate-slide-in-from-top`| `.animate-slide-in-from-top`   | `slide-in-from-top` | `300ms ease-move both`          |
| `--animate-slide-in-from-bottom` | `.animate-slide-in-from-bottom` | `slide-in-from-bottom` | `300ms ease-move both`   |
| `--animate-slide-in-from-left` | `.animate-slide-in-from-left`  | `slide-in-from-left` | `300ms ease-move both`       |
| `--animate-slide-in-from-right` | `.animate-slide-in-from-right` | `slide-in-from-right` | `300ms ease-move both`      |
| `--animate-spin`             | `.animate-spin`                | `spin`              | loader duration, linear, infinite |
| `--animate-ping`             | `.animate-ping`                | `ping`              | `1000ms ease-out infinite`      |
| `--animate-pulse`            | `.animate-pulse`               | `pulse`             | `1000ms ease-in-out infinite`   |
| `--animate-bounce`           | `.animate-bounce`              | `bounce`            | `1000ms ease-in-out infinite`   |
| `--animate-progress-bar`     | `.animate-progress-bar`        | `progress-bar`      | `1400ms ease-in-out infinite`   |

Every token has a matching `.animate-*` utility class (a build-time contract test keeps the two in sync):

```html
<div class="animate-fade-in-up">Rises in on load</div>
```

The utility classes are a **light-DOM** API. `@keyframes` do not cross shadow boundaries, so inside a component's shadow root the keyframes would have to be duplicated per root — components instead declare local `@keyframes` and wrap the declaration with the escape hatch (see [Inside Shadow DOM](#inside-shadow-dom)).

Under reduced motion the two kinds behave differently on purpose. The finite ones (`fade-*`, `scale-in`, `slide-in-from-*`) still run at `0ms`, so they settle on their end state and fire `animationend` — code that animates an element out and then removes it keeps working. The looping ones (`spin`, `ping`, `pulse`, `bounce`, `progress-bar`) carry the `--_motion-animation` hatch instead, because a zeroed duration does not stop a loop: it settles on the last keyframe, which for `ping` would leave the element invisible at double scale.

The `slide-in-from-top`/`slide-in-from-bottom` keyframes read `--overlay-enter-translate-y`/`--overlay-enter-translate-y-up` and `--overlay-enter-scale`, the same displacement tokens the overlays' own enter transitions use, so retuning those retunes both.

## Motion Mode

Reduced motion has three states, mirroring `@vielzeug/necromancer`'s `MotionMode`:

| State | How | Effect |
| --- | --- | --- |
| System (default) | no `data-motion` attribute | Follows `prefers-reduced-motion` |
| Reduced | `data-motion="reduced"` on `<html>` | Forces reduction regardless of the OS |
| Full | `data-motion="full"` on `<html>` | Opts back in despite an OS-level reduction |

Set it from JavaScript with `setMotionMode()` (or read the current state with `getMotionMode()`):

```ts
import { getMotionMode, setMotionMode } from '@vielzeug/refine';

setMotionMode('reduced'); // an app "reduce motion" setting forces reduction
setMotionMode('system'); // back to following the OS preference
```

The mode drives the token layer: every `--duration-*`/`--transition-*` token zeroes and the `--_motion-*` escape hatches switch to `none`, which reaches every CSS animation and transition in the library — including inside shadow DOMs, because custom properties inherit through the boundary. Programmatic motion built on necromancer honors the same preference through its own `motion` option.

The components that move their content programmatically — DataGrid row sorting, command-palette result filtering, and the toast stack — read their timing from the same tokens at animation time, so a zeroed `--duration-200` skips the reflow entirely rather than playing it instantly. Override `--duration-200` on one component to retune (or `0` to silence) just its reflow.

## Inside Shadow DOM

Two rules govern motion inside a Refine component (or your own, if you want motion mode to keep working):

1. **Keyframes are local.** A `@keyframes` name declared in the light DOM is invisible inside a shadow root, and vice versa. Every component that animates declares its own `@keyframes` in its own stylesheet.
2. **Declarations carry the hatch.** Component animations are written `animation: var(--_motion-animation, …)` and transitions compose `--transition-*`/`--duration-*` tokens. theme.css declares `--_motion-animation: none` (and zeroes the durations) at `:root` under reduction, and the value inherits through every shadow boundary — so one switch stops everything, and `data-motion="full"` opts back in despite an OS-level reduction.

The same hatch is available to your own components: it is an ordinary inherited custom property. A looping animation needs it in particular — zeroing a duration does not stop a loop, it settles the animation on its last keyframe, which for `ping` means invisible.

## List Reflow: `animateReflow`

Keyed lists that change content should move their items, not swap them. `animateReflow` is the same FLIP helper the DataGrid, command palette, and toast stack use, exported from the package root:

```ts
import { animateReflow } from '@vielzeug/refine';

const reflow = animateReflow(listElement, abortController.signal, {
  elements: () => [...listElement.querySelectorAll('li')],
  getKey: (item) => item.dataset.id,
});

// Capture the layout, apply your mutation, animate the delta: one call.
reflow.run(() => renderItems(nextItems));
```

| Option | Type | Default | Purpose |
| --- | --- | --- | --- |
| `elements` | `() => HTMLElement[]` | required | The elements to track, read live from the DOM on both sides of the mutation |
| `getKey` | `(el: HTMLElement) => string \| undefined` | required | Stable identity per element; every element must return one |
| `durationToken` | `string` | `'--duration-200'` | Duration token to honor |
| `easingToken` | `string` | `'--ease-move'` | Easing token to honor |
| `stagger` | `number` | `0` | Per-element delay in ms, so a reflow reads as a cascade |

How it behaves:

- **Timing comes from the tokens.** The duration and easing are read from the host's computed style at animation time, so Motion Mode works for free: a zeroed `--duration-200` skips the reflow instead of playing it instantly.
- **Motion is an enhancement.** Every path that cannot animate — no elements, no stable keys, zeroed tokens, a disposed lifecycle, a browser without the Web Animations API — still runs your mutation exactly once and never throws.
- **Rapid mutations supersede each other.** Typing into a filter queues reflows faster than they finish; the in-flight animation is disposed in the same frame the new one starts, so elements never stack additive offsets or paint a snapped intermediate.
- **Disposal is the signal you pass.** Aborting the `AbortSignal` cancels in-flight animations; the helper owns nothing else.

Run the mutation through `run()` only when it re-renders synchronously or in a microtask (Ore's render is a microtask): the committed layout is measured on the next frame.

## Working with Other Vielzeug Libraries

`animateReflow` delegates the FLIP recipe to `@vielzeug/necromancer`'s `captureLayout`. Use necromancer directly when you need lower-level control — per-handle animation groups, `animate()`/`animateEach()` with explicit keyframes, or its `testing` entry (`installFakeAnimations`) for deterministic tests. Refine's helper adds only the house rules: token timing, motion mode, and never-throw degradation.

## Best Practices

- Time transitions with `--transition-*` tokens and anything inside an `allow-discrete` shorthand with `--duration-*` tokens.
- Reach for a `.animate-*` class before hand-writing an `animation` declaration; reach for a `--animate-*` token when you need to compose it with other declarations.
- Inside a shadow root, always wrap `animation` declarations with `var(--_motion-animation, …)` — a loop without the hatch keeps moving under reduced motion.
- Give list items a stable `data-*` key before wiring `animateReflow`; without keys it correctly does nothing.
- Offer an in-app motion toggle through `setMotionMode()` rather than only trusting the OS setting; some users reduce motion system-wide but opt back in for one context.

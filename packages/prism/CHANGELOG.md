# Change Log - @vielzeug/prism

This log was last generated on Thu, 08 Oct 2026 07:48:38 GMT and should not be manually modified.

## 26.10.5
Thu, 08 Oct 2026 07:48:38 GMT

### Minor changes

- Skip the initial no-op ResizeObserver fire so a settling container no longer cancels a chart's mount entrance (bar/line/area/radar)

### Patches

- Fix chart entrances, reserve legend space before rendering, and apply bar and line resizes without animation; refresh Prism documentation and scatter examples
## 26.10.4
Wed, 07 Oct 2026 14:13:11 GMT

### Minor changes

- Themeable + turn-key axes: scoped/expanded setTheme, [data-prism-theme=dark] trigger, ResizeObserver guard, theme.css subpath, axes on by default
- Animate every chart by default with a shared motion model (transition: true/false shorthand, 300ms default, system reduced-motion respected), cubic + back-out/expo-out easings, pie slice morphs, sparkline data-space tweens, mounted line/area rise-from-baseline, and transform-based crosshair/tooltip transitions
## 26.10.3
Wed, 07 Oct 2026 11:33:21 GMT

### Minor changes

- Greenfield refactor: replace debugChart/devtools with ChartHandle.tap(), unify animation on startTween, and make pie/sparkline callbacks object events
## 26.10.2
Wed, 07 Oct 2026 09:37:46 GMT

### Minor changes

- Add per-datum dash/opacity presentation and stable data-series-id on series groups
## 26.10.1
Wed, 07 Oct 2026 07:25:55 GMT

### Minor changes

- Add createRadarChart for comparing values across 3+ axes, with per-axis ranges, gradient fill, axis hover and keyboard navigation
- Bring line, area, bar, pie, and sparkline charts to the radar's interaction standard: series-comparison tooltips and announcements, keyboard navigation on every chart, active-key highlighting, gradient area fills, rounded bars, fit-aware pie and category labels; explicit config now overrides theme tokens
- add an independent right value axis for line charts

### Patches

- Standardize package text punctuation
- Fit date x-axis domains to the data instead of rounding outwards to a tick interval
- subtract in-flow chart chrome from resize-driven svg heights so auto-height containers cannot grow unboundedly
- size the chart svg by its attributes only so the in-flow legend rides inside the reserved height instead of overflowing the container
- cap the chart svg width at its host so wide charts stop overflowing their container
## 26.10.0
Fri, 02 Oct 2026 18:01:51 GMT

### Patches

- chore: align with CalVer lockstep trains: no code change this train
## 3.0.0
Wed, 09 Sep 2026 22:15:14 GMT

### Breaking changes

- Replace implicit reactive inputs with explicit typed chart updates, remove speculative plugins, narrow invalid data and axis contracts, and make tooltip rendering safe by construction.

## 2.2.6
Sun, 30 Aug 2026 13:16:08 GMT

### Patches

- refactor: replace isReactive with resolveMaybeSignal across charts. Add core/resolve module for MaybeSignal resolution.

## 2.2.5
Fri, 28 Aug 2026 07:44:01 GMT

### Patches

- Fix duplicate ARIA announcements when both tooltip and crosshair are active. Tooltip now owns the live region; crosshair stays silent when tooltip is present. Use container.ownerDocument instead of global document for tooltip element creation.

## 2.2.4
Wed, 26 Aug 2026 17:29:55 GMT

_Version update only_

## 2.2.3
Fri, 21 Aug 2026 16:02:58 GMT

_Version update only_

## 2.2.2
Wed, 19 Aug 2026 06:57:36 GMT

_Version update only_

## 2.2.1
Sun, 16 Aug 2026 10:35:40 GMT

_Version update only_

## 2.2.0
Sun, 16 Aug 2026 09:15:39 GMT

### Minor changes

- refactor: remove PrismError.is() static type guard (use instanceof PrismError); remove speculative PrismDisposedError class (no code path threw it); remove deprecated ariaLabel field from BaseChartConfig and SparklineConfig (use a11y: { ariaLabel } instead); delete dead internal utilities (truncateText, measureTextWidth, createAxisLabel, nearestPointX, tweenColor); delete dead re-export files (line-types.ts, area-types.ts, bar-types.ts, charts/index.ts, axes/types.ts, scales/types.ts re-export line)

## 2.1.2
Sat, 15 Aug 2026 06:26:02 GMT

_Version update only_

## 2.1.1
Mon, 10 Aug 2026 21:21:35 GMT

_Version update only_

## 2.1.0
Mon, 10 Aug 2026 15:11:23 GMT

### Minor changes

- chore!: use keyed chart data, explicit accessibility, and reduced-motion-aware transitions

## 2.0.1
Thu, 06 Aug 2026 07:20:49 GMT

### Patches

- publish clean export metadata and classic TypeScript subpath mappings

## 2.0.0
Wed, 05 Aug 2026 16:48:52 GMT

### Breaking changes

- refactor!: own chart effects through Ripple scopes

## 1.1.7
Sun, 26 Jul 2026 06:43:54 GMT

### Patches

- refactor(prism): derive vite external list from package.json via readWorkspaceDeps() instead of hand-listing dependencies

## 1.1.6
Fri, 24 Jul 2026 05:28:41 GMT

### Patches

- chore: bump engines.node to >=22 to match .nvmrc/CLAUDE.md's Node 22 requirement

## 1.1.5
Fri, 17 Jul 2026 14:17:07 GMT

_Version update only_

## 1.1.4
Wed, 15 Jul 2026 07:45:31 GMT

_Version update only_

## 1.1.3
Tue, 14 Jul 2026 06:12:09 GMT

### Patches

- fix: rewrite workspace:* deps to real semver on publish (was shipping literal 'workspace:*' to npm, breaking installs outside this monorepo)

## 1.1.2
Tue, 07 Jul 2026 09:20:39 GMT

_Version update only_

## 1.1.1
Sun, 05 Jul 2026 06:22:27 GMT

_Version update only_

## 1.1.0
Sun, 05 Jul 2026 05:52:18 GMT

### Minor changes

- fix(prism): fix scale/axis/grid correctness (reversed domains, tick-count sync, band-axis centering), harden tooltip XSS default and easing prototype-key lookup, add a11y live regions and aria-hidden decorative elements, implement CrosshairConfig.snap, cancel in-flight chart animations on dispose, isolate plugin install()/dispose() failures, add resetTheme() and a working /devtools debugChart(), fix cross-realm container validation, make scale factories destructuring-safe, and sync docs with the current API

## 1.0.1
Fri, 03 Jul 2026 06:00:47 GMT

### Patches

- chore(prism): rename internal _warn.ts to _dev.ts

## 1.0.0
Wed, 01 Jul 2026 16:10:37 GMT

### Breaking changes

- Initial public release


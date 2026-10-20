# @vielzeug/beacon

> Guided onboarding and contextual product tours for web applications

## Installation

```sh
pnpm add @vielzeug/beacon
npm install @vielzeug/beacon
yarn add @vielzeug/beacon
```

## Quick Start

```ts
import { createTour, type BeaconTourConfig } from '@vielzeug/beacon';

const tour = createTour({
  id: 'getting-started',
  steps: [
    { id: 'welcome', title: 'Welcome', description: 'A two-minute look around.' },
    { id: 'nav', target: '[data-tour="nav"]', title: 'Navigation', placement: 'bottom-start' },
  ],
} satisfies BeaconTourConfig);

// Render the live snapshot wherever you like: rect is the anchor, null centers.
const unsubscribe = tour.current.subscribe(() => renderCard(tour.current.value));

tour.start(); // no-op for users who already completed the tour

// On teardown:
unsubscribe();
tour.dispose();
```

Beacon never renders: it owns step order, target waiting, and persisted progress, while your markup — or `@vielzeug/refine`'s `ore-tour` components — presents each step.

## Features

- `createTour()` runs a sequential, resumable walkthrough over your own DOM.
- `createCoachmark()` shows a single contextual hint once per user per version.
- `current` is a live snapshot with the anchor rect kept fresh on scroll and resize.
- `BeaconStorage` persists progress through any sync or async key-value bridge.
- `tap()` reports lifecycle events such as `step:start`, `tour:complete`, and `target-missing`.
- `@vielzeug/refine`'s `ore-tour` renders a handle with one `card.bind(tour)` call.

## Documentation

- [Overview](https://vielzeug.dev/beacon/)
- [Usage Guide](https://vielzeug.dev/beacon/usage)
- [API Reference](https://vielzeug.dev/beacon/api)
- [Examples](https://vielzeug.dev/beacon/examples)
- [Migration](https://vielzeug.dev/beacon/migration)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu): part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.

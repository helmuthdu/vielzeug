import type { BeaconTourConfig } from '@vielzeug/beacon';

/**
 * The product tour, declared as data: a plain module of tour shapes, checked
 * against `BeaconTourConfig` by the `satisfies` clause while still inferring
 * the literal step ids. Targets are `data-tour` hooks the shell stamps on the
 * elements worth pointing at, which keeps the copy decoupled from the markup's
 * class names.
 *
 * The first step has no `target`, so it centers as a modal welcome; the rest
 * anchor to real controls and present as popovers. `presentation: 'auto'` on the
 * tour lets `ore-tour` pick popover on wide viewports and a bottom sheet on
 * narrow ones without any per-step choice.
 *
 * The welcome step carries a decorative illustration on `data`: Beacon never
 * interprets that field, and the shell renders it into the card's `media` slot.
 */
const welcomeArt =
  '<svg viewBox="0 0 352 120" role="presentation" aria-hidden="true">' +
  '<rect fill="var(--color-contrast-100)" height="120" width="352"/>' +
  '<rect fill="var(--color-primary-backdrop)" height="56" rx="8" width="96" x="20" y="20"/>' +
  '<rect fill="var(--color-primary)" height="22" rx="4" width="56" x="34" y="32"/>' +
  '<rect fill="var(--color-contrast-400)" height="10" rx="3" width="40" x="34" y="60"/>' +
  '<rect fill="var(--color-contrast-100)" height="56" rx="8" width="96" x="128" y="20"/>' +
  '<rect fill="var(--color-contrast-400)" height="22" rx="4" width="56" x="142" y="32"/>' +
  '<rect fill="var(--color-contrast-400)" height="10" rx="3" width="40" x="142" y="60"/>' +
  '<rect fill="var(--color-contrast-100)" height="56" rx="8" width="96" x="236" y="20"/>' +
  '<rect fill="var(--color-contrast-400)" height="22" rx="4" width="56" x="250" y="32"/>' +
  '<rect fill="var(--color-contrast-400)" height="10" rx="3" width="40" x="250" y="60"/>' +
  '</svg>';

export const productTour = {
  id: 'signalbox-product-tour',
  placement: 'bottom',
  presentation: 'auto',
  // The navbar is sticky, so keep its height clear when centering a target.
  scrollOffset: 76,
  steps: [
    {
      data: { media: welcomeArt },
      description:
        'Signalbox turns raw events into live dashboards. This 40-second tour shows where everything lives. Nothing here is real data — it is a playground for the onboarding flow.',
      id: 'welcome',
      presentation: 'modal',
      title: 'Welcome to Signalbox',
    },
    {
      description:
        'Boards, the live event stream, and saved reports all live here. Switching views ends the tour, so you can explore each one on your own.',
      id: 'navigation',
      placement: 'bottom-start',
      target: '[data-tour="navigation"]',
      title: 'Move around the workspace',
    },
    {
      description:
        'Every board is a grid of tiles. This is where your metrics live, and where a new chart lands once you add one.',
      id: 'board',
      placement: 'top',
      target: '[data-tour="board"]',
      title: 'Your board is a grid of tiles',
    },
    {
      description:
        'Pin the metrics you check daily so they load first. The star on each tile toggles it — try it on any tile.',
      id: 'pinned',
      placement: 'top-end',
      target: '[data-tour="pinned-tile"]',
      title: 'Pin what matters',
    },
    {
      description:
        'Add a chart, table, or text note to the board in one click. That is the whole tour — press Finish whenever you are ready, or Skip to explore on your own.',
      id: 'add-tile',
      placement: 'bottom-end',
      target: '[data-tour="add-tile"]',
      title: 'Add your first tile',
    },
  ],
  version: 1,
} satisfies BeaconTourConfig;

/**
 * A single contextual hint on the share control, shown once. Coachmarks are the
 * lighter sibling of a tour: one anchored hint, no steps, dismissed forever
 * after the user acknowledges it (until `version` is bumped).
 */
export const shareCoachmark = {
  description: 'Share a board with your team or publish a live link. Anyone you invite sees it update in real time.',
  id: 'signalbox-share',
  placement: 'bottom-end' as const,
  // Anchored to the share control: always a popover, never a bottom sheet.
  presentation: 'popover' as const,
  target: '[data-tour="share"]',
  title: 'Share this board',
  version: 1,
};

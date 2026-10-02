// @vitest-environment jsdom

import { createBarChart, createRadarChart } from '@vielzeug/prism';
import type { Signal } from '@vielzeug/ripple';
import type { Mock } from 'vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp, defineComponent, h, nextTick } from 'vue';
import { ascents, campaigns, challenges, expeditions } from '../../app/store';
import { forgeEquipment, hunterById, hunterCards } from '../../content';
import { baseEquipment } from '../../domain/deck';
import { idleMonsterState } from '../../domain/monster-state';
import { buildProfile, STRENGTH_AXES } from '../../domain/strength';
import type { HunterBuild, HuntRecord } from '../../domain/types';
import ChroniclesView from './ChroniclesView.vue';

vi.mock('@vielzeug/prism', () => ({
  createBarChart: vi.fn(() => ({ dispose: vi.fn(), update: vi.fn() })),
  createLineChart: vi.fn((element: HTMLElement, config: { a11y: { ariaLabel: string } }) => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', config.a11y.ariaLabel);
    element.append(svg);
    return { dispose: vi.fn(), update: vi.fn() };
  }),
  createRadarChart: vi.fn(() => ({ dispose: vi.fn(), update: vi.fn() })),
}));

vi.mock('../../app/store', async () => {
  const { signal } = await import('@vielzeug/ripple');

  return {
    ascents: signal<unknown[]>([]),
    campaigns: signal<unknown[]>([]),
    challenges: signal<unknown[]>([]),
    expeditions: signal<unknown[]>([]),
  };
});

const sourceByMode: Record<string, Signal<unknown[]>> = {
  ascents: ascents as unknown as Signal<unknown[]>,
  campaigns: campaigns as unknown as Signal<unknown[]>,
  challenges: challenges as unknown as Signal<unknown[]>,
  expeditions: expeditions as unknown as Signal<unknown[]>,
};

const hunt = (overrides: Partial<HuntRecord> = {}): HuntRecord => ({
  durationMs: 1000,
  events: [],
  fightStart: { hunters: {}, monsterId: 'monster-a', monsterState: idleMonsterState() },
  hunters: [
    {
      deckCardIds: ['card-a'],
      equipment: { armorId: 'armor-a', helmId: null, itemId: null, weaponId: 'weapon-a' },
      hunterId: 'daeron',
      masteryCardId: 'mastery-a',
    },
  ],
  id: `hunt:${Math.random()}`,
  monsterId: 'monster-a',
  outcome: 'victory',
  recordedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

/** Seeds every source empty, then one game of `mode` carrying `records` in its hunt history. */
function setSources(records: HuntRecord[], mode: keyof typeof sourceByMode = 'campaigns'): void {
  for (const source of Object.values(sourceByMode)) source.value = [];
  sourceByMode[mode].value = [{ huntHistory: records, id: 'subject-a', name: 'The Long Hunt' }];
}

const mounted: Array<ReturnType<typeof createApp>> = [];

afterEach(() => {
  for (const app of mounted) app.unmount();
  mounted.length = 0;
  setSources([]);
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

function mountView(): HTMLElement {
  const container = document.createElement('div');

  if (typeof ResizeObserver === 'undefined') {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe(): void {}
        disconnect(): void {}
      },
    );
  }

  const app = createApp({ render: () => h(ChroniclesView) });

  for (const tag of [
    'ore-accordion',
    'ore-accordion-item',
    'ore-button',
    'ore-badge',
    'ore-chip',
    'ore-dialog',
    'ore-button-group',
    'ore-grid',
    'ore-icon',
    'ore-rank-item',
    'ore-rank-list',
    'ore-select',
    'ore-stats',
    'ore-tooltip',
    'ore-text',
  ]) {
    app.component(
      tag,
      defineComponent({
        inheritAttrs: false,
        setup(_, { attrs, slots }) {
          return () =>
            h(
              tag,
              attrs,
              Object.values(slots).flatMap((slot) => slot?.() ?? []),
            );
        },
      }),
    );
  }

  app.mount(container);
  mounted.push(app);
  return container;
}

const settle = async () => {
  await nextTick();
  await nextTick();
};

/** Clicks the pressed-button filter control for `mode` and lets the view settle. */
async function chooseMode(container: HTMLElement, mode: string): Promise<void> {
  const control = [...container.querySelectorAll<HTMLElement>('.chronicle__desktop-filter ore-button')].find((button) =>
    button.textContent?.toLowerCase().includes(mode.toLowerCase()),
  );

  if (!control) throw new Error(`mode filter button for ${mode} not rendered`);

  control.click();
  await settle();
}

describe('ChroniclesView', () => {
  it('shows exact remaining-count badges for both creature and pace expansion controls', async () => {
    setSources(Array.from({ length: 110 }, (_, index) => hunt({ monsterId: `monster-${index}` })));
    const container = mountView();
    await settle();
    for (const selector of ['.chronicle__creatures-more', '.chronicle__pace-more']) {
      const button = container.querySelector<HTMLElement>(selector)!;
      expect(button.textContent?.trim()).toBe('Show more');
      expect(button.querySelector('ore-badge')?.getAttribute('count')).toBe('102');
      expect(button.querySelector('ore-badge')?.getAttribute('max')).toBe('102');
      button.click();
      await settle();
      expect(button.querySelector('ore-badge')).toBeNull();
      expect(button.getAttribute('aria-expanded')).toBe('true');
    }
  });

  it('renders the global empty state with entry actions and no filter over nothing', async () => {
    setSources([]);
    const container = mountView();
    await settle();

    expect(container.querySelector('.chronicle__hero-number')).toBeNull();
    expect(container.querySelector('.chronicle__empty-state')?.textContent).toContain('No hunts recorded yet');
    expect(container.querySelector('.chronicle__empty-state')?.textContent).toContain(
      'Record a victory or defeat after your next hunt',
    );
    // Filtering an empty record is noise: the divider and its timer note stay away.
    expect(container.querySelector('.chronicle__desktop-filter')).toBeNull();
    expect(container.querySelector('.chronicle__mobile-filter')).toBeNull();
    expect(container.textContent).not.toContain('Only hunts recorded with the Hunt timer contribute');

    const actions = [...container.querySelectorAll('ore-button')].map((button) => button.textContent);

    expect(actions).toContain('Choose a game');
    expect(actions).toContain('Open saved games');
  });

  it('offers only the way to begin when the device holds no games at all', async () => {
    for (const source of Object.values(sourceByMode)) source.value = [];
    const container = mountView();
    await settle();

    const actions = [...container.querySelectorAll('ore-button')].map((button) => button.textContent);

    expect(actions).toEqual(['Choose a game']);
  });

  it('renders the record summary, every folio section, and the ranked rows from recorded hunts', async () => {
    setSources([
      hunt({ monsterId: 'monster-a', outcome: 'victory' }),
      hunt({ monsterId: 'toramat', outcome: 'defeat' }),
      hunt({ durationMs: 65000, monsterId: 'monster-a', outcome: 'defeat' }),
    ]);
    const container = mountView();
    await settle();

    expect(container.querySelector('.chronicle__hero-number')).toBeNull();
    expect(container.querySelector('.chronicle__record-chart')).not.toBeNull();
    expect(container.querySelector('.chronicle__overview')?.getAttribute('cols-lg')).toBe('2');
    expect(container.querySelector('.chronicle__overview')?.getAttribute('align')).toBe('stretch');
    expect(container.querySelector('.chronicle__rankings')?.getAttribute('cols-lg')).toBe('2');
    expect(container.querySelector('.chronicle__rankings')?.getAttribute('align')).toBe('stretch');
    expect(container.querySelector('.chronicle__highlights')?.getAttribute('aria-label')).toBe('Record highlights');

    /** Monster-valued highlights render their value as the subject link, plain ones as text. */
    const stat = (element: Element) => ({
      description: element.getAttribute('description') ?? '',
      label: element.getAttribute('label') ?? '',
      value: element.getAttribute('value') ?? element.querySelector('[slot="value"]')?.textContent ?? '',
    });
    const summary = [
      ...(container.querySelector('.chronicle__record .chronicle__stats')?.querySelectorAll('ore-stats') ?? []),
    ].map(stat);
    const marks = [...(container.querySelector('.chronicle__highlights')?.querySelectorAll('ore-stats') ?? [])].map(
      stat,
    );

    expect(summary).toEqual([
      { description: '', label: 'Victories', value: '1' },
      { description: '', label: 'Defeats', value: '2' },
      { description: '', label: 'Win rate', value: '33%' },
      { description: '', label: 'Timed hunts', value: '3 / 3' },
    ]);
    expect(marks).toContainEqual({ description: '2 hunts', label: 'Most faced', value: 'monster-a' });
    expect(marks).toContainEqual({ description: '1 victory · 1 defeat', label: 'Best record', value: 'monster-a' });
    expect(marks).toContainEqual({ description: '1s', label: 'Quickest prey', value: 'Toramat' });
    expect(marks).toContainEqual({ description: '3 timed hunts', label: 'Play time', value: '1m 7s' });
    expect(marks).toContainEqual({ description: '1m 5s', label: 'Longest hunt', value: 'monster-a' });
    // Every highlight that names a creature links it back into the reference.
    const highlightLinks = [...(container.querySelectorAll('.chronicle__highlights-grid a') ?? [])];

    expect(highlightLinks.map((link) => link.getAttribute('href'))).toEqual([
      '/manual?entry=monster-monster-a',
      '/manual?entry=monster-toramat',
      '/manual?entry=monster-toramat',
      '/manual?entry=monster-monster-a',
      '/manual?entry=monster-monster-a',
    ]);
    // Plain left clicks stay in-app; modified clicks keep the browser default.
    const plainClick = new MouseEvent('click', { bubbles: true, button: 0, cancelable: true });

    highlightLinks[0]?.dispatchEvent(plainClick);
    expect(plainClick.defaultPrevented).toBe(true);

    const ctrlClick = new MouseEvent('click', { bubbles: true, button: 0, cancelable: true, ctrlKey: true });

    highlightLinks[0]?.dispatchEvent(ctrlClick);
    expect(ctrlClick.defaultPrevented).toBe(false);
    expect(marks.map(({ label }) => label)).toEqual([
      'Most faced',
      'Play time',
      'Toughest rival',
      'Quickest prey',
      'Best record',
      'Longest hunt',
    ]);
    expect(
      [...(container.querySelector('.chronicle__highlights')?.querySelectorAll('ore-stats') ?? [])].map((stat) => ({
        icon: stat.querySelector('ore-icon')?.getAttribute('name'),
        label: stat.getAttribute('label'),
        variant: stat.getAttribute('variant'),
      })),
    ).toEqual([
      { icon: 'repeat', label: 'Most faced', variant: 'plain' },
      { icon: 'timer', label: 'Play time', variant: 'plain' },
      { icon: 'swords', label: 'Toughest rival', variant: 'plain' },
      { icon: 'fast-forward', label: 'Quickest prey', variant: 'plain' },
      { icon: 'trophy', label: 'Best record', variant: 'plain' },
      { icon: 'clock', label: 'Longest hunt', variant: 'plain' },
    ]);
    expect([...container.querySelectorAll('.chronicle__folio')].map((node) => node.textContent)).toEqual([
      'I',
      'II',
      'III',
      'IV',
      'V',
    ]);
    expect(
      [...container.querySelectorAll('.chronicle__rankings, .chronicle__recent')].map((section) =>
        section.classList.contains('chronicle__recent') ? 'recent' : 'rankings',
      ),
    ).toEqual(['rankings', 'recent']);

    const creatures = container.querySelector('section[aria-label="Creatures encountered"]');

    expect(creatures?.querySelectorAll('ore-rank-item')).toHaveLength(2);
    expect(creatures?.querySelector('.chronicle__trophy')).not.toBeNull();
    const creatureRows = [...(creatures?.querySelectorAll('ore-rank-item') ?? [])];
    expect(creatureRows.every((row) => row.getAttribute('bar') !== 'false')).toBe(true);
    expect(creatureRows.map((row) => row.style.getPropertyValue('--chronicle-creature-victory-share'))).toEqual([
      '50%',
      '0%',
    ]);
    expect(creatureRows.map((row) => row.querySelector('.chronicle__creature-count')?.textContent)).toEqual(['2', '1']);
    expect(creatureRows.map((row) => row.querySelector('.chronicle__creature-win-rate')?.textContent?.trim())).toEqual([
      '50%',
      '0%',
    ]);
    expect(creatureRows[0]?.querySelector('[slot="description"]')?.textContent).toContain('1 victory · 1 defeat');

    const company = container.querySelector('section[aria-label="Hunters"]');

    expect(company?.querySelectorAll('.chronicle__roster-row')).toHaveLength(1);
    expect(company?.querySelector('.hunter-identity'))?.not.toBeNull();
    expect(company?.querySelector('.hunter-identity__class')?.textContent).toContain('Great Sword');
    expect(company?.textContent).toContain('Daeron');
    expect(company?.querySelector('.chronicle__dossier')).toBeNull();
    expect(company?.querySelector('.chronicle__hunter-workspace')).not.toBeNull();
    expect(company?.querySelector('.chronicle__hunter-detail')?.textContent).toContain(
      'Select one hunter to inspect their equipment and deck cards, or two to compare them.',
    );
    expect(company?.querySelector('.chronicle__company-compare')).toBeNull();
    expect(company?.textContent).toContain('Recorded hunts, equipment, and deck inclusions by hunter');

    expect(container.querySelector('section[aria-label="The armory"]')).toBeNull();

    const pace = container.querySelector('section[aria-label="The pace of the hunt"]');
    const paceRows = [...(pace?.querySelectorAll('ore-accordion-item') ?? [])];

    // monster-a carries two timed hunts and ranks; single-sample Toramat stays out of the ranking.
    expect(paceRows).toHaveLength(2);
    expect(pace?.querySelector('ore-accordion')?.getAttribute('selection-mode')).toBe('single');
    expect(paceRows.map((row) => row.querySelector('.chronicle__pace-rank')?.textContent)).toEqual(['1', undefined]);
    expect(paceRows[0]?.querySelector('.chronicle__pace-monster')).toBeNull();
    expect(paceRows[1]?.querySelector('.chronicle__pace-monster')?.getAttribute('src')).toContain(
      '/monsters/Toramat.svg',
    );
    expect(paceRows[0]?.querySelector('.chronicle__pace-summary')?.textContent).toBe('0:01–1:05');
    expect(paceRows[1]?.querySelector('.chronicle__pace-summary')?.textContent).toBe('Not enough hunts to rank yet');
    expect(paceRows[0]?.querySelector('.chronicle__pace-median')?.textContent).toBe('0:33');
    expect(paceRows[0]?.querySelector('.chronicle__pace-samples')?.textContent?.trim()).toBe('2 timed hunts');
    expect(paceRows[1]?.querySelector('.chronicle__pace-samples')?.textContent?.trim()).toBe('1 timed hunt');
    expect(pace?.textContent).toContain('0:33');

    const picks = [...(paceRows[0]?.querySelectorAll<HTMLButtonElement>('.chronicle__pace-pick') ?? [])];
    const paceDetails = () => paceRows[0]?.querySelector('.hunt-record-details');
    const pacePicks = () => paceRows[0]?.querySelector('.chronicle__pace-picks');

    expect(pacePicks()?.querySelector('legend')?.textContent).toBe('Timed hunts against monster-a');
    expect(picks).toHaveLength(2);
    expect(picks.map((pick) => pick.querySelector('.chronicle__pace-pick-time')?.textContent)).toEqual([
      '0:01',
      '1:05',
    ]);
    expect(picks.map((pick) => pick.getAttribute('aria-pressed'))).toEqual(['true', 'false']);
    expect(picks[0]?.querySelector('.chronicle__pace-pick-outcome')?.textContent).toBe('victory');
    expect(picks[1]?.querySelector('.chronicle__pace-pick-outcome')?.textContent).toBe('defeat');
    expect(paceDetails()?.textContent).toContain('Daeron');
    expect(paceRows[0]?.querySelector('.chronicle__pace-origin')?.textContent).toContain('Open The Long Hunt');

    picks[1]?.click();
    await settle();

    expect(picks.map((pick) => pick.getAttribute('aria-pressed'))).toEqual(['false', 'true']);
    expect(paceDetails()?.textContent).toContain('Daeron');
    expect(pace?.lastElementChild).toBe(pace?.querySelector('.chronicle__coverage'));
    expect(pace?.querySelector('.chronicle__coverage')?.textContent).toContain(
      'Only hunts recorded with the Hunt timer contribute',
    );
    expect([...container.querySelectorAll('.chronicle__folio')].map((node) => node.textContent)).toEqual([
      'I',
      'II',
      'III',
      'IV',
      'V',
    ]);
  });

  it('omits play time when no recorded hunts used the timer', async () => {
    setSources([hunt({ durationMs: null })]);
    const container = mountView();
    await settle();

    const highlights = container.querySelector('.chronicle__highlights');
    const labels = [...(highlights?.querySelectorAll('ore-stats') ?? [])].map((stat) => stat.getAttribute('label'));

    expect(labels).not.toContain('Play time');
  });

  it('browses recent hunts newest first with untimed and recorded hunter details', async () => {
    setSources(
      Array.from({ length: 9 }, (_, index) =>
        hunt({
          durationMs: index === 7 ? null : (index + 1) * 1000,
          events:
            index === 8
              ? [
                  {
                    actor: { hunterId: 'daeron', kind: 'hunter' },
                    delta: 2,
                    elapsedMs: null,
                    recordedAt: new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
                    sequence: 1,
                    type: 'damage',
                    value: 2,
                  },
                ]
              : [],
          id: `campaign:hunt:${index + 1}`,
          recordedAt: new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
        }),
      ),
    );
    const container = mountView();
    await settle();

    const section = container.querySelector('.chronicle__recent');
    const rows = () => [...(section?.querySelectorAll('.chronicle__recent-accordion ore-accordion-item') ?? [])];
    const more = section?.querySelector<HTMLElement>('.chronicle__recent-more');

    expect(rows()).toHaveLength(8);
    expect(rows()[0]?.querySelector('time')?.getAttribute('datetime')).toBe('2026-01-09T00:00:00.000Z');
    expect(rows().some((row) => row.textContent?.includes('No time recorded'))).toBe(true);
    // The collapsed row already names the game it was recorded in.
    expect(rows()[0]?.querySelector('.chronicle__hunt-date')?.textContent).toContain('The Long Hunt');
    expect(rows()[0]?.textContent).toContain('Daeron');
    expect(rows()[0]?.textContent).toContain('Weapon: weapon-a');
    expect(rows()[0]?.textContent).toContain('Action cards');
    // Every hunt carries its way back to the game it was recorded in.
    expect(rows()[0]?.querySelector('.chronicle__hunt-origin')?.getAttribute('href')).toBe('/campaigns/subject-a');
    expect(rows()[0]?.querySelector('.chronicle__hunt-origin')?.textContent).toContain('Open The Long Hunt');
    expect(rows()[0]?.querySelector('.hunt-record-layout--responsive')).not.toBeNull();
    expect(
      container.querySelector('section[aria-label="The pace of the hunt"] .hunt-record-layout--responsive'),
    ).toBeNull();
    expect(rows()[0]?.querySelector('svg[role="img"]')?.getAttribute('aria-label')).toBe(
      'Fight event timeline against monster-a',
    );
    expect(rows()[0]?.querySelector('.hunt-timeline__events')?.textContent).toContain('Daeron received 2 damage');
    expect(more?.textContent?.trim()).toBe('Show more');
    expect(more?.querySelector('ore-badge')?.getAttribute('count')).toBe('1');
    expect(more?.getAttribute('aria-expanded')).toBe('false');
    expect(more?.getAttribute('aria-controls')).toBe('chronicle-recent-hunt-list');

    more?.dispatchEvent(new Event('click'));
    await settle();

    expect(rows()).toHaveLength(9);
    expect(more?.textContent?.trim()).toBe('Show less');
    expect(more?.querySelector('ore-badge')).toBeNull();
    expect(more?.getAttribute('aria-expanded')).toBe('true');
  });

  it('renders a fight timeline chart and ordered event list for an untimed hunt', async () => {
    setSources([
      hunt({
        durationMs: null,
        events: [
          {
            actor: { hunterId: 'daeron', kind: 'hunter' },
            delta: 2,
            elapsedMs: null,
            recordedAt: '2026-01-01T00:00:01.000Z',
            sequence: 1,
            type: 'damage',
            value: 2,
          },
          {
            active: true,
            actor: { kind: 'monster', monsterId: 'monster-a' },
            effect: 'stun',
            elapsedMs: null,
            recordedAt: '2026-01-01T00:00:02.000Z',
            sequence: 2,
            type: 'effect',
          },
        ],
      }),
    ]);
    const container = mountView();
    await settle();

    const timeline = container.querySelector('.hunt-timeline');

    expect(timeline?.querySelector('svg[role="img"]')?.getAttribute('aria-label')).toBe(
      'Fight event timeline against monster-a',
    );
    expect(timeline?.querySelectorAll('.hunt-timeline__events li')).toHaveLength(2);
    expect(timeline?.textContent).toContain('Ordered by event sequence; no hunt timer was recorded.');
    expect(timeline?.textContent).toContain('Event 1');
    expect(timeline?.textContent).toContain('Daeron received 2 damage');
    expect(timeline?.textContent).toContain('monster-a received Stun');
  });

  it('formats accumulated play time in hours and minutes', async () => {
    setSources([hunt({ durationMs: 3_661_000 })]);
    const container = mountView();
    await settle();

    const playTime = [...(container.querySelector('.chronicle__highlights')?.querySelectorAll('ore-stats') ?? [])].find(
      (stat) => stat.getAttribute('label') === 'Play time',
    );

    expect(playTime?.getAttribute('value')).toBe('1h 1m');
  });

  it('shows only the selected hunter dossier and closes it again', async () => {
    const mirah = {
      deckCardIds: ['card-c'],
      equipment: { armorId: null, helmId: null, itemId: null, weaponId: 'weapon-b' },
      hunterId: 'mirah',
      masteryCardId: 'mastery-b',
    };

    setSources([hunt(), hunt(), hunt({ hunters: [mirah], monsterId: 'monster-b' })], 'campaigns');
    const container = mountView();
    await settle();

    const company = () => container.querySelector('section[aria-label="Hunters"]');
    const row = (name: string) =>
      [...container.querySelectorAll('.chronicle__roster-row')].find((candidate) =>
        candidate.textContent?.includes(name),
      );
    const dossier = () => container.querySelector('.chronicle__dossier');

    // No hunter is implicit; the roster is the first decision.
    expect(company()?.querySelectorAll('.chronicle__roster-row')).toHaveLength(2);
    expect(
      company()
        ?.querySelector<HTMLElement>('.chronicle__roster-options')
        ?.style.getPropertyValue('--chronicle-roster-columns'),
    ).toBe('2');
    expect(dossier()).toBeNull();

    row('Mirah')?.dispatchEvent(new Event('click'));
    await settle();

    // Select one hunter to reveal only their recorded equipment and deck.
    expect(row('Mirah')?.getAttribute('aria-pressed')).toBe('true');
    expect(company()?.querySelector('.chronicle__roster-status')?.textContent).toBe('Mirah selected');
    expect(dossier()?.textContent).toContain('Mirah');
    expect(dossier()?.textContent).toContain('1 hunt');
    expect(dossier()?.textContent).toContain('Equipped in recorded loadouts');
    expect(dossier()?.textContent).toContain('weapon-b');
    expect(dossier()?.textContent).toContain('Most configured action cards');
    expect(dossier()?.textContent).toContain('card-c');
    expect(dossier()?.textContent).not.toContain('card-a');
    expect(dossier()?.querySelector('.chronicle__shape')).toBeNull();
    expect(dossier()?.textContent).not.toContain('Printed hunter profile');
    expect(company()?.querySelector('.chronicle__hunter-detail .chronicle__dossier')).not.toBeNull();
    // The dossier carries the hunter's way into their builds.
    expect(dossier()?.querySelector('.chronicle__dossier-actions ore-button')?.getAttribute('href')).toBe(
      '/builds?hunter=mirah',
    );

    // Pressing the open row closes it.
    row('Mirah')?.dispatchEvent(new Event('click'));
    await settle();

    expect(dossier()).toBeNull();
    expect(company()?.querySelector('.chronicle__roster-status')).toBeNull();
  });

  it('caps selected-hunter card inclusions and expands the remaining rows on demand', async () => {
    const daeron = {
      deckCardIds: Array.from({ length: 10 }, (_, index) => `card-${index}`),
      equipment: { armorId: null, helmId: null, itemId: null, weaponId: 'weapon-a' },
      hunterId: 'daeron',
      masteryCardId: 'mastery-a',
    };
    setSources([hunt({ hunters: [daeron] })]);
    const container = mountView();
    await settle();

    [...container.querySelectorAll('.chronicle__roster-row')]
      .find((row) => row.textContent?.includes('Daeron'))
      ?.dispatchEvent(new Event('click'));
    await settle();

    const cardGroup = container.querySelector('.chronicle__dossier-group:nth-child(2)');
    const rows = () => cardGroup?.querySelectorAll('.chronicle__action-cards li') ?? [];
    const more = cardGroup?.querySelector('.chronicle__more');

    expect(rows()).toHaveLength(8);
    expect(more?.textContent).toContain('Show more');
    expect(more?.querySelector('ore-badge')?.getAttribute('count')).toBe('2');
    expect(more?.getAttribute('label')).toBe('Show more action cards (2)');
    expect(more?.getAttribute('aria-controls')).toBe('chronicle-action-card-list');
    expect(more?.getAttribute('aria-expanded')).toBe('false');

    more?.dispatchEvent(new Event('click'));
    await settle();

    expect(rows()).toHaveLength(10);
    expect(more?.textContent).toContain('Show less');
    expect(more?.getAttribute('aria-expanded')).toBe('true');
  });

  it('sorts action cards by inclusion count and then catalog type', async () => {
    const mirah = hunterById('mirah');

    if (!mirah) throw new Error('Mirah catalog entry is missing');

    const cards = hunterCards(mirah).filter(
      (candidate) => candidate.kind === 'action' && candidate.cardType && candidate.art,
    );
    const highest = cards.find((candidate) => candidate.cardType === 'Offensive');
    const offensive = cards.find((candidate) => candidate.cardType === 'Offensive' && candidate.id !== highest?.id);
    const defensive = cards.find((candidate) => candidate.cardType === 'Defensive');

    if (!highest || !offensive || !defensive) throw new Error('Mirah action-card types are missing');

    const record = (cardId: string) =>
      hunt({
        hunters: [{ ...hunt().hunters[0]!, deckCardIds: [cardId], hunterId: mirah.id }],
      });

    setSources([
      record(highest.id),
      record(highest.id),
      record(highest.id),
      record(offensive.id),
      record(offensive.id),
      record(defensive.id),
      record(defensive.id),
    ]);
    const container = mountView();
    await settle();

    [...container.querySelectorAll('.chronicle__roster-row')]
      .find((row) => row.textContent?.includes(mirah.name))
      ?.dispatchEvent(new Event('click'));
    await settle();

    const rows = [...container.querySelectorAll('.chronicle__action-card-tile')];

    expect(rows.slice(0, 3).map((row) => row.querySelector('.chronicle__action-card-name')?.textContent)).toEqual([
      highest.name,
      defensive.name,
      offensive.name,
    ]);
    expect(rows.slice(0, 3).map((row) => row.querySelector('.chronicle__loadout-count')?.textContent?.trim())).toEqual([
      '3',
      '2',
      '2',
    ]);
    expect(rows[0]?.querySelector('.chronicle__action-card-artwork')?.getAttribute('src')).toContain(highest.art);
    expect(rows[0]?.querySelector('.chronicle__action-card-category')?.textContent?.trim()).toBe(highest.cardType);
    const actionCardZoom = rows[0]?.querySelector('.chronicle__action-card-art');

    expect(actionCardZoom).not.toBeNull();
    actionCardZoom?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await settle();

    expect(container.querySelector('.card-detail__image')?.getAttribute('src')).toContain(highest.art);
    expect(container.querySelector('.card-detail__actions ore-button[label^="Add "]')).toBeNull();
    expect(container.querySelector('.card-detail__actions ore-button[label^="Remove "]')).toBeNull();
  });

  it('uses catalog artwork for recorded equipment', async () => {
    const daeron = hunt().hunters[0];
    const weapon = forgeEquipment.find((equipment) => equipment.type === 'weapon');

    if (!daeron || !weapon) throw new Error('Catalog hunter equipment is missing');

    setSources([
      hunt({
        hunters: [{ ...daeron, equipment: { ...daeron.equipment, weaponId: weapon.id } }],
      }),
    ]);
    const container = mountView();
    await settle();

    [...container.querySelectorAll('.chronicle__roster-row')]
      .find((row) => row.textContent?.includes('Daeron'))
      ?.dispatchEvent(new Event('click'));
    await settle();

    const weaponCard = container.querySelector('.chronicle__equipment-grid--weapons .slot-card__zoom');

    expect(weaponCard?.querySelector('.slot-card__art')?.getAttribute('src')).toContain(weapon.artwork);
    weaponCard?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await settle();

    expect(container.querySelector('.picker-detail__image')?.getAttribute('src')).toContain(weapon.artwork);
  });

  it('filters base equipment while retaining other recorded loadout pieces', async () => {
    const daeron = hunterById('daeron');
    const hunter = hunt().hunters[0];

    if (!daeron || !hunter) throw new Error('Hunter catalog entries are missing');

    const baseline = baseEquipment(daeron);
    const weapon = forgeEquipment.find(
      (piece) => piece.type === 'weapon' && piece.classRestriction === daeron.classId && piece.id !== baseline.weaponId,
    );
    const armor = forgeEquipment.find((piece) => piece.type === 'armor' && piece.id !== baseline.armorId);

    if (!weapon || !armor) throw new Error('Non-base hunter equipment is missing');

    setSources([
      hunt({
        hunters: [
          { ...hunter, equipment: { ...baseline, armorId: armor.id, weaponId: weapon.id }, hunterId: daeron.id },
        ],
      }),
    ]);
    const container = mountView();
    await settle();

    [...container.querySelectorAll('.chronicle__roster-row')]
      .find((row) => row.textContent?.includes(daeron.name))
      ?.dispatchEvent(new Event('click'));
    await settle();

    const weaponRows = [
      ...(container.querySelectorAll('.chronicle__equipment-grid--weapons .chronicle__equipment-tile') ?? []),
    ];
    const otherRows = [
      ...(container.querySelectorAll('.chronicle__equipment-grid--other .chronicle__equipment-tile') ?? []),
    ];

    expect(weaponRows).toHaveLength(1);
    expect(weaponRows[0]?.textContent).toContain(weapon.name);
    expect(otherRows).toHaveLength(1);
    expect(otherRows[0]?.textContent).toContain(armor.name);
    expect(container.querySelector('.chronicle__dossier')?.textContent).not.toContain('Base Armor');
    expect(container.querySelector('.chronicle__dossier')?.textContent).not.toContain('Base Helm');
  });

  it('explains when recorded loadouts contain only base equipment', async () => {
    const daeron = hunterById('daeron');
    const hunter = hunt().hunters[0];

    if (!daeron || !hunter) throw new Error('Hunter catalog entries are missing');

    setSources([hunt({ hunters: [{ ...hunter, equipment: baseEquipment(daeron), hunterId: daeron.id }] })]);
    const container = mountView();
    await settle();

    [...container.querySelectorAll('.chronicle__roster-row')]
      .find((row) => row.textContent?.includes(daeron.name))
      ?.dispatchEvent(new Event('click'));
    await settle();

    expect(container.querySelector('.chronicle__equipment-grid')).toBeNull();
    expect(container.querySelector('.chronicle__dossier')?.textContent).toContain(
      'Only base equipment appears in recorded loadouts.',
    );
  });

  it('compares two hunters and their recorded equipment only after explicit selection', async () => {
    const seatBuild = (hunterId: string): HunterBuild => {
      const hunter = hunterById(hunterId);

      if (!hunter) throw new Error(`Hunter ${hunterId} is missing`);

      const base = baseEquipment(hunter);
      const piece = (type: 'weapon' | 'helm' | 'armor' | 'item', baseId: string | null) =>
        forgeEquipment.find(
          (candidate) =>
            candidate.type === type &&
            candidate.id !== baseId &&
            (candidate.type !== 'weapon' || candidate.classRestriction === hunter.classId),
        );
      const weapon = piece('weapon', base.weaponId);
      const helm = piece('helm', base.helmId);
      const armor = piece('armor', base.armorId);
      const item = piece('item', null);

      if (!weapon || !helm || !armor || !item) throw new Error('Comparison equipment is missing');

      return {
        deckCardIds: ['card-a'],
        equipment: { armorId: armor.id, helmId: helm.id, itemId: item.id, weaponId: weapon.id },
        masteryCardId: 'mastery-a',
      };
    };
    const seatHunt = (hunterId: string) => hunt({ hunters: [{ ...seatBuild(hunterId), hunterId }] });

    // Five hunters in the record; two selections compare them, no mode toggle in between.
    setSources(
      [seatHunt('daeron'), seatHunt('heleren'), seatHunt('karah'), seatHunt('mirah'), seatHunt('thoreg')],
      'campaigns',
    );
    const container = mountView();
    await settle();

    const seats = () => [...container.querySelectorAll('.chronicle__roster-row')];
    const pressed = () =>
      seats()
        .filter((seat) => seat.getAttribute('aria-pressed') === 'true')
        .map((seat) => seat.querySelector('.hunter-identity__name')?.textContent?.replace(/\s+/g, ''));

    expect(seats()).toHaveLength(5);
    expect(pressed()).toEqual([]);
    expect(createRadarChart).not.toHaveBeenCalled();
    expect(container.querySelector('.chronicle__dossier')).toBeNull();

    (seats()[0] as HTMLButtonElement | undefined)?.click();
    (seats()[1] as HTMLButtonElement | undefined)?.click();
    await settle();

    // Two selections mount a radar of each side's recorded build: most-used gear scored with the latest deck.
    expect(container.querySelector('.chronicle__roster-status')?.textContent).toBe('Comparing Daeron and Heleren');
    expect(createRadarChart).toHaveBeenCalledTimes(1);
    expect((createRadarChart as unknown as Mock).mock.calls[0]?.[0]).toBe(
      container.querySelector('.chronicle__comparison-center .chronicle__strength-chart'),
    );
    const config = (createRadarChart as unknown as Mock).mock.calls[0]?.[1];

    expect(config.axes.map((axis: { label: string }) => axis.label)).toEqual([
      'Power',
      'Defense',
      'Mobility',
      'Speed',
      'Control',
      'Support',
    ]);
    expect(config.domain).toEqual([0, 5]);
    expect(config.series).toHaveLength(2);
    // Each plotted shape is the side's recorded build profiled, named by its hunter.
    const expectedData = (hunterId: string) =>
      STRENGTH_AXES.map((axis) => ({
        key: axis,
        value: buildProfile(seatBuild(hunterId), hunterById(hunterId)!)[axis],
      }));

    expect(config.series.map((series: { data: unknown; name: string }) => [series.name, series.data])).toEqual([
      ['Daeron', expectedData('daeron')],
      ['Heleren', expectedData('heleren')],
    ]);
    expect(config.a11y.ariaLabel).toBe(
      'Profiles for Daeron and Heleren: each hunter’s most-used gear scored with their latest deck',
    );
    expect(container.querySelector('.chronicle__strength-values')).toBeNull();
    expect(container.querySelectorAll('.chronicle__comparison-side')).toHaveLength(2);
    expect(container.querySelector('.chronicle__comparison-center .chronicle__strength-chart')).not.toBeNull();
    expect(container.querySelector('.chronicle__strength-lines')).toBeNull();
    const comparisonSides = [...container.querySelectorAll('.chronicle__comparison-side')];

    expect(comparisonSides.map((side) => side.querySelectorAll('.loadout-frame'))).toHaveLength(2);
    for (const side of comparisonSides) {
      const frame = side.querySelector('.loadout-frame');

      expect(frame?.querySelectorAll('.loadout-slot')).toHaveLength(4);
      expect(frame?.querySelector('.loadout-grid--no-potions')).not.toBeNull();
      expect(frame?.querySelector('.loadout-slot--potion1, .loadout-slot--potion2, .loadout-slot--potion3')).toBeNull();
      expect(frame?.querySelectorAll('.loadout-slot__total')).toHaveLength(4);
      for (const total of frame?.querySelectorAll('.loadout-slot__total') ?? []) {
        expect(total.textContent?.trim()).toBe('1');
        expect(total.closest('.slot-card')?.querySelector('.slot-card__art')).not.toBeNull();
      }
      expect(side.querySelector('.chronicle__comparison-portrait')?.getAttribute('src')).toBeTruthy();
    }

    // A third pick makes room by dropping the oldest selection; no row is ever disabled.
    (seats()[2] as HTMLButtonElement).click();
    await settle();

    expect(pressed()).toEqual(['Heleren', 'Karah']);
    // The shift is spoken, not silently swapped.
    expect(container.querySelector('.chronicle__roster-status')?.textContent).toBe('Comparing Heleren and Karah');
    expect(seats().every((seat) => !(seat as HTMLButtonElement).disabled)).toBe(true);
    const handle = (createRadarChart as unknown as Mock).mock.results[0]?.value;

    // The moved comparison updates the chart in place; it never remounts.
    expect(createRadarChart).toHaveBeenCalledTimes(1);
    const seriesNames = (call: unknown[]) => (call[0] as { name: string }[]).map((series) => series.name);

    expect(handle.update).toHaveBeenCalledTimes(2);
    expect(seriesNames(handle.update.mock.calls[0]!)).toEqual(['Daeron', 'Heleren']);
    expect(seriesNames(handle.update.mock.calls[1]!)).toEqual(['Heleren', 'Karah']);

    window.dispatchEvent(new Event('resize'));
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

    expect(handle.update).toHaveBeenCalledTimes(3);

    // A chapter with one hunter keeps its dossier rather than a stranded comparison.
    sourceByMode.expeditions.value = [{ huntHistory: [seatHunt('daeron')], id: 'subject-a', name: 'The Long Hunt' }];
    // Bring Daeron back into the selection before leaving the chapter that holds the others.
    (seats()[0] as HTMLButtonElement).click();
    await settle();
    await chooseMode(container, 'expedition');
    await settle();

    expect(container.querySelector('.chronicle__comparison')).toBeNull();
    expect(container.querySelector('.chronicle__dossier')?.textContent).toContain('Daeron');
    expect(pressed()).toEqual(['Daeron']);
  });

  it('shows printed base gear in a comparison slot that never wore more', async () => {
    const baseHunt = (hunterId: string) => {
      const hunter = hunterById(hunterId);

      if (!hunter) throw new Error(`Hunter ${hunterId} is missing`);

      return hunt({ hunters: [{ ...hunt().hunters[0]!, equipment: baseEquipment(hunter), hunterId }] });
    };
    setSources([baseHunt('daeron'), baseHunt('karah')], 'campaigns');
    const container = mountView();
    await settle();

    const seats = () => [...container.querySelectorAll<HTMLButtonElement>('.chronicle__roster-row')];

    seats()[0]?.click();
    seats()[1]?.click();
    await settle();

    for (const side of [...container.querySelectorAll('.chronicle__comparison-side')]) {
      const frame = side.querySelector('.loadout-frame');

      // Worn slots show the printed base pieces with their counts; only the item slot stays empty.
      expect(frame?.textContent).not.toContain('Empty Weapon');
      expect(frame?.textContent).not.toContain('Empty Armor');
      expect(frame?.textContent).not.toContain('Empty Helm');
      for (const total of frame?.querySelectorAll('.loadout-slot__total') ?? []) {
        expect(total.textContent?.trim()).toBe('1');
      }
    }
  });

  it('expands all creatures using the same ranked row style and collapses back', async () => {
    setSources(
      Array.from({ length: 10 }, (_, index) => hunt({ monsterId: `monster-${index}` })),
      'campaigns',
    );
    const container = mountView();
    await settle();

    const creatures = () => container.querySelectorAll('section[aria-label="Creatures encountered"] ore-rank-item');
    const more = () => container.querySelector<HTMLElement>('.chronicle__creatures-more');

    expect(creatures()).toHaveLength(8);
    expect(more()?.textContent).toContain('Show more');
    expect(more()?.querySelector('ore-badge')?.getAttribute('count')).toBe('2');

    more()?.dispatchEvent(new Event('click'));
    await settle();

    expect(creatures()).toHaveLength(10);
    expect([...creatures()].every((row) => row.querySelector('[slot="description"]'))).toBe(true);
    expect([...creatures()].every((row) => row.querySelector('.chronicle__creature-win-rate'))).toBe(true);
    expect(more()?.textContent).toContain('Show less');

    more()?.dispatchEvent(new Event('click'));
    await settle();

    expect(creatures()).toHaveLength(8);
  });

  it('closes an open dossier when its hunter leaves the chapter', async () => {
    const mirah = {
      deckCardIds: ['card-c'],
      equipment: { armorId: null, helmId: null, itemId: null, weaponId: 'weapon-b' },
      hunterId: 'mirah',
      masteryCardId: 'mastery-b',
    };

    setSources([hunt(), hunt({ hunters: [mirah], monsterId: 'monster-b' })], 'campaigns');
    sourceByMode.expeditions.value = [
      { huntHistory: [hunt({ monsterId: 'monster-c' })], id: 'subject-expedition', name: 'Vyraxen' },
    ];
    const container = mountView();
    await settle();

    const mirahRow = [...container.querySelectorAll('.chronicle__roster-row')].find((candidate) =>
      candidate.textContent?.includes('Mirah'),
    );

    mirahRow?.dispatchEvent(new Event('click'));
    await settle();
    expect(container.querySelector('.chronicle__dossier')?.textContent).toContain('Mirah');

    // Switching to a chapter without Mirah closes her dossier, not a stale panel.
    await chooseMode(container, 'expedition');
    await settle();

    expect(container.querySelector('.chronicle__dossier')).toBeNull();
    expect(container.querySelectorAll('.chronicle__roster-row').length).toBeGreaterThan(0);
  });

  it('switches the expanded Pace details when a timed-hunt row is selected', async () => {
    const mirah = {
      deckCardIds: ['card-c'],
      equipment: { armorId: null, helmId: null, itemId: null, weaponId: 'weapon-b' },
      hunterId: 'mirah',
      masteryCardId: 'mastery-b',
    };
    setSources([
      hunt({ id: 'campaign:hunt:daeron', recordedAt: '2026-01-01T00:00:00.000Z' }),
      hunt({
        durationMs: 65000,
        hunters: [mirah],
        id: 'campaign:hunt:mirah',
        recordedAt: '2026-01-02T00:00:00.000Z',
      }),
    ]);
    const container = mountView();
    await settle();

    const paceRow = container.querySelector('section[aria-label="The pace of the hunt"] ore-accordion-item');
    const picks = [...(paceRow?.querySelectorAll<HTMLButtonElement>('.chronicle__pace-pick') ?? [])];
    const details = () => paceRow?.querySelector('.hunt-record-details');

    expect(picks).toHaveLength(2);
    // The newest hunt is the first pick and the default inspection.
    expect(picks[0]?.getAttribute('aria-pressed')).toBe('true');
    expect(picks[0]?.textContent).toContain('1:05');
    expect(details()?.textContent).toContain('Mirah');
    expect(details()?.textContent).toContain('weapon-b');
    expect(details()?.textContent).toContain('card-c');

    picks[1]?.click();
    await settle();

    expect(picks[1]?.getAttribute('aria-pressed')).toBe('true');
    expect(picks[0]?.getAttribute('aria-pressed')).toBe('false');
    expect(details()?.textContent).toContain('Daeron');
    expect(details()?.textContent).toContain('weapon-a');
    expect(details()?.textContent).not.toContain('Mirah');
  });

  it('formats hour-span fights as hour spans, never runaway minutes', async () => {
    setSources([hunt({ durationMs: 5_400_000, monsterId: 'monster-a' })]);
    const container = mountView();
    await settle();

    expect(container.querySelector('section[aria-label="The pace of the hunt"]')?.textContent).toContain('1h 30m');
  });

  it('closes the record with the most recent hunt as the way into its game', async () => {
    setSources([
      hunt({ monsterId: 'monster-a', outcome: 'victory', recordedAt: '2026-01-01T00:00:00.000Z' }),
      hunt({ monsterId: 'monster-b', outcome: 'defeat', recordedAt: '2026-03-01T00:00:00.000Z' }),
    ]);
    const container = mountView();
    await settle();

    const last = container.querySelector('.chronicle__record-last');

    expect(last?.textContent).toContain('defeat against monster-b');
    expect(last?.textContent).toContain('Mar 1');
    expect(last?.querySelector('a')?.getAttribute('href')).toBe('/campaigns/subject-a');

    const plainClick = new MouseEvent('click', { bubbles: true, button: 0, cancelable: true });

    last?.querySelector('a')?.dispatchEvent(plainClick);
    expect(plainClick.defaultPrevented).toBe(true);
  });

  it('carries each mode hunt count on its filter button and mobile option', async () => {
    setSources([hunt(), hunt({ monsterId: 'monster-b' })], 'campaigns');
    sourceByMode.expeditions.value = [
      { huntHistory: [hunt({ monsterId: 'monster-c' })], id: 'subject-expedition', name: 'Vyraxen' },
    ];
    const container = mountView();
    await settle();

    const buttons = [...container.querySelectorAll('.chronicle__desktop-filter ore-button')].map(
      (button) => button.textContent,
    );

    expect(buttons[0]).toContain('3');
    expect(buttons[1]).toContain('2');
    expect(buttons[2]).toContain('1');
    expect(buttons[3]).toContain('0');
    expect(buttons[4]).toContain('0');
    // The pressed filter announces the record it produced.
    expect(container.querySelector('[aria-live="polite"]')?.textContent).toBe('Showing 3 hunts in All modes');

    // The phone select keeps the unit its desktop twin hides in the count.
    const options = [...container.querySelectorAll('.chronicle__mobile-filter option')].map(
      (option) => option.textContent,
    );

    expect(options).toEqual([
      'All modes · 3 hunts',
      'Campaigns · 2 hunts',
      'Expeditions · 1 hunt',
      'Ascents · 0 hunts',
      'Challenges · 0 hunts',
    ]);
  });

  it('reads the record through the party divider, its counts within the mode lens', async () => {
    const second = {
      deckCardIds: ['card-a'],
      equipment: { armorId: 'armor-a', helmId: null, itemId: null, weaponId: 'weapon-a' },
      hunterId: 'mirah',
      masteryCardId: 'mastery-a',
    };
    const pair = (overrides: Partial<HuntRecord> = {}) => hunt({ ...overrides, hunters: [...hunt().hunters, second] });

    setSources([hunt(), pair({ monsterId: 'monster-b' })], 'campaigns');
    sourceByMode.expeditions.value = [
      { huntHistory: [pair({ monsterId: 'monster-c' })], id: 'subject-expedition', name: 'Vyraxen' },
    ];
    const container = mountView();
    await settle();

    // Two sizes in the record: the divider appears, each option carrying its hunt count.
    const partyButtons = () => [...container.querySelectorAll<HTMLElement>('.chronicle__party-filter ore-button')];
    const partyTexts = partyButtons().map((button) => button.textContent);

    expect(partyTexts[0]).toContain('All party sizes');
    expect(partyTexts[0]).toContain('3');
    expect(partyTexts[1]).toContain('1 hunter');
    expect(partyTexts[1]).toContain('1');
    expect(partyTexts[2]).toContain('2 hunters');
    expect(partyTexts[2]).toContain('2');
    // The phone select mirrors the divider, its options carrying the hunt unit.
    const phoneOptions = [...container.querySelectorAll('.chronicle__mobile-filter option')].map(
      (option) => option.textContent,
    );

    expect(phoneOptions.slice(5)).toEqual(['All party sizes · 3 hunts', '1 hunter · 1 hunt', '2 hunters · 2 hunts']);

    // Reading at one size: the record and announcement answer, and the mode divider counts
    // within the party lens.
    partyButtons()[2]?.click();
    await settle();
    expect(container.querySelector('[aria-live="polite"]')?.textContent).toBe(
      'Showing 2 hunts in All modes with 2 hunters',
    );
    const modeTexts = [...container.querySelectorAll('.chronicle__mode-filter ore-button')].map(
      (button) => button.textContent,
    );

    expect(modeTexts[0]).toContain('2');
    expect(modeTexts[1]).toContain('1');
    expect(modeTexts[2]).toContain('1');

    // A mode empty at this size still names the mode, and offers each lens' way back.
    [...container.querySelectorAll<HTMLElement>('.chronicle__mode-filter ore-button')][3]?.click();
    await settle();
    expect(container.querySelector('.chronicle__empty-state')?.textContent).toContain('No hunts recorded in this mode');
    expect(
      [...container.querySelectorAll('.chronicle__empty-state ore-button')].map((button) => button.textContent),
    ).toEqual(['Show all modes', 'Show all party sizes']);
    [...container.querySelectorAll<HTMLElement>('.chronicle__empty-state ore-button')][0]?.click();
    await settle();
    expect(container.querySelector('[aria-live="polite"]')?.textContent).toBe(
      'Showing 2 hunts in All modes with 2 hunters',
    );
  });

  it('hides the party divider when the record holds one party size', async () => {
    setSources([hunt(), hunt({ monsterId: 'monster-b' })]);
    const container = mountView();
    await settle();

    expect(container.querySelector('.chronicle__party-filter')).toBeNull();
    expect(container.querySelectorAll('.chronicle__mobile-filter ore-select')).toHaveLength(1);
  });

  it('carries each creature win/loss standing under its name', async () => {
    setSources([hunt(), hunt({ monsterId: 'monster-b', outcome: 'defeat' })]);
    const container = mountView();
    await settle();

    const creatures = container.querySelector('section[aria-label="Creatures encountered"]');
    const standings = [...(creatures?.querySelectorAll('[slot="description"]') ?? [])].map((node) => node.textContent);

    expect(standings).toEqual(['1 victory · 0 defeats', '0 victories · 1 defeat']);
    expect(
      [...(creatures?.querySelectorAll('.chronicle__creature-win-rate') ?? [])].map((node) => node.textContent?.trim()),
    ).toEqual(['100%', '0%']);
    expect(container.querySelector('.chronicle__radar')).toBeNull();
  });

  it('links catalog creatures to their reference entry', async () => {
    setSources([hunt({ monsterId: 'toramat', outcome: 'victory' })]);
    const container = mountView();
    await settle();

    const link = container.querySelector('section[aria-label="Creatures encountered"] .chronicle__subject-link');

    expect(link?.getAttribute('href')).toBe('/manual?entry=monster-toramat');
    expect(link?.textContent).toBe('Toramat');

    const plainClick = new MouseEvent('click', { bubbles: true, button: 0, cancelable: true });

    link?.dispatchEvent(plainClick);
    expect(plainClick.defaultPrevented).toBe(true);
  });

  it('carries the folio chips that jump a stacked phone page to its sections', async () => {
    setSources([hunt()]);
    const container = mountView();
    await settle();

    expect([...container.querySelectorAll('.chronicle-jumps a')].map((chip) => chip.getAttribute('href'))).toEqual([
      '#chronicle-record',
      '#chronicle-creatures',
      '#chronicle-pace',
      '#chronicle-recent',
      '#chronicle-hunters',
    ]);
  });

  it('keeps the provenance band whole while the divider filters, and a segment selects', async () => {
    setSources([hunt(), hunt({ monsterId: 'monster-b', outcome: 'defeat' })], 'campaigns');
    sourceByMode.expeditions.value = [
      { huntHistory: [hunt({ monsterId: 'monster-c' })], id: 'subject-expedition', name: 'Vyraxen' },
    ];
    const container = mountView();
    await settle();

    const config = (createBarChart as unknown as Mock).mock.calls[0]?.[1];
    const updates = () => (createBarChart as unknown as Mock).mock.results[0]?.value.update;

    expect(createBarChart).toHaveBeenCalledTimes(1);
    expect(config).toMatchObject({
      a11y: { ariaLabel: 'Recorded hunts per game mode; select a segment to filter by it' },
      tooltip: true,
      variant: 'stacked-horizontal',
    });
    // Every played mode rides the band, each in its own stable color.
    expect(config.series).toEqual([
      { color: 'var(--prism-color-1)', data: [{ key: 'record', value: 2 }], name: 'Campaigns' },
      { color: 'var(--prism-color-2)', data: [{ key: 'record', value: 1 }], name: 'Expeditions' },
    ]);

    await chooseMode(container, 'campaign');

    // Filtering dims the other modes instead of erasing them: folio I keeps the whole story.
    expect(updates().mock.lastCall?.[0]).toEqual([
      { color: 'var(--prism-color-1)', data: [{ key: 'record', value: 2 }], name: 'Campaigns' },
      {
        color: 'color-mix(in oklch, var(--prism-color-2) 45%, transparent)',
        data: [{ key: 'record', value: 1 }],
        name: 'Expeditions',
      },
    ]);

    // A segment click selects its mode; the pressed segment returns to all.
    config.onClick({ series: { name: 'Expeditions' } });
    await settle();

    expect(container.querySelector('[aria-live="polite"]')?.textContent).toBe('Showing 1 hunts in Expeditions');
    expect(updates().mock.lastCall?.[0]).toEqual([
      {
        color: 'color-mix(in oklch, var(--prism-color-1) 45%, transparent)',
        data: [{ key: 'record', value: 2 }],
        name: 'Campaigns',
      },
      { color: 'var(--prism-color-2)', data: [{ key: 'record', value: 1 }], name: 'Expeditions' },
    ]);

    config.onClick({ series: { name: 'Expeditions' } });
    await settle();

    expect(container.querySelector('[aria-live="polite"]')?.textContent).toBe('Showing 3 hunts in All modes');
    expect(updates().mock.lastCall?.[0]).toEqual([
      { color: 'var(--prism-color-1)', data: [{ key: 'record', value: 2 }], name: 'Campaigns' },
      { color: 'var(--prism-color-2)', data: [{ key: 'record', value: 1 }], name: 'Expeditions' },
    ]);
  });

  it('adds a mode segment for every game the record spans', async () => {
    setSources([hunt(), hunt({ monsterId: 'monster-b' })], 'campaigns');
    sourceByMode.expeditions.value = [
      { huntHistory: [hunt({ monsterId: 'monster-c' })], id: 'subject-expedition', name: 'Vyraxen' },
    ];
    mountView();
    await settle();

    expect((createBarChart as unknown as Mock).mock.calls[0]?.[1].series).toEqual([
      { color: 'var(--prism-color-1)', data: [{ key: 'record', value: 2 }], name: 'Campaigns' },
      { color: 'var(--prism-color-2)', data: [{ key: 'record', value: 1 }], name: 'Expeditions' },
    ]);
  });

  it('falls back to the mode empty state and returns through Show all modes', async () => {
    setSources([hunt(), hunt({ monsterId: 'monster-b' })], 'campaigns');
    const container = mountView();
    await settle();

    await chooseMode(container, 'expedition');

    expect(container.querySelector('.chronicle__hero-number')).toBeNull();
    expect(container.querySelector('.chronicle__empty-state')?.textContent).toContain('No hunts recorded in this mode');
    expect(container.querySelector('.chronicle__empty-state')?.textContent).toContain(
      'Your hunting record contains 2 hunts across other modes',
    );

    const showAll = [...container.querySelectorAll('ore-button')].find((button) =>
      button.textContent?.includes('Show all modes'),
    );

    showAll?.dispatchEvent(new Event('click'));
    await settle();

    expect(container.querySelector('.chronicle__hero-number')).toBeNull();
    expect(container.querySelector('.chronicle__record-chart')).not.toBeNull();
  });
});

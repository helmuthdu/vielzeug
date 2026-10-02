// @vitest-environment jsdom

import { createRadarChart } from '@vielzeug/prism';
import type { Mock } from 'vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp, defineComponent, h, nextTick, ref } from 'vue';
import { hunterById } from '../../../content';
import { hunterProfile, STRENGTH_AXES, starterBuild } from '../../../domain/strength';
import type { Hunter, HunterBuild } from '../../../domain/types';
import BuildProfile from './BuildProfile.vue';

vi.mock('@vielzeug/prism', () => ({
  createRadarChart: vi.fn(() => ({ dispose: vi.fn(), update: vi.fn() })),
}));

const daeron = (): Hunter => {
  const entry = hunterById('daeron');
  if (!entry) throw new Error('daeron is missing');
  return entry;
};

const mounted: Array<ReturnType<typeof createApp>> = [];

afterEach(() => {
  for (const app of mounted) app.unmount();
  mounted.length = 0;
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

/** Mounts the panel against a reactive build prop so draft updates exercise the update path. */
function mountPanel(
  hunter: Hunter,
  build: HunterBuild,
): { container: HTMLElement; setBuild: (next: HunterBuild) => void } {
  const container = document.createElement('div');
  const draft = ref(build);

  if (typeof ResizeObserver === 'undefined') {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe(): void {}
        disconnect(): void {}
      },
    );
  }

  const app = createApp({ render: () => h(BuildProfile, { build: draft.value, hunter }) });

  for (const tag of ['ore-text']) {
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
  return { container, setBuild: (next: HunterBuild) => void (draft.value = next) };
}

const settle = async () => {
  await nextTick();
  await nextTick();
};

const rows = (container: HTMLElement) =>
  [...container.querySelectorAll<HTMLElement>('.build-profile__row')].map((row) => ({
    delta: row.querySelector('.build-profile__delta [aria-hidden="true"]')?.textContent ?? '',
    label: row.querySelector('dt')?.textContent,
    value: row.querySelector('.build-profile__value')?.textContent,
  }));

const createdConfig = () => (createRadarChart as unknown as Mock).mock.calls[0]?.[1];
const createdHandle = () => (createRadarChart as unknown as Mock).mock.results[0]?.value;

describe('BuildProfile', () => {
  it('plots the starter build against itself: no deltas, every axis on the row', async () => {
    const hunter = daeron();
    const starter = starterBuild(hunter);
    const { container } = mountPanel(hunter, starter);
    await settle();

    const starterProfile = hunterProfile(hunter);

    expect(rows(container)).toEqual(
      STRENGTH_AXES.map((axis) => ({
        delta: '',
        label: {
          control: 'Control',
          defense: 'Defense',
          mobility: 'Mobility',
          power: 'Power',
          speed: 'Speed',
          support: 'Support',
        }[axis],
        value: starterProfile[axis].toFixed(1),
      })),
    );

    const config = createdConfig();

    expect(createRadarChart).toHaveBeenCalledTimes(1);
    expect(config.domain).toEqual([0, 5]);
    expect(config.series.map((series: { name: string }) => series.name)).toEqual(['Starter build', 'This build']);
    for (const series of config.series) {
      expect(series.data).toEqual(STRENGTH_AXES.map((axis) => ({ key: axis, value: starterProfile[axis] })));
    }
  });

  it('scores a swapped-in level-3 weapon into the power row and its delta', async () => {
    const hunter = daeron();
    const starter = starterBuild(hunter);
    const { container } = mountPanel(hunter, {
      ...starter,
      equipment: { ...starter.equipment, weaponId: 'weapon-daeron-aurean-blade-l3' },
    });
    await settle();

    const byLabel = new Map(rows(container).map((row) => [row.label, row]));

    expect(byLabel.get('Power')).toMatchObject({ delta: '+0.8', value: '3.5' });
    for (const label of ['Defense', 'Mobility', 'Speed', 'Control', 'Support']) {
      expect(byLabel.get(label)?.delta).toBe('');
    }
  });

  it('pushes a changed build into the chart through update, never a remount', async () => {
    const hunter = daeron();
    const starter = starterBuild(hunter);
    const { setBuild } = mountPanel(hunter, starter);
    await settle();

    const handle = createdHandle();

    setBuild({ ...starter, deckCardIds: starter.deckCardIds.slice(4) });
    await settle();

    expect(createRadarChart).toHaveBeenCalledTimes(1);
    expect(handle.update).toHaveBeenCalled();
    const nextSeries = handle.update.mock.calls.at(-1)?.[0];

    expect(nextSeries[1].name).toBe('This build');
    expect(nextSeries[1].data.find((datum: { key: string }) => datum.key === 'power').value).toBe(2.1);
  });
});

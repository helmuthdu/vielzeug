// @vitest-environment jsdom

import { createLineChart } from '@vielzeug/prism';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp, defineComponent, h, nextTick } from 'vue';
import { hunterById, hunterCards } from '../../content';
import { baseEquipment } from '../../domain/deck';
import { snapshotFightStart } from '../../domain/fight-events';
import { idleHunterState } from '../../domain/hunter-state';
import { idleMonsterState } from '../../domain/monster-state';
import type { HuntEvent, HuntRecord } from '../../domain/types';
import HuntTimeline from './HuntTimeline.vue';

vi.mock('@vielzeug/prism', () => ({ createLineChart: vi.fn(() => ({ dispose: vi.fn(), update: vi.fn() })) }));
const mounted: Array<ReturnType<typeof createApp>> = [];
afterEach(() => {
  for (const app of mounted) app.unmount();
  mounted.length = 0;
  document.body.replaceChildren();
  vi.clearAllMocks();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function makeRecord(count: number): HuntRecord {
  return {
    durationMs: 120_000,
    events: Array.from(
      { length: count },
      (_, index): HuntEvent => ({
        actor: { hunterId: 'daeron', kind: 'hunter' },
        delta: index % 2 ? -1 : 1,
        elapsedMs: index * 500,
        recordedAt: '2026-01-01T00:00:00.000Z',
        sequence: index + 1,
        type: 'damage',
        value: index % 2 ? 0 : 1,
      }),
    ),
    fightStart: snapshotFightStart(
      {
        hunterState: { daeron: idleHunterState() },
        hunters: [{ equipment: baseEquipment(hunterById('daeron')!), hunterId: 'daeron', masteryCardId: '' }],
        monsterState: idleMonsterState(1),
      },
      'toramat',
    ),
    hunters: [
      { deckCardIds: [], equipment: baseEquipment(hunterById('daeron')!), hunterId: 'daeron', masteryCardId: '' },
    ],
    id: 'continuous-hunt',
    monsterId: 'toramat',
    outcome: 'victory',
    recordedAt: '2026-01-01T00:02:00.000Z',
  };
}

async function mountTimeline(record: HuntRecord): Promise<HTMLElement> {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    },
  );
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(384);
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    return new DOMRect(0, 0, 640, this.classList.contains('hunt-timeline__event-viewport') ? 384 : 64);
  });
  const container = document.createElement('div');
  document.body.append(container);
  const app = createApp({ render: () => h(HuntTimeline, { record }) });
  app.component(
    'ore-button',
    defineComponent({
      inheritAttrs: false,
      setup(_, { attrs, slots }) {
        return () => h('button', attrs, slots.default?.());
      },
    }),
  );
  app.mount(container);
  mounted.push(app);
  await nextTick();
  await nextTick();
  return container;
}

describe('HuntTimeline', () => {
  it('does not plot an unleash at zero health when recorded health is unknown', async () => {
    const record = makeRecord(0);
    record.fightStart.hunters.daeron!.armorHealth = null;
    record.fightStart.hunters.daeron!.helmHealth = null;
    record.events = [
      {
        actor: { kind: 'monster', monsterId: record.monsterId },
        elapsedMs: 1_000,
        recordedAt: record.recordedAt,
        sequence: 1,
        type: 'unleash',
      },
    ];
    await mountTimeline(record);
    const series = vi.mocked(createLineChart).mock.calls[0]![1].series;
    expect(series.find((entry) => entry.name === 'Remaining party health')).toBeUndefined();
    expect(series.find((entry) => entry.name === 'Unleash')?.data).toEqual([]);
  });
  it.each([120_000, null])(
    'highlights mastery focus only when the recorded card goal is crossed with duration %s',
    async (durationMs) => {
      const record = makeRecord(0);
      record.durationMs = durationMs;
      const card = hunterCards(hunterById('daeron')!).find(
        (entry) => entry.kind === 'mastery' && entry.unfocused?.counters === 4,
      );
      if (!card) throw new Error('The four-counter Daeron mastery fixture is missing');
      record.hunters[0]!.masteryCardId = card.id;
      record.fightStart.hunters.daeron!.masteryGoal = card.unfocused!.counters!;
      const actor = { hunterId: 'daeron', kind: 'hunter' as const };
      record.events = [1, 3, 4, 5, 0, 4].map((value, index, values) => ({
        actor,
        counter: 'mastery',
        delta: value - (values[index - 1] ?? 0),
        elapsedMs: durationMs === null ? null : 1_000,
        recordedAt: record.recordedAt,
        sequence: index + 1,
        type: 'counter',
        value,
      }));
      const container = await mountTimeline(record);
      const mastery = vi
        .mocked(createLineChart)
        .mock.calls[0]![1].series.find((series) => series.name === 'Mastery focused')!;
      expect(mastery.data.map((datum) => datum.meta?.sequence)).toEqual([3, 6]);
      expect(mastery.data.map((datum) => datum.key)).toEqual(durationMs === null ? [3, 6] : [1_000, 1_000]);
      expect(mastery.data[0]?.meta?.description).toBe('Daeron focused their mastery');
      expect(container.querySelector('.hunt-timeline__legend')?.textContent).toContain('Mastery focused');
      container.querySelectorAll<HTMLButtonElement>('.hunt-timeline__event')[2]!.click();
      await nextTick();
      expect(container.querySelector('.hunt-timeline__selection')?.textContent).toContain(
        'Daeron focused their mastery',
      );
    },
  );

  it.each([120_000, null])(
    'highlights the four milestone types at recorded positions with duration %s',
    async (durationMs) => {
      const record = makeRecord(0);
      record.durationMs = durationMs;
      const meta = { elapsedMs: durationMs === null ? null : 1_000, recordedAt: record.recordedAt };
      const monster = { kind: 'monster' as const, monsterId: record.monsterId };
      const hunter = { hunterId: 'daeron', kind: 'hunter' as const };
      record.events = [
        { ...meta, actor: monster, delta: 6, sequence: 1, type: 'damage', value: 6 },
        { ...meta, actor: monster, from: 1, sequence: 2, to: 2, toughness: 3, type: 'stance' },
        { ...meta, actor: monster, damage: 6, sequence: 3, threshold: 6, type: 'wound-ready' },
        { ...meta, actor: monster, damageRemoved: 6, sequence: 4, stance: 2, type: 'wound' },
        { ...meta, actor: hunter, delta: 2, sequence: 5, type: 'damage', value: 2 },
        { ...meta, actor: monster, sequence: 6, type: 'unleash' },
        { ...meta, actor: hunter, sequence: 7, token: 'red', type: 'knockout' },
        { ...meta, actor: hunter, sequence: 8, token: null, type: 'knockout' },
      ];
      const container = await mountTimeline(record);
      const config = vi.mocked(createLineChart).mock.calls[0]![1];
      const highlights = config.series.slice(2, 6);
      expect(config.rightYAxis?.label).toBe('Damage dealt');
      expect(config.series[1]?.yAxis).toBe('right');
      expect(highlights.map((series) => series.yAxis)).toEqual(['right', 'right', 'left', 'left']);
      expect(new Set(highlights.map((series) => series.color)).size).toBe(4);
      expect(highlights.map((series) => series.data.map((datum) => datum.meta?.sequence))).toEqual([
        [2],
        [4],
        [6],
        [7],
      ]);
      const healthAtUnleash = config.series[0]!.data.find((datum) => datum.meta?.sequence === 6)!.value;
      expect(healthAtUnleash).not.toBe(6);
      expect(highlights.map((series) => series.data[0]!.value)).toEqual([6, 6, healthAtUnleash, 0]);
      expect(highlights.map((series) => series.data[0]!.key)).toEqual(
        durationMs === null ? [2, 4, 6, 7] : [1_000, 1_000, 1_000, 1_000],
      );
      expect(highlights.every((series) => series.showPoints && series.strokeWidth === 0)).toBe(true);
      expect(container.querySelector('.hunt-timeline__legend')?.textContent).toContain('Confirmed wound');
      const wound = highlights[1]!;
      config.onClick!({ datum: wound.data[0]!, originalEvent: new MouseEvent('click'), series: wound });
      await nextTick();
      expect(container.querySelector('.hunt-timeline__selection')?.textContent).toContain('wound confirmed');
      const handle = vi.mocked(createLineChart).mock.results[0]!.value;
      const selected = handle.update.mock.calls.at(-1)![0].at(-1);
      expect(selected.yAxis).toBe('right');
    },
  );

  it('scrolls through hundreds of events without dropdowns or mounting the entire history', async () => {
    const container = await mountTimeline(makeRecord(240));
    const viewport = container.querySelector<HTMLElement>('.hunt-timeline__event-viewport')!;
    viewport.scrollTo = (options?: ScrollToOptions | number, top?: number) => {
      viewport.scrollTop = typeof options === 'number' ? (top ?? 0) : (options?.top ?? 0);
      viewport.dispatchEvent(new Event('scroll'));
    };
    expect(viewport).not.toBeNull();
    expect(container.querySelector('ore-select')).toBeNull();
    expect(container.querySelectorAll('.hunt-timeline__events li').length).toBeLessThan(40);
    viewport.scrollTop = 12_000;
    viewport.dispatchEvent(new Event('scroll'));
    await vi.waitFor(() =>
      expect(
        Number(container.querySelector('.hunt-timeline__events li')?.getAttribute('aria-posinset')),
      ).toBeGreaterThan(100),
    );
    expect(container.querySelectorAll('.hunt-timeline__events li').length).toBeLessThan(40);
    expect(container.querySelector('.hunt-timeline__events li')?.getAttribute('aria-setsize')).toBe('240');
    container
      .querySelector('.hunt-timeline__event')!
      .dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'End' }));
    await vi.waitFor(() =>
      expect(container.querySelector('.hunt-timeline__selection')?.textContent).toContain('Daeron healed 1'),
    );
    await vi.waitFor(() => expect(container.querySelector('[data-vz-key="240"]')).not.toBeNull());
  });

  it('links selected events to the progression chart and disposes its drawing handle', async () => {
    const container = await mountTimeline(makeRecord(2));
    expect(vi.mocked(createLineChart).mock.calls[0]?.[1].series.map((series) => series.name)).toEqual([
      'Remaining party health',
      'Net damage dealt to monster',
      'Stance change',
      'Confirmed wound',
      'Unleash',
      'Knockout',
      'Mastery focused',
    ]);
    container.querySelector<HTMLButtonElement>('.hunt-timeline__event')!.click();
    await nextTick();
    expect(container.querySelector('.hunt-timeline__selection')?.textContent).toContain('Daeron received 1 damage');
    const handle = vi.mocked(createLineChart).mock.results[0]!.value;
    expect(handle.update).toHaveBeenCalled();
    mounted.pop()!.unmount();
    expect(handle.dispose).toHaveBeenCalledOnce();
  });
});

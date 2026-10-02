// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp, defineComponent, h, nextTick } from 'vue';
import { finalBattle, monsterById, questId, TOTAL_CHAPTERS } from '../../../../content';
import { narrativeAvailable } from '../../../../content/lore';
import { activateQuest, createCampaign } from '../../../../domain/campaign';
import { startSubjectHuntTimer } from '../../../../domain/hunt-timer';
import { finishHunt } from '../../../../domain/scoring';
import type { Campaign } from '../../../../domain/types';
import ResultPhase from './ResultPhase.vue';
import type { DashboardModel } from './use-dashboard';

// The audio composable touches `window.matchMedia` at module scope; LoreEntry only needs `pauseMusic`.
vi.mock('../../../composables/use-youtube-audio', () => ({ pauseMusic: vi.fn() }));

const NOW = '2026-01-01T00:00:00.000Z';

/** The campaign as the domain leaves it once the Awakening is won: every chapter resolved. */
function wonFinalCampaign(): Campaign {
  const created = createCampaign({
    config: { expansionIds: ['core'], name: 'Crimson Forest', nightmareVariant: false, variants: [] },
    hunterIds: ['daeron', 'mirah'],
    id: 'c1',
    now: NOW,
  });
  const finalQuest: Campaign = {
    ...activateQuest(created, questId(1), NOW),
    activeQuestId: null,
    chapter: TOTAL_CHAPTERS,
    phase: 'hunt',
    resolvedChapter: TOTAL_CHAPTERS,
  };
  const hunting: Campaign = { ...startSubjectHuntTimer(finalQuest, NOW), phase: 'hunt' };
  return finishHunt(hunting, 'victory', [], NOW);
}

/** The dashboard surface the completed screen reads; the phases beyond the result are not reached. */
function finalDashboard(campaign: Campaign): DashboardModel {
  const passages = finalBattle.lore.conclusions.filter((passage) =>
    narrativeAvailable(passage.condition, TOTAL_CHAPTERS, campaign.achievements),
  );
  return {
    campaign,
    finalBattle,
    finalConclusion: {
      excerpt: passages.find((passage) => passage.condition)?.summary ?? passages[0]?.summary ?? finalBattle.conclusion,
      paragraphs: passages.flatMap((passage) => passage.paragraphs),
    },
    finalEnding: campaign.achievements.includes('The Voice of Woltyar')
      ? finalBattle.endings.rebirth
      : finalBattle.endings.dawn,
    finalHunterRank: 'Commander',
    finalHunterScore: 110,
    isFinalBattle: true,
    trialCampaignOver: false,
  } as unknown as DashboardModel;
}

const mounted: Array<ReturnType<typeof createApp>> = [];

afterEach(() => {
  for (const app of mounted) app.unmount();
  vi.unstubAllGlobals();
  mounted.length = 0;
});

function mountPhase(dashboard: DashboardModel): HTMLElement {
  const container = document.createElement('div');

  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    },
  );
  vi.stubGlobal('matchMedia', () => ({ matches: false }));

  const app = createApp({ render: () => h(ResultPhase, { dashboard }) });

  for (const tag of [
    'ore-accordion',
    'ore-accordion-item',
    'ore-badge',
    'ore-button',
    'ore-card',
    'ore-chip',
    'ore-dialog',
    'ore-icon',
    'ore-qr-code',
    'ore-text',
    'ore-textarea',
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

describe('ResultPhase', () => {
  it('opens the share dialog from the campaign-complete dock', async () => {
    const campaign = wonFinalCampaign();
    expect(campaign.finalBattleWon).toBe(true);
    const container = mountPhase(finalDashboard(campaign));
    await settle();

    expect(container.textContent).toContain('The Awakened is defeated');
    expect(container.querySelector('ore-dialog[open="true"]')).toBeNull();

    const share = [...container.querySelectorAll<HTMLElement>('.phase-dock__actions ore-button')].find((button) =>
      button.textContent?.includes('Share this victory'),
    );
    if (!share) throw new Error('the campaign-complete share button is not rendered');
    share.click();
    await settle();

    const dialog = container.querySelector('ore-dialog[open="true"]');
    expect(dialog).not.toBeNull();
    expect(dialog?.textContent).toContain('Crimson Forest');
    expect(dialog?.textContent).toContain('Copy code');
  });

  it('lists every campaign trophy as the banner’s portrait row', async () => {
    const campaign = { ...wonFinalCampaign(), trophies: ['vyraxen', 'felaxir', 'xitheros'] };
    const container = mountPhase(finalDashboard(campaign));
    await settle();

    const row = container.querySelector('.result-banner__trophies');
    if (!row) throw new Error('the trophy row is not rendered');
    const portraits = [...row.querySelectorAll('img')];
    expect(portraits).toHaveLength(3);
    for (const id of ['vyraxen', 'felaxir', 'xitheros']) {
      const icon = monsterById(id)?.trophyIcon ?? '';
      expect(portraits.some((img) => img.getAttribute('src')?.endsWith(icon))).toBe(true);
    }
    // The row replaces the single emblem on a victory.
    expect(container.querySelector('.result-banner__emblem')).toBeNull();
  });

  it('shows the final score in the banner and the Nightmare ladder under it', async () => {
    const dashboard = finalDashboard(wonFinalCampaign());
    dashboard.finalHunterScore = 110;
    dashboard.finalHunterRank = 'Commander';
    const container = mountPhase(dashboard);
    await settle();

    const score = container.querySelector('.result-banner__score');
    expect(score?.textContent).toContain('Final score');
    expect(score?.textContent).toContain('110');

    const ranking = container.querySelector('.final-result__ranking');
    expect(ranking).not.toBeNull();
    expect(ranking?.textContent).toContain('Commander');
    const reached = ranking?.querySelector('.ranking__tier[aria-current="true"]');
    expect(reached?.textContent).toContain('Commander');
    // The ladder prints the Nightmare table as the detailed grid: one flavored cell per tier,
    // the colors rising with the heat from the cold Rookie row to the full-blood summit.
    expect(ranking?.querySelector('.ranking--grid')).not.toBeNull();
    expect(ranking?.querySelectorAll('.ranking__text')).toHaveLength(9);
    expect(ranking?.textContent).toContain('Pinnacle campaign score');
    const heat = (cell: Element | null | undefined) =>
      (cell as HTMLElement | null)?.style.getPropertyValue('--tier-heat');
    const cells = [...(ranking?.querySelectorAll('.ranking__tier') ?? [])];
    expect(heat(cells[0])).toBe('0%');
    expect(heat(reached)).toBe('37.5%');
    const apex = ranking?.querySelector('.ranking__tier--apex');
    expect(heat(apex)).toBe('100%');
    expect(apex?.textContent).toContain('Nightmare');
    // Every card carries its points as the foot badge, the reached tier's own value included.
    const badges = [...(ranking?.querySelectorAll('ore-badge') ?? [])];
    expect(badges).toHaveLength(9);
    expect(reached?.querySelector('ore-badge')?.textContent).toContain('100 points');
    expect(apex?.querySelector('ore-badge')?.textContent).toContain('330 points');
    // The Rookie row is the bounded catch-all: any value lower than 50.
    expect(cells[0]?.querySelector('ore-badge')?.textContent).toContain('<30');
    // The climbed card stays quiet: no check in its name, no delta subline under the flavor.
    expect(reached?.querySelector('ore-icon')).toBeNull();
    expect(reached?.textContent).not.toContain('more point');
    // The comparison ends the page: it follows the campaign's ending section, nothing after.
    expect(ranking?.previousElementSibling?.classList.contains('final-result__ending')).toBe(true);
  });
});

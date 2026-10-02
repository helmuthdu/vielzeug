import { computed } from 'vue';
import { t } from '../../app/i18n';
import type { RouteName } from '../../app/router';
import { ascents, campaigns, challenges, expeditions, type SubjectKind } from '../../app/store';
import { useReadable, useRouteName, useRouteParams } from '../../app/vue-bridge';
import type { Ascent, Campaign, Challenge, Expedition, SubjectRef } from '../../domain/types';

/**
 * Which subject kind each route renders: exhaustive, so a new route must classify itself
 * here instead of the kind being inferred from the route's name.
 */
const ROUTE_KINDS: Record<RouteName, SubjectKind | null> = {
  ascentCreate: null,
  ascentDeck: 'ascent',
  ascentDetail: 'ascent',
  ascentHunterBoard: 'ascent',
  ascentMonsterBoard: 'ascent',
  ascentPhase: 'ascent',
  buildEdit: null,
  builds: null,
  campaignCreate: null,
  campaignDashboard: 'campaign',
  campaignDeck: 'campaign',
  campaignForge: 'campaign',
  campaignHunterBoard: 'campaign',
  campaignLog: 'campaign',
  campaignMonsterBoard: 'campaign',
  campaignPhase: 'campaign',
  campaigns: null,
  challengeCreate: null,
  challengeDeck: 'challenge',
  challengeDetail: 'challenge',
  challengeHunterBoard: 'challenge',
  challengeMonsterBoard: 'challenge',
  challengePhase: 'challenge',
  chronicles: null,
  expeditionCreate: null,
  expeditionDeck: 'expedition',
  expeditionDetail: 'expedition',
  expeditionHunterBoard: 'expedition',
  expeditionMonsterBoard: 'expedition',
  expeditions: null,
  forge: null,
  home: null,
  loadoutImport: null,
  manual: null,
  newGame: null,
  onlineBuild: null,
  privacy: null,
  sessionJoin: null,
  settings: null,
  victoryImport: null,
};

/** The detail page behind a board: where its back button goes. */
const DETAIL_ROUTES: Record<SubjectKind, RouteName> = {
  ascent: 'ascentDetail',
  campaign: 'campaignDashboard',
  challenge: 'challengeDetail',
  expedition: 'expeditionDetail',
};

const HUNTER_BOARD_ROUTES: Record<SubjectKind, RouteName> = {
  ascent: 'ascentHunterBoard',
  campaign: 'campaignHunterBoard',
  challenge: 'challengeHunterBoard',
  expedition: 'expeditionHunterBoard',
};

const MONSTER_BOARD_ROUTES: Record<SubjectKind, RouteName> = {
  ascent: 'ascentMonsterBoard',
  campaign: 'campaignMonsterBoard',
  challenge: 'challengeMonsterBoard',
  expedition: 'expeditionMonsterBoard',
};

/**
 * The board views' shared subject resolution: find the routed entity from its kind's signal,
 * compute lock state and board route names, and expose the SubjectRef the store's runCommand
 * expects. Both board views (hunter and monster) route through this: one code path for all
 * four modes.
 */
export function useSubject() {
  const params = useRouteParams();
  const routeName = useRouteName();
  const kind = computed<SubjectKind | null>(() => (routeName.value ? ROUTE_KINDS[routeName.value] : null));
  const isCampaign = computed(() => kind.value === 'campaign');
  const isAscent = computed(() => kind.value === 'ascent');

  const allAscents = useReadable(ascents);
  const allCampaigns = useReadable(campaigns);
  const allChallenges = useReadable(challenges);
  const allExpeditions = useReadable(expeditions);
  const campaign = computed<Campaign | undefined>(() =>
    kind.value === 'campaign' ? allCampaigns.value.find((entry) => entry.id === params.value.id) : undefined,
  );
  const ascent = computed<Ascent | undefined>(() =>
    kind.value === 'ascent' ? allAscents.value.find((entry) => entry.id === params.value.id) : undefined,
  );
  const challenge = computed<Challenge | undefined>(() =>
    kind.value === 'challenge' ? allChallenges.value.find((entry) => entry.id === params.value.id) : undefined,
  );
  const expedition = computed<Expedition | undefined>(() =>
    kind.value === 'expedition' ? allExpeditions.value.find((entry) => entry.id === params.value.id) : undefined,
  );
  const entity = computed<Campaign | Ascent | Challenge | Expedition | undefined>(() =>
    kind.value === 'campaign'
      ? campaign.value
      : kind.value === 'ascent'
        ? ascent.value
        : kind.value === 'challenge'
          ? challenge.value
          : expedition.value,
  );

  /**
   * Boards are editable only during the hunt (campaigns, ascents and challenges) or
   * before the result (expeditions).
   */
  const locked = computed(() =>
    kind.value === 'campaign'
      ? campaign.value?.phase !== 'hunt'
      : kind.value === 'ascent'
        ? ascent.value?.phase !== 'hunt'
        : kind.value === 'challenge'
          ? challenge.value?.phase !== 'hunt'
          : expedition.value?.status === 'played',
  );
  const lockReason = computed(() => (kind.value === 'expedition' ? t('boards.lockResult') : t('boards.lockHunt')));

  /** The detail page behind this board: where the back button goes. */
  const backRoute = computed<RouteName>(() => (kind.value ? DETAIL_ROUTES[kind.value] : 'home'));

  /** The hunter board for this subject: the counterpart of the monster board. */
  const hunterBoardRoute = computed<RouteName>(() => (kind.value ? HUNTER_BOARD_ROUTES[kind.value] : 'home'));

  /** The monster board for this subject: the counterpart of the hunter board. */
  const monsterBoardRoute = computed<RouteName>(() => (kind.value ? MONSTER_BOARD_ROUTES[kind.value] : 'home'));

  /** The SubjectRef the store's runCommand expects for this entity. */
  const subject = computed<SubjectRef | null>(() =>
    entity.value && kind.value ? { id: entity.value.id, kind: kind.value } : null,
  );

  return {
    ascent,
    backRoute,
    campaign,
    challenge,
    entity,
    expedition,
    hunterBoardRoute,
    isAscent,
    isCampaign,
    locked,
    lockReason,
    monsterBoardRoute,
    params,
    subject,
  };
}

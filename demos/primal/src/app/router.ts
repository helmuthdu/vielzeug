import { createHistoryForBase, createRouter } from '@vielzeug/wayfinder';

const base = import.meta.env.BASE_URL;

export const router = createRouter({
  // Deployed under /demos/primal/ on a static host, so deep links use the hash driver there.
  base,
  history: createHistoryForBase(base),
  routes: {
    ascentCreate: { path: '/new/ascent' },
    ascentDeck: { path: '/ascents/:id/hunters/:hunterId/deck' },
    ascentDetail: { path: '/ascents/:id' },
    ascentHunterBoard: { path: '/ascents/:id/hunters/:hunterId' },
    ascentMonsterBoard: { path: '/ascents/:id/monster' },
    // Phase routes: `/ascents/:id/:phase`. Wayfinder matches routes in key order, so this
    // param route must stay below the static ascent children (hunters, monster); the
    // hand-alphabetized key order keeps it there.
    ascentPhase: { path: '/ascents/:id/:phase' },
    buildEdit: { path: '/builds/:id' },
    builds: { path: '/builds' },
    campaignCreate: { path: '/new/campaign' },
    campaignDashboard: { path: '/campaigns/:id' },
    campaignDeck: { path: '/campaigns/:id/hunters/:hunterId/deck' },
    campaignForge: { path: '/campaigns/:id/forge' },
    campaignHunterBoard: { path: '/campaigns/:id/hunters/:hunterId' },
    campaignLog: { path: '/campaigns/:id/log' },
    campaignMonsterBoard: { path: '/campaigns/:id/monster' },
    // Phase routes: `/campaigns/:id/:phase`. Wayfinder matches routes in key order, so this
    // param route must stay below the static campaign children (forge, log, monster); the
    // hand-alphabetized key order keeps it there.
    campaignPhase: { path: '/campaigns/:id/:phase' },
    campaigns: { path: '/campaigns' },
    challengeCreate: { path: '/new/challenge' },
    challengeDeck: { path: '/challenges/:id/hunters/:hunterId/deck' },
    challengeDetail: { path: '/challenges/:id' },
    challengeHunterBoard: { path: '/challenges/:id/hunters/:hunterId' },
    challengeMonsterBoard: { path: '/challenges/:id/monster' },
    // Phase routes: `/challenges/:id/:phase`. Wayfinder matches routes in key order, so
    // this param route must stay below the static run children (hunters, monster); the
    // hand-alphabetized key order keeps it there.
    challengePhase: { path: '/challenges/:id/:phase' },
    chronicles: { path: '/chronicles' },
    expeditionCreate: { path: '/new/expedition' },
    expeditionDeck: { path: '/expeditions/:id/hunters/:hunterId/deck' },
    expeditionDetail: { path: '/expeditions/:id' },
    expeditionHunterBoard: { path: '/expeditions/:id/hunters/:hunterId' },
    expeditionMonsterBoard: { path: '/expeditions/:id/monster' },
    expeditions: { path: '/expeditions' },
    forge: { path: '/forge' },
    home: { path: '/' },
    loadoutImport: { path: '/build/:code' },
    manual: { path: '/manual' },
    newGame: { path: '/new' },
    // Two segments, so `/builds/:id` (single-segment) can never shadow it.
    onlineBuild: { path: '/builds/online/:entry' },
    privacy: { path: '/privacy' },
    sessionJoin: { path: '/join/:code' },
    settings: { path: '/settings' },
    victoryImport: { path: '/victory/:code' },
  },
  // Route changes start from the top; hash targets (the skip link) keep their anchor scroll,
  // and a query-only update on the same page keeps the reader's place: the manual's live
  // search and reference jumps move the page themselves instead of resetting it.
  scroll: (to, from) =>
    to.location.hash ? 'preserve' : to.location.pathname === from.location.pathname ? 'preserve' : 'top',
  viewTransition: true,
});

export type AppRouter = typeof router;
export type RouteName = Parameters<AppRouter['url']>[0];

/** A named in-app destination, as consumed by `RouteLink` and `LinkButton`. */
export interface RouteTarget {
  params?: Record<string, string>;
  /** Query string entries; string values are rendered as-is. */
  query?: Record<string, string>;
  to: RouteName;
}

/** Builds an anchor href that works for both history drivers: plain paths locally, hash paths on the static host. */
export function href(name: RouteName, params?: Record<string, string>, query?: Record<string, string>): string {
  return router.href(name, params as never, query);
}

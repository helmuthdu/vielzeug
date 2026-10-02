<script lang="ts" setup>
import type { CookieBannerElement, CookieConsentRecord } from '@vielzeug/refine/cookie-banner';
import { type Component, computed, defineAsyncComponent, nextTick, onMounted, provide, ref, watch } from 'vue';
import { asset } from './app/assets';
import { useBoardFocus } from './app/board-focus';
import { consent, consentBannerOpen, saveConsent } from './app/consent';
import { bus, notify, pendingJoinCode, sessionDialogOpen } from './app/events';
import { type MessageKey, t } from './app/i18n';
import { narration } from './app/narration';
import { href, type RouteName } from './app/router';
import { navigate, useReadable, useRouteName, useRouteParams } from './app/vue-bridge';
import AudioPlayerBar from './ui/components/audio/AudioPlayerBar.vue';
import SidebarMusicPlayer from './ui/components/audio/SidebarMusicPlayer.vue';
import NarrationChip from './ui/components/NarrationChip.vue';
import PromoBanner from './ui/components/PromoBanner.vue';
import RouteLink from './ui/components/RouteLink.vue';
import { useYouTubeAudio } from './ui/composables/use-youtube-audio';
import MainMenuView from './ui/views/MainMenuView.vue';
import NotFoundView from './ui/views/NotFoundView.vue';

const { showPlayer } = useYouTubeAudio();

// Consent banner: opens on startup while no decision is stored (the signal
// seeds itself from localStorage), and `decide` persists through the consent
// store, which the YouTube composable watches to load or refuse the embed.
// Computed so the arrays keep identity across re-renders and only follow locale.
const consentRecord = useReadable(consent);
const consentBannerVisible = useReadable(consentBannerOpen);
const consentCategories = computed(() => [{ id: 'music', label: t('consent.musicLabel') }]);
const consentLabels = computed(() => ({
  acceptAll: t('consent.acceptAll'),
  essential: t('consent.essential'),
  essentialNote: t('consent.essentialNote'),
  heading: t('consent.heading'),
  reject: t('consent.reject'),
  save: t('consent.save'),
}));

function onConsentDecide(event: CustomEvent<{ consent: CookieConsentRecord }>): void {
  saveConsent(event.detail.consent);
}

// The banner is driven through its imperative API so focus management works:
// show() moves focus into the dialog and hide() restores it. The initial
// state sync runs after mount (the template ref exists then, still pre-paint).
const cookieBannerEl = ref<CookieBannerElement | null>(null);

onMounted(() => {
  if (!consentBannerVisible.value) cookieBannerEl.value?.hide();
});

watch(consentBannerVisible, (visible) => {
  if (visible) cookieBannerEl.value?.show();
  else cookieBannerEl.value?.hide();
});

// Every route view loads on demand so the first paint ships only the menu; the landing page
// and the 404 stay eager so the app always renders something, even offline on first visit.
const lazyView = (loader: () => Promise<{ default: Component }>) => defineAsyncComponent(loader);
const chroniclesView = lazyView(() => import('./ui/views/ChroniclesView.vue'));

const views = {
  ascentCreate: lazyView(() => import('./ui/views/ascent/AscentCreateView.vue')),
  ascentDeck: lazyView(() => import('./ui/views/deck/DeckBuilderView.vue')),
  ascentDetail: lazyView(() => import('./ui/views/ascent/AscentDetailView.vue')),
  ascentHunterBoard: lazyView(() => import('./ui/views/hunter-board/HunterBoardView.vue')),
  ascentMonsterBoard: lazyView(() => import('./ui/views/monster-board/MonsterBoardView.vue')),
  ascentPhase: lazyView(() => import('./ui/views/ascent/AscentDetailView.vue')),
  buildEdit: lazyView(() => import('./ui/views/builds/BuildEditorView.vue')),
  builds: lazyView(() => import('./ui/views/builds/BuildsView.vue')),
  campaignCreate: lazyView(() => import('./ui/views/campaign/CampaignCreateView.vue')),
  campaignDashboard: lazyView(() => import('./ui/views/campaign/CampaignDashboardView.vue')),
  campaignDeck: lazyView(() => import('./ui/views/deck/DeckBuilderView.vue')),
  campaignForge: lazyView(() => import('./ui/views/forge/ForgeView.vue')),
  campaignHunterBoard: lazyView(() => import('./ui/views/hunter-board/HunterBoardView.vue')),
  campaignLog: lazyView(() => import('./ui/views/campaign/CampaignLogView.vue')),
  campaignMonsterBoard: lazyView(() => import('./ui/views/monster-board/MonsterBoardView.vue')),
  campaignPhase: lazyView(() => import('./ui/views/campaign/CampaignDashboardView.vue')),
  campaigns: lazyView(() => import('./ui/views/campaign/CampaignsView.vue')),
  challengeCreate: lazyView(() => import('./ui/views/challenge/ChallengeCreateView.vue')),
  challengeDeck: lazyView(() => import('./ui/views/deck/DeckBuilderView.vue')),
  challengeDetail: lazyView(() => import('./ui/views/challenge/ChallengeDetailView.vue')),
  challengeHunterBoard: lazyView(() => import('./ui/views/hunter-board/HunterBoardView.vue')),
  challengeMonsterBoard: lazyView(() => import('./ui/views/monster-board/MonsterBoardView.vue')),
  challengePhase: lazyView(() => import('./ui/views/challenge/ChallengeDetailView.vue')),
  expeditionCreate: lazyView(() => import('./ui/views/expedition/ExpeditionCreateView.vue')),
  expeditionDeck: lazyView(() => import('./ui/views/deck/DeckBuilderView.vue')),
  expeditionDetail: lazyView(() => import('./ui/views/expedition/ExpeditionDetailView.vue')),
  expeditionHunterBoard: lazyView(() => import('./ui/views/hunter-board/HunterBoardView.vue')),
  expeditionMonsterBoard: lazyView(() => import('./ui/views/monster-board/MonsterBoardView.vue')),
  expeditions: lazyView(() => import('./ui/views/expedition/ExpeditionsView.vue')),
  forge: lazyView(() => import('./ui/views/forge/ForgeView.vue')),
  home: MainMenuView,
  loadoutImport: lazyView(() => import('./ui/views/builds/LoadoutImportView.vue')),
  manual: lazyView(() => import('./ui/views/ManualView.vue')),
  newGame: lazyView(() => import('./ui/views/NewGameView.vue')),
  onlineBuild: lazyView(() => import('./ui/views/builds/OnlineBuildDetailView.vue')),
  privacy: lazyView(() => import('./ui/views/PrivacyView.vue')),
  sessionJoin: MainMenuView,
  settings: lazyView(() => import('./ui/views/SettingsView.vue')),
  victoryImport: lazyView(() => import('./ui/views/VictoryImportView.vue')),
};

const nav: { icon: string; key: MessageKey; to: RouteName }[] = [
  { icon: 'swords', key: 'nav.campaigns', to: 'campaigns' },
  { icon: 'compass', key: 'nav.expeditions', to: 'expeditions' },
  { icon: 'layers', key: 'nav.builds', to: 'builds' },
  { icon: 'flame', key: 'nav.crafting', to: 'forge' },
  { icon: 'scroll', key: 'nav.chronicles', to: 'chronicles' },
  { icon: 'book-open', key: 'nav.manual', to: 'manual' },
  { icon: 'settings', key: 'nav.settings', to: 'settings' },
];

const routeName = useRouteName();
const routeParams = useRouteParams();
const mobileSidebarEl = ref<HTMLElement & { closeDrawer?: () => void } | null>(null);
const isSidebarOpen = ref(false);

// Deep link: /join/:code — hand the code to the join handoff (a plain signal in events,
// so the boot path never pulls the peer-to-peer plumbing), open the session dialog on
// the join flow, and land on the menu.
watch(
  routeName,
  (name) => {
    isSidebarOpen.value = false;
    const code = routeParams.value.code;
    if (name === 'sessionJoin' && typeof code === 'string' && code) {
      pendingJoinCode.update(() => code);
      sessionDialogOpen.update(() => true);
      void navigate('home', undefined, undefined, { replace: true });
    }
  },
  { immediate: true },
);

// The dialog only loads when opened from a game or the menu, keeping the
// peer-to-peer plumbing off the boot path.
const sessionDialogVisible = useReadable(sessionDialogOpen);
const narrationActive = useReadable(narration);
const MultiplayerDialog = defineAsyncComponent(() => import('./ui/components/MultiplayerDialog.vue'));

// Route changes unmount the focused element (e.g. a dialog trigger); move focus to the new
// page's content so keyboards and screen readers land somewhere meaningful, not on <body>.
// preventScroll keeps focus from fighting the router's scroll decision.
watch(routeName, async (_, previous) => {
  if (!previous) return;
  await nextTick();
  document.getElementById('main')?.focus({ preventScroll: true });
});
const view = computed(() => {
  const name = routeName.value;
  if (name === 'chronicles') return chroniclesView;
  return name ? views[name] : NotFoundView;
});
const isHome = computed(() => routeName.value === 'home');
// The fight boards are full-screen game surfaces — no global chrome.
const BOARD_ROUTES: ReadonlySet<RouteName> = new Set([
  'ascentHunterBoard',
  'ascentMonsterBoard',
  'campaignHunterBoard',
  'campaignMonsterBoard',
  'challengeHunterBoard',
  'challengeMonsterBoard',
  'expeditionHunterBoard',
  'expeditionMonsterBoard',
]);
const isBoard = computed(() => routeName.value !== null && BOARD_ROUTES.has(routeName.value));
const { fullscreen, toggleFullscreen } = useBoardFocus(isBoard);
provide('boardFullscreen', { fullscreen, toggleFullscreen });
const activeNav = computed<RouteName | undefined>(() => {
  if (
    routeName.value === 'campaignCreate' ||
    routeName.value === 'campaignDashboard' ||
    routeName.value === 'campaignDeck' ||
    routeName.value === 'campaignPhase' ||
    routeName.value === 'campaignLog' ||
    routeName.value === 'ascentCreate' ||
    routeName.value === 'ascentDeck' ||
    routeName.value === 'ascentDetail'
  )
    return 'campaigns';
  if (routeName.value === 'campaignForge') return 'forge';
  if (
    routeName.value === 'expeditionCreate' ||
    routeName.value === 'expeditionDeck' ||
    routeName.value === 'expeditionDetail'
  )
    return 'expeditions';
  if (
    routeName.value === 'challengeCreate' ||
    routeName.value === 'challengeDeck' ||
    routeName.value === 'challengeDetail' ||
    routeName.value === 'challengePhase'
  )
    return 'campaigns';
  if (routeName.value === 'buildEdit' || routeName.value === 'loadoutImport') return 'builds';
  return routeName.value ?? undefined;
});

function closeSidebar(): void {
  isSidebarOpen.value = false;
  mobileSidebarEl.value?.closeDrawer?.();
}

function onDrawerChange(event: Event): void {
  const custom = event as CustomEvent<{ open: boolean }>;
  if (custom.detail) {
    isSidebarOpen.value = custom.detail.open;
  }
}

function openNav(event: MouseEvent, to: RouteName): void {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  closeSidebar();
  void navigate(to);
}

bus.on('session:ended', () => {
  notify('app.sessionEnded', 'warning');
  void navigate('home');
});
</script>

<template>
  <a class="skip-link" href="#main">{{ t('app.skipToContent') }}</a>
  <div class="app-layout" :class="{ 'app-layout--shifted': isSidebarOpen && !isBoard }">
    <ore-navbar breakpoint="(max-width: 640px)" class="topbar" menu-close-icon="panel-left-close"
      menu-icon="panel-left-open" mobile-sidebar="#mobile-sidebar" sticky v-if="!isBoard"
      :class="{ 'topbar--home': isHome }" :elevation="0" :label="t('nav.label')">
      <RouteLink class="topbar__brand" slot="logo" to="home" v-if="!isHome" :aria-label="t('app.brandLabel')">
        <img alt="" height="32" width="132" :src="asset('/primal_logo.svg')"
          :style="{ '--logo': `url(${asset('/primal_logo.svg')})` }" />
      </RouteLink>
      <ore-navbar-item class="topbar__link" slot="end" v-for="item in nav" :key="item.to"
        :active="activeNav === item.to || undefined" :aria-label="t(item.key)" :href="href(item.to)"
        :title="t(item.key)" @click="openNav($event, item.to)">
        <ore-icon size="16" slot="icon" :name="item.icon" />
        <span class="topbar__label">{{ t(item.key) }}</span>
      </ore-navbar-item>
      <ore-navbar-item class="topbar__audio" slot="end" :aria-label="t('nav.audioPlayer')" :title="t('nav.audioPlayer')"
        @click="showPlayer">
        <ore-icon name="headphones" size="18" slot="icon" />
      </ore-navbar-item>
    </ore-navbar>
    <main class="view" id="main" tabindex="-1" :class="{ 'view--board': isBoard, 'view--home': isHome }">
      <component :is="view" :key="routeName === 'sessionJoin' ? 'home' : routeName" />
      <section class="video-area">
        <div class="video-area__promos"></div>
        <section id="video-player-mount"></section>
      </section>
    </main>
  </div>

  <!-- Desktop corner stack: PromoBanner teleports its cards here, and
       use-youtube-audio.ts docks the video window below them (fine pointers). -->
  <div
    id="corner-dock"
    :class="{ 'corner-dock--board': isBoard, 'corner-dock--chronicles': routeName === 'chronicles' }"></div>
  <PromoBanner v-if="!isBoard" />
  <ore-sidebar bottom-nav-at="(max-width: 640px)" class="mobile-sidebar" close-on-select id="mobile-sidebar"
    v-if="!isBoard" ref="mobileSidebarEl" :label="t('nav.label')" @drawer-change="onDrawerChange">
    <div class="mobile-sidebar__header" slot="header">
      <RouteLink class="mobile-sidebar__brand" to="home" :aria-label="t('app.brandLabel')" @click="closeSidebar">
        <img alt="" height="32" width="132" :src="asset('/primal_logo.svg')"
          :style="{ '--logo': `url(${asset('/primal_logo.svg')})` }" />
      </RouteLink>
    </div>
    <ore-sidebar-item class="mobile-sidebar__item" v-for="item in nav" :key="`sidebar-${item.to}`"
      :active="activeNav === item.to || undefined" :href="href(item.to)" @click="openNav($event, item.to)">
      <ore-icon size="18" slot="icon" :name="item.icon" />
      {{ t(item.key) }}
    </ore-sidebar-item>
    <div slot="footer">
      <SidebarMusicPlayer />
    </div>
  </ore-sidebar>

  <!-- The narration takes the media slot while it speaks — the music bar conceals and
       pauses for it (see LoreEntry), and the chip's stop never scrolls out of reach. -->
  <NarrationChip v-if="narrationActive && !isSidebarOpen && !isBoard" />

  <!-- Concealed while the sidebar's mini player is visible, and while the chronicler
       speaks — the app's one voice hands the media slot to whichever is active. -->
  <AudioPlayerBar :concealed="(isSidebarOpen || narrationActive !== null) && !isBoard" />

  <!-- The global session surface — mounted on demand, reachable from every route. -->
  <MultiplayerDialog v-if="sessionDialogVisible" />

  <ore-cookie-banner ref="cookieBannerEl" :categories.prop="consentCategories" :consent.prop="consentRecord"
    :labels.prop="consentLabels" @decide="onConsentDecide">
    {{ t('consent.body') }}
    <RouteLink class="privacy-link" to="privacy">{{ t('consent.privacyLink') }}</RouteLink>
  </ore-cookie-banner>
</template>

<style scoped>
.skip-link {
  position: absolute;
  top: calc(var(--size-24) * -1);
  left: var(--size-4);
  z-index: var(--z-dropdown);
  padding: var(--size-2) var(--size-4);
  color: var(--color-primary-contrast);
  background: var(--p-gold);
}

/* The banner's shadow-DOM ::slotted(a) underline loses to this document's global
   `a { text-decoration: none }` reset (document rules outrank ::slotted), so the
   privacy link restates it here to stay distinguishable inside the policy text. */
.privacy-link {
  text-decoration: underline;
}

.skip-link:focus {
  top: var(--size-2);
}

.topbar {
  --navbar-backdrop-filter: blur(var(--blur-sm));
  --navbar-bg: color-mix(in oklch, var(--p-canvas) 92%, transparent);
  --navbar-border-color: var(--p-line);
  --navbar-height: var(--size-14);
  --navbar-shadow: var(--shadow-none);
  --navbar-width: var(--p-frame-w);
}

.topbar::part(bar) {
  padding-block: 0;
  padding-inline: max(var(--size-4), calc((var(--size-screen-width) - 1240px) / 2));
}

.topbar::part(mobile-toggle) {
  width: var(--size-11);
  height: var(--size-11);
}

.topbar--home {
  --navbar-backdrop-filter: none;
  --navbar-bg: var(--p-canvas);
}

.topbar--home::part(end) {
  margin-inline: auto;
}

.topbar__brand,
.mobile-sidebar__brand {
  display: grid;
  place-items: center;
  min-width: var(--size-11);
  min-height: var(--size-11);
}

.topbar__brand {
  transition: opacity var(--transition-fast);
}

.topbar__brand img,
.mobile-sidebar__brand img {
  width: auto;
  height: var(--size-6);
  filter: grayscale(1) contrast(1.35);
}

.topbar__link {
  --navbar-item-active-bg: transparent;
  --navbar-item-active-color: var(--p-gold);
  --navbar-item-color: var(--p-text-muted);
  --navbar-item-hover-bg: transparent;
  --navbar-item-hover-color: var(--p-gold);
  font-family: var(--font-serif);
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  text-transform: uppercase;
  letter-spacing: var(--p-tracking);
}

.topbar__link::part(item) {
  gap: var(--size-1-5);
  min-height: var(--size-11);
  padding: var(--size-2) var(--size-3);
  border-bottom: var(--border-2) solid transparent;
  border-radius: var(--rounded-none);
}

.topbar ore-navbar-item::part(item):hover:not(:focus-visible) {
  outline: none;
}

.topbar__link::part(item-icon) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

/* Desktop: clean typography-first navigation without icons across all pages (including home) */
.topbar .topbar__link:not([slot="mobile-menu"])::part(item-icon) {
  display: none;
}

.topbar__link[active]::part(item) {
  border-bottom-color: var(--p-gold);
}

/* Audio trigger: icon-only, separated from the nav links, sits at the far right. */
.topbar__audio {
  --navbar-item-color: var(--p-text-muted);
  --navbar-item-hover-bg: transparent;
  --navbar-item-hover-color: var(--p-gold);
}

.topbar__audio::part(item) {
  gap: 0;
  min-height: var(--size-11);
  padding: var(--size-2);
  border-bottom: var(--border-2) solid transparent;
  border-radius: var(--rounded-sm);
}

.topbar--home .topbar__link[active]::part(item) {
  border-bottom-color: transparent;
}

.app-layout {
  min-height: var(--size-screen-height);
  transition: transform var(--transition-normal);
  will-change: transform;
}

.view {
  padding-block: var(--size-7) var(--size-16);
  outline: none;
}

.view--home {
  height: calc(var(--size-screen-height) - var(--navbar-height, var(--size-14)));
  max-height: calc(var(--size-screen-height) - var(--navbar-height, var(--size-14)));
  padding: 0;
  overflow: hidden;
}

.view--board {
  padding: 0;
}

/* Tablet / compact screens: switch horizontal navbar items to icon-only buttons across all pages (including home) */
@media (640px <=width < 1080px) {
  .topbar .topbar__link:not([slot="mobile-menu"])::part(item-icon) {
    display: inline-flex;
  }

  .topbar .topbar__link:not([slot="mobile-menu"]) .topbar__label {
    display: none;
  }

  .topbar .topbar__link:not([slot="mobile-menu"])::part(item-label) {
    display: none;
  }

  .topbar .topbar__link:not([slot="mobile-menu"])::part(item) {
    gap: 0;
    align-items: center;
    justify-content: center;
    width: var(--size-11);
    min-width: var(--size-11);
    padding: 0;
    border-top: var(--border-2) solid transparent;
  }
}

@media (width < 640px) {
  .topbar::part(bar) {
    position: relative;
    justify-content: flex-start;
  }

  .topbar::part(logo) {
    position: absolute;
    inset-inline: 0;
    z-index: var(--z-base);
    width: fit-content;
    margin-inline: auto;
    pointer-events: auto;
  }

  .topbar::part(mobile-toggle) {
    position: relative;
    z-index: calc(var(--z-base) + 1);
  }

  .topbar__link {
    font-size: var(--text-sm);
  }

  .topbar__link::part(item) {
    gap: var(--size-2-5);
    width: var(--size-full);
  }

  .app-layout--shifted {
    transform: translateX(calc(min(var(--size-72), 80vw)));
  }

  .app-layout--shifted :deep(.topbar__brand) {
    pointer-events: none;
    opacity: 0;
  }
}

.mobile-sidebar {
  --sidebar-bg: var(--p-canvas);
  --sidebar-header-height: var(--size-14);
  --sidebar-header-padding: var(--size-2) var(--size-4);
  --sidebar-panel-blur: var(--blur-md);
  --sidebar-border-color: var(--p-line);
  --sidebar-item-active-color: var(--p-gold);
  --sidebar-item-active-bg: color-mix(in oklch, var(--p-gold) 15%, transparent);
  --sidebar-item-color: var(--p-text-muted);
  --sidebar-item-hover-color: var(--p-gold);
  --sidebar-item-hover-bg: color-mix(in oklch, var(--p-gold) 10%, transparent);
  --sidebar-width: min(var(--size-72), 80vw);
  --sidebar-z-index: var(--z-sticky);
}

.mobile-sidebar::part(bottom-bar) {
  display: none;
}

/* The phone sidebar hides its bottom bar, but the host still reserves the fixed strip at
   the viewport foot: let pointers pass through it (it sat invisibly over the phase dock,
   stealing its taps) and re-arm only the drawer's own surfaces. */
.mobile-sidebar {
  pointer-events: none;
}

.mobile-sidebar::part(drawer-backdrop),
.mobile-sidebar::part(nav) {
  pointer-events: auto;
}

.mobile-sidebar__header {
  display: flex;
  align-items: center;
  padding: var(--size-1) var(--size-2);
}

.mobile-sidebar__item {
  font-family: var(--font-serif);
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  text-transform: uppercase;
  letter-spacing: var(--p-tracking);
}

@media (width >=640px) {
  .mobile-sidebar {
    display: none;
  }
}

/* Below the bottom-nav breakpoint the consent banner docks above the nav
   instead of covering it — the nav stays visible and usable beneath it. */
@media (width < 640px) {
  #corner-dock.corner-dock--chronicles {
    display: none;
  }

  ore-cookie-banner {
    --cookie-banner-inset: calc(var(--sidebar-bottom-nav-height, 3.75rem) + var(--size-2));
  }
}

/* ── The corner stack and the in-page video area ─────────────────────────────

   The music video window and the promo cards share one geometry system:
   fine pointers stack them in the fixed #corner-dock under the topbar (promo
   above the video window); touch devices lay both out in the page-flow
   .video-area at the end of the content. The video wrapper is parked by
   use-youtube-audio.ts, which also toggles .has-video on the area; the
   PromoBanner toggles .has-promos. */

#corner-dock {
  position: fixed;
  /* Clears the sticky topbar — the navbar height var lives on the topbar
     subtree, so this reads its token fallback (56px). */
  top: calc(var(--navbar-height, var(--size-14)) + var(--size-4));
  left: var(--size-4);
  z-index: 80;
  display: flex;
  flex-direction: column;
  gap: var(--size-2);
  width: 280px;
}

/* The fight boards are fullscreen surfaces without the topbar — the stack
   anchors to the bare corner there. */
#corner-dock.corner-dock--board {
  top: var(--size-4);
}

#corner-dock.corner-dock--chronicles {
  right: var(--size-4);
  left: auto;
}

/* Touch: the dock's fixed corner belongs to no one — video and promos are
   in-page instead. */
@media (pointer: coarse) {
  #corner-dock {
    display: none;
  }
}

.video-area {
  display: none;
}

@media (pointer: coarse) {
  .video-area {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: var(--size-2);
    align-items: start;
    width: calc(100% - 2rem);
    margin: var(--size-4) auto;
  }

  .video-area__promos {
    display: grid;
    gap: var(--size-2);
  }

  /* Nothing to show (no consent, everything dismissed): no dead band. */
  .video-area:not(.has-promos):not(.has-video) {
    display: none;
  }
}

/* Tablet: promo and video share the row as equal columns — equal width gives
   both windows the same height (identical frames around 16:9 content). With
   no video to pair with, the capped promo column centers alone; with no
   promo, the video keeps its full-width strip. */
@media (pointer: coarse) and (width >=640px) {
  .video-area.has-promos.has-video {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .video-area.has-promos:not(.has-video) {
    grid-template-columns: minmax(0, 24rem);
    justify-content: center;
  }
}

/* Tablet home only: the menu stage owns the full viewport and clips the content
   end, so the in-page strip would be invisible — the items dock to the left
   edge under the topbar instead, mirroring the desktop corner stack. Fixed
   positioning escapes the stage's overflow clip because the area's containing
   block is the transformed app layout, which sits above the clipping main. */
@media (pointer: coarse) and (width >=640px) {

  .view--home .video-area,
  .view--home .video-area.has-promos.has-video,
  .view--home .video-area.has-promos:not(.has-video) {
    position: fixed;
    top: calc(var(--navbar-height, var(--size-14)) + var(--size-4));
    left: var(--size-4);
    z-index: 80;
    grid-template-columns: minmax(0, 1fr);
    width: 280px;
    margin: 0;
  }
}
</style>

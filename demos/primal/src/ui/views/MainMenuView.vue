<script lang="ts" setup>
import { computed, ref } from 'vue';
import { asset } from '../../app/assets';
import { sessionDialogOpen } from '../../app/events';
import { t } from '../../app/i18n';
import type { RouteName } from '../../app/router';
import { recentCampaigns } from '../../app/store';
import { useReadable } from '../../app/vue-bridge';
import LinkButton from '../components/LinkButton.vue';
import RouteLink from '../components/RouteLink.vue';

const campaigns = useReadable(recentCampaigns);
const latest = computed(() => campaigns.value[0]);

/** The menu card opens the global session surface. */
function openMultiplayer(): void {
  sessionDialogOpen.update(() => true);
}

const creditOpen = ref(false);

function onCreditOpenChange(event: Event): void {
  if (event.target !== event.currentTarget) return;
  if (!(event as CustomEvent<{ open: boolean }>).detail.open) creditOpen.value = false;
}

interface Ember {
  alpha: number;
  bottom: number;
  delay: number;
  duration: number;
  id: number;
  left: number;
  rise: number;
  size: number;
  sway: number;
  swayDelay: number;
  swayDuration: number;
}

/**
 * The ridge fire, randomized once per visit so no two arrivals show the same sparks.
 * Every third spark is a high flyer: it crosses the band between the ridge and the menu so
 * the atmosphere connects the illustration to the type instead of pooling at the bottom.
 */
const embers: Ember[] = Array.from({ length: 18 }, (_, id) => {
  const tall = id % 3 === 0;
  return {
    alpha: 0.35 + Math.random() * 0.3,
    bottom: 4 + Math.random() * 9,
    // Negative delays: the field is already in flight when the menu appears.
    delay: -Math.random() * 16,
    // High flyers get the extra seconds their longer climb needs.
    duration: 9 + Math.random() * 8 + (tall ? 5 : 0),
    id,
    left: 6 + Math.random() * 88,
    rise: (tall ? 48 : 26) + Math.random() * 18,
    size: 3 + Math.random() * 3,
    sway: 10 + Math.random() * 18,
    swayDelay: -Math.random() * 4,
    swayDuration: 3 + Math.random() * 3,
  };
});

interface Entry {
  hint: string;
  label: string;
  multiplayer?: boolean;
  params?: Record<string, string>;
  primary?: boolean;
  to?: RouteName;
}

type EntryKey = 'loadGame' | 'multiplayer' | 'newGame' | 'settings';

const entry = (key: EntryKey, extra?: Partial<Entry>): Entry => ({
  hint: t(`home.entries.${key}.hint`),
  label: t(`home.entries.${key}.label`),
  ...extra,
});
const entries = computed<Entry[]>(() => [
  entry('newGame', { primary: true, to: 'newGame' }),
  ...(latest.value
    ? [
        entry('loadGame', {
          hint: t('home.entries.loadGame.hint', { chapter: latest.value.chapter, name: latest.value.name }),
          params: { id: latest.value.id },
          to: 'campaignDashboard' as const,
        }),
      ]
    : []),
  entry('multiplayer', { multiplayer: true }),
  entry('settings', { to: 'settings' }),
]);
</script>

<template>
  <div class="menu">
    <div aria-hidden="true" class="menu__glow" />
    <div aria-hidden="true" class="menu__embers">
      <span
        class="menu__ember"
        v-for="ember in embers"
        :key="ember.id"
        :style="{
          '--ember-alpha': ember.alpha,
          '--ember-bottom': `${ember.bottom}%`,
          '--ember-delay': `${ember.delay}s`,
          '--ember-duration': `${ember.duration}s`,
          '--ember-left': `${ember.left}%`,
          '--ember-rise': `${ember.rise}dvh`,
        }">
        <span
          class="menu__spark"
          :style="{
            '--ember-alpha': ember.alpha,
            '--ember-size': `${ember.size}px`,
            '--ember-sway': `${ember.sway}px`,
            '--ember-sway-delay': `${ember.swayDelay}s`,
            '--ember-sway-duration': `${ember.swayDuration}s`,
          }" />
      </span>
    </div>
    <div class="menu__inner">
      <div class="menu__stack">
        <header class="menu__brand">
          <img
            alt="Primal: The Hunter's Journal"
            class="menu__logo"
            :src="asset('/primal_logo.svg')"
            :style="{ '--logo': `url(${asset('/primal_logo.svg')})` }" />
        </header>

        <nav class="menu__nav" :aria-label="t('home.menuLabel')">
          <template v-for="(entry, index) in entries" :key="entry.label">
            <ore-button
              class="menu__item"
              color="primary"
              fullwidth
              size="lg"
              variant="text"
              v-if="entry.multiplayer"
              :style="{ animationDelay: `${60 + index * 50}ms` }"
              @click="openMultiplayer">
              <span class="menu__content">
                <span class="menu__label">{{ entry.label }}</span>
                <span class="menu__hint">{{ entry.hint }}</span>
              </span>
            </ore-button>
            <LinkButton
              class="menu__item"
              color="primary"
              fullwidth
              size="lg"
              variant="text"
              v-else
              :class="{ 'menu__item--primary': entry.primary }"
              :params="entry.params"
              :style="{ animationDelay: `${60 + index * 50}ms` }"
              :to="entry.to!">
              <span class="menu__content">
                <span class="menu__label">{{ entry.label }}</span>
                <span class="menu__hint">{{ entry.hint }}</span>
              </span>
            </LinkButton>
          </template>
        </nav>
      </div>

      <div class="menu__stage">
        <img
          class="menu__hero"
          fetchpriority="high"
          :alt="t('home.heroAlt')"
          :src="asset('/backgrounds/bg_bottom_hero.svg')"
          :style="{ '--hero': `url(${asset('/backgrounds/bg_bottom_hero.svg')})` }" />
        <div class="menu__meta">
          <button class="menu__meta-link" type="button" @click="creditOpen = true">
            {{ t('home.credit.short') }}
          </button>
          <RouteLink class="menu__meta-link" to="privacy">{{ t('privacy.title') }}</RouteLink>
        </div>
      </div>
    </div>

    <ore-dialog
      backdrop="blur"
      size="sm"
      :label="t('home.credit.title')"
      :open="creditOpen"
      @open-change="onCreditOpenChange">
      <div class="credit">
        <ore-text color="muted" size="sm">{{ t('home.credit.notice') }}</ore-text>
        <a class="credit__link" href="https://reggiegames.com/" rel="noopener noreferrer" target="_blank">
          {{ t('home.credit.link') }}
          <ore-icon name="external-link" />
        </a>
      </div>
    </ore-dialog>
  </div>
</template>

<style scoped>
.menu {
  /* Warm horizon light behind the ridge; the silhouette stays dark and reads against this glow.
     The glow itself lives in .menu__glow so it can breathe; see below. */
  --hero-glow: light-dark(
    color-mix(in oklch, var(--color-primary) 14%, transparent),
    color-mix(in oklch, var(--color-primary) 22%, transparent)
  );
  --hero-glow-size: 58% 30%;
  --hero-glow-pos: 50% 74%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 100%;
  max-height: 100%;
  padding-block-start: clamp(var(--size-2), 3dvh, var(--size-6));
  padding-block-end: 0;
  padding-inline: var(--size-4);
  overflow: hidden;
  color: var(--p-text);
  background:
    radial-gradient(circle at 50% 34%, color-mix(in oklch, var(--p-panel-raised) 95%, transparent), transparent 42%),
    linear-gradient(180deg, var(--p-canvas) 0%, var(--p-panel) 58%, var(--p-ink) 100%);
}

/* Dark theme: the page stays dark: the only light in the scene is the book itself, glowing from
   inside the silhouette (see .menu__hero). No page glow, no halo around the figure. */
html[data-theme='dark'] .menu {
  --hero-glow: transparent;
}

.menu__inner {
  position: relative;
  z-index: 1;
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  width: min(58rem, 100%);
  height: 100%;
  min-height: 0;
  margin-inline: auto;
  overflow: hidden;
  text-align: center;
}

/* The horizon glow, lifted out of .menu's background so it can breathe like firelight.
   Dark theme's glow var is transparent, so the layer simply vanishes there. */
.menu__glow {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background: radial-gradient(var(--hero-glow-size) at var(--hero-glow-pos), var(--hero-glow), transparent 70%);
  /* Breathe around the glow's own centre, not the page's: the firelight swells in place. */
  transform-origin: var(--hero-glow-pos);
  animation: glow-breath 8s var(--p-ease) infinite alternate;
}

/* Sparks rise from the ridge, drifting past the hunter and fading as they climb.
   The rise animates the spark's parent (translate + opacity); the sway animates the
   spark itself, so one material idea stays compositor-only on both elements. */
.menu__embers {
  position: absolute;
  inset: 0;
  z-index: 2;
  overflow: hidden;
  pointer-events: none;
}

.menu__ember {
  position: absolute;
  inset-block-end: var(--ember-bottom);
  inset-inline-start: var(--ember-left);
  animation: ember-rise var(--ember-duration) linear infinite;
  animation-delay: var(--ember-delay);
}

.menu__spark {
  display: block;
  width: var(--ember-size);
  height: var(--ember-size);
  background: radial-gradient(
    circle,
    light-dark(var(--color-primary-dark), var(--color-primary-light)) 0%,
    light-dark(
        color-mix(in oklch, var(--color-primary-dark) 40%, transparent),
        color-mix(in oklch, var(--color-primary-light) 45%, transparent)
      )
      45%,
    transparent 75%
  );
  animation: ember-sway var(--ember-sway-duration) var(--p-ease) infinite alternate;
  animation-delay: var(--ember-sway-delay);
}

/* Logo and menu form one block, centred in the space above the hero. */
.menu__stack {
  display: grid;
  gap: clamp(var(--size-6), 6dvh, var(--size-12));
  align-content: center;
  justify-items: center;
  width: 100%;
  padding-block: var(--size-2);
  margin-block: auto;
}

.menu__brand {
  display: grid;
  justify-items: center;
  width: 100%;
}

.menu__logo {
  width: min(82vw, 23rem);
  filter: grayscale(1) contrast(1.35);
  animation: rise 700ms var(--p-ease) both;
}

.menu__nav {
  display: grid;
  gap: var(--size-0-5);
  width: min(22rem, 100%);
}

.menu__item {
  --button-padding: 0.45rem 1rem;
  --button-color: var(--p-text-muted);
  --button-radius: 0;
  min-height: 2.75rem;
  font-family: var(--font-serif);
  font-weight: 700;
  text-transform: uppercase;
  animation: rise 600ms var(--p-ease) both;
}

.menu__item--primary {
  --button-color: var(--p-text-strong);
}

.menu__content {
  display: grid;
  text-align: center;
}

.menu__label {
  font-size: 0.95rem;
  letter-spacing: 0.24em;
}

.menu__item--primary .menu__label::before,
.menu__item--primary .menu__label::after {
  display: inline-block;
  width: 2rem;
  height: 1px;
  margin: 0 0.8rem 0.28em;
  content: '';
  background: currentcolor;
  opacity: 0.55;
}

.menu__hint {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  white-space: nowrap;
  clip-path: inset(50%);
}

/* The ridge and the meta links share one stage: the row floats over the bottom of the
   silhouette so it costs no vertical space in the composition. */
.menu__stage {
  position: relative;
  display: grid;
  flex-shrink: 0;
  justify-items: center;
  width: 100%;
  margin-block-start: auto;
}

.menu__meta {
  position: absolute;
  inset-block-end: var(--size-2);
  inset-inline: 0;
  display: flex;
  flex-wrap: wrap;
  gap: var(--size-2);
  justify-content: center;
}

.menu__meta-link {
  width: max-content;
  padding: var(--size-0-5) var(--size-3);
  font: inherit;
  font-size: var(--text-xs);
  color: var(--color-primary-light);
  letter-spacing: 0.04em;
  text-decoration: none;
  cursor: pointer;
  background: light-dark(
    color-mix(in oklch, var(--p-text-strong) 85%, transparent),
    color-mix(in oklch, var(--p-canvas) 72%, transparent)
  );
  border: 0;
  border-radius: var(--rounded-full);
  opacity: 0.8;
  transition: opacity var(--transition-fast) var(--p-ease);
}

.menu__meta-link:hover,
.menu__meta-link:focus-visible {
  opacity: 1;
}

.menu__meta-link:focus-visible {
  outline: 2px solid var(--color-primary-light);
  outline-offset: var(--size-1);
}

.credit {
  display: grid;
  gap: var(--size-3);
}

.credit__link {
  display: inline-flex;
  gap: var(--size-1);
  align-items: center;
  justify-self: start;
  font-size: var(--text-sm);
  color: var(--color-primary);
}

/* The silhouette SVG is masked like the dark-mode logo: the artwork is pushed out of the box and a
   gradient shows through the shape. Light theme: the logo's own brown-to-black range on white.
   Dark theme (below): the logo's ramp continued: primary-light through primary and primary-darker
   across the figure, then falling into the page so mark and scene read as one painted system. */
.menu__hero {
  flex-shrink: 0;
  align-self: center;
  width: min(58rem, 100vw);
  max-width: none;
  max-height: 28dvh;
  object-fit: none;
  object-position: -9999em -9999em;
  background: linear-gradient(180deg, oklch(33% 0.045 55deg) 10%, oklch(17% 0.012 52deg) 72%);
  filter: drop-shadow(0 -10px 34px var(--hero-glow));
  -webkit-mask: var(--hero, none) center bottom / contain no-repeat;
  mask: var(--hero, none) center bottom / contain no-repeat;
  animation: rise 850ms 180ms var(--p-ease) both;
}

html[data-theme='dark'] .menu__hero {
  background: linear-gradient(180deg, var(--p-gold-dim) 0%, oklch(0% 0.012 52deg) 70%);
}

@media (width < 480px) {
  .menu__item--primary .menu__label::before,
  .menu__item--primary .menu__label::after {
    width: 1.25rem;
    margin-inline: 0.5rem;
  }
}

@keyframes rise {
  from {
    opacity: 0;
    transform: translateY(10px);
  }

  to {
    opacity: 1;
    transform: none;
  }
}

@keyframes glow-breath {
  from {
    opacity: 0.82;
    scale: 0.98;
  }

  to {
    opacity: 1;
    scale: 1.03;
  }
}

@keyframes ember-rise {
  0% {
    translate: 0 0;
    opacity: 0;
  }

  12% {
    opacity: var(--ember-alpha);
  }

  70% {
    opacity: var(--ember-alpha);
  }

  100% {
    translate: 0 calc(-1 * var(--ember-rise));
    opacity: 0;
  }
}

@keyframes ember-sway {
  from {
    translate: calc(-0.5 * var(--ember-sway)) 0;
  }

  to {
    translate: calc(0.5 * var(--ember-sway)) 0;
  }
}

/* The fire is decoration: under reduced motion the glow holds still and the sparks
   never take flight (a static dot field would read as noise, not embers). */
@media (prefers-reduced-motion: reduce) {
  .menu__glow,
  .menu__ember,
  .menu__spark {
    animation: none;
  }

  .menu__ember {
    display: none;
  }
}

html[data-reduced-motion='true'] .menu__glow,
html[data-reduced-motion='true'] .menu__ember,
html[data-reduced-motion='true'] .menu__spark {
  animation: none;
}

html[data-reduced-motion='true'] .menu__ember {
  display: none;
}
</style>

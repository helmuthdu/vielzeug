<script setup lang="ts">
import { useData } from 'vitepress';
import { computed, onMounted, onUnmounted, ref } from 'vue';
import PackageInfo from './PackageInfo.vue';

const prefersReducedMotion = ref(false);

const RINGS = [
  { cx: 32.0, cy: 32.0, rx: 28.902, ry: 11.221, tilt: -Math.PI / 2, dur: 3800 },
  { cx: 27.15, cy: 23.72, rx: 28.902, ry: 11.221, tilt: (-Math.PI * 5) / 6, dur: 5200 },
  { cx: 36.84, cy: 23.71, rx: 28.902, ry: 11.221, tilt: -Math.PI / 6, dur: 4500 },
];

const TAIL_LEN = 18;

type Pt = { x: number; y: number };

const electrons = ref(RINGS.map(() => ({ head: { x: 0, y: 0 } as Pt, tail: [] as Pt[] })));

let rafId = 0;
const phases = [0, -1.7 / 5.2, -0.9 / 4.5];

const TAIL_TIP = { x: 74.014653, y: 20.358239 };
const BALL_ENTRY = { x: 69.239759, y: 22.948267 };

function buildNucleusTailD(t: number): string {
  const sx = TAIL_TIP.x + (BALL_ENTRY.x - TAIL_TIP.x) * (1 - t);
  const sy = TAIL_TIP.y + (BALL_ENTRY.y - TAIL_TIP.y) * (1 - t);
  const sc = (v: number) => (v * t).toFixed(6);
  return (
    `m ${sx.toFixed(6)},${sy.toFixed(6)} ` +
    `c 0,0 ${sc(-2.742591)},${sc(1.622434)} ${sc(-2.877972)},${sc(1.556451)} ` +
    `${sc(-0.220497)},${sc(-0.107489)} ${sc(0.05383)},${sc(-0.610907)} ${sc(0.05383)},${sc(-0.610907)} ` +
    `${sc(-0.650251)},${sc(0.548161)} ${sc(-1.300501)},${sc(1.096323)} ${sc(-1.950752)},${sc(1.644484)} ` +
    `-0.0287,0.02464 -0.05675,0.05058 -0.08399,0.07782 ` +
    `-0.605065,0.605066 -0.605065,1.585962 0,2.191027 ` +
    `0.605065,0.605065 1.585961,0.605065 2.191026,0 ` +
    `0.06566,-0.06566 0.175755,-0.209478 0.175755,-0.209478 ` +
    `l ${sc(1.82801)},${sc(-2.435835)} ` +
    `c 0,0 -0.470958,0.250084 -0.564586,-0.109137 z`
  );
}

const nucleusTailD = ref(buildNucleusTailD(1));

function posAt(r: (typeof RINGS)[0], ts: number, phase: number): Pt {
  const frac = (ts / r.dur + phase) % 1;
  const angle = frac * Math.PI * 2;
  const cosT = Math.cos(r.tilt);
  const sinT = Math.sin(r.tilt);
  const px = r.rx * Math.cos(angle);
  const py = r.ry * Math.sin(angle);
  return { x: r.cx + px * cosT - py * sinT, y: r.cy + px * sinT + py * cosT };
}

function tickElectrons(ts: number) {
  if (!prefersReducedMotion.value) {
    const t = 0.845 + Math.sin(ts / 700) * 0.125;
    nucleusTailD.value = buildNucleusTailD(t);
  }
  electrons.value = RINGS.map((r, i) => {
    const head = posAt(r, ts, phases[i]);
    const tail: Pt[] = [];
    for (let j = 1; j <= TAIL_LEN; j++) {
      tail.push(posAt(r, ts - j * 16, phases[i]));
    }
    return { head, tail };
  });
  rafId = requestAnimationFrame(tickElectrons);
}

const glowPaused = ref(false);
let glowObserver: IntersectionObserver | null = null;

const { theme } = useData();

const packages = computed(() => theme.value.packages || {});

const packageCount = computed(() => Object.keys(packages.value).length);

const monoVersion = computed(() => {
  const versions = Object.values(packages.value)
    .map((p) => (p as { version: string }).version)
    .filter(Boolean);
  if (!versions.length) return null;
  versions.sort((a, b) => {
    const [aMaj, aMin] = a.split('.').map(Number);
    const [bMaj, bMin] = b.split('.').map(Number);
    return bMaj !== aMaj ? bMaj - aMaj : bMin - aMin;
  });
  const [maj, min] = versions[0].split('.');
  return `v${maj}.${min}`;
});

const categories = [
  {
    name: 'App Infrastructure',
    icon: 'building-2',
    packages: [
      { id: 'conduit', tagline: 'Dependency injection' },
      { id: 'familiar', tagline: 'Web Worker pool' },
      { id: 'herald', tagline: 'Typed event bus' },
      { id: 'keymap', tagline: 'Keyboard shortcuts & chords' },
      { id: 'ward', tagline: 'RBAC & permissions' },
      { id: 'wayfinder', tagline: 'Client-side routing' },
    ],
  },
  {
    name: 'Core Primitives',
    icon: 'atom',
    packages: [
      { id: 'clockwork', tagline: 'Finite state machines' },
      { id: 'flux', tagline: 'Reactive streams & operators' },
      { id: 'ripple', tagline: 'Signals, computed, effects' },
    ],
  },
  {
    name: 'Data Layer',
    icon: 'database',
    packages: [
      { id: 'courier', tagline: 'HTTP client & caching' },
      { id: 'pulse', tagline: 'WebSocket client & presence' },
      { id: 'sourcerer', tagline: 'Reactive data sources' },
      { id: 'vault', tagline: 'Browser storage' },
    ],
  },
  {
    name: 'Forms & Validation',
    icon: 'check-square',
    packages: [
      { id: 'forge', tagline: 'Form state & validation' },
      { id: 'spell', tagline: 'Schema validation' },
    ],
  },
  {
    name: 'UI Components',
    icon: 'layout',
    packages: [
      { id: 'ore', tagline: 'Web component primitives' },
      { id: 'dnd', tagline: 'Drag & drop' },
      { id: 'orbit', tagline: 'Floating positioning' },
      { id: 'prism', tagline: 'SVG charts' },
      { id: 'scroll', tagline: 'Virtual lists' },
      { id: 'refine', tagline: 'Accessible components' },
    ],
  },
  {
    name: 'Utilities & Tools',
    icon: 'wrench',
    packages: [
      { id: 'arsenal', tagline: '75+ utility functions' },
      { id: 'codex', tagline: 'AI / MCP server' },
      { id: 'coins', tagline: 'Monetary arithmetic' },
      { id: 'ledger', tagline: 'Async undo / redo history' },
      { id: 'lingua', tagline: 'i18n & pluralization' },
      { id: 'rune', tagline: 'Structured logging' },
      { id: 'scout', tagline: 'Trigram fuzzy search' },
      { id: 'tempo', tagline: 'Date & time' },
    ],
  },
];

const heroPackages = [
  { id: 'arsenal', name: 'arsenal', cmd: 'pnpm add @vielzeug/arsenal', tagline: '75+ utility functions' },
  { id: 'clockwork', name: 'clockwork', cmd: 'pnpm add @vielzeug/clockwork', tagline: 'Finite state machines' },
  { id: 'coins', name: 'coins', cmd: 'pnpm add @vielzeug/coins', tagline: 'Monetary arithmetic' },
  { id: 'conduit', name: 'conduit', cmd: 'pnpm add @vielzeug/conduit', tagline: 'Dependency injection' },
  { id: 'courier', name: 'courier', cmd: 'pnpm add @vielzeug/courier', tagline: 'HTTP client & caching' },
  { id: 'dnd', name: 'dnd', cmd: 'pnpm add @vielzeug/dnd', tagline: 'Drag & drop' },
  { id: 'familiar', name: 'familiar', cmd: 'pnpm add @vielzeug/familiar', tagline: 'Web Worker pool' },
  { id: 'flux', name: 'flux', cmd: 'pnpm add @vielzeug/flux', tagline: 'Reactive streams & operators' },
  { id: 'forge', name: 'forge', cmd: 'pnpm add @vielzeug/forge', tagline: 'Form state & validation' },
  { id: 'herald', name: 'herald', cmd: 'pnpm add @vielzeug/herald', tagline: 'Typed event bus' },
  { id: 'keymap', name: 'keymap', cmd: 'pnpm add @vielzeug/keymap', tagline: 'Keyboard shortcuts & chords' },
  { id: 'ledger', name: 'ledger', cmd: 'pnpm add @vielzeug/ledger', tagline: 'Async undo / redo history' },
  { id: 'lingua', name: 'lingua', cmd: 'pnpm add @vielzeug/lingua', tagline: 'i18n & pluralization' },
  { id: 'orbit', name: 'orbit', cmd: 'pnpm add @vielzeug/orbit', tagline: 'Floating positioning' },
  { id: 'ore', name: 'ore', cmd: 'pnpm add @vielzeug/ore', tagline: 'Web component primitives' },
  { id: 'prism', name: 'prism', cmd: 'pnpm add @vielzeug/prism', tagline: 'SVG charts' },
  { id: 'pulse', name: 'pulse', cmd: 'pnpm add @vielzeug/pulse', tagline: 'WebSocket client & presence' },
  { id: 'refine', name: 'refine', cmd: 'pnpm add @vielzeug/refine', tagline: 'Accessible components' },
  { id: 'ripple', name: 'ripple', cmd: 'pnpm add @vielzeug/ripple', tagline: 'Signals, computed, effects' },
  { id: 'rune', name: 'rune', cmd: 'pnpm add @vielzeug/rune', tagline: 'Structured logging' },
  { id: 'scout', name: 'scout', cmd: 'pnpm add @vielzeug/scout', tagline: 'Trigram fuzzy search' },
  { id: 'scroll', name: 'scroll', cmd: 'pnpm add @vielzeug/scroll', tagline: 'Virtual lists' },
  { id: 'sourcerer', name: 'sourcerer', cmd: 'pnpm add @vielzeug/sourcerer', tagline: 'Reactive data sources' },
  { id: 'spell', name: 'spell', cmd: 'pnpm add @vielzeug/spell', tagline: 'Schema validation' },
  { id: 'tempo', name: 'tempo', cmd: 'pnpm add @vielzeug/tempo', tagline: 'Date & time' },
  { id: 'vault', name: 'vault', cmd: 'pnpm add @vielzeug/vault', tagline: 'Browser storage' },
  { id: 'ward', name: 'ward', cmd: 'pnpm add @vielzeug/ward', tagline: 'RBAC & permissions' },
  { id: 'wayfinder', name: 'wayfinder', cmd: 'pnpm add @vielzeug/wayfinder', tagline: 'Client-side routing' },
];
const activeHeroIndex = ref(0);
const activeHeroPkg = computed(() => heroPackages[activeHeroIndex.value]);
const activeHeroAnnouncement = computed(
  () =>
    `Example ${activeHeroIndex.value + 1} of ${heroPackages.length}: ${activeHeroPkg.value.name} — ${activeHeroPkg.value.cmd}`,
);

const searchQuery = ref('');
const filteredCategories = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();
  if (!query) return categories;

  return categories
    .map((cat) => {
      const matchedPackages = cat.packages.filter(
        (pkg) => pkg.id.toLowerCase().includes(query) || pkg.tagline.toLowerCase().includes(query),
      );
      if (matchedPackages.length > 0 || cat.name.toLowerCase().includes(query)) {
        return {
          ...cat,
          packages: matchedPackages.length > 0 ? matchedPackages : cat.packages,
        };
      }
      return null;
    })
    .filter(Boolean) as typeof categories;
});

const coreEssentials = [
  { id: 'ripple', category: 'Core Primitives', tagline: 'Signals, computed, and effects', size: '1.2 kB' },
  { id: 'spell', category: 'Forms & Validation', tagline: 'Schema validation with fluent API', size: '1.8 kB' },
  { id: 'arsenal', category: 'Utilities', tagline: '75+ zero-dependency utility functions', size: '2.5 kB' },
  { id: 'courier', category: 'Data Layer', tagline: 'HTTP client & query cache / mutations', size: '2.0 kB' },
];

function cycleHeroPkg() {
  activeHeroIndex.value = (activeHeroIndex.value + 1) % heroPackages.length;
}

function hideBrokenImage(e: Event) {
  (e.target as HTMLImageElement).style.visibility = 'hidden';
}

function clearSearch() {
  searchQuery.value = '';
}

onMounted(() => {
  activeHeroIndex.value = 0;

  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  prefersReducedMotion.value = mq.matches;
  mq.addEventListener('change', (e) => {
    prefersReducedMotion.value = e.matches;
    if (e.matches) cancelAnimationFrame(rafId);
    else rafId = requestAnimationFrame(tickElectrons);
  });

  if (!prefersReducedMotion.value) rafId = requestAnimationFrame(tickElectrons);

  const logoEl = document.querySelector('.hero-logo-wrapper');
  if (logoEl) {
    glowObserver = new IntersectionObserver(
      ([entry]) => {
        glowPaused.value = !entry.isIntersecting;
      },
      { rootMargin: '200px' },
    );
    glowObserver.observe(logoEl);
  }
});

onUnmounted(() => {
  cancelAnimationFrame(rafId);
  glowObserver?.disconnect();
});
</script>

<template>
  <div class="home-page">
    <!-- Hero -->
    <section class="hero">
      <div class="hero-inner">
        <div class="hero-content">
          <div class="hero-badge">
            <a href="#packages" class="hero-badge-link">
              <ore-badge variant="primary">{{ packageCount }} packages</ore-badge>
              <ore-icon name="arrow-right" size="12" class="hero-badge-arrow" aria-hidden="true"></ore-icon>
            </a>
            <ore-badge v-if="monoVersion" variant="secondary">{{ monoVersion }}</ore-badge>
          </div>
          <h1 class="hero-title">
            <ore-text as="span" variant="heading" size="2xl" weight="bold" class="hero-title-main">Vielzeug</ore-text>
            <ore-text as="span" variant="heading" size="lg" weight="medium" color="muted" class="hero-title-sub"
              >Many Tools. Zero Weight. Huge Impact.</ore-text
            >
          </h1>
          <ore-text as="p" size="md" color="muted" class="hero-description">
            Pick and compose the tools you need — from routing to charts. Shared conventions, unified architecture, and
            zero dependencies.
          </ore-text>
          <div class="hero-values">
            <ore-tooltip
              content="Built with TypeScript from the ground up, with strict types and no 'any'"
              placement="top">
              <button type="button" class="value-item">
                <ore-icon name="shield-check" size="16"></ore-icon> Type-safe
              </button>
            </ore-tooltip>
            <ore-tooltip content="Import individual functions — bundlers include only what you use" placement="top">
              <button type="button" class="value-item">
                <ore-icon name="scissors" size="16"></ore-icon> Tree-shakeable
              </button>
            </ore-tooltip>
            <ore-tooltip
              content="No external npm dependencies — only other vielzeug packages where needed"
              placement="top">
              <button type="button" class="value-item">
                <ore-icon name="package" size="16"></ore-icon> Zero transitive deps
              </button>
            </ore-tooltip>
            <ore-tooltip content="Free to use in any project, commercial or open-source" placement="top">
              <button type="button" class="value-item"><ore-icon name="scale" size="16"></ore-icon> MIT</button>
            </ore-tooltip>
          </div>
          <div class="hero-install">
            <ore-copy-command :value="activeHeroPkg.cmd" class="install-row">
              <ore-button
                slot="suffix"
                size="sm"
                variant="text"
                icon-only
                :aria-label="`Show next package example (${activeHeroIndex + 1} of ${heroPackages.length})`"
                @click="cycleHeroPkg">
                <ore-icon name="chevron-right" size="14" aria-hidden="true"></ore-icon>
              </ore-button>
            </ore-copy-command>
            <div class="hero-install-meta">
              <ore-text color="muted" size="sm">{{ activeHeroPkg.tagline }}</ore-text>
              <ore-text color="muted" size="sm" style="opacity: 0.5">•</ore-text>
              <ore-text color="primary" size="sm" weight="semibold" family="mono"
                ><PackageInfo :package="activeHeroPkg.id" type="size"
              /></ore-text>
              <ore-text color="muted" size="sm" style="opacity: 0.5">•</ore-text>
              <ore-text color="muted" size="sm" class="hero-install-counter"
                >{{ activeHeroIndex + 1 }}/{{ heroPackages.length }}</ore-text
              >
            </div>
            <span class="sr-only" role="status" aria-live="polite">{{ activeHeroAnnouncement }}</span>
          </div>
          <div class="hero-actions">
            <a href="/guide/">
              <ore-button variant="solid" color="primary" size="md" effect="shine">
                <ore-icon slot="prefix" name="book-open" size="16"></ore-icon>
                Get Started
              </ore-button>
            </a>
            <a href="https://github.com/helmuthdu/vielzeug" target="_blank" rel="noopener noreferrer">
              <ore-button variant="outline" color="primary" size="md"> View on GitHub </ore-button>
            </a>
          </div>
        </div>
        <div class="hero-visual">
          <div class="hero-logo-wrapper" :class="{ 'glow-paused': glowPaused }" aria-label="Vielzeug logo" role="img">
            <svg
              class="hero-logo"
              width="256"
              height="256"
              viewBox="0 0 64 64"
              fill="none"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg">
              <g transform="matrix(4.0000082,0,0,4.0000082,-249.00051,-70.402338)">
                <g transform="rotate(12.883023,70.356812,25.230466)">
                  <path style="fill: #e92063; fill-opacity: 1; stroke-width: 0.0103763" :d="nucleusTailD" />
                  <circle style="fill: #f3f3f3; fill-opacity: 0.702703" cx="70.25032" cy="24.120285" r="1.1067405" />
                </g>
                <ellipse
                  style="opacity: 0.7; fill: none; stroke: #ffffff; stroke-width: 0.3; stroke-opacity: 0.7"
                  cx="-25.600533"
                  cy="70.249397"
                  rx="7.2255325"
                  ry="2.805326"
                  transform="rotate(-90)" />
                <ellipse
                  style="opacity: 0.7; fill: none; stroke: #ffffff; stroke-width: 0.3; stroke-opacity: 0.7"
                  cx="-71.555634"
                  cy="14.138023"
                  rx="7.2255325"
                  ry="2.805326"
                  transform="rotate(-150)" />
                <ellipse
                  style="opacity: 0.7; fill: none; stroke: #ffffff; stroke-width: 0.3; stroke-opacity: 0.7"
                  cx="50.120911"
                  cy="56.111958"
                  rx="7.2255325"
                  ry="2.805326"
                  transform="rotate(-29.999999)" />
                <template v-if="prefersReducedMotion">
                  <g transform="matrix(0.25,0,0,0.25,67.131837,13.058119)">
                    <ellipse
                      style="fill: #f6f5f4; fill-opacity: 0.3"
                      cx="17.38196"
                      cy="33.16288"
                      rx="1.9409472"
                      ry="1.9135387"
                      transform="matrix(-0.26508582,0.96422482,0.96422482,0.26508582,0,0)" />
                    <ellipse
                      style="fill: #f6f5f4"
                      cx="17.38196"
                      cy="33.162884"
                      rx="1.5814766"
                      ry="1.5591443"
                      transform="matrix(-0.26508582,0.96422482,0.96422482,0.26508582,0,0)" />
                  </g>
                  <g transform="matrix(0.25,0,0,0.25,57.257322,16.839563)">
                    <ellipse
                      style="fill: #f6f5f4; fill-opacity: 0.3"
                      cx="17.38196"
                      cy="33.16288"
                      rx="1.9409472"
                      ry="1.9135387"
                      transform="matrix(-0.26508582,0.96422482,0.96422482,0.26508582,0,0)" />
                    <ellipse
                      style="fill: #f6f5f4"
                      cx="17.38196"
                      cy="33.162884"
                      rx="1.5814766"
                      ry="1.5591443"
                      transform="matrix(-0.26508582,0.96422482,0.96422482,0.26508582,0,0)" />
                  </g>
                  <g transform="matrix(0.25,0,0,0.25,61.364494,24.126183)">
                    <ellipse
                      style="fill: #f6f5f4; fill-opacity: 0.3"
                      cx="17.38196"
                      cy="33.16288"
                      rx="1.9409472"
                      ry="1.9135387"
                      transform="matrix(-0.26508582,0.96422482,0.96422482,0.26508582,0,0)" />
                    <ellipse
                      style="fill: #f6f5f4"
                      cx="17.38196"
                      cy="33.162884"
                      rx="1.5814766"
                      ry="1.5591443"
                      transform="matrix(-0.26508582,0.96422482,0.96422482,0.26508582,0,0)" />
                  </g>
                </template>
              </g>
              <template v-if="!prefersReducedMotion">
                <g v-for="(e, i) in electrons" :key="i">
                  <circle
                    v-for="(pt, t) in e.tail"
                    :key="t"
                    :cx="pt.x"
                    :cy="pt.y"
                    :r="1.6 * Math.pow(1 - (t + 1) / (TAIL_LEN + 1), 1.4)"
                    :fill-opacity="0.55 * Math.pow(1 - (t + 1) / (TAIL_LEN + 1), 1.2)"
                    fill="#f0eeff" />
                  <circle :cx="e.head.x" :cy="e.head.y" r="1.8" fill="#f0eeff" />
                </g>
              </template>
            </svg>
          </div>
        </div>
      </div>
    </section>

    <!-- Framework compatibility strip -->
    <section class="compat">
      <div class="compat-inner">
        <ore-text size="xs" color="muted" variant="overline">Any framework. No framework. Your choice.</ore-text>
        <div class="compat-logos">
          <span class="compat-logo" title="Vue"
            ><img src="/logo-vue.svg" width="20" height="20" alt="Vue" @error="hideBrokenImage"
          /></span>
          <span class="compat-logo" title="React"
            ><img src="/logo-react.svg" width="20" height="20" alt="React" @error="hideBrokenImage"
          /></span>
          <span class="compat-logo" title="Svelte"
            ><img src="/logo-svelte.svg" width="20" height="20" alt="Svelte" @error="hideBrokenImage"
          /></span>
          <span class="compat-logo" title="Solid"
            ><img src="/logo-solidjs.svg" width="20" height="20" alt="Solid" @error="hideBrokenImage"
          /></span>
          <span class="compat-logo" title="Angular"
            ><img src="/logo-angular.svg" width="20" height="20" alt="Angular" @error="hideBrokenImage"
          /></span>
          <span class="compat-logo compat-logo--text" title="Vanilla TS">TS</span>
        </div>
      </div>
    </section>

    <!-- Why Vielzeug -->
    <section class="why">
      <div class="why-inner">
        <div class="why-header">
          <ore-text as="p" variant="overline" class="why-overline">A different kind of toolkit</ore-text>
          <ore-text as="h2" variant="heading" size="xl" weight="bold" class="why-title"
            >Everything fits. Nothing fights.</ore-text
          >
          <ore-text as="p" color="muted" class="why-subtitle"
            >{{ packageCount }} packages built as one. Same conventions, same primitives, same release cadence — so you
            ship, not integrate.</ore-text
          >
        </div>

        <!-- Stat strip -->
        <div class="why-stats">
          <div class="why-stat">
            <ore-text as="p" variant="heading" size="2xl" weight="bold" color="primary" class="why-stat-value"
              >0</ore-text
            >
            <ore-text as="p" size="sm" color="muted" class="why-stat-label"
              >Transitive dependencies across all {{ packageCount }} packages</ore-text
            >
          </div>
          <div class="why-stat-divider"></div>
          <div class="why-stat">
            <ore-text as="p" variant="heading" size="2xl" weight="bold" color="primary" class="why-stat-value"
              >1</ore-text
            >
            <ore-text as="p" size="sm" color="muted" class="why-stat-label"
              >Shared API shape — learn once, use everywhere</ore-text
            >
          </div>
          <div class="why-stat-divider"></div>
          <div class="why-stat">
            <ore-text as="p" variant="heading" size="2xl" weight="bold" color="primary" class="why-stat-value">{{
              packageCount
            }}</ore-text>
            <ore-text as="p" size="sm" color="muted" class="why-stat-label"
              >Independently installable packages</ore-text
            >
          </div>
        </div>

        <!-- Feature cards -->
        <ore-grid cols="1" cols-md="3" gap="lg" class="why-cards">
          <ore-card variant="flat" padding="lg" class="why-card">
            <div class="why-card-icon"><ore-icon name="book-open" size="20"></ore-icon></div>
            <ore-text as="h4" weight="semibold" class="why-card-title">One mental model</ore-text>
            <ore-text as="p" size="sm" color="muted" class="why-card-desc"
              >Same <code>dispose()</code> contract. Same signal shape. Same error format. Learn the pattern once —
              every new package feels familiar from line one.</ore-text
            >
          </ore-card>
          <ore-card variant="flat" padding="lg" class="why-card">
            <div class="why-card-icon"><ore-icon name="shield-check" size="20"></ore-icon></div>
            <ore-text as="h4" weight="semibold" class="why-card-title">No hidden dependencies</ore-text>
            <ore-text as="p" size="sm" color="muted" class="why-card-desc"
              >Every package you install is every package you own. No surprises in <code>node_modules</code>, no version
              conflicts six months from now.</ore-text
            >
          </ore-card>
          <ore-card variant="flat" padding="lg" class="why-card">
            <div class="why-card-icon"><ore-icon name="plug" size="20"></ore-icon></div>
            <ore-text as="h4" weight="semibold" class="why-card-title">Built to work together</ore-text>
            <ore-text as="p" size="sm" color="muted" class="why-card-desc"
              >Validation schemas plug into form fields. Signals drive UI templates. No adapter layer, no boilerplate —
              just packages that know about each other.</ore-text
            >
          </ore-card>
        </ore-grid>
      </div>
    </section>

    <!-- Code Showcase -->
    <section id="showcase" class="showcase">
      <div class="showcase-inner">
        <ore-text as="h2" variant="heading" size="xl" weight="bold" align="center" class="section-title"
          >Eliminate entire categories of glue code.</ore-text
        >
        <ore-text as="p" color="muted" align="center" class="section-subtitle"
          >Each package is standalone — combined, they compose naturally.</ore-text
        >
        <CodeWindow lang="ts" filename="app.ts">
          <pre
            class="showcase-pre"><code><span class="hl-keyword">import</span> { <span class="hl-fn">createForm</span> } <span class="hl-keyword">from</span> <a href="/forge/" class="showcase-import-link"><span class="hl-string">'@vielzeug/forge'</span></a>;
<span class="hl-keyword">import</span> { s } <span class="hl-keyword">from</span> <a href="/spell/" class="showcase-import-link"><span class="hl-string">'@vielzeug/spell'</span></a>;
<span class="hl-keyword">import</span> { <span class="hl-fn">createApi</span> } <span class="hl-keyword">from</span> <a href="/courier/" class="showcase-import-link"><span class="hl-string">'@vielzeug/courier'</span></a>;
<span class="hl-keyword">import</span> { <span class="hl-fn">createLogger</span> } <span class="hl-keyword">from</span> <a href="/rune/" class="showcase-import-link"><span class="hl-string">'@vielzeug/rune'</span></a>;

<span class="hl-keyword">const</span> log = <span class="hl-fn">createLogger</span>(<span class="hl-string">'auth'</span>);
<span class="hl-keyword">const</span> api = <span class="hl-fn">createApi</span>({ baseUrl: <span class="hl-string">'https://api.example.com'</span> });

<span class="hl-keyword">const</span> LoginSchema = s.<span class="hl-fn">object</span>({
  email: s.<span class="hl-fn">string</span>().<span class="hl-fn">email</span>(),
  password: s.<span class="hl-fn">string</span>().<span class="hl-fn">min</span>(<span class="hl-number">8</span>),
});

<span class="hl-keyword">const</span> form = <span class="hl-fn">createForm</span>({
  defaultValues: { email: <span class="hl-string">''</span>, password: <span class="hl-string">''</span> },
  schema: LoginSchema,
});

form.<span class="hl-fn">submit</span>(<span class="hl-keyword">async</span> (values) =&gt; {
  <span class="hl-keyword">const</span> user = <span class="hl-keyword">await</span> api.<span class="hl-fn">post</span>('/auth/login', { body: values });
  log.<span class="hl-fn">info</span>('Login successful', { user });
});</code></pre>
        </CodeWindow>
      </div>
    </section>

    <!-- Package Explorer -->
    <section id="packages" class="explorer">
      <div class="explorer-inner">
        <ore-text as="h2" variant="heading" size="xl" weight="bold" class="section-title"
          >All {{ packageCount }} packages, one search.</ore-text
        >
        <ore-text as="p" color="muted" class="section-subtitle">
          Organized by domain. Click any package to jump straight to its docs.
        </ore-text>

        <div class="explorer-toolbar">
          <ore-input
            type="search"
            :value="searchQuery"
            placeholder="Search packages (e.g. ripple, component, state)..."
            variant="outline"
            color="primary"
            rounded="full"
            clearable
            class="explorer-search"
            @input="(e: CustomEvent<{ value: string }>) => (searchQuery = e.detail.value)"
            @change="(e: CustomEvent<{ value: string }>) => (searchQuery = e.detail.value)"></ore-input>
        </div>

        <div v-if="!searchQuery" class="essentials-section">
          <ore-text as="h3" variant="overline" class="essentials-title">Start here</ore-text>
          <ore-grid responsive min-col-width="240px" gap="md">
            <a v-for="pkg in coreEssentials" :key="pkg.id" :href="`/${pkg.id}/`" class="essential-card-link">
              <ore-card variant="flat" padding="md" class="essential-card">
                <div class="essential-card-header">
                  <img :src="`/logo-${pkg.id}.svg`" alt="" class="essential-logo" />
                  <div class="essential-name-group">
                    <ore-text weight="bold" family="mono" class="essential-name">{{ pkg.id }}</ore-text>
                    <ore-text size="xs" color="muted" class="essential-category">{{ pkg.category }}</ore-text>
                  </div>
                </div>
                <ore-text as="p" size="sm" color="muted" class="essential-desc">{{ pkg.tagline }}</ore-text>
                <div slot="footer" class="essential-footer">
                  <PackageInfo :package="pkg.id" type="size" class="essential-size" />
                  <ore-text size="xs" color="primary" weight="semibold" class="essential-link-label"
                    >View docs →</ore-text
                  >
                </div>
              </ore-card>
            </a>
          </ore-grid>
        </div>

        <ore-text v-if="!searchQuery" as="h3" variant="overline" class="all-packages-title">All packages</ore-text>
        <ore-grid v-if="filteredCategories.length > 0" responsive min-col-width="320px" gap="xl" class="category-grid">
          <div v-for="cat in filteredCategories" :key="cat.name" class="category-section">
            <ore-text as="h3" weight="semibold" class="category-name">
              <ore-icon :name="cat.icon" size="16"></ore-icon>
              {{ cat.name }}
            </ore-text>
            <div class="package-list">
              <a v-for="pkg in cat.packages" :key="pkg.id" :href="`/${pkg.id}/`" class="package-tile">
                <img
                  :src="`/logo-${pkg.id}.svg`"
                  alt=""
                  class="package-logo"
                  @error="hideBrokenImage" />
                <div class="package-info">
                  <span class="package-name">{{ pkg.id }}</span>
                  <span class="package-tagline">{{ pkg.tagline }}</span>
                </div>
                <span v-if="packages[pkg.id]" class="package-size">
                  {{ packages[pkg.id].size }}
                </span>
              </a>
            </div>
          </div>
        </ore-grid>
        <div v-else class="explorer-empty" role="status">
          <ore-text as="p" color="muted">No packages found matching "{{ searchQuery }}"</ore-text>
          <ore-button variant="outline" color="primary" size="sm" @click="clearSearch">Clear search</ore-button>
        </div>
      </div>
    </section>

    <!-- Codex AI Section -->
    <section id="codex" class="codex-ai">
      <div class="codex-ai-inner">
        <ore-grid cols="1" cols-md="2" gap="2xl" align="start" class="codex-ai-content">
          <div class="codex-ai-copy">
            <ore-text as="h2" variant="heading" size="xl" weight="bold" class="codex-ai-title"
              >Your AI already knows Vielzeug</ore-text
            >
            <ore-text as="p" color="muted" class="codex-ai-desc">
              <code class="codex-inline-pkg">@vielzeug/codex</code> is an MCP server that bundles the entire
              documentation, package APIs, and Refine component metadata into a single offline snapshot. Wire it into
              Claude Desktop, Copilot Chat, or any MCP-compatible client — then ask anything.
            </ore-text>
            <ul class="codex-caps">
              <li class="codex-cap">
                <ore-icon name="search" size="14"></ore-icon>
                <span
                  ><strong>search-packages</strong> — find the right package by keyword across docs and exports</span
                >
              </li>
              <li class="codex-cap">
                <ore-icon name="book-open" size="14"></ore-icon>
                <span><strong>get-docs</strong> — fetch any package's index, API, usage, or examples page</span>
              </li>
              <li class="codex-cap">
                <ore-icon name="layers" size="14"></ore-icon>
                <span
                  ><strong>get-component</strong> — full Refine component CEM: attributes, slots, CSS parts,
                  events</span
                >
              </li>
            </ul>
            <div class="codex-setup">
              <ore-text color="muted" size="sm" weight="medium" class="codex-setup-label"
                >Install via npm or run directly:</ore-text
              >
              <ore-copy-command value="npx -y @vielzeug/codex" class="codex-setup-cmd"></ore-copy-command>
              <a href="/codex/" class="codex-learn-link">
                <ore-icon name="arrow-right" size="14"></ore-icon>
                Setup guide &amp; all tools
              </a>
            </div>
          </div>
          <div class="codex-ai-demo">
            <CodeWindow variant="chat" title="MCP tool call">
              <div class="chat-body">
                <div class="chat-turn chat-user">
                  <span class="chat-role">user</span>
                  <span class="chat-text">How do I debounce a function call in Arsenal?</span>
                </div>
                <div class="chat-turn chat-tool">
                  <span class="chat-role">tool</span>
                  <pre
                    class="chat-call"><span class="hl-fn">get-docs</span>({ packageSlug: <span class="hl-string">"arsenal"</span>, page: <span class="hl-string">"api"</span> })</pre>
                </div>
                <div class="chat-turn chat-assistant">
                  <span class="chat-role">assistant</span>
                  <span class="chat-text"
                    >Use <code>debounce(fn, wait)</code> — returns a version of <code>fn</code> that delays invoking
                    until <code>wait</code> ms after the last call. Pass <code>{ leading: true }</code> to fire on the
                    first call instead.</span
                  >
                </div>
                <div class="chat-code">
                  <pre><span class="hl-keyword">import</span> { debounce } <span class="hl-keyword">from</span> <span class="hl-string">'@vielzeug/arsenal'</span>;

<span class="hl-keyword">const</span> save = <span class="hl-fn">debounce</span>(<span class="hl-fn">persistToDb</span>, <span class="hl-number">300</span>);
input.<span class="hl-fn">addEventListener</span>(<span class="hl-string">'input'</span>, save);</pre>
                </div>
              </div>
            </CodeWindow>
          </div>
        </ore-grid>
      </div>
    </section>

    <!-- Community & Support -->
    <section id="community" class="community">
      <div class="community-inner">
        <ore-text as="h2" variant="heading" size="xl" weight="bold" class="section-title"
          >Everything lives on GitHub.</ore-text
        >
        <ore-text as="p" color="muted" class="section-subtitle"
          >Bug reports, questions, and contributions — all welcome. Open an issue or start a discussion.</ore-text
        >
        <div class="community-links">
          <a
            href="https://github.com/helmuthdu/vielzeug/issues"
            target="_blank"
            rel="noopener noreferrer"
            class="community-card-link">
            <ore-card padding="md">
              <div class="community-card-inner">
                <div class="community-card-icon"><ore-icon name="circle-alert" size="22"></ore-icon></div>
                <div class="community-card-body">
                  <ore-text weight="semibold" class="community-card-title">GitHub Issues</ore-text>
                  <ore-text color="muted" size="sm" class="community-card-desc"
                    >Report bugs or request features</ore-text
                  >
                </div>
                <ore-icon name="arrow-right" size="16" class="community-card-arrow"></ore-icon>
              </div>
            </ore-card>
          </a>
          <a
            href="https://github.com/helmuthdu/vielzeug/discussions"
            target="_blank"
            rel="noopener noreferrer"
            class="community-card-link">
            <ore-card padding="md">
              <div class="community-card-inner">
                <div class="community-card-icon"><ore-icon name="message-circle" size="22"></ore-icon></div>
                <div class="community-card-body">
                  <ore-text weight="semibold" class="community-card-title">Discussions</ore-text>
                  <ore-text color="muted" size="sm" class="community-card-desc">Ask questions and share ideas</ore-text>
                </div>
                <ore-icon name="arrow-right" size="16" class="community-card-arrow"></ore-icon>
              </div>
            </ore-card>
          </a>
          <a
            href="https://github.com/helmuthdu/vielzeug/blob/main/CONTRIBUTING.md"
            target="_blank"
            rel="noopener noreferrer"
            class="community-card-link">
            <ore-card padding="md">
              <div class="community-card-inner">
                <div class="community-card-icon"><ore-icon name="git-pull-request" size="22"></ore-icon></div>
                <div class="community-card-body">
                  <ore-text weight="semibold" class="community-card-title">Contributing</ore-text>
                  <ore-text color="muted" size="sm" class="community-card-desc"
                    >Learn how to contribute and join the project</ore-text
                  >
                </div>
                <ore-icon name="arrow-right" size="16" class="community-card-arrow"></ore-icon>
              </div>
            </ore-card>
          </a>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="site-footer">
      <div class="footer-top">
        <div class="footer-brand-col">
          <div class="footer-brand">
            <img src="/logo-main.svg" alt="Vielzeug" class="footer-logo" />
            <span class="footer-brand-name">Vielzeug</span>
          </div>
          <ore-text color="muted" size="sm" class="footer-tagline"
            >Modular TypeScript utilities. MIT licensed.</ore-text
          >
        </div>
        <ore-grid cols="1" cols-sm="3" gap="xl" class="footer-links-col">
          <div class="footer-link-group">
            <ore-text as="h4" weight="semibold" size="sm" class="footer-link-heading">Resources</ore-text>
            <a href="/guide/">Documentation</a>
            <a href="/repl">REPL Playground</a>
            <a href="/refine/">Components</a>
          </div>
          <div class="footer-link-group">
            <ore-text as="h4" weight="semibold" size="sm" class="footer-link-heading">Community</ore-text>
            <a href="https://github.com/helmuthdu/vielzeug" target="_blank" rel="noopener noreferrer">GitHub</a>
            <a href="https://github.com/helmuthdu/vielzeug/discussions" target="_blank" rel="noopener noreferrer"
              >Discussions</a
            >
            <a
              href="https://github.com/helmuthdu/vielzeug/blob/main/CONTRIBUTING.md"
              target="_blank"
              rel="noopener noreferrer"
              >Contributing</a
            >
          </div>
          <div class="footer-link-group">
            <ore-text as="h4" weight="semibold" size="sm" class="footer-link-heading">Legal</ore-text>
            <a href="https://github.com/helmuthdu/vielzeug/blob/main/LICENSE" target="_blank" rel="noopener noreferrer"
              >MIT License</a
            >
          </div>
        </ore-grid>
      </div>
      <div class="footer-bottom">
        <ore-separator></ore-separator>
        <ore-text as="p" size="sm" color="muted" align="center" class="footer-copyright">
          <ore-icon name="heart" size="14"></ore-icon>
          Built by <a href="https://github.com/helmuthdu" target="_blank" rel="noopener noreferrer">Helmuth Saatkamp</a>
        </ore-text>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.home-page {
  --hp-purple: var(--color-primary);
  --hp-purple-light: var(--color-primary-focus);
  --hp-purple-glow: color-mix(in oklch, var(--color-primary) 12%, transparent);
  --hp-purple-subtle: var(--color-primary-backdrop);
  --hp-surface: var(--color-canvas);
  --hp-surface-alt: var(--color-contrast-100);
  --hp-text: var(--text-color-body);
  --hp-text-muted: var(--text-color-secondary);
  --hp-border: var(--color-contrast-300);
  --hp-radius: var(--rounded-lg);
  padding-top: var(--size-8);
}

.dark .home-page {
  --hp-purple-glow: color-mix(in oklch, var(--color-primary) 15%, transparent);
  --hp-purple-subtle: var(--color-primary-backdrop);
  --hp-text-muted: oklch(65% 0.01 260deg);
}

/* ── Hero ──────────────────────────────────────────────────── */

.hero {
  padding: 3rem 1.5rem 4rem;
}

@starting-style {
  .hero {
    opacity: 0;
    transform: translateY(12px);
  }
}

.hero {
  transition:
    opacity 0.6s ease-out,
    transform 0.6s ease-out;
}

.hero-inner {
  max-width: 1152px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 3rem;
  align-items: center;
}

.hero-badge {
  display: flex;
  gap: 8px;
  margin-bottom: 1.5rem;
}

.hero-badge-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border-radius: var(--hp-radius);
  text-decoration: none;
  transition: opacity 0.15s ease-out;
}

.hero-badge-link:hover {
  opacity: 0.85;
}

.hero-badge-link:focus-visible {
  outline: 2px solid var(--hp-purple);
  outline-offset: 2px;
}

.hero-badge-arrow {
  color: var(--hp-purple);
  opacity: 0;
  transform: translateX(-2px);
  transition:
    opacity 0.15s ease-out,
    transform 0.15s ease-out;
}

.hero-badge-link:hover .hero-badge-arrow,
.hero-badge-link:focus-visible .hero-badge-arrow {
  opacity: 1;
  transform: translateX(0);
}

.hero-title {
  margin: 0 0 1.25rem;
}

.hero-title-main {
  display: block;
  font-size: clamp(2.5rem, 5vw, 3.5rem);
  line-height: 1.1;
  letter-spacing: -0.03em;
  color: var(--hp-purple);
}

.hero-title-sub {
  display: block;
  font-size: clamp(1.25rem, 2.5vw, 1.75rem);
  margin-top: 0.5rem;
  letter-spacing: -0.01em;
  text-wrap: balance;
}

.hero-description {
  line-height: 1.6;
  max-width: 520px;
  margin: 0 0 1.5rem;
}

.hero-values {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 1.75rem;
}

.value-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 4px;
  border: none;
  border-radius: 6px;
  background: none;
  color: var(--hp-text);
  font-size: 0.875rem;
  font-weight: 500;
  font-family: inherit;
  cursor: default;
}

.value-item:hover,
.value-item:focus-visible {
  background: var(--hp-purple-subtle);
}

.value-item:focus-visible {
  outline: 2px solid var(--hp-purple);
  outline-offset: 2px;
}

.hero-install {
  margin-bottom: 1.5rem;
}

.install-row {
  --copy-command-bg: var(--hp-surface-alt);
  --copy-command-color: var(--hp-text);
  --copy-command-border-color: var(--hp-border);
  --copy-command-radius: var(--hp-radius);
  --copy-command-padding: 0.625rem 1rem;
  --copy-command-font-size: 0.875rem;
  --copy-command-hover-bg: var(--hp-surface-alt);
  border-radius: var(--hp-radius);
  transition:
    border-color 0.2s ease-out,
    box-shadow 0.2s ease-out;
}

.install-row:hover {
  --copy-command-border-color: var(--hp-purple);
  box-shadow: 0 0 0 3px var(--hp-purple-glow);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.hero-actions {
  display: flex;
  gap: 12px;
}

.hero-actions a {
  text-decoration: none;
}

/* ── Hero Visual ───────────────────────────────────────────── */

.hero-visual {
  display: flex;
  align-items: center;
  justify-content: center;
}

.hero-logo-wrapper {
  position: relative;
  width: 352px;
  height: 352px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.hero-logo-wrapper::before {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  top: -10%;
  background: conic-gradient(
    from 0deg at 45% 50%,
    oklch(56% 0.22 293deg),
    oklch(60% 0.24 340deg),
    oklch(55% 0.22 220deg),
    oklch(56% 0.22 293deg)
  );
  filter: blur(80px);
  opacity: 0.55;
  animation: glow-rotate 8s linear infinite;
  animation-play-state: running;
  will-change: transform;
  border-radius: 50%;
}

.hero-logo-wrapper.glow-paused::before {
  animation-play-state: paused;
}

@keyframes glow-rotate {
  from {
    transform: rotate(0deg) scale(1);
  }
  50% {
    transform: rotate(180deg) scale(1.08);
  }
  to {
    transform: rotate(360deg) scale(1);
  }
}

.hero-logo {
  position: relative;
  width: 384px;
  height: 384px;
  z-index: 1;
}

/* ── Compatibility strip ──────────────────────────────────── */

.compat {
  padding: 1.5rem 1.5rem;
  border-top: 1px solid var(--hp-border);
  background: var(--hp-surface-alt);
}

.compat-inner {
  max-width: 900px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2rem;
  flex-wrap: wrap;
}

.compat-logos {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  flex-wrap: wrap;
}

.compat-logo {
  display: flex;
  align-items: center;
  opacity: 0.55;
  transition: opacity 0.15s ease;
}

.compat-logo:hover {
  opacity: 1;
}

.compat-logo--text {
  font-size: 0.8125rem;
  font-weight: 700;
  font-family: var(--font-mono);
  color: var(--hp-text);
  letter-spacing: 0.03em;
}

/* ── Why section ──────────────────────────────────────────── */

.why {
  padding: 5rem 1.5rem;
  border-top: 1px solid var(--hp-border);
  background: var(--hp-surface);
}

.why-inner {
  max-width: 900px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 3rem;
}

.why-header {
  text-align: center;
  max-width: 640px;
  margin: 0 auto;
}

.why-overline {
  margin: 0 0 0.75rem;
}

.why-title {
  font-size: clamp(1.5rem, 3vw, 2.25rem);
  line-height: 1.2;
  margin: 0 0 0.75rem;
}

.why-subtitle {
  line-height: 1.7;
  margin: 0;
}

/* ── Stat strip ───────────────────────────────────────────── */

.why-stats {
  display: flex;
  align-items: stretch;
  background: var(--hp-surface-alt);
  border: 1px solid var(--hp-border);
  border-radius: var(--hp-radius);
  overflow: hidden;
}

.why-stat {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 0.4rem;
  padding: 2rem 1.5rem;
}

.why-stat-value {
  font-size: clamp(2.5rem, 5vw, 3.5rem);
  line-height: 1;
  margin: 0;
}

.why-stat-label {
  margin: 0;
  max-width: 160px;
}

.why-stat-divider {
  width: 1px;
  background: var(--hp-border);
  flex-shrink: 0;
  align-self: stretch;
}

/* ── Feature cards ────────────────────────────────────────── */

.why-cards {
  width: 100%;
}

.why-card {
  display: flex;
  flex-direction: column;
  gap: var(--size-4);
}

.why-card-icon {
  margin-bottom: var(--size-2);
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  border: 1px solid var(--hp-border);
  background: var(--hp-surface);
  color: var(--hp-purple);
  flex-shrink: 0;
}

.why-card-title {
  margin: 0;
}

.why-card-desc {
  line-height: 1.6;
  margin: 0;
}

.why-card-desc code {
  font-family: var(--font-mono);
  font-size: 0.85em;
  color: var(--hp-purple);
  background: var(--hp-purple-subtle);
  padding: 1px 4px;
  border-radius: 3px;
}

/* ── Code Showcase ─────────────────────────────────────────── */

.showcase {
  padding: 5rem 1.5rem;
  background: var(--hp-surface-alt);
  border-top: 1px solid var(--hp-border);
}

.showcase-inner {
  max-width: 800px;
  margin: 0 auto;
}

.section-title {
  margin: 0 0 0.5rem;
  text-wrap: balance;
}

.section-subtitle {
  margin: 0 0 2rem;
}

.showcase-pre {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 0.8125rem;
  line-height: 1.7;
  color: var(--hp-text);
}

.hl-keyword {
  color: oklch(60% 0.18 293deg);
}
.hl-string {
  color: oklch(55% 0.15 155deg);
}
.hl-fn {
  color: oklch(60% 0.14 250deg);
}
.hl-number {
  color: oklch(60% 0.16 50deg);
}

.hl-comment {
  color: oklch(52% 0.02 260deg);
}

.dark .hl-comment {
  color: oklch(58% 0.02 260deg);
}

.dark .hl-keyword {
  color: oklch(72% 0.18 293deg);
}
.dark .hl-string {
  color: oklch(72% 0.15 155deg);
}
.dark .hl-fn {
  color: oklch(72% 0.14 250deg);
}
.dark .hl-number {
  color: oklch(72% 0.16 50deg);
}

/* ── Package Explorer ──────────────────────────────────────── */

.explorer {
  padding: 5rem 1.5rem;
  background: var(--hp-surface);
  border-top: 1px solid var(--hp-border);
}

@starting-style {
  .explorer {
    opacity: 0;
    transform: translateY(12px);
  }
}

.explorer {
  transition:
    opacity 0.6s ease-out 0.15s,
    transform 0.6s ease-out 0.15s;
}

.explorer-inner {
  max-width: 1152px;
  margin: 0 auto;
}

.category-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.category-name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--hp-text);
  margin: 0;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--hp-border);
}

.package-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.package-tile {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  text-decoration: none;
  color: var(--hp-text);
  transition:
    background 0.15s ease-out,
    box-shadow 0.15s ease-out;
}

.package-tile:hover,
.package-tile:focus-visible {
  background: var(--hp-purple-subtle);
  box-shadow: 0 0 0 1px var(--hp-purple-glow);
}

.package-tile:focus-visible {
  outline: 2px solid var(--hp-purple);
  outline-offset: 2px;
}

.package-logo {
  width: 28px;
  height: 28px;
  flex-shrink: 0;
}

.package-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}

.package-name {
  font-size: 0.875rem;
  font-weight: 600;
  font-family: var(--font-mono);
}

.package-tagline {
  display: -webkit-box;
  overflow: hidden;
  font-size: 0.75rem;
  color: var(--hp-text-muted);
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.package-size {
  font-size: 0.6875rem;
  font-family: var(--font-mono);
  color: var(--hp-text-muted);
  white-space: nowrap;
  padding: 2px 6px;
  background: var(--hp-surface-alt);
  border-radius: var(--rounded-sm);
}

/* ── Community ─────────────────────────────────────────────── */

.community {
  padding: 5rem 1.5rem;
  background: var(--hp-surface);
}

.community-inner {
  max-width: 900px;
  margin: 0 auto;
}

.community-links {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
  margin-top: 2rem;
  align-items: stretch;
}

.community-card-link {
  display: block;
  text-decoration: none;
  height: 100%;
}

.community-card-link ore-card {
  height: 100%;
  transition: transform 0.15s ease-out;
}

.community-card-link:hover ore-card,
.community-card-link:focus-visible ore-card {
  --card-border-color: var(--hp-purple);
  --card-shadow: 0 4px 20px var(--hp-purple-glow), 0 0 0 3px var(--hp-purple-glow);
  transform: translateY(-2px);
}

.community-card-link:focus-visible {
  outline: 2px solid var(--hp-purple);
  outline-offset: 2px;
  border-radius: var(--hp-radius);
}

.community-card-inner {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.community-card-icon {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--rounded-md);
  border: 1px solid oklch(70% 0.12 293deg / 20%);
  color: var(--hp-purple);
  flex-shrink: 0;
}

.community-card-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.community-card-arrow {
  color: var(--hp-text-muted);
  flex-shrink: 0;
  transition:
    color 0.15s ease-out,
    transform 0.15s ease-out;
}

.community-card-link:hover .community-card-arrow,
.community-card-link:focus-visible .community-card-arrow {
  color: var(--hp-purple);
  transform: translateX(3px);
}

/* ── Site Footer ───────────────────────────────────────────── */

.site-footer {
  padding: 3rem 1.5rem 2rem;
  border-top: 1px solid var(--hp-border);
  background: var(--hp-surface-alt);
}

.footer-top {
  max-width: 1152px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 3rem;
}

.footer-brand-col {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.footer-brand {
  display: flex;
  align-items: center;
  gap: 10px;
}

.footer-logo {
  width: 28px;
  height: 28px;
}

.footer-brand-name {
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--hp-text);
}

.footer-link-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.footer-link-heading {
  margin: 0 0 0.5rem;
}

.footer-link-group a {
  font-size: 0.8125rem;
  color: var(--hp-text-muted);
  text-decoration: none;
  transition: color 0.15s ease-out;
}

.footer-link-group a:hover {
  color: var(--hp-purple);
}

.footer-bottom {
  max-width: 1152px;
  margin: 2rem auto 0;
}

.footer-bottom ore-separator {
  margin-bottom: 1.25rem;
}

.footer-copyright {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin: 0;
}

.footer-copyright ore-icon {
  color: var(--hp-purple);
}

.footer-copyright a {
  color: var(--hp-text);
  text-decoration: none;
  font-weight: 500;
}

.footer-copyright a:hover {
  color: var(--hp-purple);
}

/* ── Codex AI ──────────────────────────────────────────────── */

.codex-ai {
  padding: 5rem 1.5rem;
  background: color-mix(in oklch, var(--color-primary-backdrop) 60%, var(--color-canvas));
  border-top: 1px solid var(--hp-border);
  border-bottom: 1px solid var(--hp-border);
}

.codex-ai-inner {
  max-width: 1152px;
  margin: 0 auto;
}

.codex-ai-copy {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  min-width: 0;
}

.codex-ai-demo {
  min-width: 0;
}

.codex-ai-title {
  font-size: clamp(1.5rem, 3vw, 2rem);
  margin: 0;
  text-wrap: balance;
}

.codex-ai-desc {
  line-height: 1.65;
  margin: 0;
}

.codex-inline-pkg {
  font-family: var(--font-mono);
  font-size: 0.9em;
  color: var(--hp-purple);
  background: var(--hp-purple-subtle);
  padding: 1px 5px;
  border-radius: 4px;
}

.codex-caps {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.codex-cap {
  display: flex;
  align-items: baseline;
  gap: 0.625rem;
  font-size: 0.9rem;
  color: var(--hp-text);
  line-height: 1.5;
}

.codex-cap ore-icon {
  color: var(--hp-purple);
  flex-shrink: 0;
  position: relative;
  top: 1px;
}

.codex-cap strong {
  font-family: var(--font-mono);
  font-size: 0.85em;
  color: var(--hp-text);
}

.codex-setup {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding-top: 0.25rem;
}

.codex-setup-cmd {
  --copy-command-color: var(--hp-text);
  --copy-command-font-size: 0.875rem;
}

.codex-learn-link {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--hp-purple);
  text-decoration: none;
}

.codex-learn-link ore-icon {
  transition: transform 0.15s ease-out;
}

.codex-learn-link:hover ore-icon {
  transform: translateX(3px);
}

/* Chat content styles (window chrome is in ore-code-window) */

.chat-body {
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
}

.chat-turn {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.chat-role {
  font-size: 0.6875rem;
  font-family: var(--font-mono);
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.chat-user .chat-role {
  color: var(--hp-text-muted);
}

.chat-tool .chat-role {
  color: oklch(58% 0.16 250deg);
}

.dark .chat-tool .chat-role {
  color: oklch(70% 0.16 250deg);
}

.chat-assistant .chat-role {
  color: var(--hp-purple);
}

.chat-text {
  font-size: 0.875rem;
  line-height: 1.55;
  color: var(--hp-text);
}

.chat-text code {
  font-family: var(--font-mono);
  font-size: 0.85em;
  color: var(--hp-purple);
  background: var(--hp-purple-subtle);
  padding: 1px 4px;
  border-radius: 3px;
}

.chat-call {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 0.8rem;
  line-height: 1.5;
  color: var(--hp-text);
  background: var(--hp-surface-alt);
  border: 1px solid var(--hp-border);
  border-radius: 6px;
  padding: 0.5rem 0.75rem;
  overflow-x: auto;
}

.chat-code {
  border-top: 1px solid var(--hp-border);
  padding-top: 0.875rem;
  margin-top: 0.125rem;
}

.chat-code pre {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 0.8rem;
  line-height: 1.7;
  color: var(--hp-text);
  overflow-x: auto;
}

/* ── Responsive ────────────────────────────────────────────── */

@media (max-width: 1024px) {
  .hero-logo-wrapper {
    width: 280px;
    height: 280px;
  }

  .hero-logo {
    width: 280px;
    height: 280px;
  }
}

@media (max-width: 768px) {
  .hero-inner {
    grid-template-columns: 1fr;
    text-align: center;
  }

  .hero-content {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .hero-badge {
    justify-content: center;
  }

  .hero-description {
    text-align: center;
  }

  .hero-values {
    justify-content: center;
  }

  .hero-actions {
    justify-content: center;
  }

  .hero-visual {
    order: -1;
  }

  .hero-logo-wrapper {
    width: 252px;
    height: 252px;
  }

  .hero-logo {
    width: 252px;
    height: 252px;
  }

  .community-links {
    grid-template-columns: 1fr;
  }

  .footer-top {
    grid-template-columns: 1fr;
    gap: 2rem;
  }

  .why-stats {
    flex-direction: column;
  }

  .why-stat {
    padding: 1.5rem;
  }

  .why-stat-divider {
    width: auto;
    height: 1px;
  }
}

@media (prefers-reduced-motion: reduce) {
  @starting-style {
    .hero,
    .explorer {
      opacity: 1;
      transform: none;
    }
  }

  .hero,
  .explorer {
    transition: none;
  }

  .community-card {
    transition: none;
    transform: none;
  }

  .hero-logo-wrapper::before {
    animation: none;
  }
}

/* ── Homepage Refactoring Extensions ───────────────────────── */

.hero-install-meta {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  padding: 0 4px;
}

.hero-install-counter {
  font-family: var(--font-mono);
  opacity: 0.6;
}

.showcase-import-link {
  text-decoration: none;
}

.showcase-import-link:hover .hl-string {
  text-decoration: underline;
  color: var(--hp-purple);
}

/* Package Explorer Search & Essentials */
.explorer-toolbar {
  margin-bottom: 2rem;
  display: flex;
  justify-content: center;
}

.explorer-search {
  width: 100%;
  max-width: 480px;
}

.essentials-section {
  margin-bottom: 2rem;
}

.essentials-title {
  margin: 0 0 1rem;
}

.all-packages-title {
  margin: 0 0 1.5rem;
}

.essential-card-link {
  display: block;
  height: 100%;
  border-radius: var(--hp-radius);
  text-decoration: none;
}

.essential-card-link:focus-visible {
  outline: 2px solid var(--hp-purple);
  outline-offset: 2px;
}

.essential-card {
  height: 100%;
  transition: all 0.2s ease-out;
  cursor: pointer;
}

.essential-card-link:hover .essential-card,
.essential-card-link:focus-visible .essential-card {
  --card-border-color: var(--hp-purple);
  transform: translateY(-2px);
  box-shadow: 0 4px 20px var(--hp-purple-glow);
}

.essential-card-header {
  display: flex;
  align-items: center;
  gap: var(--size-4);
  margin-bottom: var(--size-2);
}

.essential-name-group {
  display: flex;
  flex-direction: column;
  gap: var(--size-0-5);
}

.essential-category {
  margin: 0;
}

.essential-logo {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
}

.essential-desc {
  margin: 0;
  flex: 1;
}

.essential-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 0.25rem;
}

.essential-link-label {
  opacity: 0.8;
}

.essential-card-link:hover .essential-link-label,
.essential-card-link:focus-visible .essential-link-label {
  opacity: 1;
}

.explorer-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 3rem 1.5rem;
  color: var(--hp-text-muted);
  font-size: 0.9375rem;
  text-align: center;
  background: var(--hp-surface-alt);
  border-radius: 8px;
  border: 1px dashed var(--hp-border);
}

/* Size badges */
.essential-size {
  font-size: 0.6875rem;
  font-family: var(--font-mono);
  color: var(--hp-text-muted);
  white-space: nowrap;
  padding: 2px 6px;
  border-radius: var(--rounded-sm);
}
</style>
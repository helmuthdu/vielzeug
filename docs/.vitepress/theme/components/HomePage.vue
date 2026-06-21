<script setup lang="ts">
import { useData } from 'vitepress';
import { computed, onMounted, onUnmounted, ref } from 'vue';

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
      { id: 'craft', tagline: 'Web component primitives' },
      { id: 'dnd', tagline: 'Drag & drop' },
      { id: 'orbit', tagline: 'Floating positioning' },
      { id: 'prism', tagline: 'SVG charts' },
      { id: 'scroll', tagline: 'Virtual lists' },
      { id: 'sigil', tagline: 'Accessible components' },
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

const featuredPackages = [
  { id: 'arsenal', desc: '75+ zero-dep utilities — the Swiss Army knife' },
  { id: 'ripple', desc: 'Signals, computed values, and reactive stores' },
  { id: 'spell', desc: 'Schema validation with a fluent TypeScript API' },
];

const installCmds = ['pnpm add @vielzeug/ripple', 'pnpm add @vielzeug/arsenal', 'pnpm add @vielzeug/spell'];
const installCmdIndex = ref(0);
const installCmd = computed(() => installCmds[installCmdIndex.value]);

function cycleInstall() {
  installCmdIndex.value = (installCmdIndex.value + 1) % installCmds.length;
}

onMounted(() => {
  installCmdIndex.value = 0;

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
              <sg-badge variant="primary">{{ packageCount }} packages</sg-badge>
            </a>
            <sg-badge v-if="monoVersion" variant="secondary">{{ monoVersion }}</sg-badge>
          </div>
          <h1 class="hero-title">
            <span class="hero-title-main">Vielzeug</span>
            <span class="hero-title-sub">Many Tools. Zero Weight.</span>
          </h1>
          <p class="hero-description">
            From signals with <em>Ripple</em> to forms via <em>Forge</em>, explore our full range of zero-dependency
            TypeScript tools. Pick one or compose them all.
          </p>
          <div class="hero-values">
            <sg-tooltip
              content="Built with TypeScript from the ground up, with strict types and no 'any'"
              placement="top">
              <span class="value-item"><sg-icon name="shield-check" size="16"></sg-icon> Type-safe</span>
            </sg-tooltip>
            <sg-tooltip content="Import individual functions — bundlers include only what you use" placement="top">
              <span class="value-item"><sg-icon name="scissors" size="16"></sg-icon> Tree-shakeable</span>
            </sg-tooltip>
            <sg-tooltip
              content="No external npm dependencies — only other vielzeug packages where needed"
              placement="top">
              <span class="value-item"><sg-icon name="package" size="16"></sg-icon> Zero External Deps</span>
            </sg-tooltip>
            <sg-tooltip content="Free to use in any project, commercial or open-source" placement="top">
              <span class="value-item"><sg-icon name="scale" size="16"></sg-icon> MIT</span>
            </sg-tooltip>
          </div>
          <div class="hero-install">
            <sg-copy-command :value="installCmd" class="install-row">
              <sg-button
                slot="suffix"
                size="sm"
                variant="text"
                icon-only
                aria-label="Show next package example"
                @click="cycleInstall">
                <sg-icon name="chevron-right" size="14" aria-hidden="true"></sg-icon>
              </sg-button>
            </sg-copy-command>
          </div>
          <div class="hero-actions">
            <a href="/guide/">
              <sg-button variant="solid" color="primary" size="md" effect="shine">
                <sg-icon slot="prefix" name="book-open" size="16"></sg-icon>
                Get Started
              </sg-button>
            </a>
            <a href="https://github.com/helmuthdu/vielzeug" target="_blank" rel="noopener noreferrer">
              <sg-button variant="outline" color="primary" size="md"> GitHub </sg-button>
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

    <!-- Code Showcase -->
    <section id="showcase" class="showcase">
      <div class="showcase-inner">
        <h2 class="section-title">Modular by Design</h2>
        <p class="section-subtitle">Import what you need. Each package works alone or together.</p>
        <CodeWindow lang="ts" filename="app.ts">
          <pre
            class="showcase-pre"><code><span class="hl-keyword">import</span> { <span class="hl-fn">createForm</span> } <span class="hl-keyword">from</span> <span class="hl-string">'@vielzeug/forge'</span>;
<span class="hl-keyword">import</span> { s } <span class="hl-keyword">from</span> <span class="hl-string">'@vielzeug/spell'</span>;
<span class="hl-keyword">import</span> { <span class="hl-fn">createApi</span> } <span class="hl-keyword">from</span> <span class="hl-string">'@vielzeug/courier'</span>;
<span class="hl-keyword">import</span> { <span class="hl-fn">createLogger</span> } <span class="hl-keyword">from</span> <span class="hl-string">'@vielzeug/rune'</span>;

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
  <span class="hl-keyword">const</span> user = <span class="hl-keyword">await</span> api.<span class="hl-fn">post</span>(<span class="hl-string">'/auth/login'</span>, { body: values });
  log.<span class="hl-fn">info</span>(<span class="hl-string">'Login successful'</span>, { user });
});</code></pre>
        </CodeWindow>
      </div>
    </section>

    <!-- Package Explorer -->
    <section id="packages" class="explorer">
      <div class="explorer-inner">
        <h2 class="section-title">The Complete Toolkit</h2>
        <p class="section-subtitle">
          Organized by domain. Every package ships independently, works alongside the rest.
        </p>

        <sg-grid responsive min-col-width="320px" gap="xl" class="category-grid">
          <div v-for="cat in categories" :key="cat.name" class="category-section">
            <h3 class="category-name">
              <sg-icon :name="cat.icon" size="16"></sg-icon>
              {{ cat.name }}
            </h3>
            <div class="package-list">
              <a v-for="pkg in cat.packages" :key="pkg.id" :href="`/${pkg.id}/`" class="package-tile">
                <img
                  :src="`/logo-${pkg.id}.svg`"
                  alt=""
                  class="package-logo"
                  @error="(e) => ((e.target as HTMLImageElement).style.visibility = 'hidden')" />
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
        </sg-grid>
      </div>
    </section>

    <!-- Codex AI Section -->
    <section id="codex" class="codex-ai">
      <div class="codex-ai-inner">
        <sg-grid cols="1" cols-md="2" gap="2xl" align="start" class="codex-ai-content">
          <div class="codex-ai-copy">
            <h2 class="codex-ai-title">Your AI already knows Vielzeug</h2>
            <p class="codex-ai-desc">
              <code class="codex-inline-pkg">@vielzeug/codex</code> is an MCP server that bundles the entire
              documentation, package APIs, and Sigil component metadata into a single offline snapshot. Wire it into
              Claude Desktop, Copilot Chat, or any MCP-compatible client — then ask anything.
            </p>
            <ul class="codex-caps">
              <li class="codex-cap">
                <sg-icon name="search" size="14"></sg-icon>
                <span
                  ><strong>search-packages</strong> — find the right package by keyword across docs and exports</span
                >
              </li>
              <li class="codex-cap">
                <sg-icon name="book-open" size="14"></sg-icon>
                <span><strong>get-docs</strong> — fetch any package's index, API, usage, or examples page</span>
              </li>
              <li class="codex-cap">
                <sg-icon name="layers" size="14"></sg-icon>
                <span
                  ><strong>get-component</strong> — full Sigil component CEM: attributes, slots, CSS parts, events</span
                >
              </li>
            </ul>
            <div class="codex-setup">
              <sg-text color="muted" size="sm" weight="medium" class="codex-setup-label"
                >One command. No install required.</sg-text
              >
              <sg-copy-command value="npx -y @vielzeug/codex" class="codex-setup-cmd"></sg-copy-command>
              <a href="/codex/" class="codex-learn-link">
                <sg-icon name="arrow-right" size="14"></sg-icon>
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
        </sg-grid>
      </div>
    </section>

    <!-- Community & Support -->
    <section id="community" class="community">
      <div class="community-inner">
        <h2 class="section-title">Built in the open</h2>
        <p class="section-subtitle">Questions, bug reports, and contributions all live on GitHub. Come find us.</p>
        <div class="community-links">
          <a
            href="https://github.com/helmuthdu/vielzeug/issues"
            target="_blank"
            rel="noopener noreferrer"
            class="community-card-link">
            <sg-card padding="md">
              <div class="community-card-inner">
                <div class="community-card-icon"><sg-icon name="circle-alert" size="22"></sg-icon></div>
                <div class="community-card-body">
                  <sg-text weight="semibold" class="community-card-title">GitHub Issues</sg-text>
                  <sg-text color="muted" size="sm" class="community-card-desc">Report bugs or request features</sg-text>
                </div>
                <sg-icon name="arrow-right" size="16" class="community-card-arrow"></sg-icon>
              </div>
            </sg-card>
          </a>
          <a
            href="https://github.com/helmuthdu/vielzeug/discussions"
            target="_blank"
            rel="noopener noreferrer"
            class="community-card-link">
            <sg-card padding="md">
              <div class="community-card-inner">
                <div class="community-card-icon"><sg-icon name="message-circle" size="22"></sg-icon></div>
                <div class="community-card-body">
                  <sg-text weight="semibold" class="community-card-title">Discussions</sg-text>
                  <sg-text color="muted" size="sm" class="community-card-desc">Ask questions and share ideas</sg-text>
                </div>
                <sg-icon name="arrow-right" size="16" class="community-card-arrow"></sg-icon>
              </div>
            </sg-card>
          </a>
          <a
            href="https://github.com/helmuthdu/vielzeug/blob/main/CONTRIBUTING.md"
            target="_blank"
            rel="noopener noreferrer"
            class="community-card-link">
            <sg-card padding="md">
              <div class="community-card-inner">
                <div class="community-card-icon"><sg-icon name="git-pull-request" size="22"></sg-icon></div>
                <div class="community-card-body">
                  <sg-text weight="semibold" class="community-card-title">Contributing</sg-text>
                  <sg-text color="muted" size="sm" class="community-card-desc">Learn how to contribute</sg-text>
                </div>
                <sg-icon name="arrow-right" size="16" class="community-card-arrow"></sg-icon>
              </div>
            </sg-card>
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
          <sg-text color="muted" size="sm" class="footer-tagline">Zero deps. Fully tree-shakeable.</sg-text>
        </div>
        <sg-grid cols="1" cols-sm="3" gap="xl" class="footer-links-col">
          <div class="footer-link-group">
            <h4 class="footer-link-heading">Resources</h4>
            <a href="/guide/">Documentation</a>
            <a href="/repl">REPL Playground</a>
            <a href="/sigil/">Components</a>
          </div>
          <div class="footer-link-group">
            <h4 class="footer-link-heading">Community</h4>
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
            <h4 class="footer-link-heading">Legal</h4>
            <a href="https://github.com/helmuthdu/vielzeug/blob/main/LICENSE" target="_blank" rel="noopener noreferrer"
              >MIT License</a
            >
          </div>
        </sg-grid>
      </div>
      <div class="footer-bottom">
        <sg-separator></sg-separator>
        <p class="footer-copyright">
          <sg-icon name="heart" size="14"></sg-icon>
          Built by <a href="https://github.com/helmuthdu" target="_blank" rel="noopener noreferrer">Helmuth Saatkamp</a>
        </p>
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
  padding-top: var(--size-10);
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
  text-decoration: none;
  display: contents;
}

.hero-title {
  margin: 0 0 1.25rem;
}

.hero-title-main {
  display: block;
  font-size: clamp(2.5rem, 5vw, 3.5rem);
  font-weight: 800;
  letter-spacing: -0.03em;
  color: var(--hp-purple);
  line-height: 1.1;
}

.hero-title-sub {
  display: block;
  font-size: clamp(1.25rem, 2.5vw, 1.75rem);
  font-weight: 500;
  color: var(--hp-text);
  margin-top: 0.5rem;
  letter-spacing: -0.01em;
  text-wrap: balance;
}

.hero-description {
  font-size: 1.0625rem;
  line-height: 1.6;
  color: var(--hp-text-muted);
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
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--hp-text);
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

/* ── Code Showcase ─────────────────────────────────────────── */

.showcase {
  padding: 3rem 1.5rem;
  background: var(--hp-surface-alt);
  border-top: 1px solid var(--hp-border);
}

.showcase-inner {
  max-width: 800px;
  margin: 0 auto;
}

.section-title {
  font-size: 1.75rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--hp-text);
  margin: 0 0 0.5rem;
  text-wrap: balance;
}

.section-subtitle {
  font-size: 1.0625rem;
  color: var(--hp-text-muted);
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

/* ── Featured row ─────────────────────────────────────────── */

.featured-row {
  margin-bottom: 2.5rem;
  display: block;
}

.featured-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--hp-purple);
  margin: 0 0 0.875rem;
  letter-spacing: 0.01em;
}

.featured-tiles {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
}

.featured-tile {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0.625rem 0.875rem;
  border-radius: var(--rounded-md);
  background: var(--hp-surface-alt);
  border: 1px solid transparent;
  text-decoration: none;
  transition:
    border-color 0.15s ease-out,
    background 0.15s ease-out;
}

.featured-tile:hover {
  border-color: var(--hp-purple);
  background: var(--hp-purple-subtle);
}

.featured-tile-logo {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
}

.featured-tile-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.featured-tile-name {
  font-size: 0.8125rem;
  font-weight: 600;
  font-family: var(--font-mono);
  color: var(--hp-text);
}

.featured-tile-desc {
  font-size: 0.75rem;
  color: var(--hp-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.featured-tile-arrow {
  color: var(--hp-text-muted);
  flex-shrink: 0;
  transition:
    color 0.15s ease-out,
    transform 0.15s ease-out;
}

.featured-tile:hover .featured-tile-arrow {
  color: var(--hp-purple);
  transform: translateX(2px);
}

/* ── Package Explorer ──────────────────────────────────────── */

.explorer {
  padding: 4rem 1.5rem;
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

.package-tile:hover {
  background: var(--hp-purple-subtle);
  box-shadow: 0 0 0 1px var(--hp-purple-glow);
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
  font-size: 0.75rem;
  color: var(--hp-text-muted);
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
  padding: 4rem 1.5rem;
}

.community-inner {
  max-width: 900px;
  margin: 0 auto;
}

.community-links {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 2rem;
}

.community-card-link {
  display: block;
  text-decoration: none;
}

.community-card-link sg-card {
  transition: transform 0.15s ease-out;
}

.community-card-link:hover sg-card {
  --card-border-color: var(--hp-purple);
  --card-shadow: 0 4px 20px var(--hp-purple-glow), 0 0 0 3px var(--hp-purple-glow);
  transform: translateY(-2px);
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

.community-card-link:hover .community-card-arrow {
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
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--hp-text);
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

.footer-bottom sg-separator {
  margin-bottom: 1.25rem;
}

.footer-copyright {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 0.8125rem;
  color: var(--hp-text-muted);
  margin: 0;
}

.footer-copyright sg-icon {
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
  padding: 4rem 1.5rem;
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
}

.codex-ai-title {
  font-size: clamp(1.5rem, 3vw, 2rem);
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--hp-text);
  margin: 0;
  text-wrap: balance;
}

.codex-ai-desc {
  font-size: 1rem;
  line-height: 1.65;
  color: var(--hp-text-muted);
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

.codex-cap sg-icon {
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

.codex-learn-link sg-icon {
  transition: transform 0.15s ease-out;
}

.codex-learn-link:hover sg-icon {
  transform: translateX(3px);
}

/* Chat content styles (window chrome is in sg-code-window) */

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

  .featured-tiles {
    grid-template-columns: 1fr;
  }

  .community-links {
    grid-template-columns: 1fr;
  }

  .footer-top {
    grid-template-columns: 1fr;
    gap: 2rem;
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
</style>

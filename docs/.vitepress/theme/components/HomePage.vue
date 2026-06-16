<script setup lang="ts">
import { useData } from 'vitepress';
import { computed, onMounted, onUnmounted, ref } from 'vue';

const prefersReducedMotion = ref(false);

// Three orbital rings in root SVG space (viewBox 0 0 64 64).
// Each ring: center (cx,cy), semi-axes (rx,ry), tilt angle in radians.
// Derived from logo.svg g1 matrix(4,0,0,4,-249,-70.4) applied to the
// Inkscape-local ring ellipses. See inline SVG comment for full derivation.
const RINGS = [
  { cx: 32.0, cy: 32.0, rx: 28.902, ry: 11.221, tilt: -Math.PI / 2, dur: 3800 },
  { cx: 27.15, cy: 23.72, rx: 28.902, ry: 11.221, tilt: (-Math.PI * 5) / 6, dur: 5200 },
  { cx: 36.84, cy: 23.71, rx: 28.902, ry: 11.221, tilt: -Math.PI / 6, dur: 4500 },
];

const TAIL_LEN = 18; // comet tail length (number of ghost positions)

type Pt = { x: number; y: number };

// Current head + ring-buffer tail per electron
const electrons = ref(
  RINGS.map(() => ({
    head: { x: 0, y: 0 } as Pt,
    tail: [] as Pt[],
  })),
);

let rafId = 0;
// Phase offsets (0..1) so each electron starts at a different point on its ring
const phases = [0, -1.7 / 5.2, -0.9 / 4.5];

// Nucleus comet tail animation — tail tip moves toward ball, ball stays fixed.
// Tail tip in absolute coords: (74.014653, 20.358239)
// Ball entry in absolute coords: tail tip + cumulative tail offsets = (69.239759, 22.948267)
// Animation: move start point toward ball by (1-t), scale tail segments by t so they
// still connect start→ball. Ball and everything after stays at its fixed absolute position.
const TAIL_TIP = { x: 74.014653, y: 20.358239 };
const BALL_ENTRY = { x: 69.239759, y: 22.948267 }; // = tail tip + sum of 3 tail segs

function buildNucleusTailD(t: number): string {
  // Start point moves toward ball as t decreases
  const sx = TAIL_TIP.x + (BALL_ENTRY.x - TAIL_TIP.x) * (1 - t);
  const sy = TAIL_TIP.y + (BALL_ENTRY.y - TAIL_TIP.y) * (1 - t);
  // Tail segments scaled by t (they still sum to BALL_ENTRY - new start)
  const sc = (v: number) => (v * t).toFixed(6);
  // Spike tip also scales (it returns from ball side back toward tail tip)
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
  // Animate nucleus tail: breathe in toward ball and back out
  if (!prefersReducedMotion.value) {
    const t = 0.845 + Math.sin(ts / 700) * 0.125; // oscillates 0.72 → 0.97
    nucleusTailD.value = buildNucleusTailD(t);
  }

  electrons.value = RINGS.map((r, i) => {
    const head = posAt(r, ts, phases[i]);
    // Sample tail positions by stepping back in time uniformly
    const tail: Pt[] = [];
    for (let t = 1; t <= TAIL_LEN; t++) {
      tail.push(posAt(r, ts - t * 16, phases[i])); // ~1 frame (16ms) per tail segment
    }
    return { head, tail };
  });
  rafId = requestAnimationFrame(tickElectrons);
}

const { isDark, theme } = useData();

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
    name: 'State & Reactivity',
    icon: 'zap',
    packages: [
      { id: 'ripple', tagline: 'Signals, computed, effects' },
      { id: 'craft', tagline: 'Web component primitives' },
      { id: 'clockwork', tagline: 'Finite state machines' },
      { id: 'forge', tagline: 'Form state & validation' },
    ],
  },
  {
    name: 'Data & Network',
    icon: 'database',
    packages: [
      { id: 'courier', tagline: 'HTTP client & caching' },
      { id: 'pulse', tagline: 'WebSocket client & presence' },
      { id: 'vault', tagline: 'Browser storage' },
      { id: 'sourcerer', tagline: 'Reactive data sources' },
      { id: 'spell', tagline: 'Schema validation' },
    ],
  },
  {
    name: 'UI & Interaction',
    icon: 'layers',
    packages: [
      { id: 'sigil', tagline: 'Accessible components' },
      { id: 'prism', tagline: 'SVG charts' },
      { id: 'orbit', tagline: 'Floating positioning' },
      { id: 'dnd', tagline: 'Drag & drop' },
      { id: 'scroll', tagline: 'Virtual lists' },
    ],
  },
  {
    name: 'Architecture',
    icon: 'box',
    packages: [
      { id: 'conduit', tagline: 'Dependency injection' },
      { id: 'herald', tagline: 'Typed event bus' },
      { id: 'ward', tagline: 'RBAC & permissions' },
      { id: 'wayfinder', tagline: 'Client-side routing' },
      { id: 'familiar', tagline: 'Web Worker pool' },
    ],
  },
  {
    name: 'Utilities',
    icon: 'wrench',
    packages: [
      { id: 'arsenal', tagline: '75+ utility functions' },
      { id: 'tempo', tagline: 'Date & time' },
      { id: 'lingua', tagline: 'i18n & pluralization' },
      { id: 'rune', tagline: 'Structured logging' },
      { id: 'coins', tagline: 'Monetary arithmetic' },
      { id: 'codex', tagline: 'AI / MCP server' },
    ],
  },
];

const copied = ref(false);
const copyError = ref(false);
const installCmd = 'pnpm add @vielzeug/arsenal';

async function copyInstall() {
  try {
    await navigator.clipboard.writeText(installCmd);
    copied.value = true;
    copyError.value = false;
    setTimeout(() => (copied.value = false), 2000);
  } catch {
    copyError.value = true;
    setTimeout(() => (copyError.value = false), 3000);
  }
}

const heroVisible = ref(false);
const categoriesVisible = ref(false);

const stats = computed(() => [
  { icon: 'package', value: String(packageCount.value || '—'), label: 'Packages' },
  { icon: 'link-2', value: '0', label: 'External deps' },
  { icon: 'cpu', value: 'ES2022', label: 'ES Target' },
  { icon: 'scale', value: 'MIT', label: 'License' },
]);

onMounted(() => {
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  prefersReducedMotion.value = mq.matches;
  mq.addEventListener('change', (e) => {
    prefersReducedMotion.value = e.matches;
    if (e.matches) {
      cancelAnimationFrame(rafId);
    } else {
      rafId = requestAnimationFrame(tickElectrons);
    }
  });

  if (!prefersReducedMotion.value) {
    rafId = requestAnimationFrame(tickElectrons);
  }

  requestAnimationFrame(() => {
    heroVisible.value = true;
    setTimeout(() => (categoriesVisible.value = true), 200);
  });
});

onUnmounted(() => cancelAnimationFrame(rafId));
</script>

<template>
  <div class="home-page">
    <!-- Hero -->
    <section class="hero" :class="{ visible: heroVisible }">
      <div class="hero-inner">
        <div class="hero-content">
          <div class="hero-badge">
            <sg-badge variant="primary">{{ packageCount }} packages</sg-badge>
            <sg-badge v-if="monoVersion" variant="secondary">{{ monoVersion }}</sg-badge>
          </div>
          <h1 class="hero-title">
            <span class="hero-title-main">Vielzeug</span>
            <span class="hero-title-sub">Many tools. One Good Decision.</span>
          </h1>
          <p class="hero-description">
            A curated ecosystem of zero-dependency, tree-shakeable TypeScript packages. Each one a focused spell —
            together, magical.
          </p>
          <div class="hero-values">
            <span class="value-item"><sg-icon name="shield-check" size="16"></sg-icon> Type-safe</span>
            <span class="value-item"><sg-icon name="package" size="16"></sg-icon> Zero deps</span>
            <span class="value-item"><sg-icon name="scissors" size="16"></sg-icon> Tree-shakeable</span>
            <span class="value-item"><sg-icon name="monitor" size="16"></sg-icon> ESM + CJS</span>
          </div>
          <div class="hero-install">
            <button
              type="button"
              class="install-box"
              :aria-label="
                copied ? 'Copied!' : copyError ? 'Copy failed — select and copy manually' : 'Copy install command'
              "
              @click="copyInstall">
              <code>{{ installCmd }}</code>
              <sg-icon
                :name="copied ? 'check' : 'copy'"
                size="14"
                class="install-copy-icon"
                aria-hidden="true"></sg-icon>
            </button>
            <div aria-live="polite" aria-atomic="true" class="sr-only">
              {{ copied ? 'Copied to clipboard.' : copyError ? 'Copy failed. Please select and copy manually.' : '' }}
            </div>
          </div>
          <div class="hero-actions">
            <a href="/guide/" tabindex="-1">
              <sg-button variant="solid" color="primary" size="md">
                <sg-icon slot="prefix" name="book-open" size="16"></sg-icon>
                Get Started
              </sg-button>
            </a>
            <a href="https://github.com/helmuthdu/vielzeug" target="_blank" rel="noopener noreferrer" tabindex="-1">
              <sg-button variant="outline" color="primary" size="md"> GitHub </sg-button>
            </a>
          </div>
        </div>
        <div class="hero-visual">
          <div class="hero-logo-wrapper" aria-label="Vielzeug logo" role="img">
            <svg
              class="hero-logo"
              width="256"
              height="256"
              viewBox="0 0 64 64"
              fill="none"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg">
              <!-- Original logo geometry verbatim — rings + nucleus -->
              <g transform="matrix(4.0000082,0,0,4.0000082,-249.00051,-70.402338)">
                <!-- Nucleus: original bolt path + glow circle -->
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
                <!-- Static electron fallback (reduced-motion) — original positions -->
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

              <!--
                Animated electrons — rendered in ROOT SVG space (viewBox 0 0 64 64).
                Positions driven by tickElectrons() rAF loop via `electrons` ref.
                Each electron: soft glow halo + solid white dot.
              -->
              <template v-if="!prefersReducedMotion">
                <g v-for="(e, i) in electrons" :key="i">
                  <!-- Comet tail: oldest segment first (painted under the head) -->
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
    <section class="showcase">
      <div class="showcase-inner">
        <h2 class="section-title">Compose your toolkit</h2>
        <p class="section-subtitle">Import what you need. Each package works alone or together.</p>
        <div class="code-window">
          <div class="code-header">
            <span class="code-lang">ts</span>
            <span class="code-filename">app.ts</span>
          </div>
          <pre
            class="code-body"><code><span class="hl-keyword">import</span> { createForm } <span class="hl-keyword">from</span> <span class="hl-string">'@vielzeug/forge'</span>;
<span class="hl-keyword">import</span> { s } <span class="hl-keyword">from</span> <span class="hl-string">'@vielzeug/spell'</span>;
<span class="hl-keyword">import</span> { createApi } <span class="hl-keyword">from</span> <span class="hl-string">'@vielzeug/courier'</span>;
<span class="hl-keyword">import</span> { createLogger } <span class="hl-keyword">from</span> <span class="hl-string">'@vielzeug/rune'</span>;

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
        </div>
      </div>
    </section>

    <!-- Package Explorer -->
    <section class="explorer" :class="{ visible: categoriesVisible }">
      <div class="explorer-inner">
        <h2 class="section-title">The complete toolkit</h2>
        <p class="section-subtitle">24 packages, each focused on one domain. Pick what you need.</p>
        <div class="category-grid">
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
        </div>
      </div>
    </section>

    <!-- Stats -->
    <section class="stats">
      <div class="stats-inner">
        <dl class="stats-list">
          <div v-for="s in stats" :key="s.label" class="stat">
            <dt class="stat-label">{{ s.label }}</dt>
            <dd class="stat-value">{{ s.value }}</dd>
          </div>
        </dl>
      </div>
    </section>

    <!-- Community & Support -->
    <section class="community">
      <div class="community-inner">
        <h2 class="section-title">Community & Support</h2>
        <p class="section-subtitle">Questions, bugs, or want to contribute? We'd love to hear from you.</p>
        <div class="community-links">
          <a
            href="https://github.com/helmuthdu/vielzeug/issues"
            target="_blank"
            rel="noopener noreferrer"
            class="community-card">
            <div class="community-card-icon">
              <sg-icon name="circle-alert" size="22"></sg-icon>
            </div>
            <div class="community-card-body">
              <span class="community-card-title">GitHub Issues</span>
              <span class="community-card-desc">Report bugs or request features</span>
            </div>
            <sg-icon name="arrow-right" size="16" class="community-card-arrow"></sg-icon>
          </a>
          <a
            href="https://github.com/helmuthdu/vielzeug/discussions"
            target="_blank"
            rel="noopener noreferrer"
            class="community-card">
            <div class="community-card-icon">
              <sg-icon name="message-circle" size="22"></sg-icon>
            </div>
            <div class="community-card-body">
              <span class="community-card-title">Discussions</span>
              <span class="community-card-desc">Ask questions and share ideas</span>
            </div>
            <sg-icon name="arrow-right" size="16" class="community-card-arrow"></sg-icon>
          </a>
          <a
            href="https://github.com/helmuthdu/vielzeug/blob/main/CONTRIBUTING.md"
            target="_blank"
            rel="noopener noreferrer"
            class="community-card">
            <div class="community-card-icon">
              <sg-icon name="git-pull-request" size="22"></sg-icon>
            </div>
            <div class="community-card-body">
              <span class="community-card-title">Contributing</span>
              <span class="community-card-desc">Learn how to contribute</span>
            </div>
            <sg-icon name="arrow-right" size="16" class="community-card-arrow"></sg-icon>
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
          <p class="footer-tagline">Zero deps. Fully tree-shakeable.</p>
        </div>
        <div class="footer-links-col">
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
        </div>
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
  --hp-radius: var(--rounded-xl);
  padding-top: var(--size-10);
}

.dark .home-page {
  --hp-purple-glow: color-mix(in oklch, var(--color-primary) 15%, transparent);
  --hp-purple-subtle: var(--color-primary-backdrop);
}

/* ── Hero ──────────────────────────────────────────────────── */

.hero {
  padding: 2rem 1.5rem 3rem;
  opacity: 0;
  transform: translateY(12px);
  transition:
    opacity 0.6s ease-out,
    transform 0.6s ease-out;
}

.hero.visible {
  opacity: 1;
  transform: translateY(0);
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

.install-box {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 0.625rem 1rem;
  background: var(--hp-surface-alt);
  border: 1px solid var(--hp-border);
  border-radius: var(--hp-radius);
  cursor: pointer;
  transition:
    border-color 0.2s ease-out,
    box-shadow 0.2s ease-out;
  font-family: var(--font-mono);
  font-size: 0.875rem;
  color: var(--hp-text);
  font-weight: inherit;
  text-align: left;
}

.install-box:hover {
  border-color: var(--hp-purple);
  box-shadow: 0 0 0 3px var(--hp-purple-glow);
}

.install-copy-icon {
  opacity: 0.55;
  flex-shrink: 0;
  transition: opacity 0.15s ease-out;
}

.install-box:hover .install-copy-icon {
  opacity: 0.9;
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
  will-change: transform;
  border-radius: 50%;
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
  padding: 4rem 1.5rem;
  background: var(--hp-surface-alt);
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

.code-window {
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--hp-border);
  background: var(--hp-surface);
}

.code-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0.75rem 1rem;
  background: var(--hp-surface-alt);
  border-bottom: 1px solid var(--hp-border);
}

.code-lang {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.6875rem;
  font-family: var(--font-mono);
  font-weight: 600;
  color: var(--hp-purple);
  background: var(--hp-purple-subtle);
  border: 1px solid oklch(70% 0.12 293deg / 20%);
  letter-spacing: 0.03em;
}

.code-filename {
  margin-left: 8px;
  font-size: 0.8125rem;
  font-family: var(--font-mono);
  color: var(--hp-text-muted);
}

.code-body {
  padding: 1.25rem 1.5rem;
  margin: 0;
  font-family: var(--font-mono);
  font-size: 0.8125rem;
  line-height: 1.7;
  overflow-x: auto;
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
  padding: 4rem 1.5rem;
  opacity: 0;
  transform: translateY(12px);
  transition:
    opacity 0.6s ease-out 0.1s,
    transform 0.6s ease-out 0.1s;
}

.explorer.visible {
  opacity: 1;
  transform: translateY(0);
}

.explorer-inner {
  max-width: 1152px;
  margin: 0 auto;
}

.category-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 2rem;
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
  border-radius: 4px;
}

/* ── Stats ─────────────────────────────────────────────────── */

.stats {
  padding: 2.5rem 1.5rem;
  background: var(--hp-surface-alt);
  border-top: 1px solid var(--hp-border);
  border-bottom: 1px solid var(--hp-border);
}

.stats-inner {
  max-width: 900px;
  margin: 0 auto;
}

.stats-list {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0;
  margin: 0;
  padding: 0;
  list-style: none;
  border: 1px solid var(--hp-border);
  border-radius: var(--hp-radius);
  overflow: hidden;
  background: var(--hp-surface);
}

.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 1.5rem 1rem;
  border-right: 1px solid var(--hp-border);
}

.stat:last-child {
  border-right: none;
}

.stat-value {
  font-size: 1.625rem;
  font-weight: 800;
  font-family: var(--font-mono);
  letter-spacing: -0.03em;
  color: var(--hp-purple);
  margin: 0;
}

.stat-label {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--hp-text-muted);
  margin: 0;
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

.community-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem 1.5rem;
  border-radius: 12px;
  border: 1px solid var(--hp-border);
  background: var(--hp-surface);
  text-decoration: none;
  transition:
    border-color 0.2s ease-out,
    box-shadow 0.2s ease-out,
    transform 0.15s ease-out;
}

.community-card:hover {
  border-color: var(--hp-purple);
  box-shadow:
    0 4px 20px var(--hp-purple-glow),
    0 0 0 3px var(--hp-purple-glow);
  transform: translateX(4px);
}

.community-card-icon {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: var(--hp-purple-subtle);
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

.community-card-title {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--hp-text);
}

.community-card-desc {
  font-size: 0.8125rem;
  color: var(--hp-text-muted);
}

.community-card-arrow {
  color: var(--hp-text-muted);
  flex-shrink: 0;
  transition:
    color 0.15s ease-out,
    transform 0.15s ease-out;
}

.community-card:hover .community-card-arrow {
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

.footer-tagline {
  font-size: 0.8125rem;
  color: var(--hp-text-muted);
  margin: 0;
}

.footer-links-col {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2rem;
}

.footer-link-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.footer-link-heading {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--hp-text);
  margin: 0 0 0.25rem;
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

  .category-grid {
    grid-template-columns: 1fr;
  }

  .stats-list {
    grid-template-columns: repeat(2, 1fr);
  }

  .stat:nth-child(2) {
    border-right: none;
  }

  .stat:nth-child(1),
  .stat:nth-child(2) {
    border-bottom: 1px solid var(--hp-border);
  }

  .community-links {
    grid-template-columns: 1fr;
  }

  .footer-top {
    grid-template-columns: 1fr;
    gap: 2rem;
  }

  .footer-links-col {
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .hero,
  .explorer {
    opacity: 1;
    transform: none;
    transition: none;
  }

  .stat,
  .community-card,
  .install-box,
  .action-primary,
  .action-secondary {
    transition: none;
    transform: none;
  }

  .hero-logo-wrapper::before {
    animation: none;
  }
}
</style>

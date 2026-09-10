<script lang="ts" setup>
import { useData } from 'vitepress';
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue';
import { SHOWCASE_DEMOS, type ShowcaseDemoId, showcaseDemoById } from './showcaseDemos';

const { isDark } = useData();
const selectedId = ref<ShowcaseDemoId>('voyage');
const selectedDemo = computed(() => showcaseDemoById(selectedId.value) ?? SHOWCASE_DEMOS[0]);

const imageFor = (name: string) => `/images/${name}_${isDark.value ? 'dark' : 'light'}.webp`;

const syncFromHash = (scroll = false) => {
  const demo = showcaseDemoById(globalThis.location?.hash.slice(1) ?? '');
  if (!demo) return;

  selectedId.value = demo.id;
  if (scroll) void nextTick(() => document.getElementById('demos')?.scrollIntoView());
};

const selectDemo = (id: ShowcaseDemoId, scroll = false) => {
  selectedId.value = id;
  const url = new URL(window.location.href);
  url.hash = id;
  window.history.pushState(null, '', url);
  if (scroll) void nextTick(() => document.getElementById('demos')?.scrollIntoView());
};

const handleDemoChange = (event: Event) => {
  const demo = showcaseDemoById((event as CustomEvent<{ value: string }>).detail.value);
  if (demo) selectDemo(demo.id);
};

const handlePopState = () => syncFromHash();

onMounted(() => {
  syncFromHash(Boolean(window.location.hash));
  window.addEventListener('popstate', handlePopState);
});

onUnmounted(() => window.removeEventListener('popstate', handlePopState));
</script>

<template>
  <main class="showcase-page">
    <section aria-labelledby="showcase-title" class="showcase-hero">
      <div class="hero-inner">
        <div class="hero-copy">
          <h1 id="showcase-title">
            Compose the tools.
            <strong>Build the product.</strong>
          </h1>
          <p>
            Focused TypeScript packages for everything from UI and state to routing, data, forms, and domain logic.
            Independently useful. Designed to work together.
          </p>
          <div class="hero-actions">
            <ore-button color="primary" effect="shine" href="#demos" rounded="lg" size="lg">
              Explore reference apps
              <ore-icon aria-hidden="true" name="arrow-down" size="16" slot="suffix"></ore-icon>
            </ore-button>
            <ore-button href="/guide/#what-are-you-building" rounded="lg" size="lg" variant="outline">
              Explore the package ecosystem
            </ore-button>
          </div>
        </div>

        <div aria-label="Voyage, E-commerce, and CRM reference applications" class="app-constellation" role="group">
          <a
            href="#demos"
            v-for="(demo, index) in SHOWCASE_DEMOS"
            :key="demo.id"
            :class="['app-window', `app-window-${index + 1}`]"
            @click.prevent="selectDemo(demo.id, true)">
            <span class="window-label">
              <ore-icon aria-hidden="true" size="14" :name="demo.icon"></ore-icon>
              {{ demo.name }}
            </span>
            <img
              decoding="async"
              :alt="demo.homeAlt"
              :height="demo.imageHeight"
              :src="imageFor(demo.homeImage)"
              :width="demo.imageWidth" />
          </a>
        </div>

        <a class="mobile-hero-preview" href="#demos" @click.prevent="selectDemo(selectedDemo.id, true)">
          <span class="window-label">
            <ore-icon aria-hidden="true" size="14" :name="selectedDemo.icon"></ore-icon>
            {{ selectedDemo.name }}
          </span>
          <img
            decoding="async"
            :alt="selectedDemo.homeAlt"
            :height="selectedDemo.imageHeight"
            :src="imageFor(selectedDemo.homeImage)"
            :width="selectedDemo.imageWidth" />
        </a>

        <ul aria-label="Reference application evidence" class="hero-proof">
          <li>
            <ore-icon aria-hidden="true" name="code-2" size="17"></ore-icon>
            <span>
              <strong>Source included</strong>
              Inspect every implementation
            </span>
          </li>
          <li>
            <ore-icon aria-hidden="true" name="keyboard" size="17"></ore-icon>
            <span>
              <strong>Keyboard tested</strong>
              Focus and navigation verified
            </span>
          </li>
          <li>
            <ore-icon aria-hidden="true" name="sun-moon" size="17"></ore-icon>
            <span>
              <strong>Light and dark</strong>
              Designed in both themes
            </span>
          </li>
          <li>
            <ore-icon aria-hidden="true" name="git-commit-horizontal" size="17"></ore-icon>
            <span>
              <strong>Same-commit demos</strong>
              Deployed with these docs
            </span>
          </li>
        </ul>
      </div>
    </section>

    <section aria-labelledby="demos-title" class="demo-explorer" id="demos">
      <div class="section-heading">
        <h2 id="demos-title">Production-grade reference applications.</h2>
        <p>Choose a product to inspect its workflow, implementation, and package composition.</p>
      </div>

      <ore-tabs
        activation="auto"
        class="demo-tabs"
        color="primary"
        label="Reference applications"
        size="lg"
        variant="solid"
        :value="selectedId"
        @change="handleDemoChange">
        <ore-tab-item slot="tabs" v-for="demo in SHOWCASE_DEMOS" :key="demo.id" :value="demo.id">
          <ore-icon aria-hidden="true" size="19" slot="prefix" :name="demo.icon"></ore-icon>
          <span class="demo-tab-label">
            <strong>{{ demo.name }}</strong>
            <small>{{ demo.category }}</small>
          </span>
        </ore-tab-item>

        <ore-tab-panel lazy padding="none" v-for="demo in SHOWCASE_DEMOS" :key="demo.id" :value="demo.id">
          <article class="active-demo" v-if="selectedId === demo.id">
            <div class="active-demo-intro">
              <div class="active-demo-copy">
                <ore-badge color="primary" size="sm" variant="flat">{{ demo.category }}</ore-badge>
                <h3 :id="`${demo.id}-title`">{{ demo.headline }}</h3>
                <p>{{ demo.summary }}</p>
                <div class="active-demo-actions">
                  <ore-button color="primary" rounded="lg" size="md" :href="demo.href">
                    Launch {{ demo.name }}
                    <ore-icon aria-hidden="true" name="play" size="15" slot="suffix"></ore-icon>
                  </ore-button>
                  <ore-button
                    rel="noopener noreferrer"
                    rounded="lg"
                    size="md"
                    target="_blank"
                    variant="outline"
                    :href="demo.source">
                    View source
                    <ore-icon aria-hidden="true" name="external-link" size="15" slot="suffix"></ore-icon>
                    <span class="sr-only">(opens in a new tab)</span>
                  </ore-button>
                </div>
              </div>

              <div class="active-demo-stage">
                <div class="detail-window-bar">
                  <span aria-hidden="true" class="window-dots">
                    <i></i>
                    <i></i>
                    <i></i>
                  </span>
                  <span>{{ demo.name }} · Reference workflow</span>
                </div>
                <img
                  decoding="async"
                  :alt="demo.detailAlt"
                  :height="demo.imageHeight"
                  :src="imageFor(demo.detailImage)"
                  :width="demo.imageWidth" />
              </div>
            </div>

            <div class="active-demo-evidence">
              <section :aria-labelledby="`${demo.id}-demonstrates-title`">
                <h3 :id="`${demo.id}-demonstrates-title`">What it demonstrates</h3>
                <ul class="feature-list">
                  <li v-for="feature in demo.features" :key="feature.title">
                    <ore-icon aria-hidden="true" size="19" :name="feature.icon"></ore-icon>
                    <span>
                      <strong>{{ feature.title }}</strong>
                      <small>{{ feature.description }}</small>
                    </span>
                  </li>
                </ul>
              </section>

              <section :aria-labelledby="`${demo.id}-packages-title`">
                <h3 :id="`${demo.id}-packages-title`">Technical composition</h3>
                <ul class="package-list">
                  <li v-for="pkg in demo.packages" :key="pkg.name">
                    <a :href="`/${pkg.name}/`">
                      <strong>@vielzeug/{{ pkg.name }}</strong>
                      <span>{{ pkg.purpose }}</span>
                    </a>
                  </li>
                </ul>
              </section>
            </div>
          </article>
        </ore-tab-panel>
      </ore-tabs>
      <span aria-live="polite" class="sr-only" role="status">{{ selectedDemo.name }} selected</span>
    </section>

    <section aria-labelledby="refine-title" class="refine-proof">
      <div class="refine-copy">
        <ore-icon aria-hidden="true" name="component" size="24"></ore-icon>
        <h2 id="refine-title">Refine is the UI layer.</h2>
        <p>
          Framework-agnostic web components provide the controls and visual language. Focused Vielzeug packages supply
          the application behavior around them.
        </p>
        <div class="refine-actions">
          <ore-button color="primary" href="/refine/" rounded="lg" size="md">Explore Refine components</ore-button>
          <ore-button href="/refine/accessibility" rounded="lg" size="md" variant="outline">
            Accessibility approach
          </ore-button>
        </div>
      </div>

      <div class="architecture-proof">
        <div class="architecture-row">
          <ore-badge color="primary" size="sm" variant="flat">UI</ore-badge>
          <span>
            <strong>Refine</strong>
            <small>Buttons, cards, badges, navigation, forms, and dialogs</small>
          </span>
        </div>
        <div class="architecture-row">
          <ore-badge color="info" size="sm" variant="flat">Rendering</ore-badge>
          <span>
            <strong>Ore</strong>
            <small>Declarative, framework-neutral custom elements</small>
          </span>
        </div>
        <div class="architecture-row">
          <ore-badge color="secondary" size="sm" variant="flat">Behavior</ore-badge>
          <span>
            <strong>Focused packages</strong>
            <small>Routing, state, data, forms, search, permissions, and domain logic</small>
          </span>
        </div>
        <div aria-label="Example Vielzeug composition" role="region">
          <pre><code><span>import</span> '@vielzeug/refine/button'
<span>import</span> { createRouter } <span>from</span> '@vielzeug/wayfinder'
<span>import</span> { signal } <span>from</span> '@vielzeug/ripple'</code></pre>
        </div>
      </div>
    </section>

    <footer class="site-footer">
      <div class="footer-top">
        <div class="footer-brand-col">
          <div class="footer-brand">
            <img alt="" aria-hidden="true" class="footer-logo" src="/logo-main.svg" />
            <span class="footer-brand-name">Vielzeug</span>
          </div>
          <ore-text class="footer-tagline" color="muted" size="sm">Focused TypeScript tools. MIT licensed.</ore-text>
        </div>
        <ore-grid class="footer-links-col" cols="1" cols-sm="3" gap="xl">
          <div class="footer-link-group">
            <ore-text as="h4" class="footer-link-heading" size="sm" weight="semibold">Resources</ore-text>
            <a href="/guide/">Documentation</a>
            <a href="/repl">REPL Playground</a>
            <a href="/refine/">Components</a>
          </div>
          <div class="footer-link-group">
            <ore-text as="h4" class="footer-link-heading" size="sm" weight="semibold">Community</ore-text>
            <a href="https://github.com/helmuthdu/vielzeug" rel="noopener noreferrer" target="_blank">GitHub</a>
            <a href="https://github.com/helmuthdu/vielzeug/discussions" rel="noopener noreferrer" target="_blank">
              Discussions
            </a>
            <a
              href="https://github.com/helmuthdu/vielzeug/blob/main/CONTRIBUTING.md"
              rel="noopener noreferrer"
              target="_blank">
              Contributing
            </a>
          </div>
          <div class="footer-link-group">
            <ore-text as="h4" class="footer-link-heading" size="sm" weight="semibold">Legal</ore-text>
            <a href="https://github.com/helmuthdu/vielzeug/blob/main/LICENSE" rel="noopener noreferrer" target="_blank">
              MIT License
            </a>
          </div>
        </ore-grid>
      </div>
      <div class="footer-bottom">
        <ore-separator></ore-separator>
        <ore-text align="center" as="p" class="footer-copyright" color="muted" size="sm">
          <ore-icon aria-hidden="true" name="heart" size="14"></ore-icon>
          Built by
          <a href="https://github.com/helmuthdu" rel="noopener noreferrer" target="_blank">Helmuth Saatkamp</a>
        </ore-text>
      </div>
    </footer>
  </main>
</template>

<style scoped>
.showcase-page {
  --showcase-max: 1240px;
  --showcase-border: color-mix(in oklch, var(--color-divider) 82%, transparent);
  --showcase-muted: var(--text-color-secondary);
  overflow-x: clip;
  color: var(--text-color-body);
  background: var(--color-contrast-50);
}

.showcase-page :is(h1, h2, h3, h4, p) {
  margin: 0;
}

.showcase-page :is(a, ore-button):focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 4px;
}

.showcase-page ::selection {
  color: var(--color-primary-contrast);
  background: var(--color-primary);
}

.showcase-hero {
  min-height: calc(100svh - var(--vp-nav-height));
  overflow: hidden;
  background:
    linear-gradient(135deg, color-mix(in oklch, var(--color-primary-backdrop) 48%, transparent), transparent 40%),
    var(--color-contrast-50);
}

.hero-inner {
  display: grid;
  grid-template-columns: minmax(0, 0.82fr) minmax(520px, 1.18fr);
  row-gap: var(--size-8);
  column-gap: clamp(2rem, 5vw, 5rem);
  align-items: center;
  max-width: var(--showcase-max);
  min-height: calc(100svh - var(--vp-nav-height));
  padding: clamp(3rem, 6vh, 5rem) var(--size-6);
  margin: 0 auto;
}

.hero-copy {
  position: relative;
  z-index: 2;
}

.hero-copy h1 {
  max-width: 14ch;
  font-size: clamp(2.75rem, 4.2vw, 4.5rem);
  font-weight: var(--font-bold);
  line-height: 1.02;
  letter-spacing: -0.035em;
  text-wrap: balance;
}

.hero-copy h1 strong {
  color: var(--color-primary);
}

.hero-copy > p {
  max-width: 56ch;
  margin-top: var(--size-6);
  font-size: clamp(1rem, 1.15vw, 1.15rem);
  line-height: 1.6;
  color: var(--showcase-muted);
}

.hero-actions,
.active-demo-actions,
.refine-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--size-3);
  margin-top: var(--size-8);
}

.app-constellation {
  position: relative;
  width: min(680px, 52vw);
  aspect-ratio: 1.08;
  perspective: 1400px;
}

.app-window,
.mobile-hero-preview {
  overflow: hidden;
  color: var(--text-color-body);
  text-decoration: none;
  background: var(--color-contrast-100);
  border-radius: 14px;
  box-shadow: 0 28px 70px rgb(0 0 0 / 18%);
}

.app-window {
  position: absolute;
  display: block;
  transition:
    transform 350ms cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 350ms ease;
}

.app-window:hover,
.app-window:focus-visible {
  z-index: 4;
  box-shadow: 0 34px 80px rgb(0 0 0 / 24%);
}

.app-window img,
.mobile-hero-preview img {
  display: block;
  width: 100%;
  height: auto;
}

.window-label {
  display: flex;
  gap: var(--size-1-5);
  align-items: center;
  min-height: 32px;
  padding: 0 var(--size-3);
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  background: var(--color-contrast-100);
}

.app-window-1 {
  top: 21%;
  left: 2%;
  z-index: 3;
  width: 76%;
  transform: rotateY(4deg) rotateZ(-1deg);
  animation: compose-front 800ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

.app-window-2 {
  top: 1%;
  right: -8%;
  z-index: 1;
  width: 62%;
  transform: rotateY(-8deg) rotateZ(2deg);
  animation: compose-right 900ms 80ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

.app-window-3 {
  right: -3%;
  bottom: 2%;
  z-index: 2;
  width: 66%;
  transform: rotateY(-5deg) rotateZ(1deg);
  animation: compose-bottom 900ms 150ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

.app-window-1:hover,
.app-window-1:focus-visible {
  transform: translateY(-8px) rotateY(2deg) rotateZ(-0.5deg);
}

.app-window-2:hover,
.app-window-2:focus-visible,
.app-window-3:hover,
.app-window-3:focus-visible {
  transform: translateY(-8px) rotateY(-2deg) rotateZ(0.5deg);
}

.mobile-hero-preview {
  display: none;
}

.hero-proof {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  grid-column: 1 / -1;
  gap: var(--size-4);
  padding: var(--size-5) 0 0;
  margin: 0;
  list-style: none;
  border-top: 1px solid var(--showcase-border);
}

.hero-proof li {
  display: grid;
  grid-template-columns: 24px 1fr;
  gap: var(--size-2);
  align-items: start;
  margin: 0;
}

.hero-proof ore-icon {
  margin-top: 2px;
  color: var(--color-primary);
}

.hero-proof span {
  display: grid;
  gap: 2px;
}

.hero-proof strong {
  font-size: var(--text-sm);
}

.hero-proof span:not(strong) {
  font-size: var(--text-xs);
  line-height: 1.45;
  color: var(--showcase-muted);
}

.demo-explorer,
.refine-proof {
  max-width: var(--showcase-max);
  padding-inline: var(--size-6);
  margin-inline: auto;
}

.demo-explorer {
  padding-block: clamp(5rem, 9vw, 8rem);
  scroll-margin-top: calc(var(--vp-nav-height) + var(--size-4));
}

.section-heading {
  display: grid;
  grid-template-columns: 1fr minmax(280px, 0.7fr);
  gap: var(--size-8);
  align-items: end;
  margin-bottom: var(--size-8);
}

.section-heading h2,
.refine-proof h2 {
  max-width: 17ch;
  font-size: clamp(2rem, 3.5vw, 3.5rem);
  line-height: 1.05;
  letter-spacing: -0.035em;
  text-wrap: balance;
}

.section-heading p,
.refine-proof p {
  max-width: 62ch;
  line-height: 1.7;
  color: var(--showcase-muted);
}

.demo-tabs {
  --tabs-radius: 14px;
  --tabs-tab-gap: var(--size-2);
}

.demo-tab-label {
  display: grid;
  gap: 2px;
  min-width: 120px;
  text-align: left;
}

.demo-tab-label strong {
  font-size: var(--text-sm);
}

.demo-tab-label small {
  color: var(--showcase-muted);
}

.active-demo {
  margin-top: var(--size-6);
  overflow: hidden;
  background: var(--color-contrast-100);
  border-radius: 16px;
  box-shadow: 0 24px 65px rgb(0 0 0 / 10%);
}

.active-demo-intro {
  display: grid;
  grid-template-columns: minmax(320px, 0.65fr) minmax(0, 1.35fr);
  min-height: 520px;
}

.active-demo-copy {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  padding: clamp(2rem, 5vw, 4rem);
}

.active-demo-copy h3 {
  max-width: 11ch;
  margin-top: var(--size-4);
  font-size: clamp(2.2rem, 4vw, 4rem);
  line-height: 1.02;
  letter-spacing: -0.035em;
  text-wrap: balance;
}

.active-demo-copy > p {
  margin-top: var(--size-4);
  line-height: 1.65;
  color: var(--showcase-muted);
}

.active-demo-stage {
  align-self: center;
  overflow: hidden;
  background: #000;
  border-radius: 12px 0 0 12px;
  box-shadow: 0 20px 55px rgb(0 0 0 / 18%);
}

.detail-window-bar {
  display: flex;
  gap: var(--size-3);
  align-items: center;
  height: 40px;
  padding-inline: var(--size-4);
  font-size: var(--text-xs);
  color: var(--showcase-muted);
  background: var(--color-contrast-50);
}

.window-dots {
  display: flex;
  gap: 6px;
}

.window-dots i {
  width: 8px;
  height: 8px;
  background: var(--color-contrast-300);
  border-radius: 50%;
}

.window-dots i:first-child {
  background: var(--color-error);
}

.window-dots i:nth-child(2) {
  background: var(--color-warning);
}

.window-dots i:last-child {
  background: var(--color-success);
}

.active-demo-stage img {
  display: block;
  width: 100%;
  height: auto;
}

.active-demo-evidence {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(280px, 0.8fr);
  gap: clamp(2rem, 5vw, 5rem);
  padding: clamp(2rem, 5vw, 4rem);
  border-top: 1px solid var(--showcase-border);
}

.active-demo-evidence h3 {
  margin-bottom: var(--size-5);
  font-size: var(--text-xl);
  letter-spacing: -0.025em;
}

.feature-list,
.package-list {
  padding: 0;
  margin: 0;
  list-style: none;
}

.feature-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--size-5) var(--size-6);
}

.feature-list li {
  display: grid;
  grid-template-columns: 24px 1fr;
  gap: var(--size-3);
  align-items: start;
  margin: 0;
}

.feature-list ore-icon {
  margin-top: 2px;
  color: var(--color-primary);
}

.feature-list span {
  display: grid;
  gap: var(--size-1);
}

.feature-list strong,
.package-list strong {
  font-size: var(--text-sm);
}

.feature-list small {
  line-height: 1.55;
  color: var(--showcase-muted);
}

.package-list {
  border-top: 1px solid var(--showcase-border);
}

.package-list li {
  margin: 0;
  border-bottom: 1px solid var(--showcase-border);
}

.package-list a {
  display: flex;
  gap: var(--size-3);
  align-items: center;
  justify-content: space-between;
  padding-block: var(--size-3);
  color: inherit;
  text-decoration: none;
}

.package-list a:hover strong,
.package-list a:focus-visible strong {
  color: var(--color-primary);
}

.package-list span {
  font-size: var(--text-xs);
  color: var(--showcase-muted);
  text-align: right;
}

.refine-proof {
  display: grid;
  grid-template-columns: minmax(0, 0.85fr) minmax(420px, 1.15fr);
  gap: clamp(3rem, 7vw, 7rem);
  align-items: center;
  padding-block: clamp(5rem, 9vw, 8rem);
}

.refine-copy > ore-icon {
  margin-bottom: var(--size-4);
  color: var(--color-primary);
}

.refine-copy p {
  margin-top: var(--size-4);
}

.architecture-proof {
  overflow: hidden;
  background: var(--color-contrast-100);
  border-radius: 16px;
  box-shadow: 0 20px 55px rgb(0 0 0 / 10%);
}

.architecture-row {
  display: grid;
  grid-template-columns: 86px 1fr;
  gap: var(--size-4);
  align-items: center;
  padding: var(--size-4) var(--size-5);
  border-bottom: 1px solid var(--showcase-border);
}

.architecture-row > span {
  display: grid;
  gap: var(--size-1);
}

.architecture-row small {
  color: var(--showcase-muted);
}

.architecture-proof pre {
  padding: var(--size-5);
  margin: 0;
  overflow-x: auto;
  font-size: var(--text-xs);
  line-height: 1.8;
  color: var(--text-color-body);
  background: var(--color-contrast-50);
}

.architecture-proof code span {
  color: var(--color-primary);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  white-space: nowrap;
  border: 0;
  clip: rect(0 0 0 0);
}

.site-footer {
  padding: 3rem 1.5rem 2rem;
  background: var(--color-contrast-100);
  border-top: 1px solid var(--showcase-border);
}

.footer-top {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 3rem;
  max-width: 1152px;
  margin: 0 auto;
}

.footer-brand-col,
.footer-link-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.footer-brand {
  display: flex;
  gap: 10px;
  align-items: center;
}

.footer-logo {
  width: 28px;
  height: 28px;
}

.footer-brand-name {
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--text-color-body);
}

.footer-link-heading {
  margin: 0 0 0.5rem;
}

.footer-link-group a {
  font-size: 0.8125rem;
  color: var(--showcase-muted);
  text-decoration: none;
  transition: color 0.15s ease-out;
}

.footer-link-group a:hover,
.footer-link-group a:focus-visible {
  color: var(--color-primary);
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
  gap: 6px;
  align-items: center;
  justify-content: center;
  margin: 0;
}

.footer-copyright ore-icon {
  color: var(--color-primary);
}

.footer-copyright a {
  font-weight: 500;
  color: var(--text-color-body);
  text-decoration: none;
}

.footer-copyright a:hover,
.footer-copyright a:focus-visible {
  color: var(--color-primary);
}

@keyframes compose-front {
  from {
    opacity: 0;
    filter: blur(8px);
    transform: translate3d(-40px, 36px, -80px) rotateY(7deg) rotateZ(-2deg);
  }
}

@keyframes compose-right {
  from {
    opacity: 0;
    filter: blur(8px);
    transform: translate3d(60px, -24px, -120px) rotateY(-12deg) rotateZ(3deg);
  }
}

@keyframes compose-bottom {
  from {
    opacity: 0;
    filter: blur(8px);
    transform: translate3d(50px, 40px, -100px) rotateY(-10deg) rotateZ(2deg);
  }
}

@media (max-width: 1100px) {
  .hero-inner {
    grid-template-columns: 1fr;
    min-height: auto;
    padding-top: 6rem;
  }

  .hero-copy {
    max-width: 760px;
  }

  .app-constellation {
    width: min(820px, 94vw);
    margin-inline: auto;
  }

  .hero-proof {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .active-demo-intro {
    grid-template-columns: 1fr;
  }

  .active-demo-copy {
    max-width: 720px;
  }

  .active-demo-stage {
    margin-left: clamp(1.5rem, 5vw, 4rem);
    border-radius: 12px 0 0 12px;
  }

  .refine-proof {
    grid-template-columns: 1fr;
  }

  .architecture-proof {
    max-width: 760px;
  }
}

@media (max-width: 760px) {
  .hero-inner {
    gap: var(--size-8);
    padding: 4.5rem var(--size-5) 3rem;
  }

  .hero-copy h1 {
    max-width: 13ch;
    font-size: clamp(2.35rem, 10.5vw, 3.25rem);
  }

  .hero-actions,
  .active-demo-actions,
  .refine-actions {
    display: grid;
  }

  .hero-actions ore-button,
  .active-demo-actions ore-button,
  .refine-actions ore-button {
    width: 100%;
  }

  .app-constellation {
    display: none;
  }

  .mobile-hero-preview {
    display: block;
    width: 100%;
  }

  .hero-proof {
    grid-template-columns: 1fr;
    gap: var(--size-4);
  }

  .demo-explorer,
  .refine-proof {
    padding-inline: var(--size-5);
  }

  .section-heading {
    grid-template-columns: 1fr;
    gap: var(--size-4);
  }

  .demo-tab-label {
    min-width: 104px;
  }

  .active-demo-intro {
    min-height: 0;
  }

  .active-demo-copy {
    padding: var(--size-6);
  }

  .active-demo-copy h3 {
    font-size: clamp(2.25rem, 12vw, 3.25rem);
  }

  .active-demo-stage {
    width: 100%;
    margin: 0;
    border-radius: 0;
    box-shadow: none;
  }

  .active-demo-evidence {
    grid-template-columns: 1fr;
    padding: var(--size-6);
  }

  .feature-list {
    grid-template-columns: 1fr;
  }

  .architecture-row {
    grid-template-columns: 74px 1fr;
    padding-inline: var(--size-4);
  }

  .footer-top {
    grid-template-columns: 1fr;
    gap: 2rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .app-window {
    transition: none;
    animation: none;
  }

  .app-window-1,
  .app-window-2,
  .app-window-3,
  .app-window:hover,
  .app-window:focus-visible {
    transform: none;
  }
}
</style>

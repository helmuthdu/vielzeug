import DefaultTheme from 'vitepress/theme';
import { defineAsyncComponent } from 'vue';

import CodeWindow from './components/CodeWindow.vue';
import ColorPalette from './components/ColorPalette.vue';
import HomePage from './components/HomePage.vue';
import PackageBadges from './components/PackageBadges.vue';
import PackageHero from './components/PackageHero.vue';
import PackageInfo from './components/PackageInfo.vue';
import PackagesMenu from './components/PackagesMenu.vue';

// Import Refine styles - using direct paths for monorepo
// FOUC prevention: hide unupgraded custom elements until their shadow DOM attaches.
// Must be a CSS import (not JS-injected) so the rule is available at first paint.
import '@vielzeug/refine/fouc.css';
import '@vielzeug/refine/tokens.css';
// The Lucide dataset must be evaluated before `refine/register` defines
// `ore-icon`: the icon registry is a plain synchronous Map and each element
// resolves its name once at upgrade, so elements defined first would render
// empty icons for anything parsed before the dataset lands. Keeping this
// static (rather than chained ahead of the dynamic register import below) also
// keeps the bundler's shared runtime helpers out of the register chunk, which
// the SSR build must never evaluate: it defines `class extends HTMLElement`.
import '@vielzeug/refine/icons/lucide/all';
// Import Prism chart styles
import '@vielzeug/prism/theme.css';

import './theme.css';

// Page-scoped heavyweight components are loaded on demand instead of being
// bundled into the shared theme chunk, which every page modulepreloads:
// REPL statically imports the full examples tree and the generated registry
// (several MB of source), and ComponentPreview statically imports the
// refine-preview virtual modules (the inlined refine IIFE bundle plus every
// peer-dependency IIFE used to build preview sandboxes). Keeping them out of
// the theme chunk removes megabytes from the critical path of every page that
// does not use them, most visibly the homepage on mobile.
const ComponentPreview = defineAsyncComponent(() => import('./components/ComponentPreview.vue'));
const Repl = defineAsyncComponent(() => import('./components/REPL.vue'));
const ShowcasePage = defineAsyncComponent(() => import('./components/ShowcasePage.vue'));

// Register Refine's all-components entry as early as possible. The public root
// is deliberately side effect free, so it cannot register the custom elements
// rendered by the docs theme.
// Dynamic import is required for SSR safety (no `window` on server): the
// register module transitively defines custom elements, which throws on Node.
// The static Lucide import above is already evaluated when this line runs, so
// the registry is populated before `ore-icon` is defined.
if (typeof window !== 'undefined') {
  void import('@vielzeug/refine/register');
}

export default {
  ...DefaultTheme,
  enhanceApp({ app }) {
    app.component('CodeWindow', CodeWindow);
    app.component('HomePage', HomePage);
    app.component('REPL', Repl);
    app.component('ShowcasePage', ShowcasePage);
    app.component('ColorPalette', ColorPalette);
    app.component('PackageBadges', PackageBadges);
    app.component('PackageHero', PackageHero);
    app.component('PackageInfo', PackageInfo);
    app.component('PackagesMenu', PackagesMenu);
    app.component('ComponentPreview', ComponentPreview);
  },
};

import { defaultLogger } from '@vielzeug/rune';
import DefaultTheme from 'vitepress/theme';

import CodeWindow from './components/CodeWindow.vue';
import ColorPalette from './components/ColorPalette.vue';
import ComponentPreview from './components/ComponentPreview.vue';
import HomePage from './components/HomePage.vue';
import PackageBadges from './components/PackageBadges.vue';
import PackageHero from './components/PackageHero.vue';
import PackageInfo from './components/PackageInfo.vue';
import PackagesMenu from './components/PackagesMenu.vue';
import Repl from './components/REPL.vue';

// Import Refine styles - using direct paths for monorepo
// FOUC prevention: hide unupgraded custom elements until their shadow DOM attaches.
// Must be a CSS import (not JS-injected) so the rule is available at first paint.
import '@vielzeug/refine/fouc.css';
import '@vielzeug/refine/tokens.css';
// Import Prism chart styles
import '@vielzeug/prism/theme';

import './theme.css';

// Register Refine's all-components entry as early as possible. The public root
// is deliberately side effect free, so it cannot register the custom elements
// rendered by the docs theme.
// Dynamic import is required for SSR safety (no `window` on server).
// Moving it to module-level means it starts loading before enhanceApp runs.
if (typeof window !== 'undefined') {
  import('@vielzeug/refine/register');
}

export default {
  ...DefaultTheme,
  async enhanceApp({ app }) {
    app.component('CodeWindow', CodeWindow);
    app.component('HomePage', HomePage);
    app.component('REPL', Repl);
    app.component('ColorPalette', ColorPalette);
    app.component('PackageBadges', PackageBadges);
    app.component('PackageHero', PackageHero);
    app.component('PackageInfo', PackageInfo);
    app.component('PackagesMenu', PackagesMenu);
    app.component('ComponentPreview', ComponentPreview);

    if (typeof window !== 'undefined') {
      const [prism, ripple] = await Promise.all([import('@vielzeug/prism'), import('@vielzeug/ripple')]);

      window.Prism = prism;
      window.Ripple = ripple;
      window.defaultLogger = defaultLogger;
    }
  },
};

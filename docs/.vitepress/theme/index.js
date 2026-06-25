import { defaultLogger } from '@vielzeug/rune';
import DefaultTheme from 'vitepress/theme';

import CodeWindow from './components/CodeWindow.vue';
import ColorPalette from './components/ColorPalette.vue';
import ComponentPreview from './components/ComponentPreview.vue';
import HomePage from './components/HomePage.vue';
import PackageBadges from './components/PackageBadges.vue';
import PackageHero from './components/PackageHero.vue';
import PackageInfo from './components/PackageInfo.vue';
import Repl from './components/REPL.vue';

// Import Refine styles - using direct paths for monorepo
import '@vielzeug/refine/styles/styles.css';
// Import Prism chart styles
import '@vielzeug/prism/theme/prism.css';

import './theme.css';

// Register refine custom elements as early as possible.
// Dynamic import is required for SSR safety (no `window` on server).
// Moving it to module-level means it starts loading before enhanceApp runs.
if (typeof window !== 'undefined') {
  import('@vielzeug/refine');
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
    app.component('ComponentPreview', ComponentPreview);

    if (typeof window !== 'undefined') {
      window.defaultLogger = defaultLogger;

      const [prism, ripple] = await Promise.all([import('@vielzeug/prism'), import('@vielzeug/ripple')]);

      window.Prism = prism;
      window.Ripple = ripple;
    }
  },
};

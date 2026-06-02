import { Rune } from '@vielzeug/rune';
import DefaultTheme from 'vitepress/theme';

import ColorPalette from './components/ColorPalette.vue';
import ComponentPreview from './components/ComponentPreview.vue';
import PackageBadges from './components/PackageBadges.vue';
import PackageInfo from './components/PackageInfo.vue';
import Repl from './components/REPL.vue';

// Import Sigil styles - using direct paths for monorepo
import '@vielzeug/sigil/styles/styles.css';

import './theme.css';

// Register sigil custom elements as early as possible.
// Dynamic import is required for SSR safety (no `window` on server).
// Moving it to module-level means it starts loading before enhanceApp runs.
if (typeof window !== 'undefined') {
  import('@vielzeug/sigil');
}

export default {
  ...DefaultTheme,
  enhanceApp({ app }) {
    app.component('REPL', Repl);
    app.component('ColorPalette', ColorPalette);
    app.component('PackageBadges', PackageBadges);
    app.component('PackageInfo', PackageInfo);
    app.component('ComponentPreview', ComponentPreview);

    // Make Rune available on a window object
    if (typeof window !== 'undefined') {
      window.Rune = Rune;
    }
  },
};

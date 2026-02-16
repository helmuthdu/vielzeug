import DefaultTheme from 'vitepress/theme';
import { Logit } from '../../../packages/logit/src';
import Repl from './components/REPL.vue';
import PackageBadges from './components/PackageBadges.vue';
import PackageInfo from './components/PackageInfo.vue';

import './theme.css';

export default {
  ...DefaultTheme,
  enhanceApp({ app }) {
    app.component('REPL', Repl);
    app.component('PackageBadges', PackageBadges);
    app.component('PackageInfo', PackageInfo);

    // Make Logit available on a window object
    if (typeof window !== 'undefined') {
      window.Logit = Logit;
    }
  },
};

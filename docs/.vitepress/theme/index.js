import '@vielzeug/buildit/styles/theme.css';
import DefaultTheme from 'vitepress/theme';
import { Logit } from '../../../packages/logit/src';
import ComponentPreview from './components/ComponentPreview.vue';
import PackageBadges from './components/PackageBadges.vue';
import PackageInfo from './components/PackageInfo.vue';
import Repl from './components/REPL.vue';
import './theme.css';

export default {
  ...DefaultTheme,
  enhanceApp({ app }) {
    if (typeof window !== 'undefined') {
      import('@vielzeug/buildit');
    }
    app.component('REPL', Repl);
    app.component('PackageBadges', PackageBadges);
    app.component('PackageInfo', PackageInfo);
    app.component('ComponentPreview', ComponentPreview);

    // Make Logit available on a window object
    if (typeof window !== 'undefined') {
      window.Logit = Logit;
    }
  },
};

import DefaultTheme from 'vitepress/theme';
import { Logit } from '../../../packages/logit/src/logit';
import REPLComponent from './components/REPLComponent.vue';

import './theme.css';

export default {
  ...DefaultTheme,
  enhanceApp({ app }) {
    app.component('REPLComponent', REPLComponent);

    // Make Logit available on window object
    if (typeof window !== 'undefined') {
      window.Logit = Logit;
    }
  },
};

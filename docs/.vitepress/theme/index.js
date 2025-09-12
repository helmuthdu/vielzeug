import DefaultTheme from 'vitepress/theme';
import REPLComponent from './components/REPLComponent.vue';

import './theme.css';

export default {
  ...DefaultTheme,
  enhanceApp({ app }) {
    app.component('REPLComponent', REPLComponent);
  },
};

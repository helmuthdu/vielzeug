import { define, html, bind } from '@vielzeug/ore';

import slideStyles from './carousel-slide.css?inline';

export const CAROUSEL_SLIDE_TAG = 'ore-carousel-slide' as const;

define(CAROUSEL_SLIDE_TAG, {
  props: {},
  setup(_props) {
    bind({
      attr: {
        'aria-roledescription': () => 'slide',
        role: () => 'group',
      },
    });

    return html`<slot></slot>`;
  },
  styles: [slideStyles],
});

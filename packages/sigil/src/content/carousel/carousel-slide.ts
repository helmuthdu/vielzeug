import { define, html } from '@vielzeug/craft';

import slideStyles from './carousel-slide.css?inline';

export const CAROUSEL_SLIDE_TAG = 'sg-carousel-slide' as const;

define(CAROUSEL_SLIDE_TAG, {
  props: {},
  setup(_props, { bind }) {
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

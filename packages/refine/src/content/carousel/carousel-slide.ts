import { bind, define, getHost, html, onMounted } from '@vielzeug/ore';

import slideStyles from './carousel-slide.css?inline';

export const CAROUSEL_SLIDE_TAG = 'ore-carousel-slide' as const;

define(CAROUSEL_SLIDE_TAG, {
  props: {},
  setup(_props) {
    const host = getHost();

    onMounted(() => {
      host.shadowRoot
        ?.querySelector('.content')
        ?.toggleAttribute('inert', host.dataset.variant === 'coverflow' && !host.hasAttribute('data-active'));
    });

    bind({
      attr: {
        'aria-roledescription': () => 'slide',
        role: () => 'group',
      },
    });

    return html`
      <div class="content"><slot></slot></div>
    `;
  },
  styles: [slideStyles],
});

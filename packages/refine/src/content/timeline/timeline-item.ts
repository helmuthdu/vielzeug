import { bind, define, html, useSlots } from '@vielzeug/ore';
import { themableBundle } from '../../shared';
import { colorThemeMixin } from '../../styles';
import type { ThemeColor } from '../../types';
import componentStyles from './timeline-item.css?inline';

/** Properties of a timeline event. */
export type OreTimelineItemProps = {
  /** Semantic marker color; the event text must convey its meaning. */
  color?: ThemeColor;
};

/**
 * An event with a title, optional metadata, description, and marker.
 *
 * @element ore-timeline-item
 * @attr {string} color - Semantic marker color
 * @slot - Event title or content
 * @slot meta - Metadata such as a `time` element
 * @slot description - Additional event details
 * @slot marker - Custom marker; text is available to assistive technology
 * @part marker - Marker container
 * @part content - Event content
 * @part title - Title container
 * @part meta - Metadata container
 * @part description - Description container
 * @cssprop --timeline-marker-color - Marker color (defaults to the item's theme color)
 * @cssprop --timeline-line-color - Connecting line color (default `--color-contrast-300`)
 */
export const TIMELINE_ITEM_TAG = 'ore-timeline-item' as const;

define<OreTimelineItemProps>(TIMELINE_ITEM_TAG, {
  props: { ...themableBundle },
  setup() {
    const slots = useSlots<'description' | 'meta'>();

    bind({ attr: { role: () => 'listitem' } });

    return html`
      <div class="rail">
        <div class="marker" part="marker">
          <slot name="marker"><span class="dot" aria-hidden="true"></span></slot>
        </div>
        <span class="line" aria-hidden="true"></span>
      </div>
      <div class="content" part="content">
        <div class="title" part="title"><slot></slot></div>
        <div class="meta" part="meta" ?hidden="${() => !slots.has('meta').value}"><slot name="meta"></slot></div>
        <div class="description" part="description" ?hidden="${() => !slots.has('description').value}">
          <slot name="description"></slot>
        </div>
      </div>
    `;
  },
  styles: [colorThemeMixin, componentStyles],
});

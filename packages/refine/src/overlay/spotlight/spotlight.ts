import { define, html, prop } from '@vielzeug/ore';

import { reducedMotionMixin } from '../../styles';
import styles from './spotlight.css?inline';

/** The rectangle a spotlight cuts out of its dim layer, in viewport pixels. */
export interface SpotlightRect {
  readonly height: number;
  readonly width: number;
  readonly x: number;
  readonly y: number;
}

/** Spotlight component properties */
export type OreSpotlightProps = {
  /** Corner radius of the cutout in px */
  radius?: number;
  /** The rectangle to reveal. Omit (or pass null) to hide the cutout and dim the whole page. */
  rect?: SpotlightRect | null;
  /** Show the dim layer */
  visible?: boolean;
};

/**
 * A dim layer with a hole punched in it, so one region of the page stays at full
 * brightness while everything else recedes.
 *
 * The dim is a single oversized box-shadow on the cutout element, so the hole
 * animates with the element's own geometry: when a tour moves to the next step,
 * the highlight slides to the new target instead of blinking out and back.
 *
 * The layer never captures pointer events: a beacon shows the way, it does not
 * block the road. The element inside the cutout stays clickable, and whatever
 * dialog or popover owns the moment handles interaction and announcement: this
 * layer is decorative by definition and carries `aria-hidden`.
 *
 * @element ore-spotlight
 *
 * @attr {number} radius - Cutout corner radius in px (default: 8)
 * @attr {boolean} visible - Show the dim layer (default: true)
 *
 * @cssprop --spotlight-dim - Dim color (default: var(--color-scrim))
 * @cssprop --spotlight-ring - Ring drawn around the cutout (default: none)
 * @cssprop --spotlight-radius - Cutout corner radius
 * @cssprop --spotlight-transition - Geometry transition (default: 240ms ease)
 *
 * @part overlay - The fixed dim layer.
 * @part cutout - The highlighted rectangle.
 *
 * @example
 * ```html
 * <ore-spotlight></ore-spotlight>
 * <script type="module">
 *   import '@vielzeug/refine/spotlight';
 *   const spotlight = document.querySelector('ore-spotlight');
 *   spotlight.rect = document.querySelector('#cta').getBoundingClientRect();
 * </script>
 * ```
 */
export const SPOTLIGHT_TAG = 'ore-spotlight' as const;
define<OreSpotlightProps>(SPOTLIGHT_TAG, {
  props: {
    radius: prop.number(8),
    rect: prop.data<SpotlightRect | null>(null),
    visible: prop.bool(true),
  },
  setup(props) {
    const overlayStyle = (): string => {
      const rect = props.rect.value;
      // A rect the page cannot show (zero size, off-screen) reads as a glitch:
      // fall back to no cutout, which dims the whole page instead.
      if (!rect || rect.width <= 0 || rect.height <= 0) return '--_cutout-display:none';

      return [
        '--_cutout-display:block',
        `--_cutout-h:${rect.height}px`,
        `--_cutout-l:${rect.x}px`,
        `--_cutout-t:${rect.y}px`,
        `--_cutout-w:${rect.width}px`,
      ].join(';');
    };

    return html`
      <div
        class="overlay"
        part="overlay"
        aria-hidden="true"
        data-visible="${() => String(props.visible.value)}"
        style=${overlayStyle}>
        <div class="cutout" part="cutout" style=${() => `--_cutout-radius:${props.radius.value}px`}></div>
      </div>
    `;
  },
  styles: [reducedMotionMixin, styles],
});

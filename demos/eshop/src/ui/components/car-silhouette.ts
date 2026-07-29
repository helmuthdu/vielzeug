import { define, getHost, html, prop } from '@vielzeug/ore';
import { raw } from '@vielzeug/ore/directives';
import { computed, effect } from '@vielzeug/ripple';

import type { BodyType } from '../../core/types';

import carSvgMarkup from '../../assets/car.svg?raw';
import { prefersReducedMotion } from '../../core/motion';

/**
 * The car artwork — `src/assets/car.svg`, injected via `@vielzeug/ore`'s `raw()` directive
 * (registered with a pass-through sanitizer in `main.ts`: this is a build-time-bundled asset
 * from our own repo, never user input, so that trust boundary is correct here). Staged like a
 * quiet studio product shot — a soft neutral floor and a faded mirrored ground reflection — the
 * same restrained, static presentation real OEM configurators (Mercedes-Benz Store, BMW's
 * Neuwagensuche) use: the car itself is the subject, not a glowing showroom backdrop. It never
 * moves on its own — no autoplaying idle loop — only in direct response to something the shopper
 * does: picking a new paint briefly dips and restores the artwork's opacity (`REPAINT_DURATION_MS`,
 * skipped entirely under `prefers-reduced-motion`), reading as "the paint just changed" rather
 * than a snap-cut.
 *
 * The source SVG's body-panel paths are authored with `fill="currentColor"`, but a single flat
 * `currentColor` read straight off the selected paint hex renders as a flat cutout, not painted
 * metal. Instead of relying on `currentColor` directly, `buildCarMarkup()` below does a one-time
 * string transform per instance: it swaps those three `fill:currentColor` declarations for
 * `fill:url(#<gradient-id>)`, pointing at a `<linearGradient>` injected into the SVG's own
 * (previously empty) `<defs>` whose three stops are plain `var(--car-color*)` CSS custom
 * properties — so the *shape* of the recolor (light-catching highlight near the roofline fading
 * to a darker shade along the rocker panels) is baked into the markup once, and only the three
 * custom property *values* change reactively when `colorHex` changes.
 */

export type CarSilhouetteProps = {
  bodyType: BodyType;
  colorHex: string;
  colorName: string;
  heroHue: number;
};

const CURRENT_COLOR_RE = /fill:currentColor/g;
const DEFS_RE = /<defs\s+id="defs1"\s*\/>/;
const REPAINT_DURATION_MS = 220;

/** Builds one instance's copy of the SVG markup with a uniquely-`id`'d paint gradient wired in. */
function buildCarMarkup(gradientId: string): string {
  const gradient =
    `<defs id="defs1"><linearGradient id="${gradientId}" x1="0" y1="0" x2="0" y2="1">` +
    '<stop offset="0%" style="stop-color:var(--car-color-highlight)" />' +
    '<stop offset="45%" style="stop-color:var(--car-color)" />' +
    '<stop offset="100%" style="stop-color:var(--car-color-shade)" />' +
    '</linearGradient></defs>';

  return carSvgMarkup.replace(DEFS_RE, gradient).replace(CURRENT_COLOR_RE, `fill:url(#${gradientId})`);
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.replace(/./g, (c) => c + c) : clean.padStart(6, '0');
  const value = Number.parseInt(full, 16);

  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function toHex([r, g, b]: [number, number, number]): string {
  const clamp = (n: number): string =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, '0');

  return `#${clamp(r)}${clamp(g)}${clamp(b)}`;
}

/** Linearly mixes `hex` toward `target` by `amount` (0–1) — a cheap, dependency-free tint/shade. */
function mixToward(hex: string, target: [number, number, number], amount: number): string {
  const [r, g, b] = hexToRgb(hex);

  return toHex([r + (target[0] - r) * amount, g + (target[1] - g) * amount, b + (target[2] - b) * amount]);
}

function paintStyle(hex: string): string {
  const highlight = mixToward(hex, [255, 255, 255], 0.4);
  const shade = mixToward(hex, [0, 0, 0], 0.35);

  return `--car-color: ${hex}; --car-color-highlight: ${highlight}; --car-color-shade: ${shade};`;
}

define<CarSilhouetteProps>('car-silhouette', {
  props: {
    bodyType: prop.string<BodyType>('sedan'),
    colorHex: prop.string<string>('#c7ccd1'),
    colorName: prop.string<string>(''),
    heroHue: prop.number<number>(220),
  },
  setup(props) {
    const host = getHost();

    // Two independent gradient ids/markup copies — one per injected SVG instance (art +
    // reflection) — so each `<linearGradient>` lives inside its own SVG document fragment
    // instead of two elements racing for the same id within one shadow root.
    const uid = Math.random().toString(36).slice(2, 9);
    const artMarkup = buildCarMarkup(`car-paint-${uid}-a`);
    const reflectionMarkup = buildCarMarkup(`car-paint-${uid}-b`);

    const style = computed(() => paintStyle(props.colorHex.value));

    // The only motion this component has: a brief opacity dip-and-restore on the *next* paint
    // pick (never on first mount — `isFirstPaint` skips that run), so a color swap reads as "the
    // paint just changed" instead of a silent snap-cut. Respects `prefers-reduced-motion`.
    let isFirstPaint = true;

    effect(() => {
      void props.colorHex.value;

      if (isFirstPaint) {
        isFirstPaint = false;

        return undefined;
      }

      if (prefersReducedMotion()) return undefined;

      host.classList.add('repainting');

      const timeout = setTimeout(() => host.classList.remove('repainting'), REPAINT_DURATION_MS);

      return () => clearTimeout(timeout);
    });

    return html`
      <div
        class="stage"
        role="img"
        aria-label=${() => `${props.bodyType.value} in ${props.colorName.value || props.colorHex.value}`}>
        <div class="rig">
          <div class="art" style=${style}>${raw(artMarkup)}</div>
          <div class="reflection" aria-hidden="true" style=${style}>${raw(reflectionMarkup)}</div>
        </div>
      </div>
      <style>
        :host {
          display: block;
        }

        .stage {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 12%;
          background: radial-gradient(80% 65% at 50% 78%, rgb(0 0 0 / 8%), transparent 70%);
        }

        .rig {
          width: 100%;
        }

        .art svg,
        .reflection svg {
          display: block;
          width: 100%;
          height: auto;
        }

        .art svg {
          filter: drop-shadow(0 8px 10px rgb(0 0 0 / 18%));
        }

        .art {
          transition: opacity 220ms var(--ease-out-quart, ease-out);
        }

        :host(.repainting) .art {
          opacity: 0.7;
        }

        .reflection {
          margin-top: -4%;
          opacity: 0.16;
          transform: scaleY(-1);
          mask-image: linear-gradient(to bottom, black, transparent 65%);
        }
      </style>
    `;
  },
});

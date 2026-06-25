import { define, html, prop } from '@vielzeug/ore';
import { when } from '@vielzeug/ore/directives';
import { computed } from '@vielzeug/ripple';

import componentStyles from './code-window.css?inline';

/** `ore-code-window` variant */
export type CodeWindowVariant = 'code' | 'chat';

/** `ore-code-window` component properties */
export type OreCodeWindowProps = {
  /** Filename label shown after the language badge (`variant="code"` only) */
  filename?: string;
  /** Language badge text, e.g. `"ts"`, `"sh"` (`variant="code"` only) */
  lang?: string;
  /** Title string shown beside the traffic-light dots (`variant="chat"` only) */
  title?: string;
  /**
   * `"code"` (default) — header shows a language badge + filename.
   * `"chat"` — header shows traffic-light dots + a title.
   */
  variant?: CodeWindowVariant;
};

/**
 * A styled window chrome for code blocks and AI/MCP conversation flows.
 *
 * Two variants:
 * - `variant="code"` (default) — language badge + optional filename header.
 * - `variant="chat"` — traffic-light dots + title header.
 *
 * @element ore-code-window
 *
 * @attr {'code'|'chat'} variant - Window style variant
 * @attr {string} lang - Language badge label (variant="code" only)
 * @attr {string} filename - Filename shown next to the badge (variant="code" only)
 * @attr {string} title - Label beside the dots (variant="chat" only)
 *
 * @slot - Main body content (code, conversation turns, or any markup)
 * @slot header-end - Optional content appended to the trailing edge of the header
 *
 * @cssprop --code-window-bg - Window background color
 * @cssprop --code-window-header-bg - Header background color
 * @cssprop --code-window-border-color - Border color
 * @cssprop --code-window-radius - Border radius
 * @cssprop --code-window-shadow - Box shadow
 * @cssprop --code-window-body-padding - Body slot padding
 *
 * @part window - The root window element
 * @part header - The header bar
 * @part lang - The language badge (`variant="code"`)
 * @part filename - The filename label (`variant="code"`)
 * @part dots - The traffic-light dot container (`variant="chat"`)
 * @part title - The title label (`variant="chat"`)
 * @part body - The body container wrapping the default slot
 *
 * @example
 * ```html
 * <ore-code-window lang="ts" filename="app.ts">
 *   <pre>const x = 1;</pre>
 * </ore-code-window>
 *
 * <ore-code-window variant="chat" title="MCP tool call">
 *   <!-- conversation turns go here -->
 * </ore-code-window>
 * ```
 */
export const CODE_WINDOW_TAG = 'ore-code-window' as const;
define<OreCodeWindowProps>(CODE_WINDOW_TAG, {
  props: {
    filename: prop.string(),
    lang: prop.string('ts'),
    title: prop.string('MCP tool call'),
    variant: prop.oneOf(['code', 'chat'] as const, 'code'),
  },
  setup(props) {
    const isCode = computed(() => props.variant.value === 'code');
    const hasFilename = computed(() => Boolean(props.filename.value));

    return html`
      <div class="window" part="window">
        <div class="header" part="header">
          ${when(
            isCode,
            () => html`
              <span class="lang" part="lang">${props.lang}</span>
              ${when(hasFilename, () => html`<span class="filename" part="filename">${props.filename}</span>`)}
            `,
            () => html`
              <div class="dots" part="dots" aria-hidden="true"><span></span><span></span><span></span></div>
              <span class="title" part="title">${props.title}</span>
            `,
          )}
          <div class="header-spacer"></div>
          <slot name="header-end"></slot>
        </div>
        <div class="body" part="body">
          <slot></slot>
        </div>
      </div>
    `;
  },
  styles: [componentStyles],
});

import { define, html, prop, ref, useEmit, watchEffect } from '@vielzeug/ore';
import { parseProse, renderProseDom, ScribeError } from '@vielzeug/scribe';

import componentStyles from './prose.css?inline';

/** Prose component properties */
export type OreProseProps = {
  /** Emit unique slug `id` attributes on headings (matches `proseOutline` from `@vielzeug/scribe`) */
  'heading-ids'?: boolean;
  /** Markdown source rendered through the safe scribe pipeline */
  markdown?: string;
};

/** Prose component events */
export type OreProseEvents = {
  /** Fired when the source exceeds a scribe limit; the raw source is shown as plain text instead */
  error: { error: ScribeError };
};

/**
 * Renders Markdown prose as themed, semantic DOM through `@vielzeug/scribe`: the document is
 * parsed to a frozen AST and built with `createTextNode`/`createElement` only, so markup or
 * script-looking source renders as visible characters. Disallowed link protocols degrade to
 * their label text at parse time.
 *
 * Styling is component-owned (shadow DOM): headings, lists, code, tables, and quotes follow
 * the Refine type and color tokens. Re-rendering replaces the whole tree, so streaming updates
 * are as simple as writing the `markdown` property again.
 *
 * @element ore-prose
 *
 * @attr {string} markdown - Markdown source to render
 * @attr {boolean} heading-ids - Add unique slug `id`s to headings for TOC anchors
 *
 * @fires error - detail: `{ error }` when the source exceeds a parser limit; the raw source renders as plain text
 *
 * @cssprop --prose-color - Body text color (default `var(--text-color-body)`)
 * @cssprop --prose-link-color - Link color (default `var(--color-primary)`)
 * @cssprop --prose-code-bg - Inline code and code block background
 * @cssprop --prose-border-color - Table, rule, and quote border color (default `var(--color-divider)`)
 * @cssprop --prose-radius - Code block and inline code radius
 *
 * @part content - The rendered prose container
 *
 * @example
 * ```html
 * <ore-prose markdown="# Title\n\nRendered **safely**, `<script>` and all."></ore-prose>
 * ```
 */
export const PROSE_TAG = 'ore-prose' as const;

define<OreProseProps>(PROSE_TAG, {
  props: {
    'heading-ids': prop.bool(false),
    markdown: prop.string(''),
  },
  setup(props) {
    const emit = useEmit<OreProseEvents>();
    const container = ref<HTMLElement>();

    // The ref signal participates in tracking, so the first render happens when the
    // container mounts and every later markdown change re-parses and swaps the tree.
    watchEffect(() => {
      const target = container.value;
      if (target === null) return;
      const markdown = props.markdown.value ?? '';
      try {
        target.replaceChildren(
          renderProseDom(parseProse(markdown), { headingIds: props['heading-ids'].value === true }),
        );
      } catch (error) {
        if (!(error instanceof ScribeError)) throw error;
        emit('error', { error });
        target.replaceChildren(document.createTextNode(markdown));
      }
    });

    return html`
      <div class="prose" part="content" ref="${container}"></div>
    `;
  },
  styles: [componentStyles],
});

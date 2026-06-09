import { computed, type ReadonlySignal } from '@vielzeug/craft';

import type { LinkTarget } from '../shared';

/**
 * Computes a safe `rel` attribute value for anchor elements.
 *
 * When `target="_blank"`, automatically injects `noopener` and `noreferrer`
 * to prevent reverse tabnapping attacks (the opened page accessing
 * `window.opener` to redirect the origin).
 *
 * @param rel    - The explicit `rel` prop value (may be undefined).
 * @param target - The link `target` prop value (may be undefined).
 * @returns A `rel` string with security tokens merged in, or `null` when no
 *          rel is needed.
 */
export function computeSafeRel(rel: string | undefined, target: string | undefined): string | null {
  const base = rel ?? '';

  if (target !== '_blank') return base || null;

  const parts = new Set(base.split(/\s+/).filter(Boolean));

  parts.add('noopener');
  parts.add('noreferrer');

  return [...parts].join(' ');
}

/**
 * Props required by any component that renders as an anchor when `href` is set.
 * Import and spread into your component's props type to get consistent link support.
 */
export type LinkProps = {
  /** When set, the component renders as an `<a>` instead of its default element. */
  href?: string;
  /** Anchor `rel` attribute. `noopener noreferrer` is automatically added for `target="_blank"`. */
  rel?: string;
  /** Anchor browsing context. */
  target?: LinkTarget;
};

/**
 * Derives computed link state from reactive `href`, `rel`, and `target` signals.
 *
 * Returns:
 * - `isLink` — true when `href` is set (and optionally not disabled)
 * - `effectiveRel` — `rel` merged with security tokens when `target="_blank"`
 *
 * @example
 * ```ts
 * const { isLink, effectiveRel } = useLinkProps(props.href, props.rel, props.target);
 * ```
 */
export function useLinkProps(
  href: ReadonlySignal<string | undefined>,
  rel: ReadonlySignal<string | undefined>,
  target: ReadonlySignal<LinkTarget | undefined>,
  disabled?: ReadonlySignal<boolean>,
) {
  const isLink = computed(() => !!href.value && !disabled?.value);
  const effectiveRel = computed(() => computeSafeRel(rel.value, target.value));

  return { effectiveRel, isLink };
}

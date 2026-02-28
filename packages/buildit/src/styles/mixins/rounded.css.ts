/**
 * Rounded Variant Mixin
 *
 * Shared border-radius variant styles for components.
 * Maps rounded attribute values to theme border radius tokens.
 *
 * @returns CSS string with rounded variant rules
 *
 * @example
 * ```ts
 * import { roundedVariantMixin } from '../../styles/mixins/rounded.css';
 *
 * const styles = css`
 *   :host {
 *     --_radius: var(--rounded-md); // default
 *   }
 *   ${roundedVariantMixin()}
 * `;
 * ```
 */
export const roundedVariantMixin = () => `
  @layer buildit.variants {
    :host([rounded='none']) { --_radius: var(--rounded-none); }
    :host([rounded='sm']) { --_radius: var(--rounded-sm); }
    :host([rounded='md']) { --_radius: var(--rounded-md); }
    :host([rounded='lg']) { --_radius: var(--rounded-lg); }
    :host([rounded='xl']) { --_radius: var(--rounded-xl); }
    :host([rounded='2xl']) { --_radius: var(--rounded-2xl); }
    :host([rounded='3xl']) { --_radius: var(--rounded-3xl); }
    :host([rounded='full']), :host([rounded='']) { --_radius: var(--rounded-full); }
  }
`;

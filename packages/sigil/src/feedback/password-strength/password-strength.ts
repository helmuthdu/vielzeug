import { computed, define, html } from '@vielzeug/craft';
import { prop } from '@vielzeug/craft';

import { reducedMotionMixin } from '../../styles';
import componentStyles from './password-strength.css?inline';

/** Scoring levels for password strength. */
export type PasswordStrengthLevel = 'empty' | 'weak' | 'fair' | 'good' | 'strong';

/** Props accepted by <bit-password-strength>. */
export type BitPasswordStrengthProps = {
  /** Accessible name for assistive technology. Default: 'Password strength'. */
  label?: string;
  /**
   * Optional level labels in order: empty, weak, fair, good, strong.
   * If omitted or invalid length, defaults are used.
   */
  labels?: string[];
  /**
   * Optional score override (0..4). Use this to integrate external scorers
   * such as zxcvbn while keeping block rendering and accessibility behavior.
   * -1 means no override (default).
   */
  score?: number;
  /** Whether to render visible textual feedback. Default: true. */
  'show-label'?: boolean;
  /** Password string to evaluate. */
  value?: string;
};

/**
 * Strong password meter with segmented progress visualization.
 *
 * Built-in scoring is heuristic and conservative:
 * - length < 6 => weak
 * - length >= 8 with mixed case => fair
 * - + digit or symbol => good
 * - length >= 12 with mixed case, digit and symbol => strong
 *
 * @element bit-password-strength
 *
 * @attr {string} value       Password to evaluate
 * @attr {number} score       Optional score override (0..4)
 * @attr {boolean} show-label Show visible feedback label (default: true)
 * @attr {string} label       Accessible name (default: Password strength)
 *
 * @cssprop --password-strength-height       Segment bar height
 * @cssprop --password-strength-gap          Gap between segments
 * @cssprop --password-strength-radius       Segment corner radius
 * @cssprop --password-strength-track-bg     Inactive segment color
 * @cssprop --password-strength-label-size   Visible label font size
 * @cssprop --password-strength-label-color  Visible label color
 * @cssprop --password-strength-weak-color   Weak state segment color
 * @cssprop --password-strength-fair-color   Fair state segment color
 * @cssprop --password-strength-good-color   Good state segment color
 * @cssprop --password-strength-strong-color Strong state segment color
 *
 * @example
 * ```html
 * <bit-password-strength></bit-password-strength>
 * ```
 */
export const PASSWORD_STRENGTH_TAG = 'bit-password-strength' as const;
define<BitPasswordStrengthProps>(PASSWORD_STRENGTH_TAG, {
  props: {
    label: prop.string('Password strength'),
    labels: prop.json(undefined as string[] | undefined),
    score: prop.number(-1),
    'show-label': prop.bool(true),
    value: prop.string(),
  },

  setup(props, { bind, el: _el }) {
    const defaultLabels: Record<PasswordStrengthLevel, string> = {
      empty: '',
      fair: 'Fair',
      good: 'Good',
      strong: 'Strong',
      weak: 'Weak',
    };

    const levels: PasswordStrengthLevel[] = ['empty', 'weak', 'fair', 'good', 'strong'];

    const computeScore = (password: string): 0 | 1 | 2 | 3 | 4 => {
      if (!password) return 0;

      if (password.length < 6) return 1;

      const hasLower = /[a-z]/.test(password);
      const hasUpper = /[A-Z]/.test(password);
      const hasDigit = /\d/.test(password);
      const hasSymbol = /[^a-zA-Z0-9]/.test(password);
      const long = password.length >= 12;

      if (long && hasLower && hasUpper && hasDigit && hasSymbol) return 4;

      if ((hasLower || hasUpper) && (hasDigit || hasSymbol) && password.length >= 8) return 3;

      if ((hasLower || hasUpper) && password.length >= 8) return 2;

      return 1;
    };

    const computeLevel = (): PasswordStrengthLevel => {
      const external = props.score.value ?? -1;
      const finalScore =
        external >= 0 ? Math.max(0, Math.min(4, Math.trunc(external))) : computeScore(props.value.value ?? '');

      return levels[finalScore];
    };

    const score = computed<0 | 1 | 2 | 3 | 4>(() => {
      // score >= 0 means an external override was provided
      const external = props.score.value ?? -1;

      if (external >= 0) {
        return Math.max(0, Math.min(4, Math.trunc(external))) as 0 | 1 | 2 | 3 | 4;
      }

      return computeScore(props.value.value ?? '');
    });

    const levelLabel = computed<string>(() => {
      const custom = props.labels.value;

      if (Array.isArray(custom) && custom.length === 5) return String(custom[score.value] ?? '');

      return defaultLabels[computeLevel()];
    });

    const ariaValueText = computed<string | null>(() => {
      if (score.value === 0) return null;

      return levelLabel.value || null;
    });

    // Sync level change to data-level attribute reactively
    bind({
      attr: {
        'data-level': () => computeLevel(),
      },
    });

    const segClass = (threshold: number) => () => `segment${score.value >= threshold ? ' active' : ''}`;

    return html`
      <div
        class="meter"
        role="meter"
        :aria-label="${props.label}"
        aria-valuemin="0"
        aria-valuemax="4"
        :aria-valuenow="${() => String(score.value)}"
        :aria-valuetext="${() => ariaValueText.value}">
        <div class="segments" aria-hidden="true">
          <div class="${segClass(1)}"></div>
          <div class="${segClass(2)}"></div>
          <div class="${segClass(3)}"></div>
          <div class="${segClass(4)}"></div>
        </div>
      </div>
      ${() =>
        props['show-label'].value
          ? html`<span class="level-label" aria-live="polite" aria-atomic="true">${() => levelLabel.value}</span>`
          : ''}
    `;
  },

  styles: [reducedMotionMixin, componentStyles],
});

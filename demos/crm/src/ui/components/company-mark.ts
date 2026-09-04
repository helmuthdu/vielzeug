import { define, each, html, prop } from '@vielzeug/ore';
import { computed } from '@vielzeug/ripple';
import { t } from '../../core/i18n';
import styles from './company-mark.css?inline';

const BAR_COUNT = 4;

export type CompanyMarkProps = {
  name: string;
};

function companyInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
}

function companyHash(name: string): number {
  let hash = 2166136261;
  for (const character of name.trim().toLocaleLowerCase()) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

define<CompanyMarkProps>('company-mark', {
  props: { name: prop.string('') },
  setup(props) {
    const initials = computed(() => companyInitials(props.name.value));
    const bars = computed(() => {
      const hash = companyHash(props.name.value);
      return Array.from({ length: BAR_COUNT }, (_, index) => ({ id: index, level: ((hash >>> (index * 4)) & 3) + 1 }));
    });

    return html`
      <span
        class="company-mark__surface"
        role="img"
        aria-label=${() => `${props.name.value || t('common.unknownCompany')} ${t('common.mark')}`}>
        <span class="company-mark__bars" aria-hidden="true">
          ${each(
            bars,
            (bar) => bar.id,
            (bar) => html`
              <span class=${() => `company-mark__bar company-mark__bar--level-${bar.value.level}`}></span>
            `,
          )}
        </span>
        <span class="company-mark__initials" aria-hidden="true">${initials}</span>
      </span>
    `;
  },
  styles: [styles],
});

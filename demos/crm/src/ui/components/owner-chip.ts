import '@vielzeug/refine/avatar';
import { define, html, prop, when } from '@vielzeug/ore';
import { computed } from '@vielzeug/ripple';
import { t } from '../../core/i18n';
import { demoUsers } from '../../core/seed-data';

export type OwnerChipProps = {
  ownerId: string;
};

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

define<OwnerChipProps>('owner-chip', {
  props: { ownerId: prop.string('') },
  setup(props) {
    const owner = computed(() => demoUsers.find((user) => user.id === props.ownerId.value));
    const displayName = computed(() => owner.value?.name ?? t('common.unassigned'));

    return html`
      <span class="owner-chip__surface" title=${() => owner.value?.title ?? t('common.noMatchingDemoUser')}>
        ${when(
          () => owner.value !== undefined,
          () => html`
            <ore-avatar
              class="owner-chip__avatar"
              size="sm"
              rounded="full"
              color=${() => (owner.value?.id === 'alex' ? 'primary' : 'secondary')}
              alt=${displayName}
              initials=${() => initials(displayName.value)}></ore-avatar>
          `,
        )}
        <span class="owner-chip__name">${displayName}</span>
      </span>
    `;
  },
  shadow: false,
});

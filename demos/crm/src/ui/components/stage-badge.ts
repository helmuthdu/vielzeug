import '@vielzeug/refine/badge';
import { define, html, prop } from '@vielzeug/ore';
import { computed } from '@vielzeug/ripple';
import { t } from '../../core/i18n';
import type { OpportunityStage } from '../../core/types';

const STAGES = ['prospecting', 'qualification', 'proposal', 'negotiation', 'closed-won', 'closed-lost'] as const;

const STAGE_META: Record<OpportunityStage, { color: string; labelKey: string }> = {
  'closed-lost': { color: 'error', labelKey: 'pipeline.closedLost' },
  'closed-won': { color: 'success', labelKey: 'pipeline.closedWon' },
  negotiation: { color: 'warning', labelKey: 'pipeline.negotiation' },
  proposal: { color: 'primary', labelKey: 'pipeline.proposal' },
  prospecting: { color: 'secondary', labelKey: 'pipeline.prospecting' },
  qualification: { color: 'info', labelKey: 'pipeline.qualification' },
};

export type StageBadgeProps = {
  stage: OpportunityStage;
};

define<StageBadgeProps>('stage-badge', {
  props: { stage: prop.oneOf<OpportunityStage>(STAGES, 'prospecting') },
  setup(props) {
    const meta = computed(() => STAGE_META[props.stage.value]);
    const label = computed(() => t(meta.value.labelKey));

    return html`
      <ore-badge
        class=${() => `stage-badge__badge stage-badge__badge--${props.stage.value}`}
        color=${() => meta.value.color}
        variant="flat"
        label=${() => `${t('opportunities.opportunity')} ${t('opportunities.stage')}: ${label.value}`}>
        ${label}
      </ore-badge>
    `;
  },
  shadow: false,
});

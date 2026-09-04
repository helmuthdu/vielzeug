import { createBus } from '@vielzeug/herald';
import type { OpportunityStage } from './types';

export type AppEvents = {
  'activity:add': { actor: string; description: string; opportunityId?: string };
  'opportunity:stage-changed': { actor: string; from: OpportunityStage; opportunityId: string; to: OpportunityStage };
  'toast:show': { action?: { label: string; run: () => void }; message: string; variant: 'error' | 'info' | 'success' };
};

export const bus = createBus<AppEvents>();

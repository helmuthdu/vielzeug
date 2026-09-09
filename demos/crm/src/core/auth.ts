import type { Principal } from '@vielzeug/ward';
import { allow, createWard, WILDCARD } from '@vielzeug/ward';
import { currentUser } from './store';

export type CrmAction = 'create' | 'delete' | 'read' | 'update';

export const ward = createWard<CrmAction, 'crm'>([
  allow<CrmAction, 'crm'>('manager', 'crm', [WILDCARD]),
  allow<CrmAction, 'crm'>('sales', 'crm', ['create', 'read', 'update']),
  allow<CrmAction, 'crm'>('viewer', 'crm', ['read']),
]);

export function principal(): Principal {
  return { id: currentUser.value.id, roles: [currentUser.value.role] };
}

export function can(action: CrmAction): boolean {
  return ward.decide({ action, principal: principal(), resource: 'crm' }).effect === 'allow';
}

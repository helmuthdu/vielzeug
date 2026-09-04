import type { Principal } from '@vielzeug/ward';
import { allow, createWard } from '@vielzeug/ward';
import { currentUser } from './store';
import type { Opportunity } from './types';

export type CrmAction = 'create' | 'delete' | 'read' | 'update';
export const ward = createWard<CrmAction, Opportunity>([
  allow('manager', 'crm', ['create', 'delete', 'read', 'update']),
  allow('sales', 'crm', ['create', 'read', 'update']),
  allow('viewer', 'crm', ['read']),
]);

export function principal(): Principal {
  return { id: currentUser.value.id, roles: [currentUser.value.role] };
}

export function can(action: CrmAction): boolean {
  return ward.explain({ action, principal: principal(), resource: 'crm' }).allowed;
}

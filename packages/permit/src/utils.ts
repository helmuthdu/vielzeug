import type { PermitPrincipal, PrincipalInput, UserPrincipal } from './types';

import { ANONYMOUS, WILDCARD } from './constants';

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function isUserPrincipal(principal: PermitPrincipal): principal is UserPrincipal {
  return principal.kind === 'user';
}

function toPrincipal(input: PrincipalInput): PermitPrincipal {
  if (input == null) return { kind: 'anonymous' };

  if (typeof input === 'object' && 'kind' in input) {
    if (input.kind === 'anonymous') return input;

    if (input.kind === 'user') {
      if (typeof input.id !== 'string' || input.id.trim().length === 0) {
        throw new Error('[permit] Invalid principal: user.id must be a non-empty string');
      }

      if (!Array.isArray(input.roles) || input.roles.some((role) => typeof role !== 'string')) {
        throw new Error('[permit] Invalid principal: user.roles must be an array of strings');
      }

      return {
        id: input.id,
        kind: 'user',
        roles: input.roles.map(normalize),
      };
    }
  }

  if (typeof input === 'object' && 'id' in input && 'roles' in input) {
    if (typeof input.id !== 'string' || input.id.trim().length === 0) {
      throw new Error('[permit] Invalid principal: id must be a non-empty string');
    }

    if (!Array.isArray(input.roles) || input.roles.some((role) => typeof role !== 'string')) {
      throw new Error('[permit] Invalid principal: roles must be an array of strings');
    }

    return {
      id: input.id,
      kind: 'user',
      roles: input.roles.map(normalize),
    };
  }

  throw new Error('[permit] Invalid principal input');
}

function getRoles(principal: PermitPrincipal): Set<string> {
  if (!isUserPrincipal(principal)) {
    return new Set([ANONYMOUS, WILDCARD]);
  }

  return new Set([...principal.roles, WILDCARD]);
}

export { getRoles, isUserPrincipal, normalize, toPrincipal };

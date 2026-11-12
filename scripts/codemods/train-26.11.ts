/**
 * Mechanical renames for the 26.11 Vielzeug train, mirroring the renames
 * published in docs/tavern/migration.md, docs/lingua/migration.md, and
 * docs/vault/migration.md. Semantic changes (tap() observability, required
 * durable codecs, removed seams) stay manual; this file only covers pure renames.
 *
 * Apply: bun scripts/codemods/apply.ts <consumer-dir> --rules=scripts/codemods/train-26.11.ts [--dry-run]
 */

import type { CodemodRule } from './apply';

const rules: readonly CodemodRule[] = [
  // Tavern: the pairing API speaks "code" (docs/tavern/migration.md).
  { from: 'createInvitationText', kind: 'export', module: '@vielzeug/tavern', to: 'createInvitationCode' },
  { from: 'acceptAnswerText', kind: 'export', module: '@vielzeug/tavern', to: 'acceptAnswerCode' },
  { from: 'invitationText', kind: 'key', to: 'invitationCode' },
  { from: 'invitationText', kind: 'member', to: 'invitationCode' },
  { from: 'answerText', kind: 'key', to: 'answerCode' },
  { from: 'answerText', kind: 'member', to: 'answerCode' },
  // Lingua: the widened-key lookup is translateUnkeyed() (docs/lingua/migration.md).
  { from: 'translateDynamic', kind: 'member', to: 'translateUnkeyed' },
  // Vault: TransactionalVaultStore became DocumentVaultStore (docs/vault/migration.md).
  { from: 'TransactionalVaultStore', kind: 'export', module: '@vielzeug/vault', to: 'DocumentVaultStore' },
];

export default rules;

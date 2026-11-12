import { describe, expect, it } from 'vitest';

import { applyRenames, type CodemodRule } from '../codemods/apply';
import rules from '../codemods/train-26.11';

function run(source: string, applied: readonly CodemodRule[] = rules): string {
  return applyRenames(source, 'consumer.ts', applied).output;
}

describe('codemod engine', () => {
  it('renames import specifiers and their local references, only in the matched module', () => {
    const source = [
      `import { createInvitationText as mk, helper } from '@vielzeug/tavern';`,
      `import { createInvitationText } from '@vielzeug/other';`,
      `const a = mk();`,
      `const b = createInvitationText();`,
    ].join('\n');

    expect(run(source)).toBe([
      `import { createInvitationCode as mk, helper } from '@vielzeug/tavern';`,
      `import { createInvitationText } from '@vielzeug/other';`,
      `const a = mk();`,
      `const b = createInvitationText();`,
    ].join('\n'));
  });

  it('renames local bindings without aliases at every reference', () => {
    const source = [
      `import { TransactionalVaultStore } from '@vielzeug/vault';`,
      `let store: TransactionalVaultStore;`,
      `export { TransactionalVaultStore };`,
    ].join('\n');

    expect(run(source)).toBe([
      `import { DocumentVaultStore } from '@vielzeug/vault';`,
      `let store: DocumentVaultStore;`,
      `export { DocumentVaultStore };`,
    ].join('\n'));
  });

  it('renames method calls and property accesses', () => {
    const source = [
      `const text = i18n.translateDynamic('weird', {});`,
      `guest.join({ invitationText });`,
      `const code = result.answerText;`,
    ].join('\n');

    expect(run(source)).toBe([
      `const text = i18n.translateUnkeyed('weird', {});`,
      `guest.join({ invitationCode: invitationText });`,
      `const code = result.answerCode;`,
    ].join('\n'));
  });

  it('renames object keys and destructuring properties', () => {
    const source = [
      `const join = await joinTavern({ invitationText: code });`,
      `const { answerText: answer } = join;`,
    ].join('\n');

    expect(run(source)).toBe([
      `const join = await joinTavern({ invitationCode: code });`,
      `const { answerCode: answer } = join;`,
    ].join('\n'));
  });

  it('leaves unrelated code byte-identical', () => {
    const source = `const keep = { invitationTextLike: 1, answer: obj.answerTexts };`;

    expect(run(source)).toBe(source);
    expect(applyRenames(source, 'x.ts', rules).changed).toBe(false);
  });
});

import { describe, expectTypeOf, it } from 'vitest';

import type { FormValidityMethods } from '../shared';

// `elements.d.ts` augments `HTMLElementTagNameMap` under `skipLibCheck: true` (the root
// tsconfig), which exempts `.d.ts` files from having their own contents verified — a typo, a
// missing intersection member, or (as happened before this file existed) a completely
// unimported/unresolvable type name there would compile forever without error. This file is a
// regular `.ts` module (skipLibCheck doesn't apply to it), so these `expectTypeOf` assertions
// are the only thing that actually catches that class of drift.
describe('HTMLElementTagNameMap — form-associated element type coverage', () => {
  it('every formAssociated: true component exposes FormValidityMethods on its ambient element type', () => {
    expectTypeOf<HTMLElementTagNameMap['ore-checkbox']>().toMatchTypeOf<FormValidityMethods>();
    expectTypeOf<HTMLElementTagNameMap['ore-checkbox-group']>().toMatchTypeOf<FormValidityMethods>();
    expectTypeOf<HTMLElementTagNameMap['ore-combobox']>().toMatchTypeOf<FormValidityMethods>();
    expectTypeOf<HTMLElementTagNameMap['ore-file-input']>().toMatchTypeOf<FormValidityMethods>();
    expectTypeOf<HTMLElementTagNameMap['ore-input']>().toMatchTypeOf<FormValidityMethods>();
    expectTypeOf<HTMLElementTagNameMap['ore-message-composer']>().toMatchTypeOf<FormValidityMethods>();
    expectTypeOf<HTMLElementTagNameMap['ore-number-input']>().toMatchTypeOf<FormValidityMethods>();
    expectTypeOf<HTMLElementTagNameMap['ore-radio']>().toMatchTypeOf<FormValidityMethods>();
    expectTypeOf<HTMLElementTagNameMap['ore-radio-group']>().toMatchTypeOf<FormValidityMethods>();
    expectTypeOf<HTMLElementTagNameMap['ore-rating']>().toMatchTypeOf<FormValidityMethods>();
    expectTypeOf<HTMLElementTagNameMap['ore-select']>().toMatchTypeOf<FormValidityMethods>();
    expectTypeOf<HTMLElementTagNameMap['ore-slider']>().toMatchTypeOf<FormValidityMethods>();
    expectTypeOf<HTMLElementTagNameMap['ore-switch']>().toMatchTypeOf<FormValidityMethods>();
    expectTypeOf<HTMLElementTagNameMap['ore-textarea']>().toMatchTypeOf<FormValidityMethods>();
  });

  it('a made-up method fails the same assertion (proves the check above is not vacuously true)', () => {
    expectTypeOf<HTMLElementTagNameMap['ore-switch']>().not.toMatchTypeOf<{
      thisMethodDefinitelyDoesNotExistAnywhere(): void;
    }>();
  });
});

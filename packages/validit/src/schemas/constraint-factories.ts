import type { ErrorCode, Issue, MessageFn, ValidateFn } from '../core';

import { resolveMessage } from '../core';

type ConstraintSpec<Value, Ctx extends Record<string, unknown>> = {
  check: (value: Value) => boolean;
  code: ErrorCode;
  context: (value: Value) => Ctx;
  message: MessageFn<Ctx>;
  params?: (value: Value) => Record<string, unknown> | undefined;
};

export function createConstraintValidator<Value, Ctx extends Record<string, unknown>>(
  spec: ConstraintSpec<Value, Ctx>,
): ValidateFn {
  return (value, path) => {
    const typed = value as Value;

    if (spec.check(typed)) {
      return null;
    }

    const issue: Issue = {
      code: spec.code,
      message: resolveMessage(spec.message, spec.context(typed)),
      path,
    };

    const params = spec.params?.(typed);

    if (params) {
      issue.params = params;
    }

    return [issue];
  };
}

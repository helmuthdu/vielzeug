import type { ErrorCode, Issue, MessageFn, ValidateFn } from '../core';

import { resolveMessage } from '../core';

type ConstraintSpec<Value, Ctx extends Record<string, unknown>> = {
  check: (value: Value) => boolean;
  code: ErrorCode;
  context?: Omit<Ctx, 'value'>;
  message: MessageFn<Ctx>;
  params?: Record<string, unknown> | ((value: Value) => Record<string, unknown> | undefined);
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
      message: resolveMessage(spec.message, { ...spec.context, value: typed } as unknown as Ctx),
      path,
    };

    const params = typeof spec.params === 'function' ? spec.params(typed) : spec.params;

    if (params) {
      issue.params = params;
    }

    return [issue];
  };
}

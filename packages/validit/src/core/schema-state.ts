import type { AsyncValidateFn, ValidateFn } from './validation-types';

export interface SchemaState {
  /** Core validators (type checks and schema-level constraints) */
  coreValidators: ValidateFn[];

  /** User refinements attached via refine() */
  userValidators: ValidateFn[];

  /** Async validators (deferred to parseAsync) */
  asyncValidators: AsyncValidateFn[];

  /** Preprocessors run before validation (e.g., trim, coerce) */
  preprocessors: Array<(value: unknown) => unknown>;

  /** Postprocessors run after validation succeeds (e.g., transform) */
  postprocessors: Array<(value: any) => any>;

  /** Allow undefined values */
  isOptional: boolean;

  /** Allow null values */
  isNullable: boolean;

  /** User-provided description (for docs/tooling) */
  description?: string;

  /** Fallback value on validation failure */
  catch?: {
    enabled: boolean;
    factory: () => any;
  };
}

export function defaultState(): SchemaState {
  return {
    asyncValidators: [],
    coreValidators: [],
    isNullable: false,
    isOptional: false,
    postprocessors: [],
    preprocessors: [],
    userValidators: [],
  };
}

export function cloneState(state: SchemaState): SchemaState {
  return {
    asyncValidators: [...state.asyncValidators],
    catch: state.catch ? { ...state.catch } : undefined,
    coreValidators: [...state.coreValidators],
    description: state.description,
    isNullable: state.isNullable,
    isOptional: state.isOptional,
    postprocessors: [...state.postprocessors],
    preprocessors: [...state.preprocessors],
    userValidators: [...state.userValidators],
  };
}

import { ApiError } from '../worker/http';

export type AuthDiagnostic = {
  readonly kind: 'configuration' | 'database' | 'schema' | 'email' | 'catalog' | 'internal';
};

export class AuthOperationError extends ApiError {
  readonly authDiagnostic: AuthDiagnostic;

  constructor(status: number, kind: AuthDiagnostic['kind'], opts?: ErrorOptions) {
    super(
      status,
      status === 500 ? 'internal' : 'unavailable',
      status === 500 ? 'Something went wrong.' : 'The service is temporarily unavailable.',
      opts,
    );
    this.authDiagnostic = { kind };
  }
}

export async function databaseOperation<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (cause) {
    throw new AuthOperationError(500, 'database', { cause });
  }
}

// Public auth surface of @vielzeug/archive: the reference passwordless identity
// issuer. Server deployments bind it behind this subpath — it never belongs in a
// browser bundle, exactly like the ./worker subpath.
export type { AuthArchiveBinding, AuthWorkerEnv, SendEmail } from './auth/config';
export type { AuthDiagnostic } from './auth/errors';
export type { AuthEvent, AuthWorkerHandler } from './auth/worker';
export { createAuthWorker } from './auth/worker';

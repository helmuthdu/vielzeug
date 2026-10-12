import type { ArchiveWorkerEnv } from '../../src/worker';
import worker from './worker';

/** HTTP adapter for the catalog-only harness's external loopback signing fixture. */
export default {
  fetch(request: Request, env: Omit<ArchiveWorkerEnv, 'AUTH_ISSUER_SERVICE'>, ctx: Parameters<typeof worker.fetch>[2]) {
    return worker.fetch(request, { ...env, AUTH_ISSUER_SERVICE: { fetch: (input) => fetch(input) } }, ctx);
  },
  scheduled(
    controller: unknown,
    env: Omit<ArchiveWorkerEnv, 'AUTH_ISSUER_SERVICE'>,
    ctx: Parameters<NonNullable<typeof worker.scheduled>>[2],
  ) {
    return worker.scheduled?.(controller, { ...env, AUTH_ISSUER_SERVICE: { fetch: (input) => fetch(input) } }, ctx);
  },
};

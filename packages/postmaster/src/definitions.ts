import { PostmasterError } from './errors.ts';
import type { JobDefinition, JobDefinitions, RetryPolicy } from './types.ts';

function validateRetry(retry: RetryPolicy | undefined, name: string): void {
  if (!retry) return;

  if (!Number.isInteger(retry.maxAttempts) || retry.maxAttempts < 1) {
    throw new PostmasterError(`job "${name}" retry.maxAttempts must be a positive integer`);
  }
}

function validateMigrations(name: string, job: JobDefinition<unknown>): void {
  const migrations = job.migrate;
  if (!migrations) return;

  const keys = Object.keys(migrations);
  if (keys.length === 0) throw new PostmasterError(`job "${name}" migrations must not be empty`);

  const versions = keys
    .map((key) => {
      const version = Number(key);
      if (!Number.isInteger(version) || String(version) !== key) {
        throw new PostmasterError(`job "${name}" has invalid migration key "${key}"`);
      }
      if (version < 1 || version >= job.version) {
        throw new PostmasterError(
          `job "${name}" has invalid migration key "${version}" (valid range: 1..${job.version - 1})`,
        );
      }
      if (typeof migrations[version] !== 'function') {
        throw new PostmasterError(`job "${name}" migration from version ${version} must be a function`);
      }
      return version;
    })
    .sort((a, b) => a - b);

  for (let index = 1; index < versions.length; index++) {
    if (versions[index] !== versions[index - 1] + 1) {
      throw new PostmasterError(`job "${name}" missing migration from version ${versions[index - 1] + 1}`);
    }
  }

  if (versions.at(-1) !== job.version - 1) {
    throw new PostmasterError(`job "${name}" migrations must lead into version ${job.version}`);
  }
}

function validateJob(name: string, job: JobDefinition<unknown>): void {
  if (!Number.isInteger(job.version) || job.version < 1) {
    throw new PostmasterError(`job "${name}" version must be a positive integer`);
  }

  if (typeof job.execute !== 'function' || typeof job.key !== 'function') {
    throw new PostmasterError(`job "${name}" must define execute and key`);
  }

  validateRetry(job.retry, name);
  validateMigrations(name, job);
}

export function defineJobs<const J extends JobDefinitions>(jobs: J): J {
  for (const [name, job] of Object.entries(jobs)) validateJob(name, job);

  return jobs;
}

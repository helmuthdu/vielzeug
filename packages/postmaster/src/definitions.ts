import { PostmasterError } from './errors.ts';
import type { JobDefinition, JobDefinitions, RetryPolicy } from './types.ts';

function validateRetry(retry: RetryPolicy | undefined, name: string): void {
  if (!retry) return;

  if (!Number.isInteger(retry.maxAttempts) || retry.maxAttempts < 1) {
    throw new PostmasterError(`job "${name}" retry.maxAttempts must be a positive integer`);
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
}

export function defineJobs<const J extends JobDefinitions>(jobs: J): J {
  for (const [name, job] of Object.entries(jobs)) validateJob(name, job);

  return jobs;
}

import { PrimalDomainError } from './errors';
import type { HuntTimer } from './types';
import { type HuntSubject, isAscentSubject, isCampaignSubject, isChallengeSubject } from './types';

/** A fresh, never-started timer: the initial state for every hunt. */
export function idleHuntTimer(): HuntTimer {
  return { durationMs: null, elapsedMs: 0, startedAt: null };
}

/** Current reading in milliseconds: accumulated segments plus the running segment, if any. */
export function huntTimerMs(timer: HuntTimer, now: string): number {
  const running = timer.startedAt ? Math.max(0, Date.parse(now) - Date.parse(timer.startedAt)) : 0;
  return timer.elapsedMs + running;
}

export function startHuntTimer(timer: HuntTimer, now: string): HuntTimer {
  return timer.startedAt ? timer : { ...timer, startedAt: now };
}

export function pauseHuntTimer(timer: HuntTimer, now: string): HuntTimer {
  return timer.startedAt ? { ...timer, elapsedMs: huntTimerMs(timer, now), startedAt: null } : timer;
}

export function resetHuntTimer(): HuntTimer {
  return idleHuntTimer();
}

/**
 * Freezes the timer into `durationMs` when a result is recorded. A timer that was never
 * started (or was reset) records `null` so the result shows no duration instead of 0:00.
 */
export function stopHuntTimer(timer: HuntTimer, now: string): HuntTimer {
  const elapsedMs = huntTimerMs(timer, now);
  const durationMs = timer.startedAt || elapsedMs > 0 ? elapsedMs : null;
  return { durationMs, elapsedMs, startedAt: null };
}

/**
 * Throws unless the subject accepts hunt changes: a campaign only during its Hunt phase, an
 * ascent or challenge until it ends, an expedition until its result is recorded. Guards
 * the timer and both fight boards.
 */
export function assertHuntEditable(subject: HuntSubject): void {
  if (isCampaignSubject(subject)) {
    if (subject.phase !== 'hunt') {
      throw new PrimalDomainError('phase-transition', 'Hunt state is only editable during the Hunt phase.');
    }
  } else if (isAscentSubject(subject) || isChallengeSubject(subject)) {
    if (subject.status === 'finished') {
      throw new PrimalDomainError('run-finished', 'This run has already ended.');
    }
  } else if (subject.status === 'played') {
    throw new PrimalDomainError('expedition-finished', 'The result is already recorded for this expedition.');
  }
}

export function startSubjectHuntTimer<T extends HuntSubject>(subject: T, now: string): T {
  assertHuntEditable(subject);
  return { ...subject, huntTimer: startHuntTimer(subject.huntTimer, now), updatedAt: now };
}

export function pauseSubjectHuntTimer<T extends HuntSubject>(subject: T, now: string): T {
  assertHuntEditable(subject);
  return { ...subject, huntTimer: pauseHuntTimer(subject.huntTimer, now), updatedAt: now };
}

export function resetSubjectHuntTimer<T extends HuntSubject>(subject: T, now: string): T {
  assertHuntEditable(subject);
  return { ...subject, huntTimer: resetHuntTimer(), updatedAt: now };
}

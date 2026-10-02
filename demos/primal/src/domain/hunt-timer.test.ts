import { describe, expect, it } from 'vitest';
import {
  huntTimerMs,
  idleHuntTimer,
  pauseHuntTimer,
  resetHuntTimer,
  startHuntTimer,
  stopHuntTimer,
} from './hunt-timer';

const T0 = '2026-01-01T00:00:00.000Z';
const T10 = '2026-01-01T00:00:10.000Z';
const T25 = '2026-01-01T00:00:25.000Z';
const T40 = '2026-01-01T00:00:40.000Z';

describe('huntTimerMs', () => {
  it('reads zero on an idle timer', () => {
    expect(huntTimerMs(idleHuntTimer(), T0)).toBe(0);
  });

  it('adds the running segment to accumulated time', () => {
    const timer = { durationMs: null, elapsedMs: 5000, startedAt: T10 };
    expect(huntTimerMs(timer, T25)).toBe(20000);
  });

  it('ignores a startedAt in the future', () => {
    const timer = { durationMs: null, elapsedMs: 0, startedAt: T25 };
    expect(huntTimerMs(timer, T10)).toBe(0);
  });
});

describe('startHuntTimer', () => {
  it('stamps startedAt', () => {
    expect(startHuntTimer(idleHuntTimer(), T0)).toEqual({ durationMs: null, elapsedMs: 0, startedAt: T0 });
  });

  it('is a no-op while already running', () => {
    const running = startHuntTimer(idleHuntTimer(), T0);
    expect(startHuntTimer(running, T10)).toBe(running);
  });
});

describe('pauseHuntTimer', () => {
  it('folds the running segment into elapsedMs', () => {
    const running = startHuntTimer(idleHuntTimer(), T0);
    expect(pauseHuntTimer(running, T25)).toEqual({ durationMs: null, elapsedMs: 25000, startedAt: null });
  });

  it('is a no-op when not running', () => {
    const paused = pauseHuntTimer(startHuntTimer(idleHuntTimer(), T0), T10);
    expect(pauseHuntTimer(paused, T25)).toBe(paused);
  });

  it('resumes from accumulated time on restart', () => {
    const paused = pauseHuntTimer(startHuntTimer(idleHuntTimer(), T0), T10);
    const resumed = startHuntTimer(paused, T25);
    expect(huntTimerMs(resumed, T40)).toBe(25000);
  });
});

describe('resetHuntTimer', () => {
  it('returns a fresh idle timer', () => {
    const running = startHuntTimer(idleHuntTimer(), T0);
    expect(resetHuntTimer()).toEqual(idleHuntTimer());
    expect(running.startedAt).toBe(T0);
  });
});

describe('stopHuntTimer', () => {
  it('freezes the running reading into durationMs', () => {
    const running = startHuntTimer(idleHuntTimer(), T0);
    expect(stopHuntTimer(running, T40)).toEqual({ durationMs: 40000, elapsedMs: 40000, startedAt: null });
  });

  it('freezes accumulated time on a paused timer', () => {
    const paused = pauseHuntTimer(startHuntTimer(idleHuntTimer(), T0), T10);
    expect(stopHuntTimer(paused, T40)).toEqual({ durationMs: 10000, elapsedMs: 10000, startedAt: null });
  });

  it('records null when the timer was never started', () => {
    expect(stopHuntTimer(idleHuntTimer(), T40)).toEqual({ durationMs: null, elapsedMs: 0, startedAt: null });
  });
});

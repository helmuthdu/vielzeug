#!/usr/bin/env node
/**
 * CalVer lockstep train numbers.
 *
 * A train is one release of the @vielzeug/* family: every package manifest is stamped with
 * the same `YY.MM.N` version, where `YY.MM` is the calendar month the train ships in and `N`
 * is the train revision: 0 for the month's first train, +1 for each train after it. The
 * number answers "when did this ship?", never "how big was the change?": size lives in the
 * changelog sections and per-package migration notes, not the version. See RELEASE.md.
 */

/**
 * The next train number, given every publishable package's current version and the shipping
 * date. Versions already stamped this month advance the revision; anything else (older
 * trains, the pre-CalVer semver history, a new month) starts the month at revision 0.
 */
export function nextTrainVersion(versions, now = new Date()) {
  const prefix = `${String(now.getFullYear() % 100).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')}.`;

  let revision = -1;
  for (const version of versions) {
    if (!version.startsWith(prefix)) continue;

    const tail = version.slice(prefix.length);
    if (/^\d+$/.test(tail)) revision = Math.max(revision, Number(tail));
  }

  return `${prefix}${revision + 1}`;
}

export const errorHandlingExample = {
  code: `import { TempoError, TempoInvalidTzError, TempoMissingTzError, inTz, parse, parsePlainDateTime, toInstant } from '@vielzeug/tempo';

// ── TempoInvalidInputError: bad parse string ─────────────────────────────────
try {
  parse('not-a-date');
} catch (e) {
  if (e instanceof TempoError) {
    console.log(e.name);    // 'TempoInvalidInputError'
    console.log(e.message); // 'Unable to parse date/time string: "not-a-date". ...'
  }
}

// ── TempoMissingTzError: plain input without timezone ────────────────────────
try {
  toInstant(parsePlainDateTime('2026-03-21T10:00:00'));
} catch (e) {
  if (e instanceof TempoMissingTzError) {
    console.log(e.name); // 'TempoMissingTzError'
  }
}

// ── TempoInvalidTzError: bad timezone string ─────────────────────────────────
try {
  inTz(parse('2026-03-21T10:00:00Z', 'instant'), 'Not/AZone');
} catch (e) {
  if (e instanceof TempoInvalidTzError) {
    console.log(e.name); // 'TempoInvalidTzError'
  }
}

// ── Every subtype is also a TempoError (single catch-all) ───────────────────
try {
  parse('bad');
} catch (e) {
  console.log(e instanceof Error);      // true
  console.log(e instanceof TempoError); // true
  console.log(TempoError.is(e));        // true — static type guard, same check
}
`,

  name: 'TempoError — instanceof checks across the error hierarchy',
};

export const errorHandlingExample = {
  code: `import { TempoError, TempoErrorCode, inTz, parse, parsePlainDateTime, toInstant } from '@vielzeug/tempo';

// ── INVALID_INPUT: bad parse string ──────────────────────────────────────────
try {
  parse('not-a-date');
} catch (e) {
  if (e instanceof TempoError) {
    console.log(e.code);    // 'INVALID_INPUT'
    console.log(e.message); // '[tempo] Unable to parse date/time string: "not-a-date"'
  }
}

// ── MISSING_TZ: plain input without timezone ──────────────────────────────────
try {
  toInstant(parsePlainDateTime('2026-03-21T10:00:00'));
} catch (e) {
  if (e instanceof TempoError) {
    console.log(e.code); // 'MISSING_TZ'
  }
}

// ── INVALID_TZ: bad timezone string ──────────────────────────────────────────
try {
  inTz(parse('2026-03-21T10:00:00Z', 'instant'), 'Not/AZone');
} catch (e) {
  if (e instanceof TempoError) {
    console.log(e.code); // 'INVALID_TZ'
  }
}

// ── Still instanceof TypeError (backward compat) ─────────────────────────────
try {
  parse('bad');
} catch (e) {
  console.log(e instanceof TypeError);  // true
  console.log(e instanceof TempoError); // true
}

// ── Inspect all error codes ───────────────────────────────────────────────────
console.log(Object.values(TempoErrorCode));
// ['INVALID_INPUT', 'INVALID_TZ', 'MISSING_TZ', 'UNSUPPORTED_INPUT']
`,

  name: 'TempoError — instanceof checks and error codes',
};

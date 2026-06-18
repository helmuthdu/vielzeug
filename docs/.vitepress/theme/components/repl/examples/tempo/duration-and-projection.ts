export const durationAndProjectionExample = {
  code: `import { difference, formatDuration, inTz, parseDuration, parseZoned } from '@vielzeug/tempo'

// --- formatDuration() ---
// ISO 8601 string → human-readable
console.log(formatDuration('P1Y2M3DT4H'))    // '1 year, 2 months, 3 days, 4 hours'
console.log(formatDuration('PT30M'))         // '30 minutes'
console.log(formatDuration({ seconds: 90 })) // '1 minute, 30 seconds'
console.log(formatDuration({ microseconds: 500, nanoseconds: 250 }))
// → '500 microseconds, 250 nanoseconds'  (sub-ms units fully supported)

// --- parseDuration() ---
const dur = parseDuration('P0Y2M3DT0H5M10S')
console.log('months:', dur.months, 'days:', dur.days, 'minutes:', dur.minutes)

// --- difference() produces a Duration ---
const a = parseZoned('2026-01-01T00:00:00[UTC]')
const b = parseZoned('2026-06-15T09:30:00[UTC]')
const d = difference(a, b, { largestUnit: 'month' })
console.log(formatDuration(d)) // '5 months, 14 days, 9 hours, 30 minutes'

// --- inTz() re-projection ---
// Same absolute instant, different wall-clock
const berlin = parseZoned('2026-03-21T11:00:00+01:00[Europe/Berlin]')
const utc    = inTz(berlin, 'UTC')
const tokyo  = inTz(berlin, 'Asia/Tokyo')

console.log('Berlin:', berlin.toString())
console.log('UTC:',    utc.toString())    // wall-clock: 10:00 UTC
console.log('Tokyo:',  tokyo.toString())  // wall-clock: 19:00 JST
console.log('Same instant?', berlin.toInstant().epochMilliseconds === utc.toInstant().epochMilliseconds)`,
  name: 'Duration & Timezone Projection',
};

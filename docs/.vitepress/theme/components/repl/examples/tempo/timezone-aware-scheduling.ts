export const timezoneAwareSchedulingExample = {
  code: `import { format, formatZoned, inTz, parsePlainDateTime, toInstant } from '@vielzeug/tempo'

const meetingUtc = toInstant(parsePlainDateTime('2026-04-15T14:00:00'), { tz: 'UTC' })
const attendees = [
  { name: 'Alice', tz: 'America/New_York' },
  { name: 'Bruno', tz: 'Europe/Berlin' },
  { name: 'Keiko', tz: 'Asia/Tokyo' },
]

for (const attendee of attendees) {
  const local = inTz(meetingUtc, attendee.tz)
  console.log(attendee.name + ':', format(local, { pattern: 'long', locale: 'en-US' }))
  console.log('  zoned:', formatZoned(meetingUtc, { tz: attendee.tz }))
}`,

  name: 'Timezone-Aware Scheduling',
};

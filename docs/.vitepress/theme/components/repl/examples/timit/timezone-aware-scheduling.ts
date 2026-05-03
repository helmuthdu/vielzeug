export const timezoneAwareSchedulingExample = {
  code: `import { toInstant, toZoned, format } from '@vielzeug/timit'

const meetingUtc = toInstant('2026-04-15T14:00:00Z')
const attendees = [
  { name: 'Alice', tz: 'America/New_York' },
  { name: 'Bruno', tz: 'Europe/Berlin' },
  { name: 'Keiko', tz: 'Asia/Tokyo' },
]

for (const attendee of attendees) {
  const local = toZoned(meetingUtc, { tz: attendee.tz })
  console.log(attendee.name + ':', format(local, { pattern: 'long', locale: 'en-US', tz: attendee.tz }))
}`,

  name: 'Timezone-Aware Scheduling',
};

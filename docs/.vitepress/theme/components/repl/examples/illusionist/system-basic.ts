export const systemBasicExample = {
  code: `import { createIllusion } from '@vielzeug/illusionist'
import { en } from '@vielzeug/illusionist/locales'

const illusion = createIllusion({ seed: 12345, locale: en })

console.log(illusion.system.filePath())
console.log(illusion.system.semver({ includePrerelease: true }))
console.log(illusion.system.uuid())
console.log(illusion.system.port())
console.log(illusion.system.cron())
console.log(illusion.system.process())`,
  name: 'system - Files, semver, UUIDs, ports, and cron',
};

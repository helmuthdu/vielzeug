export const messagesOverrideExample = {
  code: `import { createParseContext, s } from '@vielzeug/spell'

const context = createParseContext({
  object: { invalidKeys: () => 'Use only supported fields' },
})

console.log(s.object({ email: s.string().email() }).safeParse({ email: 'ada@example.com', extra: true }, context).success)`,
  name: 'Request-local messages',
};

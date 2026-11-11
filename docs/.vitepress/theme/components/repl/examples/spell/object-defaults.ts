export const objectDefaultsExample = {
  code: `import { s } from '@vielzeug/spell';

const ServerConfig = s.object({
  host: s.string().default('localhost'),
  port: s.number().int().positive().default(3000),
  tls: s.boolean().default(false),
});

// Absent keys take their field default
console.log(ServerConfig.parse({}));
// { host: 'localhost', port: 3000, tls: false }

// default() on the object itself covers a missing object
const AppConfig = s.object({
  debug: s.boolean().default(false),
  server: ServerConfig.default({ host: 'localhost', port: 3000, tls: false }),
});

console.log(AppConfig.parse({}).server.port); // 3000

// Each parse returns a fresh copy of the default value
const Tags = s.array(s.string()).default([]);
const first = Tags.parse(undefined);
first.push('mutated');
console.log(Tags.parse(undefined)); // []

// Fields without a default stay required
console.log(s.object({ name: s.string() }).safeParse({}).success); // false
`,
  name: 'Object Defaults',
};

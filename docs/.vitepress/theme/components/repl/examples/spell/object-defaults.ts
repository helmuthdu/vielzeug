export const objectDefaultsExample = {
  code: `import { s } from '@vielzeug/spell';

// Schema where all fields have defaults
const ServerConfig = s.object({
  host: s.string().default('localhost'),
  port: s.number().int().positive().default(3000),
  tls: s.boolean().default(false),
});

// Get a fully filled config without providing any input
const config = ServerConfig.defaults();
console.log(config);
// { host: 'localhost', port: 3000, tls: false }

// Works with nested schemas too
const AppConfig = s.object({
  server: ServerConfig,
  debug: s.boolean().default(false),
});

// Parse with partial input — missing fields use their defaults
const parsed = AppConfig.parse({ server: { host: 'prod.example.com', port: 443, tls: true }, debug: true });
console.log(parsed.server.host); // 'prod.example.com'

// Schema with required field (no default) — throws if .defaults() called
const Strict = s.object({ name: s.string() });
const result = Strict.safeParse({});
console.log(result.success); // false — name is required
`,
  name: 'Object Defaults',
};

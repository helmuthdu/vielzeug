export const onResolveExample = `import {
  createContainer,
  token,
  type ResolveInterceptor,
} from '/conduit';

// --- Tokens ---
const Logger = token<{ log(msg: string): void }>('Logger');
const Config = token<{ env: string }>('Config');
const Service = token<{ run(): void }>('Service');

// --- Container setup ---
const container = createContainer({ name: 'app' });

container.value(Logger, { log: (msg) => console.log('[log]', msg) });
container.value(Config, { env: 'production' });
container.factory(Service, async (r) => {
  const logger = await r.resolve(Logger);
  const config = await r.resolve(Config);
  return { run: () => logger.log(\`Service running in \${config.env}\`) };
});

// --- Observability via onResolve ---
const resolvedTokens: string[] = [];

const interceptor: ResolveInterceptor = (tok) => {
  resolvedTokens.push(tok.description ?? 'anonymous');
};

const unsub = container.onResolve(interceptor);

// --- Resolve ---
const service = await container.resolve(Service);
service.run();

console.log('Tokens resolved:', resolvedTokens);
// → ['Service']  (Logger/Config resolved internally — not via container.resolve())

// --- Unsubscribe ---
unsub();
await container.resolve(Config); // interceptor no longer fires

console.log('After unsub:', resolvedTokens);
// → still ['Service'] — no new entry
`;

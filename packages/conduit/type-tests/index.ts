import { createContainer, factoryProvider, token, valueProvider } from '../src/index.js';

const Config = token<{ url: string }>('Config');
const Client = token<{ url: string }>('Client');

const container = createContainer([
  valueProvider(Config, { url: '/api' }),
  factoryProvider(Client, [Config], (config) => {
    const url: string = config.url;
    return { url };
  }),
]);

const client: Promise<{ url: string }> = container.resolve(Client);
const services: Promise<{ readonly client: { url: string } }> = container.resolve({ client: Client });

void client;
void services;

import { createCourier } from '../dist/index.js';

interface User {
  id: number;
}

const courier = createCourier();
const request: Promise<User> = courier.get<User>('/users/{id}', { params: { id: 1 } });
const cached: Promise<User> = courier.get<User>('/users/{id}', {
  cache: { key: ['users', 1] },
  params: { id: 1 },
});
const prefetched: Promise<void> = courier.prefetch<User>('/users/{id}', {
  cache: { key: ['users', 1] },
  params: { id: 1 },
});

void request;
void cached;
void prefetched;

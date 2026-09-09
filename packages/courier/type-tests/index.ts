import {
  type CourierCacheKey,
  createCourier,
  type GetRequestConfig,
  type PrefetchConfig,
  type RequestConfig,
} from '../src/index.js';

interface User {
  id: number;
}

const courier = createCourier();
const explicit: Promise<User> = courier.get<User>('/users/{id}', { params: { id: 1 } });
const inferred: Promise<User> = courier.get('/users/{id}', {
  params: { id: 1 },
  schema: { parse: (value) => value as User },
});
const key: CourierCacheKey = ['users', 1];
const cached: Promise<User> = courier.get<User>('/users/{id}', { cache: { key }, params: { id: 1 } });
const prefetched: Promise<void> = courier.prefetch<User>('/users/{id}', { cache: { key }, params: { id: 1 } });

type ExpectFalse<T extends false> = T;
type EmptyKeyRejected = ExpectFalse<readonly [] extends CourierCacheKey ? true : false>;
type RawRejectsCache = ExpectFalse<
  { cache: { key: readonly ['users'] }; responseType: 'raw' } extends GetRequestConfig<'/users', Response>
    ? true
    : false
>;
type PrefetchRejectsSignal = ExpectFalse<
  { cache: { key: readonly ['users'] }; signal: AbortSignal } extends PrefetchConfig<'/users', User> ? true : false
>;
type PrefetchRejectsTimeout = ExpectFalse<
  { cache: { key: readonly ['users'] }; timeout: number } extends PrefetchConfig<'/users', User> ? true : false
>;
type RequestRejectsCache = ExpectFalse<
  { cache: { key: readonly ['users'] }; method: 'GET' } extends RequestConfig<'/users', User> ? true : false
>;

void explicit;
void inferred;
void cached;
void prefetched;
void (false as EmptyKeyRejected);
void (false as RawRejectsCache);
void (false as PrefetchRejectsSignal);
void (false as PrefetchRejectsTimeout);
void (false as RequestRejectsCache);

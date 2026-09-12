import { activeRouteQuery, type RouteName, router } from '../core/router';

const routePath = (name: RouteName, params: Record<string, string> = {}): string =>
  name === 'booking'
    ? `/booking/${params.slug}`
    : name === 'destination'
      ? `/destinations/${params.slug}`
      : name === 'hotel'
        ? `/hotels/${params.slug}`
        : name === 'trip'
          ? `/trips/${params.id}`
          : `/${name}`;

export const routeHref = (name: RouteName, params: Record<string, string> = {}): string => {
  const path = routePath(name, params);
  return import.meta.env.BASE_URL === '/' ? path : `${import.meta.env.BASE_URL}#${path}`;
};

export const navigate = (name: RouteName, params: Record<string, string> = {}): void => {
  void router.navigate(routePath(name, params));
};

export const tripRoute = (): void => navigate('trip', { id: 'japan-october' });

export const queryValue = (key: string): string => {
  const value = activeRouteQuery.value[key];
  return typeof value === 'string' ? value : '';
};

import { activeRouteQuery, type RouteName, router } from '../core/router';

export const navigate = (name: RouteName, params: Record<string, string> = {}): void => {
  const path =
    name === 'booking'
      ? `/booking/${params.slug}`
      : name === 'destination'
        ? `/destinations/${params.slug}`
        : name === 'hotel'
          ? `/hotels/${params.slug}`
          : name === 'trip'
            ? `/trips/${params.id}`
            : `/${name}`;
  void router.navigate(path);
};

export const tripRoute = (): void => navigate('trip', { id: 'japan-october' });

export const queryValue = (key: string): string => {
  const value = activeRouteQuery.value[key];
  return typeof value === 'string' ? value : '';
};

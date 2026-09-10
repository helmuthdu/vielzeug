import { signal } from '@vielzeug/ripple';

export const travelerProfile = signal({
  email: 'avery@example.com',
  firstName: 'Avery',
  homeAirport: 'Dublin (DUB)',
  lastName: 'Morgan',
  phone: '+353 85 123 4567',
  seatPreference: 'Window',
});

export const travelPreferences = signal({
  currency: 'EUR',
  distanceUnit: 'Kilometers',
  language: 'English',
  marketingUpdates: false,
  priceAlerts: true,
  tripReminders: true,
});

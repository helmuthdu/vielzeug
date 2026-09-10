import { computed, signal } from '@vielzeug/ripple';
import { initialBookings, initialItinerary } from './data';
import type { Booking, ItineraryDay, ItineraryItem } from './types';

export const bookings = signal<Booking[]>(structuredClone(initialBookings));
export const upcomingBookings = computed(() => bookings.value.filter((booking) => booking.timeframe === 'upcoming'));
export const itinerary = signal<ItineraryDay[]>(structuredClone(initialItinerary));
export const searchDestination = signal('Tokyo');
export const searchDestinationId = signal('tokyo');
export const searchDeparture = signal('2026-10-12');
export const searchReturn = signal('2026-10-19');
export const searchTravelers = signal('2 travelers');
export const searchDates = computed(() => {
  const format = (value: string, includeMonth = true): string =>
    new Intl.DateTimeFormat('en-GB', includeMonth ? { day: 'numeric', month: 'short' } : { day: 'numeric' }).format(
      new Date(`${value}T00:00:00Z`),
    );
  const sameMonth = searchDeparture.value.slice(0, 7) === searchReturn.value.slice(0, 7);
  return `${format(searchDeparture.value, !sameMonth)}–${format(searchReturn.value)}`;
});

export function addBooking(booking: Booking): void {
  if (bookings.value.some((item) => item.id === booking.id)) return;
  bookings.value = [booking, ...bookings.value];
}

export function addItineraryItem(dayIndex: number, item: ItineraryItem): void {
  itinerary.value = itinerary.value.map((day, index) =>
    index === dayIndex ? { ...day, items: [...day.items, item] } : day,
  );
}

export function removeItineraryItem(dayIndex: number, itemId: string): void {
  itinerary.value = itinerary.value.map((day, index) =>
    index === dayIndex ? { ...day, items: day.items.filter((item) => item.id !== itemId) } : day,
  );
}

export function moveItineraryItem(dayIndex: number, itemIndex: number, direction: -1 | 1): void {
  const day = itinerary.value[dayIndex];
  const nextIndex = itemIndex + direction;
  if (!day || nextIndex < 0 || nextIndex >= day.items.length) return;
  const items = [...day.items];
  [items[itemIndex], items[nextIndex]] = [items[nextIndex], items[itemIndex]];
  itinerary.value = itinerary.value.map((candidate, index) =>
    index === dayIndex ? { ...candidate, items } : candidate,
  );
}

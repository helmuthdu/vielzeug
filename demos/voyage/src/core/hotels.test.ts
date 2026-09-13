import { beforeEach, describe, expect, it } from 'vitest';
import { hotels, initialBookings } from './data';
import { compareBookings, savedHotelIds, toggleSavedHotel } from './state';

describe('hotel discovery data', () => {
  it('provides commercially useful card metadata', () => {
    for (const hotel of hotels) {
      expect(hotel.propertyType).not.toBe('');
      expect(hotel.reviewCount).toBeGreaterThan(0);
      expect(hotel.amenities.length).toBeGreaterThanOrEqual(2);
    }
  });
});

describe('booking chronology', () => {
  it('sorts upcoming bookings by their machine-readable start time', () => {
    expect(
      initialBookings
        .filter((booking) => booking.timeframe === 'upcoming')
        .sort(compareBookings)
        .map((booking) => booking.id),
    ).toEqual(['stay-tokyo', 'sushi-tokyo', 'train-kyoto', 'stay-kyoto']);
  });
});

describe('saved hotels', () => {
  beforeEach(() => {
    savedHotelIds.value = [];
  });

  it('toggles a hotel without affecting other saved hotels', () => {
    savedHotelIds.value = ['tokyo-house'];

    expect(toggleSavedHotel('ginza-edition')).toBe(true);
    expect(savedHotelIds.value).toEqual(['tokyo-house', 'ginza-edition']);
    expect(toggleSavedHotel('tokyo-house')).toBe(false);
    expect(savedHotelIds.value).toEqual(['ginza-edition']);
  });
});

import { createIllusion } from '@vielzeug/illusionist';
import { en } from '@vielzeug/illusionist/locales';
import type { Booking, Destination, Experience, Hotel, ItineraryDay } from './types';

const destinationTemplates: Destination[] = [
  {
    coordinates: { latitude: '35.6762° N', longitude: '139.6503° E' },
    description: 'Neon-lit neighborhoods, quiet shrines, and extraordinary food at every turn.',
    editorial: {
      description:
        'Start early in quiet shrine grounds, spend the afternoon inside ambitious galleries and tiny shops, then follow lantern light to a counter with six seats.',
      heading: 'Tradition and tomorrow, held in perfect tension.',
    },
    feature: {
      description:
        'Meet a local guide before the city wakes, cross the fish market, and finish with a seasonal lunch prepared in front of you.',
      heading: 'Follow Tokyo’s morning rhythm.',
    },
    highlight: 'Autumn peak',
    id: 'tokyo',
    name: 'Tokyo',
    region: 'Kantō',
    stays: 342,
  },
  {
    coordinates: { latitude: '35.0116° N', longitude: '135.7681° E' },
    description: 'Temple gardens, artisan traditions, and lanes shaped by a thousand years of history.',
    editorial: {
      description:
        'Move between moss gardens, cedar workshops, and neighborhood kitchens where inherited techniques remain part of everyday life.',
      heading: 'Ancient rituals, living craft.',
    },
    feature: {
      description:
        'Enter the eastern temples before the crowds, pause for tea in Gion, and end beside the lantern-lit Shirakawa canal.',
      heading: 'Find Kyoto’s quiet hours.',
    },
    id: 'kyoto',
    name: 'Kyoto',
    region: 'Kansai',
    stays: 186,
  },
  {
    coordinates: { latitude: '34.6937° N', longitude: '135.5023° E' },
    description: 'A spirited city of castle views, late-night flavors, and famously warm welcomes.',
    editorial: {
      description:
        'Osaka rewards appetite and spontaneity, from market breakfasts and riverside architecture to tiny bars hidden above Dōtonbori.',
      heading: 'Big flavor, open-hearted energy.',
    },
    feature: {
      description:
        'Walk the castle gardens, explore the city’s graphic design scene, and taste your way through the evening markets.',
      heading: 'See Osaka after sunset.',
    },
    id: 'osaka',
    name: 'Osaka',
    region: 'Kansai',
    stays: 214,
  },
  {
    coordinates: { latitude: '35.2324° N', longitude: '139.1069° E' },
    description: 'Mountain air, restorative onsen, and clear-day views across to Mount Fuji.',
    editorial: {
      description:
        'Slow the journey between Tokyo and Kyoto with forest trails, volcanic valleys, open-air baths, and changing views of Fuji.',
      heading: 'A restorative pause in the mountains.',
    },
    feature: {
      description:
        'Cross Lake Ashi, ride above Owakudani, and settle into an outdoor bath as evening reaches the mountains.',
      heading: 'Trade the train for mountain air.',
    },
    id: 'hakone',
    name: 'Hakone',
    region: 'Kanagawa',
    stays: 78,
  },
  {
    coordinates: { latitude: '43.2203° N', longitude: '142.8635° E' },
    description: 'Open landscapes, flower fields, and a slower rhythm in Japan’s wild north.',
    editorial: {
      description:
        'Hokkaido opens into broad horizons: flower farms, clear lakes, volcanic ridges, winter markets, and exceptional regional produce.',
      heading: 'Wild landscapes, generous seasons.',
    },
    feature: {
      description:
        'Follow country roads through Furano’s fields, stop at family-run farms, and watch the mountains change color at dusk.',
      heading: 'Take the long way through Furano.',
    },
    id: 'hokkaido',
    name: 'Hokkaido',
    region: 'Northern Japan',
    stays: 129,
  },
];

const hotelTemplates: Hotel[] = [
  {
    amenities: ['Breakfast', 'Onsen spa', 'Wi-Fi', 'Sky lounge'],
    description:
      'A serene contemporary stay above Shinjuku, balancing warm Japanese craft with far-reaching city views.',
    destinationId: 'tokyo',
    id: 'tokyo-house',
    location: 'Shinjuku, Tokyo',
    name: 'Tokyo House',
    price: 184,
    rating: 4.9,
    rooms: [
      { guests: 2, id: 'deluxe-king', name: 'Deluxe King', price: 184, size: 32 },
      { guests: 2, id: 'skyline-suite', name: 'Skyline Suite', price: 268, size: 48 },
    ],
    storyHeading: 'A calm vantage point above the city.',
  },
  {
    amenities: ['Tea room', 'City views', 'Breakfast', 'Wi-Fi'],
    description: 'Traditional proportions meet contemporary calm in the heart of Azabudai.',
    destinationId: 'tokyo',
    id: 'azabu-ryokan',
    location: 'Azabudai, Tokyo',
    name: 'Azabu Modern Ryokan',
    price: 216,
    rating: 4.8,
    rooms: [{ guests: 2, id: 'tatami-suite', name: 'Tatami Suite', price: 216, size: 36 }],
    storyHeading: 'Traditional proportions, contemporary calm.',
  },
  {
    amenities: ['Rooftop', 'Breakfast', 'Gym', 'Wi-Fi'],
    description: 'A polished city stay surrounded by Ginza galleries, restaurants, and design stores.',
    destinationId: 'tokyo',
    id: 'ginza-edition',
    location: 'Ginza, Tokyo',
    name: 'Ginza Edition',
    price: 198,
    rating: 4.7,
    rooms: [{ guests: 2, id: 'gallery-king', name: 'Gallery King', price: 198, size: 30 }],
    storyHeading: 'Ginza design with the city at your feet.',
  },
  {
    amenities: ['Garden', 'Breakfast', 'Tea room', 'Wi-Fi'],
    description: 'A quiet machiya-inspired hotel within walking distance of Kyoto’s eastern temples.',
    destinationId: 'kyoto',
    id: 'kyoto-garden',
    location: 'Higashiyama, Kyoto',
    name: 'Kyoto Garden Hotel',
    price: 162,
    rating: 4.8,
    rooms: [{ guests: 2, id: 'garden-room', name: 'Garden Room', price: 162, size: 29 }],
    storyHeading: 'A garden retreat beside Kyoto’s temples.',
  },
  {
    amenities: ['Rooftop', 'Gym', 'Wi-Fi', 'Late checkout'],
    description: 'An energetic base close to Dōtonbori with graphic interiors and skyline terraces.',
    destinationId: 'osaka',
    id: 'naniwa-stay',
    location: 'Namba, Osaka',
    name: 'Naniwa Stay',
    price: 138,
    rating: 4.7,
    rooms: [{ guests: 2, id: 'corner-queen', name: 'Corner Queen', price: 138, size: 27 }],
    storyHeading: 'An energetic base above Namba.',
  },
];

const experienceTemplates: Experience[] = [
  {
    curation: 'Host-led masterclass',
    description: 'Learn precise knife work and shape a seasonal tasting menu at the counter.',
    duration: '2.5 hours',
    id: 'sushi-workshop',
    location: 'Tsukiji, Tokyo',
    name: 'Sushi workshop with a local chef',
    price: 74,
    rating: 4.9,
    type: 'food',
  },
  {
    curation: 'Private sanctuary',
    description: 'Enter a quiet Gion tearoom for a ceremony shaped around season and craft.',
    duration: '90 minutes',
    id: 'tea-ceremony',
    location: 'Gion, Kyoto',
    name: 'Private tea ceremony',
    price: 48,
    rating: 4.9,
    type: 'activity',
  },
  {
    curation: 'Scenic traverse',
    description: 'Cross Lake Ashi and climb above the volcanic valley for clear-day Fuji views.',
    duration: 'Full day',
    id: 'fuji-day-trip',
    location: 'Hakone',
    name: 'Mount Fuji and lake day trip',
    price: 112,
    rating: 4.8,
    type: 'activity',
  },
  {
    curation: 'Early access',
    description: 'Walk moss gardens and temple paths in the stillness before the city wakes.',
    duration: '3 hours',
    id: 'temple-tour',
    location: 'Higashiyama, Kyoto',
    name: 'Temple gardens at first light',
    price: 56,
    rating: 4.8,
    type: 'activity',
  },
  {
    curation: 'Culinary crawl',
    description: 'Follow neon lanes for takoyaki, kushikatsu, and stories from local kitchens.',
    duration: '3 hours',
    id: 'osaka-food-tour',
    location: 'Dōtonbori, Osaka',
    name: 'Osaka street-food evening',
    price: 62,
    rating: 4.9,
    type: 'food',
  },
  {
    curation: 'Seasonal wonder',
    description: 'Meet growers among Furano’s fields and taste produce gathered that morning.',
    duration: 'Half day',
    id: 'furano-farm-day',
    location: 'Furano, Hokkaido',
    name: 'Furano farms and flower fields',
    price: 84,
    rating: 4.8,
    type: 'activity',
  },
];

const bookingTemplates: Booking[] = [
  {
    dates: '12–16 October',
    id: 'stay-tokyo',
    location: 'Shinjuku, Tokyo',
    status: 'Confirmed',
    subtitle: 'Deluxe King · 2 guests',
    timeframe: 'upcoming',
    title: 'Tokyo House',
    type: 'hotel',
  },
  {
    dates: '15 October · 08:30',
    id: 'train-kyoto',
    location: 'Tokyo → Kyoto',
    status: 'Confirmed',
    subtitle: 'Nozomi 17 · Car 8',
    timeframe: 'upcoming',
    title: 'Shinkansen to Kyoto',
    type: 'transport',
  },
  {
    dates: '12 October · 19:00',
    id: 'sushi-tokyo',
    location: 'Tsukiji, Tokyo',
    status: 'Confirmed',
    subtitle: '2 travelers',
    timeframe: 'upcoming',
    title: 'Sushi workshop',
    type: 'experience',
  },
  {
    dates: '15–18 October',
    id: 'stay-kyoto',
    location: 'Higashiyama, Kyoto',
    status: 'Confirmed',
    subtitle: 'Garden Room · 2 guests',
    timeframe: 'upcoming',
    title: 'Kyoto Garden Hotel',
    type: 'hotel',
  },
  {
    dates: '3–7 February 2025',
    id: 'past-sapporo-stay',
    location: 'Sapporo, Hokkaido',
    status: 'Completed',
    subtitle: 'Snow View Room · 2 guests',
    timeframe: 'past',
    title: 'North Light Ryokan',
    type: 'hotel',
  },
  {
    dates: '3 February 2025 · 11:20',
    id: 'past-airport-train',
    location: 'New Chitose → Sapporo',
    status: 'Completed',
    subtitle: 'Rapid Airport 93 · Car 4',
    timeframe: 'past',
    title: 'Airport Express',
    type: 'transport',
  },
  {
    dates: '5 February 2025 · 18:30',
    id: 'past-food-tour',
    location: 'Susukino, Sapporo',
    status: 'Completed',
    subtitle: 'Winter market tasting · 2 travelers',
    timeframe: 'past',
    title: 'Sapporo evening food tour',
    type: 'experience',
  },
];

const itineraryTemplates: ItineraryDay[] = [
  {
    city: 'Tokyo',
    date: '12 OCT',
    items: [
      { id: 'arrive', time: '09:00', title: 'Arrive at Haneda Airport', type: 'transport' },
      {
        id: 'checkin-tokyo',
        subtitle: 'Shinjuku',
        time: '14:00',
        title: 'Check in · Tokyo House',
        type: 'accommodation',
      },
      { id: 'sushi', subtitle: 'Tsukiji', time: '19:00', title: 'Sushi workshop', type: 'food' },
    ],
  },
  {
    city: 'Tokyo',
    date: '13 OCT',
    items: [
      { id: 'meiji', subtitle: 'Harajuku', time: '10:00', title: 'Meiji Shrine', type: 'activity' },
      { id: 'shibuya', subtitle: 'Shibuya', time: '14:00', title: 'Design district walk', type: 'activity' },
    ],
  },
  {
    city: 'Kyoto',
    date: '15 OCT',
    items: [
      {
        id: 'train',
        subtitle: 'Tokyo Station → Kyoto Station',
        time: '08:30',
        title: 'Shinkansen to Kyoto',
        type: 'transport',
      },
      {
        id: 'checkin-kyoto',
        subtitle: 'Higashiyama',
        time: '12:00',
        title: 'Check in · Kyoto Garden Hotel',
        type: 'accommodation',
      },
      { id: 'tea', subtitle: 'Gion', time: '16:00', title: 'Private tea ceremony', type: 'food' },
    ],
  },
  {
    city: 'Osaka',
    date: '18 OCT',
    items: [
      {
        id: 'osaka-train',
        subtitle: 'Kyoto Station → Shin-Osaka',
        time: '10:10',
        title: 'Train to Osaka',
        type: 'transport',
      },
      { id: 'castle', subtitle: 'Chūō', time: '14:00', title: 'Osaka Castle gardens', type: 'activity' },
      { id: 'dinner', subtitle: 'Dōtonbori', time: '19:30', title: 'Street-food evening', type: 'food' },
    ],
  },
];

export type VoyageDataSeed = {
  destinations: Destination[];
  experiences: Experience[];
  hotels: Hotel[];
  initialBookings: Booking[];
  initialItinerary: ItineraryDay[];
};

export function generateVoyageData(seed: string | number = 'vielzeug-voyage-2026'): VoyageDataSeed {
  const illusion = createIllusion({ locale: en, seed });
  const generatedPrice = (baseline: number, variation: number): number =>
    Math.round(
      Number(
        illusion.commerce.price({
          currency: 'EUR',
          max: baseline + variation,
          min: baseline - variation,
        }).amount,
      ) / 100,
    );
  const hotels = structuredClone(hotelTemplates).map((hotel) => {
    const price = generatedPrice(hotel.price, 12);
    return {
      ...hotel,
      price,
      rooms: hotel.rooms.map((room) => ({ ...room, price: price + (room.price - hotel.price) })),
    };
  });
  const experiences = structuredClone(experienceTemplates).map((experience) => ({
    ...experience,
    price: generatedPrice(experience.price, 8),
  }));

  return {
    destinations: structuredClone(destinationTemplates),
    experiences,
    hotels,
    initialBookings: structuredClone(bookingTemplates),
    initialItinerary: structuredClone(itineraryTemplates),
  };
}

export const seedData = generateVoyageData();
export const { destinations, experiences, hotels, initialBookings, initialItinerary } = seedData;

export const destinationById = (id: string | undefined) =>
  destinations.find((destination) => destination.id === id) ?? destinations[0];
export const hotelById = (id: string | undefined) => hotels.find((hotel) => hotel.id === id) ?? hotels[0];

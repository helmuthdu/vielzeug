export type Destination = {
  coordinates: { latitude: string; longitude: string };
  description: string;
  editorial: { description: string; heading: string };
  feature: { description: string; heading: string };
  highlight?: string;
  id: string;
  name: string;
  region: string;
  stays: number;
};

export type Hotel = {
  amenities: string[];
  description: string;
  destinationId: string;
  id: string;
  location: string;
  name: string;
  price: number;
  rating: number;
  rooms: Room[];
  storyHeading: string;
};

export type Room = {
  guests: number;
  id: string;
  name: string;
  price: number;
  size: number;
};

export type Experience = {
  curation: string;
  description: string;
  duration: string;
  id: string;
  location: string;
  name: string;
  price: number;
  rating: number;
  type: 'activity' | 'food';
};

export type Booking = {
  dates: string;
  id: string;
  location: string;
  status: 'Completed' | 'Confirmed';
  subtitle: string;
  timeframe: 'past' | 'upcoming';
  title: string;
  type: 'experience' | 'hotel' | 'transport';
};

export type ItineraryItem = {
  id: string;
  subtitle?: string;
  time: string;
  title: string;
  type: 'accommodation' | 'activity' | 'food' | 'transport';
};

export type ItineraryDay = {
  city: string;
  date: string;
  items: ItineraryItem[];
};

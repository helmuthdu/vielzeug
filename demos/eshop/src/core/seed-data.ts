import type { ColorOption, Dealer, Model, Order, PackageOption, User, WheelOption } from './types';

// ---------------------------------------------------------------------------
// Shared option pools — every model draws from the same paint/wheel/package
// catalog (like a real configurator would), each model's trims just decide
// which package ids come standard.
// ---------------------------------------------------------------------------

export const STANDARD_COLORS: ColorOption[] = [
  { hex: '#0b0c10', id: 'obsidian-black', metallic: false, name: 'Obsidian Black', priceDelta: '0.00' },
  { hex: '#f5f6f8', id: 'polar-white', metallic: false, name: 'Polar White', priceDelta: '0.00' },
  { hex: '#c7ccd1', id: 'glacier-silver', metallic: true, name: 'Glacier Silver', priceDelta: '890.00' },
  { hex: '#4b4f58', id: 'graphite-grey', metallic: true, name: 'Graphite Grey', priceDelta: '890.00' },
  { hex: '#1c3d5a', id: 'sapphire-blue', metallic: true, name: 'Sapphire Blue', priceDelta: '1290.00' },
  { hex: '#8c1c25', id: 'crimson-red', metallic: true, name: 'Crimson Red', priceDelta: '1290.00' },
];

function colorsStartingWith(defaultColorId: ColorOption['id']): ColorOption[] {
  const defaultColor = STANDARD_COLORS.find((color) => color.id === defaultColorId);

  if (!defaultColor) throw new Error(`Unknown default color: ${defaultColorId}`);

  return [defaultColor, ...STANDARD_COLORS.filter((color) => color.id !== defaultColorId)];
}

export const STANDARD_WHEELS: WheelOption[] = [
  { id: 'wheel-18', name: '18" Aero', priceDelta: '0.00', sizeInches: 18 },
  { id: 'wheel-19', name: '19" Sport', priceDelta: '650.00', sizeInches: 19 },
  { id: 'wheel-20', name: '20" AS Performance', priceDelta: '1450.00', sizeInches: 20 },
  { id: 'wheel-21', name: '21" Forged Titanium', priceDelta: '2600.00', sizeInches: 21 },
];

export const STANDARD_PACKAGES: PackageOption[] = [
  {
    category: 'comfort',
    description: 'Ventilated massage seats, ambient lighting, acoustic glass.',
    id: 'pkg-comfort',
    name: 'Comfort Package',
    priceDelta: '2400.00',
  },
  {
    category: 'technology',
    description: 'Augmented-reality navigation, 3D surround display, wireless charging.',
    id: 'pkg-tech',
    name: 'Technology Package',
    priceDelta: '3100.00',
  },
  {
    category: 'safety',
    description: 'Adaptive cruise control, active lane-keep assist, blind-spot exit warning.',
    id: 'pkg-safety',
    name: 'Driver Assistance Package',
    priceDelta: '1950.00',
  },
  {
    category: 'performance',
    description: 'Adaptive sport suspension, uprated brakes, sport exhaust.',
    id: 'pkg-performance',
    name: 'AS Performance Package',
    priceDelta: '4200.00',
  },
];

// ---------------------------------------------------------------------------
// Dealers — pickup destinations for `checkout-shipping`'s delivery-method step. A fixed, static
// list (no dealer-locator API in this demo), resolved by id via `Order.dealerId`.
// ---------------------------------------------------------------------------

export const DEALERS: Dealer[] = [
  { city: 'Lisbon', id: 'dealer-lisbon', name: 'Vielzeug Motors Lisbon' },
  { city: 'Berlin', id: 'dealer-berlin', name: 'Vielzeug Motors Berlin' },
  { city: 'Amsterdam', id: 'dealer-amsterdam', name: 'Vielzeug Motors Amsterdam' },
];

// ---------------------------------------------------------------------------
// Catalog — a fictional lineup under the "Vielzeug Motors" marque (this demo storefront borrows
// the monorepo's own project name rather than inventing an unrelated one) spanning the segments
// a real luxury automaker covers, deliberately using our own trim/sub-brand naming ("AS" =
// Vielzeug Sport, "Volt" = Vielzeug's EV line) rather than any real manufacturer's model names or
// trademarks.
// ---------------------------------------------------------------------------

export const models: Model[] = [
  {
    basePrice: '38900.00',
    bodyType: 'sedan',
    colors: colorsStartingWith('polar-white'),
    description:
      'The entry point into the Vielzeug lineup — a compact executive sedan built for the daily commute without compromising on the marque\u2019s signature ride quality.',
    features: ['adaptiveCruise', 'wirelessCharging', 'headUpDisplay'],
    fuelEconomyLPer100Km: 6.8,
    heroHue: 210,
    id: 'a200',
    name: 'Vielzeug A200',
    packages: STANDARD_PACKAGES,
    powertrain: 'petrol',
    rangeKm: null,
    seats: 5,
    segment: 'Compact Executive Sedan',
    slug: 'a200',
    tagline: 'Effortless precision, every day.',
    topSpeedKph: 225,
    trims: [
      {
        description: 'Well equipped from the start.',
        id: 'a200-base',
        includedPackageIds: [],
        name: 'Base',
        priceDelta: '0.00',
      },
      {
        description: 'Adds driver-assistance as standard.',
        id: 'a200-progressive',
        includedPackageIds: ['pkg-safety'],
        name: 'Progressive',
        priceDelta: '3200.00',
      },
      {
        description: 'Sport-tuned suspension and styling.',
        id: 'a200-as-line',
        includedPackageIds: ['pkg-safety', 'pkg-performance'],
        name: 'AS Line',
        priceDelta: '6800.00',
      },
    ],
    wheels: STANDARD_WHEELS,
    zeroToHundredSec: 7.9,
  },
  {
    basePrice: '58900.00',
    bodyType: 'sedan',
    colors: colorsStartingWith('crimson-red'),
    description:
      'A hybrid-assisted executive sedan striking the balance between effortless power and long-distance refinement.',
    features: ['adaptiveCruise', 'panoramicRoof', 'massageSeats', 'wirelessCharging'],
    fuelEconomyLPer100Km: 7.9,
    heroHue: 220,
    id: 'r350',
    name: 'Vielzeug R350',
    packages: STANDARD_PACKAGES,
    powertrain: 'hybrid',
    rangeKm: null,
    seats: 5,
    segment: 'Executive Sedan',
    slug: 'r350',
    tagline: 'The art of arriving well.',
    topSpeedKph: 250,
    trims: [
      {
        description: 'Refined and understated.',
        id: 'r350-elegance',
        includedPackageIds: [],
        name: 'Elegance',
        priceDelta: '0.00',
      },
      {
        description: 'Adds first-class comfort features.',
        id: 'r350-executive',
        includedPackageIds: ['pkg-comfort'],
        name: 'Executive',
        priceDelta: '5400.00',
      },
      {
        description: 'Sport suspension with comfort and performance packages.',
        id: 'r350-as-line',
        includedPackageIds: ['pkg-comfort', 'pkg-performance'],
        name: 'AS Line',
        priceDelta: '9200.00',
      },
    ],
    wheels: STANDARD_WHEELS,
    zeroToHundredSec: 5.9,
  },
  {
    basePrice: '94900.00',
    bodyType: 'sedan',
    colors: colorsStartingWith('obsidian-black'),
    description:
      'The Vielzeug flagship — a full-size sovereign sedan engineered for those in the back seat as much as those behind the wheel.',
    features: ['panoramicRoof', 'massageSeats', 'premiumAudio', 'matrixLed', 'headUpDisplay'],
    fuelEconomyLPer100Km: 9.6,
    heroHue: 235,
    id: 'v500',
    name: 'Vielzeug V500',
    packages: STANDARD_PACKAGES,
    powertrain: 'petrol',
    rangeKm: null,
    seats: 5,
    segment: 'Flagship Sedan',
    slug: 'v500',
    tagline: 'Presence, perfected.',
    topSpeedKph: 250,
    trims: [
      {
        description: 'Comfort and technology as standard.',
        id: 'v500-prestige',
        includedPackageIds: ['pkg-comfort', 'pkg-tech'],
        name: 'Prestige',
        priceDelta: '0.00',
      },
      {
        description: 'Every package, nothing left to add.',
        id: 'v500-sovereign',
        includedPackageIds: ['pkg-comfort', 'pkg-tech', 'pkg-safety'],
        name: 'Sovereign',
        priceDelta: '14500.00',
      },
    ],
    wheels: STANDARD_WHEELS,
    zeroToHundredSec: 4.8,
  },
  {
    basePrice: '52900.00',
    bodyType: 'suv',
    colors: colorsStartingWith('sapphire-blue'),
    description:
      'A compact SUV that trades none of the sedan lineup\u2019s composure for its extra ride height and space.',
    features: ['adaptiveCruise', 'panoramicRoof', 'wirelessCharging'],
    fuelEconomyLPer100Km: 8.1,
    heroHue: 28,
    id: 'x300',
    name: 'Vielzeug X300',
    packages: STANDARD_PACKAGES,
    powertrain: 'petrol',
    rangeKm: null,
    seats: 5,
    segment: 'Compact SUV',
    slug: 'x300',
    tagline: 'Room to roam, precision to trust.',
    topSpeedKph: 210,
    trims: [
      {
        description: 'Capable from the start.',
        id: 'x300-base',
        includedPackageIds: [],
        name: 'Base',
        priceDelta: '0.00',
      },
      {
        description: 'Adds all-weather driver assistance.',
        id: 'x300-adventure',
        includedPackageIds: ['pkg-safety'],
        name: 'Adventure',
        priceDelta: '4100.00',
      },
      {
        description: 'Sport-tuned with performance and safety packages.',
        id: 'x300-as-line',
        includedPackageIds: ['pkg-safety', 'pkg-performance'],
        name: 'AS Line',
        priceDelta: '7600.00',
      },
    ],
    wheels: STANDARD_WHEELS,
    zeroToHundredSec: 7.2,
  },
  {
    basePrice: '89900.00',
    bodyType: 'suv',
    colors: colorsStartingWith('graphite-grey'),
    description:
      'The performance flagship of the SUV range, built by Vielzeug Sport — uncompromising power wrapped in everyday usability.',
    features: ['matrixLed', 'premiumAudio', 'adaptiveCruise', 'headUpDisplay'],
    fuelEconomyLPer100Km: 12.4,
    heroHue: 355,
    id: 'x600-as',
    name: 'Vielzeug X600 AS',
    packages: STANDARD_PACKAGES,
    powertrain: 'petrol',
    rangeKm: null,
    seats: 5,
    segment: 'Performance SUV',
    slug: 'x600-as',
    tagline: 'Engineered for the edge.',
    topSpeedKph: 270,
    trims: [
      {
        description: 'Full Vielzeug Sport treatment as standard.',
        id: 'x600-as-base',
        includedPackageIds: ['pkg-performance', 'pkg-safety'],
        name: 'AS',
        priceDelta: '0.00',
      },
      {
        description: 'Adds the technology package and carbon trim.',
        id: 'x600-as-carbon',
        includedPackageIds: ['pkg-performance', 'pkg-safety', 'pkg-tech'],
        name: 'AS Carbon Edition',
        priceDelta: '11200.00',
      },
    ],
    wheels: STANDARD_WHEELS,
    zeroToHundredSec: 3.9,
  },
  {
    basePrice: '71900.00',
    bodyType: 'sedan',
    colors: colorsStartingWith('glacier-silver'),
    description:
      'Vielzeug\u2019s all-electric sedan, part of the Volt line — silent power with a range built for real journeys.',
    features: ['matrixLed', 'premiumAudio', 'wirelessCharging', 'headUpDisplay'],
    fuelEconomyLPer100Km: null,
    heroHue: 165,
    id: 'av400',
    name: 'Vielzeug AV400',
    packages: STANDARD_PACKAGES,
    powertrain: 'electric',
    rangeKm: 590,
    seats: 5,
    segment: 'Electric Sedan',
    slug: 'av400',
    tagline: 'Silence is the new performance.',
    topSpeedKph: 210,
    trims: [
      {
        description: 'Technology package as standard.',
        id: 'av400-volt',
        includedPackageIds: ['pkg-tech'],
        name: 'Volt',
        priceDelta: '0.00',
      },
      {
        description: 'Larger battery pack, extended range.',
        id: 'av400-volt-lr',
        includedPackageIds: ['pkg-tech', 'pkg-comfort'],
        name: 'Volt Long Range',
        priceDelta: '6200.00',
      },
    ],
    wheels: STANDARD_WHEELS,
    zeroToHundredSec: 4.5,
  },
];

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export const seedUsers: User[] = [
  { email: 'amara@example.com', id: 'user-amara', name: 'Amara Okonkwo', role: 'customer' },
  { email: 'liam@vielzeug-motors.example', id: 'user-liam', name: 'Liam Ferreira', role: 'sales' },
  { email: 'chen@vielzeug-motors.example', id: 'user-chen', name: 'Chen Wei', role: 'admin' },
];

// ---------------------------------------------------------------------------
// Seed orders — relative to "now" so the admin dashboard's revenue chart
// always has real recent data, regardless of when the demo is loaded.
// ---------------------------------------------------------------------------

function daysAgo(n: number): string {
  const d = new Date();

  d.setDate(d.getDate() - n);

  return d.toISOString();
}

export const seedOrders: Order[] = [
  {
    dealerId: null,
    deliveryMethod: 'delivery',
    estimatedDeliveryDate: daysAgo(-14),
    financing: { aprPercent: 4.9, downPaymentAmount: '8000.00', termMonths: 60 },
    id: 'order-1001',
    items: [
      {
        breakdown: {
          base: '58900.00',
          color: '890.00',
          packages: '2400.00',
          subtotal: '67590.00',
          tax: '5407.20',
          total: '72997.20',
          trim: '5400.00',
          wheels: '0.00',
        },
        configuration: {
          colorId: 'glacier-silver',
          modelId: 'r350',
          packageIds: ['pkg-comfort'],
          trimId: 'r350-executive',
          wheelId: 'wheel-18',
        },
        modelId: 'r350',
        modelName: 'Vielzeug R350',
        quantity: 1,
      },
    ],
    paymentMethod: 'financing',
    placedAt: daysAgo(6),
    shippingAddress: {
      city: 'Lisbon',
      country: 'Portugal',
      fullName: 'Amara Okonkwo',
      phone: '+351 900 000 000',
      postalCode: '1000-001',
      street: 'Avenida da Liberdade 100',
    },
    status: 'processing',
    totalAmount: '72997.20',
    tradeIn: null,
    userId: 'user-amara',
  },
  {
    dealerId: 'dealer-berlin',
    deliveryMethod: 'pickup',
    estimatedDeliveryDate: daysAgo(-2),
    financing: null,
    id: 'order-1002',
    items: [
      {
        breakdown: {
          base: '89900.00',
          color: '0.00',
          packages: '0.00',
          subtotal: '89900.00',
          tax: '7192.00',
          total: '97092.00',
          trim: '0.00',
          wheels: '1450.00',
        },
        configuration: {
          colorId: 'obsidian-black',
          modelId: 'x600-as',
          packageIds: [],
          trimId: 'x600-as-base',
          wheelId: 'wheel-20',
        },
        modelId: 'x600-as',
        modelName: 'Vielzeug X600 AS',
        quantity: 1,
      },
    ],
    paymentMethod: 'cash',
    placedAt: daysAgo(3),
    shippingAddress: {
      city: 'Berlin',
      country: 'Germany',
      fullName: 'Amara Okonkwo',
      phone: '+49 30 0000000',
      postalCode: '10115',
      street: 'Unter den Linden 1',
    },
    status: 'in-transit',
    totalAmount: '97092.00',
    tradeIn: null,
    userId: 'user-amara',
  },
  {
    dealerId: null,
    deliveryMethod: 'delivery',
    estimatedDeliveryDate: daysAgo(20),
    financing: null,
    id: 'order-1003',
    items: [
      {
        breakdown: {
          base: '38900.00',
          color: '0.00',
          packages: '1950.00',
          subtotal: '44050.00',
          tax: '3524.00',
          total: '47574.00',
          trim: '3200.00',
          wheels: '0.00',
        },
        configuration: {
          colorId: 'polar-white',
          modelId: 'a200',
          packageIds: ['pkg-safety'],
          trimId: 'a200-progressive',
          wheelId: 'wheel-18',
        },
        modelId: 'a200',
        modelName: 'Vielzeug A200',
        quantity: 1,
      },
    ],
    paymentMethod: 'lease',
    placedAt: daysAgo(28),
    shippingAddress: {
      city: 'Porto',
      country: 'Portugal',
      fullName: 'Amara Okonkwo',
      phone: '+351 900 111 222',
      postalCode: '4000-001',
      street: 'Rua de Santa Catarina 50',
    },
    status: 'delivered',
    totalAmount: '47574.00',
    tradeIn: null,
    userId: 'user-amara',
  },
];

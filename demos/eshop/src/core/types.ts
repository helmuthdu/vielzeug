// ── Identity & access ────────────────────────────────────────────────────────

export type Role = 'customer' | 'sales' | 'admin';

export type User = {
  email: string;
  id: string;
  name: string;
  role: Role;
};

// ── Catalog ──────────────────────────────────────────────────────────────────

export type BodyType = 'sedan' | 'suv';
export type Powertrain = 'electric' | 'hybrid' | 'petrol';

export type ColorOption = {
  hex: string;
  id: string;
  metallic: boolean;
  name: string;
  priceDelta: string;
};

export type WheelOption = {
  id: string;
  name: string;
  priceDelta: string;
  sizeInches: number;
};

export type PackageCategory = 'comfort' | 'performance' | 'safety' | 'technology';

/** Luxury feature-card catalog — a fixed set every model draws a subset from, rendered as
 * icon+label cards on the model detail page (`model.features.*` in `core/i18n.ts` owns the labels). */
export type FeatureKey =
  | 'adaptiveCruise'
  | 'headUpDisplay'
  | 'massageSeats'
  | 'matrixLed'
  | 'panoramicRoof'
  | 'premiumAudio'
  | 'wirelessCharging';

export type PackageOption = {
  category: PackageCategory;
  description: string;
  id: string;
  name: string;
  priceDelta: string;
};

export type TrimOption = {
  description: string;
  id: string;
  includedPackageIds: string[];
  name: string;
  priceDelta: string;
};

export type Model = {
  /** Base price in USD — the storage currency; `core/currency.ts` converts for display. */
  basePrice: string;
  bodyType: BodyType;
  colors: ColorOption[];
  description: string;
  features: FeatureKey[];
  fuelEconomyLPer100Km: number | null;
  /** Hue angle (deg) tinting catalog and card staging surfaces. */
  heroHue: number;
  id: string;
  name: string;
  packages: PackageOption[];
  powertrain: Powertrain;
  rangeKm: number | null;
  seats: number;
  segment: string;
  slug: string;
  tagline: string;
  topSpeedKph: number;
  trims: TrimOption[];
  wheels: WheelOption[];
  zeroToHundredSec: number;
};

// ── Configuration & cart ─────────────────────────────────────────────────────

export type Configuration = {
  colorId: string;
  modelId: string;
  packageIds: string[];
  trimId: string;
  wheelId: string;
};

export type CartItem = {
  addedAt: string;
  configuration: Configuration;
  id: string;
  quantity: number;
};

export type PriceBreakdown = {
  base: string;
  color: string;
  packages: string;
  subtotal: string;
  tax: string;
  total: string;
  trim: string;
  wheels: string;
};

// ── Checkout ─────────────────────────────────────────────────────────────────

export type Address = {
  city: string;
  country: string;
  fullName: string;
  phone: string;
  postalCode: string;
  street: string;
};

/** `pickup`'s dealer is resolved via `Order.dealerId` against `seed-data.ts`'s static `DEALERS`
 * list — there's no dealer API/query in this demo, so no dealer store lives in `core/catalog.ts`. */
export type DeliveryMethod = 'delivery' | 'pickup';

export type Dealer = {
  city: string;
  id: string;
  name: string;
};

/** Self-reported — this demo has no valuation service, so the shopper's own estimate is the
 * number carried straight through to the order total (see `pricing.ts`'s `applyTradeInCredit`). */
export type TradeIn = {
  description: string;
  estimatedValueUsd: string;
};

export type PaymentMethod = 'cash' | 'financing' | 'lease';

export type FinancingTerms = {
  aprPercent: number;
  downPaymentAmount: string;
  termMonths: number;
};

export type OrderStatus = 'cancelled' | 'delivered' | 'in-transit' | 'placed' | 'processing';

export type OrderItem = {
  breakdown: PriceBreakdown;
  configuration: Configuration;
  modelId: string;
  modelName: string;
  quantity: number;
};

export type Order = {
  dealerId: string | null;
  deliveryMethod: DeliveryMethod;
  estimatedDeliveryDate: string;
  financing: FinancingTerms | null;
  id: string;
  items: OrderItem[];
  paymentMethod: PaymentMethod;
  placedAt: string;
  shippingAddress: Address;
  status: OrderStatus;
  totalAmount: string;
  tradeIn: TradeIn | null;
  userId: string;
};

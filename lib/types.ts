export type Transmission = "Automatic" | "Manual";
export type Fuel = "Petrol" | "Diesel" | "Hybrid" | "Electric";
export type BodyType =
  | "SUV"
  | "Sedan"
  | "Hatchback"
  | "Pickup"
  | "Coupe"
  | "Van";
export type Condition = "New" | "Used" | "Certified";
export type CarStatus = "Available" | "Reserved" | "Sold";

export interface CarImage {
  id: string;
  url: string;
  /** ordering; 0 = cover */
  position: number;
  alt?: string;
}

export interface Car {
  id: string;
  make: string;
  model: string;
  year: number;
  priceGhs: number;
  mileageKm: number;
  transmission: Transmission;
  fuel: Fuel;
  bodyType: BodyType;
  colour: string;
  condition: Condition;
  description: string;
  features: string[];
  videoUrl?: string;
  status: CarStatus;
  verified: boolean;
  images: CarImage[];
  createdAt: string; // ISO
}

export type DiscountType = "percent" | "fixed";

export interface DiscountCode {
  id: string;
  code: string;
  type: DiscountType;
  /** percent (0-100) or fixed GHS amount */
  value: number;
  minPrice?: number;
  expiresAt?: string; // ISO
  usageLimit?: number;
  usedCount: number;
  /** restrict to a single make, e.g. "Toyota" */
  makeRestriction?: string;
  active: boolean;
}

export type AnalyticsEventType = "view" | "favourite" | "whatsapp_click";

export interface AnalyticsEvent {
  id: string;
  carId: string;
  type: AnalyticsEventType;
  createdAt: string;
}

export interface Settings {
  dealerName: string;
  whatsappNumber: string;
  ghsPerUsd: number;
}

export type Currency = "GHS" | "USD";

/** Result of applying a discount code to a price. */
export interface DiscountResult {
  ok: boolean;
  code?: DiscountCode;
  originalPrice: number;
  finalPrice: number;
  savedAmount: number;
  error?: string;
}

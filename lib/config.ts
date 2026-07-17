/**
 * Central runtime config. All values are read from NEXT_PUBLIC_* env vars
 * with safe defaults so the app runs out of the box.
 *
 * The GHS→USD rate and WhatsApp number are also editable from the admin
 * Settings screen at runtime (persisted to localStorage). See lib/store.ts.
 */
export const SITE_CONFIG = {
  dealerName: process.env.NEXT_PUBLIC_DEALER_NAME || "CarLab",
  whatsappNumber: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "233201234567",
  ghsPerUsd: Number(process.env.NEXT_PUBLIC_GHS_PER_USD) || 15.5,
  tagline: "Ghana's premium pre-owned & new car showroom",
  location: "Accra, Ghana",
} as const;

export const ADMIN_CREDENTIALS = {
  email: process.env.NEXT_PUBLIC_ADMIN_EMAIL || "admin@carlab.gh",
  password: process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "carlab-admin",
} as const;

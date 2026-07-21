/**
 * Central runtime config. All values are read from NEXT_PUBLIC_* env vars
 * with safe defaults so the app runs out of the box.
 *
 * The GHS→USD rate and WhatsApp number are the build-time defaults; the live
 * values come from the database (admin Settings screen). See lib/db/settings.ts.
 *
 * Admin authentication is fully server-side (see lib/session.ts + the
 * /api/admin routes) — there are no admin credentials in the client bundle.
 */
export const SITE_CONFIG = {
  dealerName: process.env.NEXT_PUBLIC_DEALER_NAME || "Eclipse Motors",
  whatsappNumber: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "233201234567",
  ghsPerUsd: Number(process.env.NEXT_PUBLIC_GHS_PER_USD) || 15.5,
  ghsPerRmb: Number(process.env.NEXT_PUBLIC_GHS_PER_RMB) || 2.1,
  tagline: "Ghana's premium pre-owned & new car showroom",
  location: "Accra, Ghana",
} as const;

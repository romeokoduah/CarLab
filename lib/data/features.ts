/**
 * Curated catalog of common car features, grouped for the admin form's
 * checkbox picker. These are the amenities buyers weigh most when choosing a
 * car, so ticking them is faster than typing. Admins can still add any custom
 * feature that isn't listed here.
 */
export const FEATURE_GROUPS: { group: string; items: string[] }[] = [
  {
    group: "Comfort & convenience",
    items: [
      "Air conditioning",
      "Climate control",
      "Dual-zone climate",
      "Leather seats",
      "Heated seats",
      "Ventilated seats",
      "Power-adjustable seats",
      "Memory seats",
      "Keyless entry",
      "Push-button start",
      "Cruise control",
      "Adaptive cruise control",
      "Sunroof",
      "Panoramic roof",
      "Power tailgate",
      "Wireless charging",
      "Ambient lighting",
      "Rear AC vents",
      "Third-row seating",
    ],
  },
  {
    group: "Safety",
    items: [
      "ABS brakes",
      "Multiple airbags",
      "Traction control",
      "Stability control",
      "Blind-spot monitor",
      "Lane-keep assist",
      "Forward collision warning",
      "Automatic emergency braking",
      "Parking sensors",
      "Reverse camera",
      "360° camera",
      "Tyre-pressure monitor",
      "Hill-start assist",
      "ISOFIX child seats",
    ],
  },
  {
    group: "Technology & infotainment",
    items: [
      "Touchscreen display",
      "Apple CarPlay",
      "Android Auto",
      "Bluetooth",
      "Navigation / GPS",
      "Premium sound system",
      "Digital instrument cluster",
      "Head-up display",
      "USB ports",
      "Rear entertainment",
      "Voice control",
    ],
  },
  {
    group: "Exterior & wheels",
    items: [
      "Alloy wheels",
      "LED headlights",
      "Fog lights",
      "Daytime running lights",
      "Roof rails",
      "Tow bar",
      "Power-folding mirrors",
      "Rain-sensing wipers",
    ],
  },
  {
    group: "Performance & drivetrain",
    items: [
      "Turbocharged",
      "Hybrid system",
      "Sport mode",
      "Eco mode",
      "Paddle shifters",
      "Differential lock",
      "All-terrain tyres",
    ],
  },
];

/** Flat set of every catalog feature, for quick membership checks. */
export const CATALOG_FEATURES = new Set(
  FEATURE_GROUPS.flatMap((g) => g.items),
);

import type { Car, DiscountCode } from "@/lib/types";
import { galleryFor } from "@/lib/data/images";

let uid = 0;
function imgs(offset: number, count: number, carId: string) {
  return galleryFor(offset, count).map((g, i) => ({
    id: `img-${carId}-${i}`,
    url: g.url,
    position: i,
    alt: g.alt,
  }));
}

interface Draft {
  make: string;
  model: string;
  year: number;
  priceGhs: number;
  mileageKm: number;
  transmission: Car["transmission"];
  fuel: Car["fuel"];
  bodyType: Car["bodyType"];
  colour: string;
  condition: Car["condition"];
  status: Car["status"];
  verified: boolean;
  description: string;
  features: string[];
  videoUrl?: string;
  imageOffset: number;
  imageCount: number;
  createdAt: string;
  engineCapacity?: string;
  drivetrain?: Car["drivetrain"];
  seats?: number;
  doors?: number;
  cylinders?: number;
  horsepower?: number;
  previousOwners?: number;
  registrationStatus?: Car["registrationStatus"];
}

const DRAFTS: Draft[] = [
  {
    make: "Toyota",
    model: "Land Cruiser Prado",
    year: 2022,
    priceGhs: 685000,
    mileageKm: 38200,
    transmission: "Automatic",
    fuel: "Diesel",
    bodyType: "SUV",
    colour: "Pearl White",
    condition: "Certified",
    status: "Available",
    verified: true,
    description:
      "A meticulously maintained Prado with full service history. Built for Ghana's roads — commanding presence, effortless torque and the legendary Land Cruiser durability. Certified and inspected across 150 points.",
    features: [
      "Leather seats",
      "360° camera",
      "Adaptive cruise control",
      "Sunroof",
      "Apple CarPlay",
      "Ventilated front seats",
      "20\" alloy wheels",
    ],
    videoUrl: "https://www.youtube.com/embed/ScMzIvxBSi4",
    imageOffset: 0,
    imageCount: 9,
    createdAt: "2026-06-28T09:00:00Z",
  },
  {
    make: "Mercedes-Benz",
    model: "C300 AMG Line",
    year: 2021,
    priceGhs: 520000,
    mileageKm: 41500,
    transmission: "Automatic",
    fuel: "Petrol",
    bodyType: "Sedan",
    colour: "Obsidian Black",
    condition: "Used",
    status: "Available",
    verified: true,
    description:
      "The C300 in AMG Line trim — poised, quiet and quick. Burmester sound, ambient lighting and a cabin that still feels brand new. One careful owner, accident-free.",
    features: [
      "AMG body kit",
      "Burmester sound",
      "Ambient lighting",
      "Wireless charging",
      "Keyless entry",
      "Panoramic roof",
    ],
    imageOffset: 4,
    imageCount: 8,
    createdAt: "2026-07-02T10:30:00Z",
  },
  {
    make: "BMW",
    model: "X5 xDrive40i",
    year: 2020,
    priceGhs: 610000,
    mileageKm: 55000,
    transmission: "Automatic",
    fuel: "Petrol",
    bodyType: "SUV",
    colour: "Alpine White",
    condition: "Used",
    status: "Reserved",
    verified: true,
    description:
      "A commanding X5 with the smooth inline-six. Head-up display, comfort seats and xDrive grip for any weather. Reserved pending final paperwork — enquire to join the waitlist.",
    features: [
      "Head-up display",
      "Harman Kardon audio",
      "Comfort access",
      "Heated seats",
      "Gesture control",
      "Air suspension",
    ],
    imageOffset: 7,
    imageCount: 7,
    createdAt: "2026-06-20T14:15:00Z",
  },
  {
    make: "Toyota",
    model: "Corolla Altis",
    year: 2023,
    priceGhs: 268000,
    mileageKm: 18900,
    transmission: "Automatic",
    fuel: "Hybrid",
    bodyType: "Sedan",
    colour: "Celestite Grey",
    condition: "Certified",
    status: "Available",
    verified: true,
    description:
      "Frugal, refined and endlessly reliable. This hybrid Corolla sips fuel while keeping you cool in Accra traffic. Perfect first executive car with balance of the payments possible.",
    features: [
      "Hybrid drivetrain",
      "Lane keep assist",
      "Reverse camera",
      "Push-button start",
      "LED headlights",
    ],
    imageOffset: 10,
    imageCount: 6,
    createdAt: "2026-07-10T08:45:00Z",
  },
  {
    make: "Land Rover",
    model: "Range Rover Sport",
    year: 2019,
    priceGhs: 720000,
    mileageKm: 62000,
    transmission: "Automatic",
    fuel: "Diesel",
    bodyType: "SUV",
    colour: "Santorini Black",
    condition: "Used",
    status: "Available",
    verified: false,
    description:
      "Presence and pace in equal measure. The Range Rover Sport blends off-road capability with limousine comfort. Freshly serviced with new tyres all round.",
    features: [
      "Meridian sound",
      "Terrain response",
      "Soft-close doors",
      "Massage seats",
      "Adaptive dynamics",
    ],
    imageOffset: 13,
    imageCount: 8,
    createdAt: "2026-06-15T11:00:00Z",
  },
  {
    make: "Honda",
    model: "CR-V",
    year: 2021,
    priceGhs: 335000,
    mileageKm: 44300,
    transmission: "Automatic",
    fuel: "Petrol",
    bodyType: "SUV",
    colour: "Modern Steel",
    condition: "Used",
    status: "Available",
    verified: true,
    description:
      "Spacious, sensible and superbly built. The CR-V is the family SUV that just works — generous boot, airy cabin and Honda's bulletproof reliability.",
    features: [
      "Honda Sensing",
      "Dual-zone climate",
      "Apple CarPlay",
      "Power tailgate",
      "Blind-spot monitor",
    ],
    imageOffset: 16,
    imageCount: 6,
    createdAt: "2026-07-05T13:20:00Z",
  },
  {
    make: "Ford",
    model: "Ranger Wildtrak",
    year: 2022,
    priceGhs: 458000,
    mileageKm: 29800,
    transmission: "Automatic",
    fuel: "Diesel",
    bodyType: "Pickup",
    colour: "Sea Grey",
    condition: "Certified",
    status: "Available",
    verified: true,
    description:
      "The Wildtrak does work and weekends. Bi-turbo diesel, load-lugging bed and a cabin that shames most SUVs. Ready for the site or the coast.",
    features: [
      "Bi-turbo diesel",
      "Tow package",
      "Roller shutter",
      "SYNC 3",
      "All-terrain tyres",
    ],
    imageOffset: 19,
    imageCount: 7,
    createdAt: "2026-06-30T16:40:00Z",
  },
  {
    make: "Tesla",
    model: "Model 3 Long Range",
    year: 2023,
    priceGhs: 495000,
    mileageKm: 21000,
    transmission: "Automatic",
    fuel: "Electric",
    bodyType: "Sedan",
    colour: "Midnight Silver",
    condition: "Certified",
    status: "Available",
    verified: true,
    description:
      "Instant torque, near-silent cruising and software that keeps improving. This Long Range Model 3 comes with a wall charger and full self-driving hardware.",
    features: [
      "Autopilot",
      "Glass roof",
      "Wall charger included",
      "Premium audio",
      "Over-the-air updates",
    ],
    imageOffset: 2,
    imageCount: 6,
    createdAt: "2026-07-12T09:10:00Z",
  },
  {
    make: "Volkswagen",
    model: "Golf GTI",
    year: 2020,
    priceGhs: 298000,
    mileageKm: 47500,
    transmission: "Manual",
    fuel: "Petrol",
    bodyType: "Hatchback",
    colour: "Tornado Red",
    condition: "Used",
    status: "Sold",
    verified: true,
    description:
      "The definitive hot hatch. Six-speed manual, plaid seats and a chassis that begs for a back road. A future classic, already sold — ask us to source another.",
    features: [
      "6-speed manual",
      "Sport suspension",
      "Digital cockpit",
      "Plaid seats",
      "DCC adaptive damping",
    ],
    imageOffset: 5,
    imageCount: 6,
    createdAt: "2026-05-28T12:00:00Z",
  },
  {
    make: "Toyota",
    model: "Hilux GR-Sport",
    year: 2023,
    priceGhs: 512000,
    mileageKm: 15600,
    transmission: "Automatic",
    fuel: "Diesel",
    bodyType: "Pickup",
    colour: "Emotional Red",
    condition: "New",
    status: "Available",
    verified: true,
    description:
      "The toughest Hilux yet, in GR-Sport dress. Wider track, uprated suspension and unmistakable presence. Brand new, zero compromises, ready to be plated.",
    features: [
      "GR-Sport suspension",
      "Wide-body kit",
      "Diff lock",
      "9\" display",
      "Leather-accented seats",
    ],
    imageOffset: 21,
    imageCount: 7,
    createdAt: "2026-07-14T07:30:00Z",
  },
];

export const SEED_CARS: Car[] = DRAFTS.map((d) => {
  uid += 1;
  const id = `car-${String(uid).padStart(3, "0")}`;
  return {
    id,
    make: d.make,
    model: d.model,
    year: d.year,
    priceGhs: d.priceGhs,
    mileageKm: d.mileageKm,
    transmission: d.transmission,
    fuel: d.fuel,
    bodyType: d.bodyType,
    colour: d.colour,
    condition: d.condition,
    description: d.description,
    features: d.features,
    videoUrl: d.videoUrl,
    status: d.status,
    verified: d.verified,
    images: imgs(d.imageOffset, d.imageCount, id),
    createdAt: d.createdAt,
    engineCapacity: d.engineCapacity ?? defaultEngine(d),
    drivetrain: d.drivetrain ?? defaultDrivetrain(d),
    seats: d.seats ?? defaultSeats(d),
    doors: d.doors ?? defaultDoors(d),
    cylinders: d.cylinders ?? (d.fuel === "Electric" ? undefined : 4),
    horsepower: d.horsepower,
    previousOwners:
      d.previousOwners ?? (d.condition === "New" ? 0 : 1),
    registrationStatus: d.registrationStatus ?? defaultRegistration(d),
  };
});

function defaultEngine(d: Draft): string {
  if (d.fuel === "Electric") return "Electric";
  switch (d.bodyType) {
    case "Pickup":
      return "2.4L";
    case "SUV":
      return d.fuel === "Diesel" ? "3.0L" : "2.0L";
    case "Hatchback":
      return "2.0L";
    default:
      return d.fuel === "Hybrid" ? "1.8L" : "2.0L";
  }
}

function defaultDrivetrain(d: Draft): Car["drivetrain"] {
  if (d.bodyType === "Pickup") return "4WD";
  if (d.bodyType === "SUV") return "AWD";
  return "FWD";
}

function defaultSeats(d: Draft): number {
  if (d.bodyType === "Van") return 8;
  if (d.bodyType === "SUV") return 5;
  if (d.bodyType === "Coupe") return 4;
  return 5;
}

function defaultDoors(d: Draft): number {
  if (d.bodyType === "Coupe") return 2;
  return 5;
}

function defaultRegistration(d: Draft): Car["registrationStatus"] {
  if (d.condition === "New") return "Brand new";
  return "Registered (Ghana)";
}

export const SEED_DISCOUNTS: DiscountCode[] = [
  {
    id: "disc-001",
    code: "SHOWROOM10",
    type: "percent",
    value: 10,
    minPrice: 200000,
    expiresAt: "2026-12-31T23:59:59Z",
    usageLimit: 100,
    usedCount: 12,
    active: true,
  },
  {
    id: "disc-002",
    code: "GHS20K",
    type: "fixed",
    value: 20000,
    minPrice: 300000,
    usageLimit: 50,
    usedCount: 4,
    active: true,
  },
  {
    id: "disc-003",
    code: "TOYOTAVIP",
    type: "percent",
    value: 7,
    makeRestriction: "Toyota",
    usageLimit: 30,
    usedCount: 9,
    active: true,
  },
  {
    id: "disc-004",
    code: "EXPIRED5",
    type: "percent",
    value: 5,
    expiresAt: "2025-01-01T00:00:00Z",
    usedCount: 40,
    active: false,
  },
];

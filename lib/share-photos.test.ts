import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MAX_SHARE_PHOTOS,
  buildPhotoCaption,
  buildPhotoFallbackLink,
  canShareFiles,
  photoFileName,
  pickShareablePhotos,
} from "@/lib/share-photos";
import type { Car, CarImage } from "@/lib/types";

function makeCar(overrides: Partial<Car> = {}): Car {
  return {
    id: "car-1",
    make: "Toyota",
    model: "Camry",
    year: 2019,
    priceGhs: 685_000,
    mileageKm: 45_000,
    transmission: "Automatic",
    fuel: "Petrol",
    bodyType: "Sedan",
    colour: "Silver",
    condition: "Used",
    description: "",
    features: [],
    status: "Available",
    verified: true,
    images: [],
    createdAt: "2026-08-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeImages(count: number): CarImage[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `img-${i}`,
    url: `/uploads/photo-${i}.webp`,
    position: i,
  }));
}

test("a car with more photos than WhatsApp wants is capped at ten", () => {
  const car = makeCar({ images: makeImages(14) });
  const picked = pickShareablePhotos(car);
  assert.equal(picked.length, MAX_SHARE_PHOTOS);
  assert.equal(picked[0].url, "/uploads/photo-0.webp");
  assert.equal(picked[9].url, "/uploads/photo-9.webp");
});

test("the cover photo leads even when the images arrive out of order", () => {
  const car = makeCar({
    images: [
      { id: "b", url: "/uploads/b.webp", position: 2 },
      { id: "c", url: "/uploads/c.webp", position: 0 },
      { id: "a", url: "/uploads/a.webp", position: 1 },
    ],
  });
  assert.deepEqual(
    pickShareablePhotos(car).map((i) => i.id),
    ["c", "a", "b"],
  );
});

test("an image with no url is dropped rather than shared as a broken file", () => {
  const car = makeCar({
    images: [
      { id: "a", url: "/uploads/a.webp", position: 0 },
      { id: "blank", url: "   ", position: 1 },
      { id: "b", url: "/uploads/b.webp", position: 2 },
    ],
  });
  assert.deepEqual(
    pickShareablePhotos(car).map((i) => i.id),
    ["a", "b"],
  );
});

test("a car with no photos yields nothing to share", () => {
  assert.deepEqual(pickShareablePhotos(makeCar()), []);
});

test("the caption names the car, its price and where the listing lives", () => {
  const caption = buildPhotoCaption({
    car: makeCar(),
    listingUrl: "https://eclipsemotors.org/car/car-1",
    priceLabel: "GHS 685,000",
  });
  assert.match(caption, /2019 Toyota Camry/);
  assert.match(caption, /GHS 685,000/);
  assert.match(caption, /https:\/\/eclipsemotors\.org\/car\/car-1/);
});

test("the caption carries mileage and colour so a buyer needs no follow-up", () => {
  const caption = buildPhotoCaption({
    car: makeCar(),
    listingUrl: "https://eclipsemotors.org/car/car-1",
    priceLabel: "GHS 685,000",
  });
  assert.match(caption, /45,000 km/);
  assert.match(caption, /Silver/);
});

test("a car with no colour recorded gets no stray separator", () => {
  const caption = buildPhotoCaption({
    car: makeCar({ colour: "" }),
    listingUrl: "https://eclipsemotors.org/car/car-1",
    priceLabel: "GHS 685,000",
  });
  assert.ok(!caption.includes("· ·"), `dangling separator in: ${caption}`);
  assert.ok(!/·\s*\n/.test(caption), `trailing separator in: ${caption}`);
});

test("photo files are named after the car so a saved photo is identifiable", () => {
  const car = makeCar();
  assert.equal(photoFileName(car, 0), "2019-toyota-camry-1.jpg");
  assert.equal(photoFileName(car, 9), "2019-toyota-camry-10.jpg");
});

test("punctuation and spaces in a model never leak into a filename", () => {
  const car = makeCar({ make: "Mercedes-Benz", model: "C 300 4MATIC" });
  assert.equal(photoFileName(car, 0), "2019-mercedes-benz-c-300-4matic-1.jpg");
});

const photos = [new File(["x"], "a.jpg", { type: "image/jpeg" })];

test("a browser with no Web Share API takes the download fallback", () => {
  assert.equal(canShareFiles(undefined, photos), false);
  assert.equal(canShareFiles({}, photos), false);
});

test("a browser that shares but cannot vouch for files takes the fallback", () => {
  // Without canShare there is no way to ask whether files are supported, and
  // share() would silently drop them — downloading is the honest outcome.
  assert.equal(canShareFiles({ share: async () => {} }, photos), false);
});

test("a desktop browser that refuses file payloads takes the fallback", () => {
  assert.equal(
    canShareFiles({ share: async () => {}, canShare: () => false }, photos),
    false,
  );
});

test("a phone that accepts file payloads gets the share sheet", () => {
  assert.equal(
    canShareFiles({ share: async () => {}, canShare: () => true }, photos),
    true,
  );
});

test("a browser whose canShare throws is treated as unable to share", () => {
  const hostile = {
    share: async () => {},
    canShare: () => {
      throw new Error("nope");
    },
  };
  assert.equal(canShareFiles(hostile, photos), false);
});

test("nothing to share is never offered to the share sheet", () => {
  assert.equal(
    canShareFiles({ share: async () => {}, canShare: () => true }, []),
    false,
  );
});

test("the fallback chat opens on the dealer's own number, digits only", () => {
  const href = buildPhotoFallbackLink("+233 55 498 1410", "2019 Toyota Camry");
  assert.ok(
    href.startsWith("https://wa.me/233554981410?text="),
    `unexpected href: ${href}`,
  );
});

test("a caption's newlines survive into the fallback link", () => {
  const href = buildPhotoFallbackLink("233554981410", "Camry\nGHS 685,000");
  assert.match(href, /Camry%0AGHS%20685%2C000/);
});

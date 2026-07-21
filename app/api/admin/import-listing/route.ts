import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { requireSuperAdmin } from "@/lib/auth-server";
import { Che168ImportError, scrapeChe168Listing } from "@/lib/import/che168";
import { DeepSeekImportError, extractListingCopy } from "@/lib/import/deepseek";
import { compressToTarget } from "@/lib/images";
import { dbGetSettings } from "@/lib/db/settings";
import {
  computeFinalPriceGhs,
  defaultsForBody,
  LOGISTICS_RMB,
} from "@/lib/pricing";
import type { CarImage } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// A real headless-browser scrape + an AI call take real time — give this
// import generously more room than a normal admin request.
const FETCH_IMAGE_TIMEOUT_MS = 20000;
const MAX_IMAGES = 24;

function uploadDir(): string {
  return process.env.UPLOAD_DIR || path.join(process.cwd(), "public", "uploads");
}

async function downloadAndStore(url: string): Promise<CarImage | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131.0 Safari/537.36",
        Referer: "https://global.che168.com/",
      },
      signal: AbortSignal.timeout(FETCH_IMAGE_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const original = Buffer.from(await res.arrayBuffer());
    const { buffer } = await compressToTarget(original);
    const dir = uploadDir();
    await mkdir(dir, { recursive: true });
    const name = `${randomUUID()}.webp`;
    await writeFile(path.join(dir, name), buffer);
    return { id: `img-${randomUUID()}`, url: `/uploads/${name}`, position: 0 };
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const guard = await requireSuperAdmin();
  if (!guard.ok) {
    return NextResponse.json({ error: "forbidden" }, { status: guard.status });
  }

  const body = await req.json().catch(() => null);
  const url = typeof body?.url === "string" ? body.url.trim() : "";
  if (!url) {
    return NextResponse.json({ error: "Paste a che168 listing link." }, { status: 400 });
  }

  let listing;
  try {
    listing = await scrapeChe168Listing(url);
  } catch (e) {
    if (e instanceof Che168ImportError) {
      return NextResponse.json({ error: e.message }, { status: 422 });
    }
    console.error("che168 scrape failed:", e);
    return NextResponse.json(
      { error: "Could not read that listing. It may have been taken down, or che168 changed its page layout." },
      { status: 502 },
    );
  }

  let copy;
  try {
    copy = await extractListingCopy({
      make: listing.make,
      model: listing.model,
      trim: listing.trim,
      year: listing.year,
      mileageKm: listing.mileageKm,
      colour: listing.colour,
      previousOwners: listing.previousOwners,
      specContext: listing.specContext,
    });
  } catch (e) {
    if (e instanceof DeepSeekImportError) {
      return NextResponse.json({ error: e.message }, { status: 502 });
    }
    console.error("DeepSeek extraction failed:", e);
    return NextResponse.json({ error: "The AI write-up step failed. Try again." }, { status: 502 });
  }

  const downloaded = await Promise.all(
    listing.imageUrls.slice(0, MAX_IMAGES).map((u) => downloadAndStore(u)),
  );
  const images = downloaded
    .filter((im): im is CarImage => im !== null)
    .map((im, i) => ({ ...im, position: i }));
  if (!images.length) {
    return NextResponse.json(
      { error: "Found the listing but none of its photos could be downloaded." },
      { status: 502 },
    );
  }

  const settings = await dbGetSettings();
  const { profitRmb, shippingUsd } = defaultsForBody(listing.bodyType);
  const breakdown = {
    carRmb: listing.carRmb,
    logisticsRmb: LOGISTICS_RMB,
    profitRmb,
    shippingUsd,
    ghsPerRmb: settings.ghsPerRmb,
    ghsPerUsd: settings.ghsPerUsd,
  };
  const priceGhs = computeFinalPriceGhs(breakdown) ?? 0;

  return NextResponse.json({
    draft: {
      make: listing.make,
      model: listing.model,
      year: listing.year,
      mileageKm: listing.mileageKm,
      colour: listing.colour,
      bodyType: listing.bodyType,
      transmission: listing.transmission,
      fuel: listing.fuel,
      drivetrain: listing.drivetrain,
      seats: listing.seats,
      doors: listing.doors,
      cylinders: listing.cylinders,
      horsepower: listing.horsepower,
      engineCapacity: listing.engineCapacity,
      previousOwners: listing.previousOwners,
      description: copy.description,
      features: copy.features,
      images,
      priceGhs,
      costCarRmb: breakdown.carRmb,
      costLogisticsRmb: breakdown.logisticsRmb,
      costProfitRmb: breakdown.profitRmb,
      costShippingUsd: breakdown.shippingUsd,
      rateGhsPerRmb: breakdown.ghsPerRmb,
      rateGhsPerUsd: breakdown.ghsPerUsd,
      sourceUrl: listing.sourceUrl,
    },
    meta: {
      sourceUrl: listing.sourceUrl,
      photosFound: listing.imageUrls.length,
      photosDownloaded: images.length,
      unrecognisedHighlights: listing.unrecognisedHighlights,
    },
  });
}

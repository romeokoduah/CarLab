"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  AnalyticsEvent,
  AnalyticsEventType,
  Car,
  CarStatus,
  Currency,
  DiscountCode,
  Settings,
} from "@/lib/types";
import { SITE_CONFIG } from "@/lib/config";

/**
 * Client runtime cache. Cars/discounts/settings are the source-of-truth on the
 * server (PostgreSQL) — this store hydrates them from the /api/* routes and
 * writes go through the protected /api/admin/* routes. Only per-visitor prefs
 * (favourites, currency) and local analytics are persisted to localStorage.
 *
 * See lib/api.ts (server data access) and the /api route handlers.
 */

function genId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}${Date.now()
    .toString(36)
    .slice(-4)}`;
}

async function jsonFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: options?.body ? { "Content-Type": "application/json" } : undefined,
    ...options,
  });
  if (!res.ok) {
    throw new Error(`${options?.method ?? "GET"} ${url} -> ${res.status}`);
  }
  return (await res.json()) as T;
}

interface StoreState {
  cars: Car[];
  discounts: DiscountCode[];
  analytics: AnalyticsEvent[];
  favourites: string[];
  currency: Currency;
  settings: Settings;
  hydrated: boolean;

  // data loading
  hydrate: () => Promise<void>;
  /** Re-load cars with their cost breakdown. Admin only; needs a session. */
  hydrateAdminCars: () => Promise<void>;

  // preferences (client-only)
  setCurrency: (c: Currency) => void;
  toggleFavourite: (id: string) => void;

  // car CRUD (server-backed)
  addCar: (car: Omit<Car, "id" | "createdAt">) => Promise<Car | undefined>;
  updateCar: (id: string, patch: Partial<Car>) => Promise<void>;
  deleteCar: (id: string) => Promise<void>;
  duplicateCar: (id: string) => Promise<void>;
  setCarStatus: (id: string, status: CarStatus) => Promise<void>;

  // discount CRUD (server-backed)
  addDiscount: (code: Omit<DiscountCode, "id" | "usedCount">) => Promise<void>;
  updateDiscount: (id: string, patch: Partial<DiscountCode>) => Promise<void>;
  deleteDiscount: (id: string) => Promise<void>;
  toggleDiscount: (id: string) => Promise<void>;

  // settings + analytics
  /** Resolves with the number of cars re-priced by a rate change. */
  updateSettings: (patch: Partial<Settings>) => Promise<number>;
  recordEvent: (carId: string, type: AnalyticsEventType) => void;

  resetData: () => Promise<void>;
}

const defaultSettings: Settings = {
  dealerName: SITE_CONFIG.dealerName,
  whatsappNumber: SITE_CONFIG.whatsappNumber,
  ghsPerUsd: SITE_CONFIG.ghsPerUsd,
  ghsPerRmb: SITE_CONFIG.ghsPerRmb,
};

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      cars: [],
      discounts: [],
      analytics: [],
      favourites: [],
      currency: "GHS",
      settings: defaultSettings,
      hydrated: false,

      hydrate: async () => {
        try {
          const [c, d, s] = await Promise.all([
            jsonFetch<{ cars: Car[] }>("/api/cars"),
            jsonFetch<{ discounts: DiscountCode[] }>("/api/discounts"),
            jsonFetch<{ settings: Settings }>("/api/settings"),
          ]);
          set({
            cars: c.cars,
            discounts: d.discounts,
            settings: s.settings,
            hydrated: true,
          });
        } catch (err) {
          console.error("hydrate failed", err);
          set({ hydrated: true });
        }
      },

      /**
       * The public /api/cars omits each car's cost breakdown, so the admin
       * re-reads the full records once signed in. Without this the car form
       * would open with an empty breakdown and saving would erase it.
       */
      hydrateAdminCars: async () => {
        try {
          const { cars } = await jsonFetch<{ cars: Car[] }>("/api/admin/cars");
          set({ cars });
        } catch (err) {
          console.error("admin car hydrate failed", err);
        }
      },

      setCurrency: (c) => set({ currency: c }),

      toggleFavourite: (id) =>
        set((s) => {
          const has = s.favourites.includes(id);
          if (!has) get().recordEvent(id, "favourite");
          return {
            favourites: has
              ? s.favourites.filter((f) => f !== id)
              : [...s.favourites, id],
          };
        }),

      addCar: async (car) => {
        const { car: created } = await jsonFetch<{ car: Car }>(
          "/api/admin/cars",
          { method: "POST", body: JSON.stringify(car) },
        );
        set((s) => ({ cars: [created, ...s.cars] }));
        return created;
      },

      updateCar: async (id, patch) => {
        const { car } = await jsonFetch<{ car: Car }>(`/api/admin/cars/${id}`, {
          method: "PATCH",
          body: JSON.stringify(patch),
        });
        set((s) => ({ cars: s.cars.map((c) => (c.id === id ? car : c)) }));
      },

      deleteCar: async (id) => {
        await jsonFetch(`/api/admin/cars/${id}`, { method: "DELETE" });
        set((s) => ({
          cars: s.cars.filter((c) => c.id !== id),
          favourites: s.favourites.filter((f) => f !== id),
        }));
      },

      duplicateCar: async (id) => {
        const src = get().cars.find((c) => c.id === id);
        if (!src) return;
        const { id: _id, createdAt: _createdAt, ...rest } = src;
        const copy: Omit<Car, "id" | "createdAt"> = {
          ...rest,
          model: `${src.model} (copy)`,
          status: "Available",
          images: src.images.map((im, i) => ({ ...im, position: i })),
        };
        const { car: created } = await jsonFetch<{ car: Car }>(
          "/api/admin/cars",
          { method: "POST", body: JSON.stringify(copy) },
        );
        set((s) => ({ cars: [created, ...s.cars] }));
      },

      setCarStatus: async (id, status) => {
        await get().updateCar(id, { status });
      },

      addDiscount: async (code) => {
        const { discount } = await jsonFetch<{ discount: DiscountCode }>(
          "/api/admin/discounts",
          { method: "POST", body: JSON.stringify(code) },
        );
        set((s) => ({ discounts: [discount, ...s.discounts] }));
      },

      updateDiscount: async (id, patch) => {
        const { discount } = await jsonFetch<{ discount: DiscountCode }>(
          `/api/admin/discounts/${id}`,
          { method: "PATCH", body: JSON.stringify(patch) },
        );
        set((s) => ({
          discounts: s.discounts.map((d) => (d.id === id ? discount : d)),
        }));
      },

      deleteDiscount: async (id) => {
        await jsonFetch(`/api/admin/discounts/${id}`, { method: "DELETE" });
        set((s) => ({ discounts: s.discounts.filter((d) => d.id !== id) }));
      },

      toggleDiscount: async (id) => {
        const d = get().discounts.find((x) => x.id === id);
        if (!d) return;
        await get().updateDiscount(id, { active: !d.active });
      },

      updateSettings: async (patch) => {
        const { settings, repriced } = await jsonFetch<{
          settings: Settings;
          repriced: number;
        }>("/api/admin/settings", {
          method: "PATCH",
          body: JSON.stringify(patch),
        });
        set({ settings });
        // A rate change re-prices cars server-side; pull the new figures in so
        // the admin tables and the public store agree with the database.
        if (repriced > 0) {
          const { cars } = await jsonFetch<{ cars: Car[] }>("/api/cars");
          set({ cars });
        }
        return repriced;
      },

      recordEvent: (carId, type) =>
        set((s) => ({
          analytics: [
            { id: genId("evt"), carId, type, createdAt: new Date().toISOString() },
            ...s.analytics,
          ].slice(0, 2000),
        })),

      resetData: async () => {
        await get().hydrate();
      },
    }),
    {
      name: "eclipse-store",
      version: 3,
      // Only per-visitor state is persisted; catalogue data always comes fresh
      // from the server via hydrate().
      partialize: (s) => ({
        favourites: s.favourites,
        currency: s.currency,
        analytics: s.analytics,
      }),
    },
  ),
);

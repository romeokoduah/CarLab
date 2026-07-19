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
  updateSettings: (patch: Partial<Settings>) => Promise<void>;
  recordEvent: (carId: string, type: AnalyticsEventType) => void;

  resetData: () => Promise<void>;
}

const defaultSettings: Settings = {
  dealerName: SITE_CONFIG.dealerName,
  whatsappNumber: SITE_CONFIG.whatsappNumber,
  ghsPerUsd: SITE_CONFIG.ghsPerUsd,
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
        const { settings } = await jsonFetch<{ settings: Settings }>(
          "/api/admin/settings",
          { method: "PATCH", body: JSON.stringify(patch) },
        );
        set({ settings });
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
